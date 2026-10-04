# 🛡️ PolicyGuard — Insurance Claim Prediction & Analytics Platform

An end-to-end insurance analytics platform that predicts the likelihood of a motor insurance claim using a **CatBoost classifier**, serves predictions through a **FastAPI backend**, visualizes risk in a **React dashboard**, and documents an optional **Power BI reporting layer**.

> Internal analytics tool for portfolio exploration — predictions are statistical estimates, not underwriting decisions.

---

## ✨ Features

- **Claim prediction** — 41-field policy/vehicle/safety form → claim probability + binary decision at a tuned threshold (0.57)
- **Real-row testing** — fill the form from real dataset rows (`/dataset-sample`) with actual-vs-predicted comparison
- **Analytics dashboard** — claim rates by segment, fuel type, region, vehicle age, customer age, subscription length, NCAP, displacement, gross weight (aggregated server-side, no 58k-row download)
- **Model transparency** — initial 4-model screening comparison + final tuned production metrics, PR/ROC curves context
- **Prediction history** — localStorage-backed history with stats, latest prediction, and clear-all
- **Power BI layer** — docs-only DAX measures + dashboard layout to rebuild the analytics in Power BI Desktop (`powerbi/`)
- **Experiment harness** — 10-candidate validation-PR-AUC comparison (CatBoost / LightGBM / XGBoost / RF) that never touches production artifacts (`ml/experiment_model_improvement.py`)

---

## 🏗️ Architecture

```
┌─────────────────┐      HTTP/JSON       ┌──────────────────┐
│  React + Vite   │  ─────────────────►  │  FastAPI backend │
│  frontend/      │  ◄─────────────────  │  backend/main.py │
│  :5173          │   /predict, /model-  │  :8000           │
│                 │   info, /analytics,  └────────┬─────────┘
│  Dashboard      │   /dataset-sample            │
│  NewPrediction  │                              │ joblib
│  Analytics      │                              ▼
│  History / Model│                   ┌──────────────────┐
└─────────────────┘                   │ CatBoost model   │
                                      │ ml/models/*.pkl  │
                                      │ + feature eng.   │
                                      └──────────────────┘
                                                    ▲
                                      ┌──────────────────┐
                                      │ insurance_claims │
                                      │ .csv (58,592)    │
                                      └──────────────────┘

Optional: Power BI Desktop ──reads──► ml/data/insurance_claims.csv (DAX in powerbi/)
```

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| ML | Python, CatBoost 1.2.10, LightGBM, XGBoost, scikit-learn, pandas, NumPy, joblib, Jupyter |
| Backend | FastAPI, Uvicorn, Pydantic v2, CORS (Vite origins) |
| Frontend | React 19, Vite 8, Axios, vanilla CSS (no UI framework) |
| BI | Power BI Desktop (DAX measures + calculated columns, docs only) |
| Data | `ml/data/insurance_claims.csv` — 58,592 policies, 6.40% claim rate |

---

## 📁 Project Structure

```
PolicyGuard/
├── backend/
│   └── main.py                  # FastAPI app: /predict, /model-info,
│                                # /dataset-sample, /analytics, /health
├── frontend/
│   ├── src/
│   │   ├── pages/               # Dashboard, NewPrediction, Analytics,
│   │   │                        # History, Model
│   │   ├── components/          # ClaimForm, PredictionForm/Result,
│   │   │                        # DatasetRowPicker, AnalyticsCharts,
│   │   │                        # ModelComparison/Metrics, StatCard, …
│   │   ├── services/api.js      # Axios client (baseURL :8000)
│   │   ├── hooks/               # usePredictionHistory (localStorage)
│   │   └── data/fields.js       # Form field definitions
│   ├── package.json
│   └── vite.config.js
├── ml/
│   ├── data/
│   │   └── insurance_claims.csv # 58,592 rows (tracked in git)
│   ├── models/
│   │   ├── final_results.json   # Production metrics (tracked)
│   │   ├── model_config.json    # Feature lists, threshold (tracked)
│   │   ├── *.pkl                # Model artifacts (LOCAL ONLY, gitignored)
│   │   └── experiments/         # experiment_results.json (tracked)
│   ├── insurance_claim_prediction.ipynb  # Training notebook
│   └── experiment_model_improvement.py   # 10-candidate validation study
├── powerbi/
│   ├── README.md                # Power BI build guide
│   ├── DAX_Measures.md          # Measures + calculated columns
│   └── Dashboard_Layout.md      # Visuals / slicers / layout plan
└── README.md                    # ← you are here
```

