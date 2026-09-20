"""
Lung Cancer Survival Risk Predictor - FastAPI backend (v2, rebalanced model)

Change vs the old backend: the deployed predictor is now a CT + clinical fusion
model. The old model let the CT branch dominate and ignored clinical stage; on
held-out data it was no better than clinical-only, and it flagged early-stage
patients as high risk. In this cohort stage does not predict survival (it even
runs slightly backwards), but AGE does. This model uses age and the other
clinical fields alongside the CT embedding, so younger early-stage patients read
lower and older patients read higher, while test C-index stays about the same.

Radiomics is no longer fed to the model (it carried the weakest signal and its
serve-time features could not be reproduced exactly). The RTSTRUCT is still used
only to draw the tumour preview.

Model weights load from fusion_model_final_v2.npz (numpy state dict).
"""

import json
import pickle
import os
import tempfile
import shutil
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import SimpleITK as sitk
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from monai.transforms import Compose, EnsureChannelFirst, Resize, ScaleIntensityRange, EnsureType
from rt_utils import RTStructBuilder

# ---------------------------------------------------------------------------
# Paths, config, scalers, baseline hazard
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
with open(BASE_DIR / "model_config_final_v2.json") as f:
    CONFIG = json.load(f)
with open(BASE_DIR / "scalers_final_v2.pkl", "rb") as f:
    SCALERS = pickle.load(f)          # ct_scaler + clin_scaler are reused unchanged
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


# ---------------------------------------------------------------------------
# Model: CT + clinical fusion
# ---------------------------------------------------------------------------
class FusionCTClin(nn.Module):
    def __init__(self, ct_dim, clin_dim, ct_hidden):
        super().__init__()
        self.ct_branch = nn.Sequential(nn.Linear(ct_dim, ct_hidden), nn.ReLU())
        self.clin_branch = nn.Sequential(nn.Linear(clin_dim, clin_dim), nn.ReLU())
        self.head = nn.Sequential(
            nn.Linear(ct_hidden + clin_dim, 32), nn.ReLU(), nn.Linear(32, 1)
        )

    def forward(self, ct_x, clin_x):
        combined = torch.cat([self.ct_branch(ct_x), self.clin_branch(clin_x)], dim=1)
        return self.head(combined).squeeze(-1)


MODEL = FusionCTClin(CONFIG["ct_dim"], CONFIG["clin_dim"], CONFIG["ct_hidden"])
_w = np.load(BASE_DIR / "fusion_model_final_v2.npz")
MODEL.load_state_dict({k: torch.tensor(_w[k]) for k in _w.files})
MODEL.eval()

_medicalnet = None


def get_medicalnet():
    global _medicalnet
    if _medicalnet is None:
        _medicalnet = torch.hub.load("Warvito/MedicalNet-models", "medicalnet_resnet10")
        _medicalnet.to(DEVICE)
        _medicalnet.eval()
    return _medicalnet


# ---------------------------------------------------------------------------
# Risk-band calibration (percentile against the model's own scores)
# ---------------------------------------------------------------------------
_RISK_QUANTILE_GRID = [
    -0.5579, -0.2455, -0.1759, -0.1187, -0.0582, -0.0124, 0.0069, 0.0298,
    0.0435, 0.0601, 0.0721, 0.0848, 0.1017, 0.1186, 0.1348, 0.1516, 0.1735,
    0.1944, 0.2246, 0.2653, 0.3565,
]
_RISK_QUANTILE_PCTS = list(range(0, 101, 5))
_BAND_LOWER_PCT = 50.0   # below this percentile -> Lower
_BAND_UPPER_PCT = 85.0   # above this percentile -> Higher


def _load_calibration_scores():
    """Prefer this model's own scores (fusion_model_risk_scores.csv)."""
    for name in ("risk_calibration.json", "fusion_model_risk_scores.csv"):
        p = BASE_DIR / name
        if not p.exists():
            continue
        try:
            if name.endswith(".json"):
                data = json.load(open(p))
                vals = data.get("risk_scores") if isinstance(data, dict) else data
            else:
                import csv as _csv
                vals = [float(r["risk_score"]) for r in _csv.DictReader(open(p, newline=""))]
            if vals:
                return np.sort(np.asarray(vals, dtype=float))
        except Exception:
            pass
    return None


