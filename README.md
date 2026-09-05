# Lunexa: Lung Cancer Prognosis and Risk Assessment

Mobile-responsive **React + FastAPI** web app for multimodal lung-cancer survival risk prediction.

**Brand:** Lunexa  
**Tagline:** Lung Cancer Prognosis and Risk Assessment  


---

## Features

- Upload a **raw CT DICOM folder** and an **RTSTRUCT** contour
- Clinical fields: age, T/N/M, overall stage, histology, gender
- Multimodal fusion model (CT deep features + radiomics + clinical)
- Risk score, median survival estimate, 1-year and 2-year survival probabilities
- Preview CT slice, tumor overlay, and cropped region
- Pages: Home, Predict, Symptoms, Help, How it Works, About

---

## Project structure

```
lung-cancer-web/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── model_config_final_v2.json
│   ├── baseline_hazard.json
│   ├── fusion_model_final_v2.pt
│   └── scalers_final_v2.pkl
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── public/
│   │   └── symptoms/          # optional local symptom images
│   └── src/
│       ├── App.jsx
│       ├── index.css
│       ├── main.jsx
│       ├── components/
│       │   ├── Navbar.jsx
│       │   └── Footer.jsx
│       └── pages/
│           ├── Home.jsx
│           ├── Predict.jsx
│           ├── Symptoms.jsx
│           ├── Help.jsx
│           ├── HowItWorks.jsx
│           └── About.jsx
├── .gitignore
└── README.md
```

---

## Requirements

- **Python** 3.10 or newer  
- **Node.js** 18 or newer and npm  
- Python packages: see `backend/requirements.txt` plus the scientific stack used by the desktop app (`torch`, `monai`, `SimpleITK`, `pyradiomics`, `rt-utils`, `matplotlib`, `scikit-learn`, `numpy`)

---

## Run locally

### 1. Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
# If needed, also install:
# pip install torch monai SimpleITK pyradiomics rt-utils matplotlib scikit-learn numpy fastapi uvicorn python-multipart

python main.py
```

API: **http://localhost:8000**

### 2. Frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

App: **http://localhost:5173**  

Vite is configured with `server.open: true`, so the default browser should open automatically. To open Chrome on Windows:

```bash
start chrome http://localhost:5173
```

### 3. Optional production build

```bash
cd frontend
npm run build
cd ../backend
python main.py
```

Then open **http://localhost:8000** (backend serves `frontend/dist` when present).

---

## Predict page inputs

| Input | What to provide |
|--------|------------------|
| CT | Entire **raw DICOM series folder** (many `.dcm` files) |
| Mask | **RTSTRUCT** DICOM file (`.dcm`) |
| ROI name | Structure name in the RTSTRUCT (default `GTV-1`) |
| Clinical | Age, T/N/M stages, overall stage, histology, gender |

Chrome is recommended for the folder picker.

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home and slideshow |
| `/predict` | DICOM + RTSTRUCT risk assessment |
| `/symptoms` | Common symptoms, tips, YouTube videos |
| `/help` | DICOM, RTSTRUCT, staging, histology glossary |
| `/how-it-works` | Five-step pipeline |
| `/about` | Model overview, performance, disclaimer |

---



---

## How others run after cloning

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# Backend
cd backend
python -m venv .venv
# activate venv, then:
pip install -r requirements.txt
python main.py

# Frontend (other terminal)
cd frontend
npm install
npm run dev
```

---

## Model notes

- Fusion DeepSurv-style network: CT branch + radiomics branch + clinical branch  
- Test C-index about **0.598** · Validation C-index about **0.665**  
- Baseline cumulative hazard used for median survival and fixed-time probabilities  

---

## Disclaimer

Lunexa is a **research and educational prototype**. It is not a certified medical device. Predictions are model-based estimates and must not replace clinical judgment or standard-of-care decisions. Always consult qualified healthcare professionals.