---

## 🤖 ML Model

### Dataset

- **File:** `ml/data/insurance_claims.csv` — **58,592 policies**, 3,748 claims (**6.40%** base rate)
- Highly imbalanced → PR-AUC is the primary metric, threshold tuned for F1

### Feature engineering (`build_features` in `backend/main.py`)

Raw inputs (41 fields: demographics, region, vehicle specs, safety flags, `torque_nm/rpm`, `power_bhp/rpm`) plus 8 engineered features:

| Feature | Formula |
|---|---|
| `power_to_weight` | `power_bhp / gross_weight` |
| `torque_to_weight` | `torque_nm / gross_weight` |
| `power_per_displacement` | `power_bhp / displacement` |
| `torque_per_displacement` | `torque_nm / displacement` |
| `customer_vehicle_age_gap` | `customer_age − vehicle_age` |
| `region_density_log` | `log1p(region_density)` |
| `power_rpm_per_bhp` | `power_rpm / power_bhp` |
| `torque_rpm_per_nm` | `torque_rpm / torque_nm` |

CatBoost handles the 25 categorical columns natively (no one-hot in production). Final vector: **49 features** in fixed training order (see `ml/models/model_config.json`).

### Model screening (threshold 0.50, historical — selection only)

| Model | Precision | Recall | F1 | PR-AUC | ROC-AUC |
|---|---|---|---|---|---|
| Decision Tree | 0.0718 | 0.0813 | 0.0763 | 0.0646 | 0.5047 |
| Random Forest | 0.1034 | 0.0773 | 0.0885 | 0.0852 | 0.5854 |
| **CatBoost ✅** | 0.1010 | **0.6773** | **0.1757** | **0.1070** | **0.6680** |
| LightGBM | 0.0999 | 0.5773 | 0.1703 | 0.1009 | 0.6450 |

### Production model (tuned threshold 0.57, test set)

| Metric | Value |
|---|---|
| Model | CatBoost Native + Engineered Features (85 iterations) |
| Threshold | **0.57** (F1-tuned) |
| Precision / Recall / F1 | 0.1104 / 0.4147 / 0.1744 |
| PR-AUC / ROC-AUC | 0.1059 / 0.6635 |
| Confusion (TN/FP/FN/TP) | 8464 / 2505 / 439 / 311 |
| Validation PR-AUC / F1 | 0.1153 / 0.1806 |

> The portfolio is hard to separate — the model is a **screening/ranking aid**, not a decision-maker. See `ml/models/final_results.json` and the Model page in the UI.

### Experiment harness

`ml/experiment_model_improvement.py` replays identical feature engineering + `random_state=42` stratified train/val/test splits, compares 10 candidates (4 CatBoost variants, 2 LightGBM, 2 XGBoost, 2 RF) on **validation PR-AUC**, retrains the winner once on train+val, and evaluates once on test. Output goes to `ml/models/experiments/` — production `.pkl` files are never touched.

---

## 🔌 API Reference

Base URL: `http://127.0.0.1:8000` · Interactive docs: `http://127.0.0.1:8000/docs`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Service status + model name + threshold |
| `GET` | `/health` | Health check (`model_loaded`, threshold) |
| `GET` | `/model-info` | Final metrics + 4-model screening table |
| `GET` | `/dataset-sample?count=20&seed=42` | Balanced claimed/non-claimed real rows as ready-to-predict payloads + `actual_claim` |
| `GET` | `/analytics` | Cached aggregate claim rates for every dashboard chart (never downloads the CSV) |
| `POST` | `/predict` | Body: 41-field `ClaimRequest` → `{ claim_probability, claim_prediction, threshold, model }` |