_TRAIN_RISK_SORTED = _load_calibration_scores()


def risk_percentile(r):
    if _TRAIN_RISK_SORTED is not None and len(_TRAIN_RISK_SORTED) > 0:
        n = len(_TRAIN_RISK_SORTED)
        pos = float(np.searchsorted(_TRAIN_RISK_SORTED, r, side="right"))
        return max(0.0, min(100.0, 100.0 * pos / n))
    return float(np.clip(np.interp(r, _RISK_QUANTILE_GRID, _RISK_QUANTILE_PCTS), 0.0, 100.0))


def risk_band(r):
    p = risk_percentile(r)
    if p < _BAND_LOWER_PCT:
        return "Lower relative risk", p
    if p < _BAND_UPPER_PCT:
        return "Moderate relative risk", p
    return "Higher relative risk", p


# ---------------------------------------------------------------------------
# CT + mask helpers
# ---------------------------------------------------------------------------
def load_ct_image(ct_input_path, is_dicom_folder):
    if is_dicom_folder:
        reader = sitk.ImageSeriesReader()
        names = reader.GetGDCMSeriesFileNames(ct_input_path)
        if not names:
            raise ValueError(f"No DICOM series found in folder: {ct_input_path}")
        reader.SetFileNames(names)
        return reader.Execute()
    return sitk.ReadImage(ct_input_path)


def extract_ct_embedding_from_image(sitk_image):
    model = get_medicalnet()
    arr = sitk.GetArrayFromImage(sitk_image).astype(np.float32)
    tensor = CT_TRANSFORMS(arr).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        x = model.conv1(tensor); x = model.bn1(x); x = model.relu(x); x = model.maxpool(x)
        x = model.layer1(x); x = model.layer2(x); x = model.layer3(x); x = model.layer4(x)
        x = nn.functional.adaptive_avg_pool3d(x, 1)
        return torch.flatten(x, 1).cpu().numpy().flatten()


def build_mask_from_rtstruct(dicom_folder, rtstruct_path, roi_name="GTV-1"):
    rtstruct = RTStructBuilder.create_from(dicom_series_path=dicom_folder, rt_struct_path=rtstruct_path)
    rois = rtstruct.get_roi_names()
    if roi_name not in rois:
        raise ValueError(f"ROI '{roi_name}' not found. Available: {rois}")
    mask_3d = rtstruct.get_roi_mask_by_name(roi_name)
    reader = sitk.ImageSeriesReader()
    reader.SetFileNames(reader.GetGDCMSeriesFileNames(dicom_folder))
    ct_image = reader.Execute()
    mask_array = np.transpose(mask_3d, (2, 0, 1)).astype(np.uint8)
    mask_image = sitk.GetImageFromArray(mask_array)
    mask_image.CopyInformation(ct_image)
    return mask_image


def estimate_median_survival(risk_score):
    exp_r = np.exp(risk_score)
    for t, H in zip(BASELINE_HAZARD["times"], BASELINE_HAZARD["cumulative_hazard"]):
        if np.exp(-H * exp_r) <= 0.5:
            return t
    return None


def survival_probability_at(risk_score, days):
    exp_r = np.exp(risk_score); H_at = 0.0
    for t, H in zip(BASELINE_HAZARD["times"], BASELINE_HAZARD["cumulative_hazard"]):
        if t > days:
            break
        H_at = H
    return float(np.exp(-H_at * exp_r))


def render_slice_to_base64(array_2d, title=""):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import io, base64
    fig, ax = plt.subplots(figsize=(4, 4))
    ax.imshow(array_2d, cmap="gray"); ax.axis("off")
    if title:
        ax.set_title(title, color="white", fontsize=10)
    fig.patch.set_facecolor("#1e293b")
    buf = io.BytesIO()
    plt.savefig(buf, format="png", bbox_inches="tight", facecolor="#1e293b", dpi=100)
    plt.close(fig); buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")


