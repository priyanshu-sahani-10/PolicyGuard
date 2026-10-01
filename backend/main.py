from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
import pandas as pd
import re
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


DATASET_PATH = BASE_DIR / "ml" / "data" / "insurance_claims.csv"
TORQUE_RE = re.compile(r"([\d.]+)Nm@(\d+)rpm")
POWER_RE = re.compile(r"([\d.]+)bhp@(\d+)rpm")

_dataset_df = None


def get_dataset():
    """Load the training CSV once and cache it for row sampling."""
    global _dataset_df
    if _dataset_df is None:
        try:
            _dataset_df = pd.read_csv(DATASET_PATH)
        except FileNotFoundError as exc:
            raise HTTPException(
                status_code=500, detail=f"Dataset file not found: {exc.filename}"
            )
    return _dataset_df


def dataset_row_to_inputs(row: pd.Series) -> dict:
    """Map one raw CSV row to the 41 POST /predict input fields."""
    torque = TORQUE_RE.match(str(row["max_torque"]))
    power = POWER_RE.match(str(row["max_power"]))
    if not torque or not power:
        raise ValueError("Unparseable max_torque/max_power value.")
    return {
        "subscription_length": float(row["subscription_length"]),
        "vehicle_age": float(row["vehicle_age"]),
        "customer_age": int(row["customer_age"]),
        "region_code": str(row["region_code"]),
        "region_density": int(row["region_density"]),
        "segment": str(row["segment"]),
        "model": str(row["model"]),
        "fuel_type": str(row["fuel_type"]),
        "engine_type": str(row["engine_type"]),
        "airbags": int(row["airbags"]),
        "is_esc": str(row["is_esc"]),
        "is_adjustable_steering": str(row["is_adjustable_steering"]),
        "is_tpms": str(row["is_tpms"]),
        "is_parking_sensors": str(row["is_parking_sensors"]),
        "is_parking_camera": str(row["is_parking_camera"]),
        "rear_brakes_type": str(row["rear_brakes_type"]),
        "displacement": int(row["displacement"]),
        "cylinder": int(row["cylinder"]),
        "transmission_type": str(row["transmission_type"]),
        "steering_type": str(row["steering_type"]),
        "turning_radius": float(row["turning_radius"]),
        "length": int(row["length"]),
        "width": int(row["width"]),
        "gross_weight": int(row["gross_weight"]),
        "is_front_fog_lights": str(row["is_front_fog_lights"]),
        "is_rear_window_wiper": str(row["is_rear_window_wiper"]),
        "is_rear_window_washer": str(row["is_rear_window_washer"]),
        "is_rear_window_defogger": str(row["is_rear_window_defogger"]),
        "is_brake_assist": str(row["is_brake_assist"]),
        "is_power_door_locks": str(row["is_power_door_locks"]),
        "is_central_locking": str(row["is_central_locking"]),
        "is_power_steering": str(row["is_power_steering"]),
        "is_driver_seat_height_adjustable": str(
            row["is_driver_seat_height_adjustable"]
        ),
        "is_day_night_rear_view_mirror": str(
            row["is_day_night_rear_view_mirror"]
        ),
        "is_ecw": str(row["is_ecw"]),
        "is_speed_alert": str(row["is_speed_alert"]),
        "ncap_rating": int(row["ncap_rating"]),
        "torque_nm": float(torque.group(1)),
        "torque_rpm": int(torque.group(2)),
        "power_bhp": float(power.group(1)),
        "power_rpm": int(power.group(2)),
    }


@app.get("/dataset-sample")
def dataset_sample(count: int = 20, seed: int = 42):
    """Return real dataset rows as ready-to-predict 41-field payloads.

    The sample is balanced between claimed / non-claimed rows so users can
    try both outcomes. Each row includes its actual claim_status for
    prediction-vs-actual comparison.
    """
    if not 1 <= count <= 100:
        raise HTTPException(
            status_code=422, detail="count must be between 1 and 100."
        )
    df = get_dataset()
    rng = np.random.default_rng(seed)
    claimed = df.index[df["claim_status"] == 1].to_numpy()
    unclaimed = df.index[df["claim_status"] == 0].to_numpy()
    n_claimed = min(count // 2, len(claimed))
    n_unclaimed = min(count - n_claimed, len(unclaimed))
    picked = np.concatenate(
        [
            rng.choice(claimed, size=n_claimed, replace=False),
            rng.choice(unclaimed, size=n_unclaimed, replace=False),
        ]
    )
    rng.shuffle(picked)
    rows = []
    for idx in picked:
        row = df.loc[int(idx)]
        try:
            inputs = dataset_row_to_inputs(row)
        except (ValueError, KeyError):
            continue
        rows.append(
            {
                "policy_id": str(row["policy_id"]),
                "inputs": inputs,
                "actual_claim": int(row["claim_status"]),
            }
        )
    return {"total_rows": int(len(df)), "rows": rows}


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
        "threshold": threshold,
        "model": final_results.get("model"),
    }
