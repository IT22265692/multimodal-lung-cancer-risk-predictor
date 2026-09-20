"""
build_live_calibration.py
-------------------------
Regenerates the risk-band calibration using THIS app's own pipeline, so the
bands stop reading "Higher" for everyone.

Why this is needed: the CT branch drives ~95% of the risk score, and the app's
live CT embeddings sit on a different scale than the training embeddings the
model and the old calibration were built on. Ranking new patients against the
training scores therefore pushes everyone to the top. This script runs the
app's real prediction path on a set of patients you have DICOMs for, collects
the LIVE risk scores, and writes risk_calibration.json. main.py loads that file
first, so percentiles and bands then reflect the same pipeline users hit.

You do NOT need all 377 patients. 40-80 varied cases already give a usable
calibration; more is better.

INPUT: a manifest CSV with one row per patient and these columns:
    dicom_folder , rtstruct_path , roi_name
roi_name is optional and defaults to GTV-1.

USAGE
    python build_live_calibration.py manifest.csv
    # -> writes risk_calibration.json next to main.py

Put this file next to main.py. Same environment as the backend.
"""

import sys
import json
import numpy as np
import pandas as pd

from main import run_prediction, BASE_DIR


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)

    manifest = pd.read_csv(sys.argv[1])
    needed = {"dicom_folder", "rtstruct_path"}
    if not needed.issubset(manifest.columns):
        print(f"Manifest must have columns: {sorted(needed)} (roi_name optional).")
        sys.exit(1)

    scores = []
    for i, row in manifest.iterrows():
        roi = str(row["roi_name"]) if "roi_name" in manifest.columns and not pd.isna(row.get("roi_name")) else "GTV-1"
        try:
            # Clinical values do not matter for calibration (CT dominates), but
            # run_prediction needs them. Neutral placeholders keep the CT path real.
            res = run_prediction(
                str(row["dicom_folder"]), True, "rtstruct", str(row["rtstruct_path"]), roi,
                age=65.0, t_stage=2.0, n_stage=0.0, m_stage=0.0,
                overall_stage="II", histology="squamous cell carcinoma", gender="male",
            )
            scores.append(float(res["risk_score"]))
            print(f"[{i+1}/{len(manifest)}] {row['dicom_folder']}: risk {res['risk_score']:+.4f}")
        except Exception as e:
            print(f"[{i+1}/{len(manifest)}] SKIPPED {row['dicom_folder']}: {e}")

    if len(scores) < 10:
        print(f"\nOnly {len(scores)} scores collected. Need at least ~10 for a "
              f"meaningful calibration. Add more patients to the manifest.")
        sys.exit(1)

    arr = np.sort(np.asarray(scores, dtype=float))
    out = {
        "risk_scores": arr.tolist(),
        "n": int(arr.size),
        "note": "Live-pipeline risk scores used to calibrate risk bands.",
        "min": float(arr.min()),
        "median": float(np.median(arr)),
        "max": float(arr.max()),
    }
    out_path = BASE_DIR / "risk_calibration.json"
    json.dump(out, open(out_path, "w"), indent=2)

    print(f"\nWrote {out_path} from {arr.size} live scores.")
    print(f"  live score range: [{arr.min():+.3f}, {arr.max():+.3f}]  median {np.median(arr):+.3f}")
    print("  Tertile cuts (Lower | Moderate | Higher):")
    print(f"    33rd pct = {np.percentile(arr,33.33):+.3f}   67th pct = {np.percentile(arr,66.67):+.3f}")
    print("\nRestart the backend. Bands now reflect the app's own pipeline.")


if __name__ == "__main__":
    main()