def generate_preview_images(ct_input_path, rtstruct_path, roi_name):
    sitk_image = load_ct_image(ct_input_path, True)
    ct_array = sitk.GetArrayFromImage(sitk_image).astype(np.float32)
    mask_image = build_mask_from_rtstruct(ct_input_path, rtstruct_path, roi_name)
    mask_array = sitk.GetArrayFromImage(mask_image)
    areas = mask_array.sum(axis=(1, 2))
    best = int(np.argmax(areas)) if areas.max() > 0 else ct_array.shape[0] // 2
    windowed = np.clip(ct_array[best], -1000, 400)
    windowed = (windowed - windowed.min()) / (windowed.max() - windowed.min() + 1e-8)
    full = render_slice_to_base64(windowed, "Full CT slice")
    overlay = np.stack([windowed, windowed, windowed], axis=-1)
    ms = mask_array[best] > 0
    overlay[ms] = [1.0, 0.3, 0.3]
    ov = render_slice_to_base64(overlay, "CT + Tumor Contour")
    ys, xs = np.where(ms)
    if len(ys) > 0:
        mg = 20
        y0, y1 = max(0, ys.min() - mg), min(windowed.shape[0], ys.max() + mg)
        x0, x1 = max(0, xs.min() - mg), min(windowed.shape[1], xs.max() + mg)
        cropped = render_slice_to_base64(windowed[y0:y1, x0:x1], "Cropped Tumor Region")
    else:
        cropped = full
    return {"full": full, "overlay": ov, "cropped": cropped}


def run_prediction(ct_input_path, age, t_stage, n_stage, m_stage, overall_stage, histology, gender):
    # CT embedding
    sitk_image = load_ct_image(ct_input_path, True)
    ct_emb = extract_ct_embedding_from_image(sitk_image).reshape(1, -1)

    # Clinical vector (same order as training / clinical_feature_names)
    hist = {f"hist_{c}": 0.0 for c in CONFIG["histology_categories"]}
    hist[f"hist_{histology}"] = 1.0
    clin = np.array([[
        age, t_stage, n_stage, m_stage,
        1.0 if gender == "male" else 0.0,
        CONFIG["stage_map"].get(overall_stage, 0),
        *[hist[f"hist_{c}"] for c in CONFIG["histology_categories"]],
    ]])

    ct_s = SCALERS["ct_scaler"].transform(ct_emb)
    clin_s = SCALERS["clin_scaler"].transform(clin)

    with torch.no_grad():
        risk = MODEL(
            torch.tensor(ct_s, dtype=torch.float32),
            torch.tensor(clin_s, dtype=torch.float32),
        ).item()

    band_label, pct = risk_band(risk)
    return {
        "risk_score": risk,
        "risk_band": band_label,
        "risk_percentile": round(pct, 1),
        "cohort_size": int(len(_TRAIN_RISK_SORTED)) if _TRAIN_RISK_SORTED is not None else None,
        "median_survival_days": estimate_median_survival(risk),
        "prob_1yr": survival_probability_at(risk, 365),
        "prob_2yr": survival_probability_at(risk, 730),
        "test_cindex": CONFIG["test_cindex"],
    }


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(title="Lung Cancer Risk Predictor API", version="2.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])


@app.get("/api/config")
def get_config():
    return {
        "test_cindex": CONFIG["test_cindex"],
        "stage_options": list(CONFIG["stage_map"].keys()),
        "histology_options": CONFIG["histology_categories"],
        "cohort_size": int(len(_TRAIN_RISK_SORTED)) if _TRAIN_RISK_SORTED is not None else None,
    }


def _save_dicom_series(dicom_files, tmp_dir):
    series_dir = os.path.join(tmp_dir, "dicom_series")
    os.makedirs(series_dir, exist_ok=True)
    for i, uf in enumerate(dicom_files):
        name = os.path.basename(uf.filename or f"slice_{i:04d}.dcm")
        with open(os.path.join(series_dir, name), "wb") as f:
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
        return {"ok": True, "images": generate_preview_images(series_dir, rt_path, roi_name)}
    except Exception as e:
        return {"ok": False, "error": str(e)}
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


@app.post("/api/predict")
async def api_predict(
    dicom_files: list[UploadFile] = File(...),
    rtstruct_file: UploadFile = File(None),   # optional now; model no longer needs it
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
        result = run_prediction(series_dir, age, t_stage, n_stage, m_stage,
                                overall_stage, histology, gender)
        return {"ok": True, "result": result}
    except Exception as e:
        return {"ok": False, "error": str(e)}
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        index = FRONTEND_DIST / "index.html"
        fp = FRONTEND_DIST / full_path
        if full_path and fp.exists() and fp.is_file():
            return FileResponse(fp)
        return FileResponse(index)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)