"""
Lung Cancer Survival Risk Predictor - FastAPI backend
Serves the React frontend and provides /api/predict + /api/preview endpoints.
"""

import json
import pickle
import os
import tempfile
import shutil
from pathlib import Path
from typing import Optional

import numpy as np
import torch
import torch.nn as nn
import SimpleITK as sitk
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from monai.transforms import Compose, EnsureChannelFirst, Resize, ScaleIntensityRange, EnsureType
from radiomics import featureextractor
from rt_utils import RTStructBuilder

# ---------------------------------------------------------------------------
# Paths & model loading
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
with open(BASE_DIR / "model_config_final_v2.json") as f:
    CONFIG = json.load(f)
with open(BASE_DIR / "scalers_final_v2.pkl", "rb") as f:
    SCALERS = pickle.load(f)
with open(BASE_DIR / "baseline_hazard.json") as f:
    BASELINE_HAZARD = json.load(f)

TARGET_SHAPE = (96, 96, 96)
HU_WINDOW = (-1000, 400)
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

CT_TRANSFORMS = Compose([
    EnsureChannelFirst(channel_dim="no_channel"),
    Resize(TARGET_SHAPE),
    ScaleIntensityRange(a_min=HU_WINDOW[0], a_max=HU_WINDOW[1], b_min=0.0, b_max=1.0, clip=True),
    EnsureType(),
])

EXTRACTOR_SETTINGS = {}


class FusionDeepSurv(nn.Module):
    def __init__(self, ct_dim, rad_dim, clin_dim, ct_hidden=16, dropout=0.3):
        super().__init__()
        self.ct_branch = nn.Sequential(nn.Linear(ct_dim, ct_hidden), nn.ReLU(), nn.Dropout(dropout))
        self.rad_branch = nn.Sequential(nn.Linear(rad_dim, 16), nn.ReLU(), nn.Dropout(0.2))
        self.clin_branch = nn.Sequential(nn.Linear(clin_dim, clin_dim), nn.ReLU())
        self.head = nn.Sequential(
            nn.Linear(ct_hidden + 16 + clin_dim, 32), nn.ReLU(), nn.Dropout(dropout), nn.Linear(32, 1)
        )

    def forward(self, ct_x, rad_x, clin_x):
        combined = torch.cat(
            [self.ct_branch(ct_x), self.rad_branch(rad_x), self.clin_branch(clin_x)], dim=1
        )
        return self.head(combined).squeeze(-1)


MODEL = FusionDeepSurv(CONFIG["ct_dim"], CONFIG["rad_dim"], CONFIG["clin_dim"], ct_hidden=CONFIG["ct_hidden"])
MODEL.load_state_dict(torch.load(BASE_DIR / "fusion_model_final_v2.pt", map_location="cpu"))
MODEL.eval()

_medicalnet = None
_radiomics_extractor = None


def get_medicalnet():
    global _medicalnet
    if _medicalnet is None:
        _medicalnet = torch.hub.load("Warvito/MedicalNet-models", "medicalnet_resnet10")
        _medicalnet.to(DEVICE)
        _medicalnet.eval()
    return _medicalnet


def get_radiomics_extractor():
    global _radiomics_extractor
    if _radiomics_extractor is None:
        _radiomics_extractor = featureextractor.RadiomicsFeatureExtractor(**EXTRACTOR_SETTINGS)
    return _radiomics_extractor


def build_mask_from_rtstruct(dicom_folder, rtstruct_path, roi_name="GTV-1"):
    rtstruct = RTStructBuilder.create_from(dicom_series_path=dicom_folder, rt_struct_path=rtstruct_path)
    available_rois = rtstruct.get_roi_names()
    if roi_name not in available_rois:
        raise ValueError(f"ROI '{roi_name}' not found. Available: {available_rois}")
    mask_3d = rtstruct.get_roi_mask_by_name(roi_name)

    reader = sitk.ImageSeriesReader()
    dicom_names = reader.GetGDCMSeriesFileNames(dicom_folder)
    reader.SetFileNames(dicom_names)
    ct_image = reader.Execute()

    mask_array = np.transpose(mask_3d, (2, 0, 1)).astype(np.uint8)
    mask_image = sitk.GetImageFromArray(mask_array)
    mask_image.CopyInformation(ct_image)
    return mask_image


def load_ct_image(ct_input_path, is_dicom_folder):
    if is_dicom_folder:
        reader = sitk.ImageSeriesReader()
        dicom_names = reader.GetGDCMSeriesFileNames(ct_input_path)
        if not dicom_names:
            raise ValueError(f"No DICOM series found in folder: {ct_input_path}")
        reader.SetFileNames(dicom_names)
        return reader.Execute()
    return sitk.ReadImage(ct_input_path)


