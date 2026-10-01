from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
import pandas as pd
from pathlib import Path

app = FastAPI(title="PolicyGuard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "ml" / "models"

PREPROCESSOR_PATH = MODELS_DIR / "preprocessor.pkl"
THRESHOLD_PATH = MODELS_DIR / "threshold.pkl"
WEIGHTS_PATH = MODELS_DIR / "ensemble_weights.pkl"
RESULTS_PATH = MODELS_DIR / "final_results.pkl"

# Order must match the training notebook:
# model_names = ["Decision Tree", "Random Forest", "CatBoost", "LightGBM"]
BASE_MODEL_FILES = [
    ("Decision Tree", "decision_tree_model.pkl"),
    ("Random Forest", "random_forest_model.pkl"),
    ("CatBoost", "catboost_model.pkl"),
    ("LightGBM", "lightgbm_model.pkl"),
]

try:
    preprocessor = joblib.load(PREPROCESSOR_PATH)
    threshold = float(joblib.load(THRESHOLD_PATH))
    ensemble_weights = np.asarray(joblib.load(WEIGHTS_PATH), dtype=float)
    base_models = [joblib.load(MODELS_DIR / f) for _, f in BASE_MODEL_FILES]
    final_results = joblib.load(RESULTS_PATH)
except FileNotFoundError as exc:
    raise RuntimeError(f"Missing ML artifact: {exc.filename}") from exc

if len(ensemble_weights) != len(base_models):
    raise RuntimeError(
        f"ensemble_weights has length {len(ensemble_weights)} "
        f"but {len(base_models)} base models were loaded."
    )


class ClaimRequest(BaseModel):
    subscription_length: float
    vehicle_age: float
    customer_age: int
    region_code: str
    region_density: int
    segment: str
    model: str
    fuel_type: str
    engine_type: str
    airbags: int
    is_esc: str
    is_adjustable_steering: str
    is_tpms: str
    is_parking_sensors: str
    is_parking_camera: str
    rear_brakes_type: str
    displacement: int
    cylinder: int
    transmission_type: str
    steering_type: str
    turning_radius: float
    length: int
    width: int
    gross_weight: int
    is_front_fog_lights: str
    is_rear_window_wiper: str
    is_rear_window_washer: str
    is_rear_window_defogger: str
    is_brake_assist: str
    is_power_door_locks: str
    is_central_locking: str
    is_power_steering: str
    is_driver_seat_height_adjustable: str
    is_day_night_rear_view_mirror: str
    is_ecw: str
    is_speed_alert: str
    ncap_rating: int
    torque_nm: float
    torque_rpm: float
    power_bhp: float
    power_rpm: float


def model_info_payload() -> dict:
    return {
        "model": final_results.get("model"),
        "weights": {
            name: float(w)
            for (name, _), w in zip(BASE_MODEL_FILES, ensemble_weights.tolist())
        },
        "threshold": threshold,
        "precision": final_results.get("precision"),
        "recall": final_results.get("recall"),
        "f1_score": final_results.get("f1_score"),
        "pr_auc": final_results.get("pr_auc"),
        "roc_auc": final_results.get("roc_auc"),
    }


@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "PolicyGuard API is running",
        **model_info_payload(),
    }


@app.get("/model-info")
def model_info():
    return model_info_payload()


@app.post("/predict")
def predict(data: ClaimRequest):
    try:
        input_df = pd.DataFrame([data.model_dump()])
        processed_data = preprocessor.transform(input_df)
        base_probabilities = np.column_stack(
            [m.predict_proba(processed_data)[:, 1] for m in base_models]
        )
        # Finalized weighted soft-voting ensemble, exactly as trained.
        probability = float((base_probabilities @ ensemble_weights)[0])
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}")

    if not 0.0 <= probability <= 1.0:
        raise HTTPException(
            status_code=500, detail="Model returned an out-of-range probability."
        )
    prediction = int(probability >= threshold)

    return {
        "claim_probability": round(probability, 4),
        "claim_prediction": prediction,
    }
