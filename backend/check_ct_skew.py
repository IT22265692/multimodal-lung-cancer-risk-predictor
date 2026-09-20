"""
check_ct_skew.py
----------------
Proves (or rules out) train/serve skew in the CT embedding step.

It re-extracts the CT embedding for ONE patient using the exact same code the
backend uses at prediction time, then compares that live embedding to the row
stored in ct_embeddings.csv for the same patient (the training-time embedding).

If the two match, CT extraction is consistent and the high-risk problem lies
elsewhere. If they differ (they almost certainly will), that mismatch is why
every prediction reads "Higher relative risk": the CT branch drives ~95% of the
score, so a shifted embedding shifts every score to the top of the range.

USAGE
    python check_ct_skew.py LUNG1-XXX /path/to/that_patient_dicom_folder

Put this file next to main.py so it imports the same extraction functions.
Requires the same environment as the backend (torch, monai, SimpleITK, etc.).
"""

import sys
import re
import numpy as np
import pandas as pd

# Reuse the backend's own extraction so we test exactly what the app runs.
from main import load_ct_image, extract_ct_embedding_from_image, BASE_DIR


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)

    patient_id = sys.argv[1].strip()
    dicom_folder = sys.argv[2]

    # 1) Live embedding via the app's own pipeline
    print(f"Extracting live embedding for {patient_id} ...")
    img = load_ct_image(dicom_folder, is_dicom_folder=True)
    live = extract_ct_embedding_from_image(img).astype(float).ravel()
    print(f"  live embedding: dim={live.size}  min={live.min():.4f} "
          f"max={live.max():.4f} mean={live.mean():.4f} std={live.std():.4f}")

    # 2) Stored training embedding for the same patient
    csv_path = BASE_DIR / "ct_embeddings.csv"
    if not csv_path.exists():
        print(f"\nCannot find {csv_path}. Put ct_embeddings.csv next to main.py.")
        sys.exit(1)

    ct = pd.read_csv(csv_path)
    ct["PatientID"] = ct["patient_id"].astype(str).str.extract(r"(LUNG1-\d+)")
    row = ct[ct["PatientID"] == patient_id]
    if row.empty:
        print(f"\n{patient_id} is not in ct_embeddings.csv. "
              f"Pick a patient whose ID appears there.")
        sys.exit(1)

    emb_cols = [c for c in ct.columns if c.startswith("emb_")]
    stored = row[emb_cols].values.astype(float).ravel()
    print(f"  stored embedding: dim={stored.size}  min={stored.min():.4f} "
          f"max={stored.max():.4f} mean={stored.mean():.4f} std={stored.std():.4f}")

    if live.size != stored.size:
        print(f"\nVERDICT: dimension mismatch ({live.size} vs {stored.size}). "
              f"The extraction is producing a different feature vector than training.")
        sys.exit(0)

    # 3) Compare
    corr = np.corrcoef(live, stored)[0, 1]
    mean_ratio = (live.mean() + 1e-9) / (stored.mean() + 1e-9)
    l2 = np.linalg.norm(live - stored) / (np.linalg.norm(stored) + 1e-9)

    print("\n--- comparison ---")
    print(f"  Pearson correlation (live vs stored): {corr:.3f}")
    print(f"  mean ratio live/stored              : {mean_ratio:.3f}")
    print(f"  relative L2 difference              : {l2:.3f}")

    print("\nVERDICT:")
    if corr > 0.99 and 0.95 < mean_ratio < 1.05:
        print("  Embeddings match. CT extraction is consistent with training.")
        print("  The high-risk issue is NOT CT skew; look at the calibration or model.")
    elif corr > 0.9:
        print("  Same shape but a scale/offset difference. The app's intensity")
        print("  normalization or resampling differs from training. Match the")
        print("  preprocessing (see notes in the chat) and re-check.")
    else:
        print("  Embeddings do NOT match. The app extracts CT features differently")
        print("  from how ct_embeddings.csv was built. This is the cause of the")
        print("  always-high predictions. Align the extraction, or recalibrate the")
        print("  bands to the app's own pipeline with build_live_calibration.py.")


if __name__ == "__main__":
    main()