def extract_ct_embedding_from_image(sitk_image):
    model = get_medicalnet()
    arr = sitk.GetArrayFromImage(sitk_image).astype(np.float32)
    tensor = CT_TRANSFORMS(arr).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        x = model.conv1(tensor)
        x = model.bn1(x)
        x = model.relu(x)
        x = model.maxpool(x)
        x = model.layer1(x)
        x = model.layer2(x)
        x = model.layer3(x)
        x = model.layer4(x)
        x = nn.functional.adaptive_avg_pool3d(x, 1)
        return torch.flatten(x, 1).cpu().numpy().flatten()


def extract_radiomics(ct_path_for_radiomics, mask_path):
    extractor = get_radiomics_extractor()
    result = extractor.execute(ct_path_for_radiomics, mask_path)
    kept_cols = SCALERS["kept_cols"]
    raw_values = []
    for feature_name in kept_cols:
        if feature_name not in result:
            raise KeyError(f"PyRadiomics did not produce expected feature '{feature_name}'.")
        raw_values.append(float(result[feature_name]))
    raw_values = np.array(raw_values).reshape(1, -1)
    scaled = SCALERS["rad_scaler"].transform(raw_values)
    scaled_map = {name: val for name, val in zip(kept_cols, scaled.flatten())}
    return np.array([scaled_map[f] for f in CONFIG["rad_feature_names"]])


def estimate_median_survival(risk_score):
    exp_r = np.exp(risk_score)
    for t, H in zip(BASELINE_HAZARD["times"], BASELINE_HAZARD["cumulative_hazard"]):
        if np.exp(-H * exp_r) <= 0.5:
            return t
    return None


def survival_probability_at(risk_score, days):
    exp_r = np.exp(risk_score)
    H_at_t = 0.0
    for t, H in zip(BASELINE_HAZARD["times"], BASELINE_HAZARD["cumulative_hazard"]):
        if t > days:
            break
        H_at_t = H
    return float(np.exp(-H_at_t * exp_r))


def render_slice_to_base64(array_2d, title=""):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import io, base64

    fig, ax = plt.subplots(figsize=(4, 4))
    ax.imshow(array_2d, cmap="gray")
    ax.axis("off")
    if title:
        ax.set_title(title, color="white", fontsize=10)
    fig.patch.set_facecolor("#1e293b")

    buf = io.BytesIO()
    plt.savefig(buf, format="png", bbox_inches="tight", facecolor="#1e293b", dpi=100)
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")


def generate_preview_images(ct_input_path, is_dicom_folder, mask_mode, mask_path, roi_name):
    sitk_image = load_ct_image(ct_input_path, is_dicom_folder)
    ct_array = sitk.GetArrayFromImage(sitk_image).astype(np.float32)

    if mask_mode == "rtstruct":
        if not is_dicom_folder:
            raise ValueError("RTSTRUCT mode requires the CT scan to be a raw DICOM folder.")
        mask_image = build_mask_from_rtstruct(ct_input_path, mask_path, roi_name=roi_name)
    else:
        mask_image = sitk.ReadImage(mask_path)
    mask_array = sitk.GetArrayFromImage(mask_image)

    slice_areas = mask_array.sum(axis=(1, 2))
    best_slice = int(np.argmax(slice_areas)) if slice_areas.max() > 0 else ct_array.shape[0] // 2

    windowed = np.clip(ct_array[best_slice], -1000, 400)
    windowed = (windowed - windowed.min()) / (windowed.max() - windowed.min() + 1e-8)

    full_b64 = render_slice_to_base64(windowed, title="Full CT slice")

    overlay = np.stack([windowed, windowed, windowed], axis=-1)
    mask_slice = mask_array[best_slice] > 0
    overlay[mask_slice] = [1.0, 0.3, 0.3]
    overlay_b64 = render_slice_to_base64(overlay, title="CT + Tumor Contour")

    ys, xs = np.where(mask_slice)
    if len(ys) > 0:
        margin = 20
        y0, y1 = max(0, ys.min() - margin), min(windowed.shape[0], ys.max() + margin)
        x0, x1 = max(0, xs.min() - margin), min(windowed.shape[1], xs.max() + margin)
        cropped_b64 = render_slice_to_base64(windowed[y0:y1, x0:x1], title="Cropped Tumor Region")
    else:
        cropped_b64 = full_b64

    return {"full": full_b64, "overlay": overlay_b64, "cropped": cropped_b64}


