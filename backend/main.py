from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
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

MODEL_PATH = BASE_DIR / "ml" / "models" / "catboost_model.pkl"
PREPROCESSOR_PATH = BASE_DIR / "ml" / "models" / "preprocessor.pkl"
THRESHOLD_PATH = BASE_DIR / "ml" / "models" / "threshold.pkl"

model = joblib.load(MODEL_PATH)
preprocessor = joblib.load(PREPROCESSOR_PATH)
threshold = joblib.load(THRESHOLD_PATH)


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


@app.get("/")
def root():
    return {
        "message": "PolicyGuard API is running",
        "model": "CatBoost"
    }


@app.post("/predict")
def predict(data: ClaimRequest):
    input_df = pd.DataFrame([data.model_dump()])

    processed_data = preprocessor.transform(input_df)

    probability = float(model.predict_proba(processed_data)[0][1])
    prediction = int(probability >= threshold)

    return {
        "claim_probability": round(probability, 4),
        "claim_prediction": prediction
    }