---

## 🖥️ Frontend

- **Dashboard** — session stats, latest prediction, quick navigation
- **New Prediction** — 41-field claim form + dataset row picker + probability result with actual-vs-predicted badge
- **Analytics** — `/analytics`-powered charts: distribution donut, segment/fuel/region/age/subscription/NCAP/displacement/weight rates, model comparison
- **History** — localStorage prediction log with stats + clear
- **Model** — final metrics, threshold, screening comparison, training notes

API client: `frontend/src/services/api.js` (change `baseURL` if the backend isn't on `:8000`).

---

## 📊 Power BI (optional, docs-only)

The `powerbi/` folder changes nothing in code — it documents rebuilding the analytics in Power BI Desktop:

1. `Get Data → Text/CSV` → `ml/data/insurance_claims.csv`, rename table to `Claims`
2. Create measures from `powerbi/DAX_Measures.md` (`Total Policies`, `Total Claims`, `Claim Rate`, …)
3. Add calculated bin columns (vehicle/customer age, subscription length)
4. Build 4 KPI cards + 7 visuals + 5 slicers per `powerbi/Dashboard_Layout.md`

Verification KPIs (no slicers): **58,592 policies · 3,748 claims · 6.40% claim rate**.

> Interpretation rule: report **observed descriptive rates only** — never causal claims ("Region causes claims"). Small groups (e.g. regions C18/C22/C20, vehicle-age 10+) are noisy.

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+ · Node.js 18+ · (optional) Power BI Desktop

### 1. Backend

```bash
# from repo root
python -m venv .venv
.venv\Scripts\activate        # Windows  (source .venv/bin/activate on macOS/Linux)
pip install fastapi uvicorn pydantic pandas numpy joblib catboost scikit-learn lightgbm xgboost

uvicorn backend.main:app --reload --port 8000
# docs → http://127.0.0.1:8000/docs
```

> ⚠️ **Model artifacts:** `ml/models/*.pkl` (`catboost_model.pkl`, `model_config.pkl`, `threshold.pkl`, `final_results.pkl`) are **gitignored** and must exist locally — the API raises `RuntimeError: Missing ML artifact` without them. They are produced by running `ml/insurance_claim_prediction.ipynb`. Config/metrics JSONs (`final_results.json`, `model_config.json`) are tracked for reference.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev        # → http://localhost:5173
```

The app expects the backend on `http://127.0.0.1:8000` (see `src/services/api.js`).

### 3. Quick check

1. Open `http://localhost:5173` → **New Prediction** → *Load dataset rows* → pick a policy → **Predict**
2. Open **Analytics** (served by `/analytics`) and **Model** (served by `/model-info`)

---

## ⚠️ Limitations & Responsible Use

- Severe class imbalance (6.4% claims) → modest precision (~11%); best used for **ranking/triage**, not automated decisions
- Dashboard rates are **descriptive portfolio statistics**, independent of the CatBoost model and not causal
- Small-segment rates (tiny regions, 10+ year vehicle-age bin with n=6) are high-variance — caveats are shown in-app and in `powerbi/README.md`

---

## 🗺️ Roadmap

- [ ] `backend/requirements.txt` + `frontend/.env` for `VITE_API_URL`
- [ ] SHAP/explainability per prediction
- [ ] Auth + persistent prediction store (currently localStorage)
- [ ] Docker Compose (api + web) + CI (lint/build/smoke-test `/health`)

---

## 🤝 Contributing

PRs welcome — please keep prediction logic, feature engineering, and production artifacts untouched unless you also update `model_config.json`, the notebook, and the Model page copy.

## 📄 License

No license file yet — all rights reserved by default. Add an `LICENSE` (e.g. MIT) if you want open-source reuse.