def run_prediction(
    ct_input_path, is_dicom_folder, mask_mode, mask_path, roi_name,
    age, t_stage, n_stage, m_stage, overall_stage, histology, gender
):
    sitk_image = load_ct_image(ct_input_path, is_dicom_folder)
    ct_embedding = extract_ct_embedding_from_image(sitk_image).reshape(1, -1)

    if is_dicom_folder:
        tmp_ct_path = os.path.join(tempfile.gettempdir(), "_temp_ct_for_radiomics.nii.gz")
        sitk.WriteImage(sitk_image, tmp_ct_path)
    else:
        tmp_ct_path = ct_input_path

    if mask_mode == "rtstruct":
        if not is_dicom_folder:
            raise ValueError("RTSTRUCT mode requires the CT scan to be a raw DICOM folder.")
        mask_image = build_mask_from_rtstruct(ct_input_path, mask_path, roi_name=roi_name)
        tmp_mask_path = os.path.join(tempfile.gettempdir(), "_temp_mask_for_radiomics.nii.gz")
        sitk.WriteImage(mask_image, tmp_mask_path)
    else:
        tmp_mask_path = mask_path

    rad_values = extract_radiomics(tmp_ct_path, tmp_mask_path).reshape(1, -1)

    hist_dummy = {f"hist_{cat}": 0.0 for cat in CONFIG["histology_categories"]}
    hist_dummy[f"hist_{histology}"] = 1.0

    clin_vals = np.array([[
        age, t_stage, n_stage, m_stage,
        1.0 if gender == "male" else 0.0,
        CONFIG["stage_map"].get(overall_stage, 0),
        *[hist_dummy[f"hist_{cat}"] for cat in CONFIG["histology_categories"]],
    ]])

    ct_scaled = SCALERS["ct_scaler"].transform(ct_embedding)
    clin_scaled = SCALERS["clin_scaler"].transform(clin_vals)

    with torch.no_grad():
        risk = MODEL(
            torch.tensor(ct_scaled, dtype=torch.float32),
            torch.tensor(rad_values, dtype=torch.float32),
            torch.tensor(clin_scaled, dtype=torch.float32),
        ).item()

    return {
        "risk_score": risk,
        "median_survival_days": estimate_median_survival(risk),
        "prob_1yr": survival_probability_at(risk, 365),
        "prob_2yr": survival_probability_at(risk, 730),
        "test_cindex": CONFIG["test_cindex"],
    }


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(title="Lung Cancer Risk Predictor API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/config")
def get_config():
    return {
        "test_cindex": CONFIG["test_cindex"],
        "stage_options": list(CONFIG["stage_map"].keys()),
        "histology_options": CONFIG["histology_categories"],
    }


def _save_dicom_series(dicom_files: list, tmp_dir: str) -> str:
    """Save uploaded DICOM files into a series folder and return its path."""
    series_dir = os.path.join(tmp_dir, "dicom_series")
    os.makedirs(series_dir, exist_ok=True)
    for i, uf in enumerate(dicom_files):
        # Preserve basename when possible; avoid path traversal
        name = os.path.basename(uf.filename or f"slice_{i:04d}.dcm")
        dest = os.path.join(series_dir, name)
        with open(dest, "wb") as f:
            shutil.copyfileobj(uf.file, f)
    return series_dir


@app.post("/api/preview")
async def api_preview(
    dicom_files: list[UploadFile] = File(...),
    rtstruct_file: UploadFile = File(...),
    roi_name: str = Form("GTV-1"),
):
    tmp_dir = tempfile.mkdtemp()
    try:
        series_dir = _save_dicom_series(dicom_files, tmp_dir)
        rt_path = os.path.join(tmp_dir, os.path.basename(rtstruct_file.filename or "rtstruct.dcm"))
        with open(rt_path, "wb") as f:
            shutil.copyfileobj(rtstruct_file.file, f)

        images = generate_preview_images(
            series_dir, True, "rtstruct", rt_path, roi_name
        )
        return {"ok": True, "images": images}
    except Exception as e:
        return {"ok": False, "error": str(e)}
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


@app.post("/api/predict")
async def api_predict(
    dicom_files: list[UploadFile] = File(...),
    rtstruct_file: UploadFile = File(...),
    age: float = Form(...),
    t_stage: float = Form(...),
    n_stage: float = Form(...),
    m_stage: float = Form(...),
    overall_stage: str = Form(...),
    histology: str = Form(...),
    gender: str = Form(...),
    roi_name: str = Form("GTV-1"),
):
    tmp_dir = tempfile.mkdtemp()
    try:
        series_dir = _save_dicom_series(dicom_files, tmp_dir)
        rt_path = os.path.join(tmp_dir, os.path.basename(rtstruct_file.filename or "rtstruct.dcm"))
        with open(rt_path, "wb") as f:
            shutil.copyfileobj(rtstruct_file.file, f)

        result = run_prediction(
            series_dir, True, "rtstruct", rt_path, roi_name,
            age, t_stage, n_stage, m_stage, overall_stage, histology, gender
        )
        return {"ok": True, "result": result}
    except Exception as e:
        return {"ok": False, "error": str(e)}
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


# Serve React build (after npm run build)
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        index = FRONTEND_DIST / "index.html"
        file_path = FRONTEND_DIST / full_path
        if full_path and file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(index)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
