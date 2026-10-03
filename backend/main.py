from pathlib import Path
import re

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ============================================================
# App
# ============================================================

app = FastAPI(
    title="PolicyGuard API",
    description="Insurance claim prediction API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Paths
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "ml" / "models"

MODEL_PATH = MODEL_DIR / "catboost_model.pkl"
CONFIG_PATH = MODEL_DIR / "model_config.pkl"
THRESHOLD_PATH = MODEL_DIR / "threshold.pkl"
RESULTS_PATH = MODEL_DIR / "final_results.pkl"

# ============================================================
# Load ML artifacts
# ============================================================

required_files = [
    MODEL_PATH,
    CONFIG_PATH,
    THRESHOLD_PATH,
    RESULTS_PATH,
]

for file_path in required_files:
    if not file_path.exists():
        raise RuntimeError(
            f"Missing ML artifact: {file_path}"
        )

model = joblib.load(MODEL_PATH)
model_config = joblib.load(CONFIG_PATH)
threshold = float(joblib.load(THRESHOLD_PATH))
final_results = joblib.load(RESULTS_PATH)

FINAL_FEATURE_COLUMNS = model_config["final_feature_columns"]
CATEGORICAL_COLUMNS = model_config["categorical_columns"]

# ============================================================
# Request schema
# ============================================================
#
# These are the features available before the 8 engineered
# features are calculated.
#
# No policy_id is required.
# No max_torque/max_power strings are required because the
# frontend sends the already extracted numeric values.
# ============================================================


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


# ============================================================
# Feature engineering
# ============================================================


def build_features(input_df: pd.DataFrame) -> pd.DataFrame:
    data = input_df.copy()

    # --------------------------------------------------------
    # Engineered numerical features
    # --------------------------------------------------------

    data["power_to_weight"] = (
        data["power_bhp"]
        / data["gross_weight"].replace(0, np.nan)
    )

    data["torque_to_weight"] = (
        data["torque_nm"]
        / data["gross_weight"].replace(0, np.nan)
    )

    data["power_per_displacement"] = (
        data["power_bhp"]
        / data["displacement"].replace(0, np.nan)
    )

    data["torque_per_displacement"] = (
        data["torque_nm"]
        / data["displacement"].replace(0, np.nan)
    )

    data["customer_vehicle_age_gap"] = (
        data["customer_age"] - data["vehicle_age"]
    )

    data["region_density_log"] = np.log1p(
        data["region_density"]
    )

    data["power_rpm_per_bhp"] = (
        data["power_rpm"]
        / data["power_bhp"].replace(0, np.nan)
    )

    data["torque_rpm_per_nm"] = (
        data["torque_rpm"]
        / data["torque_nm"].replace(0, np.nan)
    )

    if data.isnull().any().any():
        missing_columns = data.columns[data.isnull().any()].tolist()

        raise ValueError(
            f"Feature engineering produced missing values "
            f"in: {missing_columns}"
        )

    # --------------------------------------------------------
    # Ensure categorical columns are strings
    # --------------------------------------------------------

    for column in CATEGORICAL_COLUMNS:
        data[column] = data[column].astype(str)

    # --------------------------------------------------------
    # Ensure exact feature order used during training
    # --------------------------------------------------------

    missing_features = [
        column
        for column in FINAL_FEATURE_COLUMNS
        if column not in data.columns
    ]

    if missing_features:
        raise ValueError(
            f"Missing features required by model: {missing_features}"
        )

    data = data[FINAL_FEATURE_COLUMNS]

    return data


# ============================================================
# Routes
# ============================================================


@app.get("/")
def root():
    return {
        "status": "online",
        "service": "PolicyGuard API",
        "model": final_results["model"],
        "threshold": threshold,
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": True,
        "threshold": threshold,
    }


# ============================================================
# Initial model comparison (read-only, threshold 0.50)
# ============================================================
#
# Historical screening results used to select CatBoost.
# These are NOT the final production metrics and are never
# used by the prediction pipeline.
# ============================================================

MODEL_COMPARISON = [
    {
        "model": "Decision Tree",
        "precision": 0.0718,
        "recall": 0.0813,
        "f1_score": 0.0763,
        "pr_auc": 0.0646,
        "roc_auc": 0.5047,
    },
    {
        "model": "Random Forest",
        "precision": 0.1034,
        "recall": 0.0773,
        "f1_score": 0.0885,
        "pr_auc": 0.0852,
        "roc_auc": 0.5854,
    },
    {
        "model": "CatBoost",
        "precision": 0.1010,
        "recall": 0.6773,
        "f1_score": 0.1757,
        "pr_auc": 0.1070,
        "roc_auc": 0.6680,
    },
    {
        "model": "LightGBM",
        "precision": 0.0999,
        "recall": 0.5773,
        "f1_score": 0.1703,
        "pr_auc": 0.1009,
        "roc_auc": 0.6450,
    },
]

MODEL_COMPARISON_THRESHOLD = 0.50
SELECTED_MODEL = "CatBoost"


@app.get("/model-info")
def model_info():
    return {
        "model": final_results["model"],
        "threshold": threshold,
        "precision": final_results["precision"],
        "recall": final_results["recall"],
        "f1_score": final_results["f1_score"],
        "pr_auc": final_results["pr_auc"],
        "roc_auc": final_results["roc_auc"],
        "validation_pr_auc": final_results.get(
            "validation_pr_auc"
        ),
        "validation_f1": final_results.get(
            "validation_f1"
        ),
        "iterations": final_results.get(
            "iterations"
        ),
        "model_comparison": MODEL_COMPARISON,
        "model_comparison_threshold": MODEL_COMPARISON_THRESHOLD,
        "selected_model": SELECTED_MODEL,
    }


# ============================================================
# Dataset sample (real rows for the frontend picker)
# ============================================================

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


# ============================================================
# Analytics (read-only, CSV aggregates only)
# ============================================================
#
# Single aggregated endpoint so the frontend never downloads
# the full 58k-row CSV. Computed directly from
# ml/data/insurance_claims.csv — never touches the CatBoost
# model, threshold, or prediction logic.
# ============================================================

_analytics_cache = None


def _rate_frame(df: pd.DataFrame, group_col: str) -> list:
    """total / claims / claim_rate per distinct value, safest sort."""
    series = df[group_col]
    tmp = pd.DataFrame({"key": series.astype(str), "claim": df["claim_status"]})
    grouped = tmp.groupby("key", dropna=False)["claim"].agg(["count", "sum", "mean"])
    out = []
    for key, row in grouped.iterrows():
        label = "Unknown" if key in ("nan", "None", "") else str(key)
        out.append(
            {
                "key": label,
                "total": int(row["count"]),
                "claims": int(row["sum"]),
                "claim_rate": round(float(row["mean"]), 4),
            }
        )
    out.sort(key=lambda r: r["claim_rate"], reverse=True)
    return out


def _binned_rates(values: pd.Series, claims: pd.Series, bins: list, labels: list) -> list:
    """Claim rate per numeric bin. Empty bins are kept with total 0."""
    cats = pd.cut(values, bins=bins, labels=labels, include_lowest=True)
    out = []
    for label in labels:
        mask = cats == label
        total = int(mask.sum())
        if total == 0:
            out.append({"key": label, "total": 0, "claims": 0, "claim_rate": 0.0})
            continue
        c = claims[mask]
        rate = float(c.mean()) if len(c) else 0.0
        out.append(
            {
                "key": label,
                "total": total,
                "claims": int(c.sum()),
                "claim_rate": round(rate, 4),
            }
        )
    return out


def _highest(rates: list) -> dict | None:
    """Highest observed claim rate among bins with data."""
    valid = [r for r in rates if r.get("total", 0) > 0]
    if not valid:
        return None
    return max(valid, key=lambda r: r["claim_rate"])


@app.get("/analytics")
def analytics():
    """Aggregated dataset statistics for the Analytics dashboard."""
    global _analytics_cache
    if _analytics_cache is not None:
        return _analytics_cache

    df = get_dataset()
    if "claim_status" not in df.columns:
        raise HTTPException(status_code=500, detail="Dataset missing claim_status column.")

    claims = pd.to_numeric(df["claim_status"], errors="coerce").fillna(0).astype(int)
    total = int(len(df))
    total_claims = int(claims.sum())
    total_no_claims = total - total_claims
    claim_rate = round(float(claims.mean()) if total else 0.0, 4)

    vehicle_age = pd.to_numeric(df.get("vehicle_age"), errors="coerce")
    customer_age = pd.to_numeric(df.get("customer_age"), errors="coerce")
    subscription = pd.to_numeric(df.get("subscription_length"), errors="coerce")
    displacement = pd.to_numeric(df.get("displacement"), errors="coerce")
    gross_weight = pd.to_numeric(df.get("gross_weight"), errors="coerce")
    region_density = pd.to_numeric(df.get("region_density"), errors="coerce")

    # Customer-age bins adapted to the actual data (min age is 35,
    # so an 18-30 bin would always be empty).
    vehicle_age_rates = _binned_rates(
        vehicle_age, claims,
        bins=[-0.001, 2, 5, 10, float("inf")],
        labels=["0–2", "2–5", "5–10", "10+"],
    )
    customer_age_rates = _binned_rates(
        customer_age, claims,
        bins=[-0.001, 40, 45, 50, 60, float("inf")],
        labels=["35–40", "41–45", "46–50", "51–60", "60+"],
    )
    subscription_rates = _binned_rates(
        subscription, claims,
        bins=[-0.001, 2, 5, 10, float("inf")],
        labels=["0–2 yrs", "2–5 yrs", "5–10 yrs", "10+ yrs"],
    )
    displacement_rates = _binned_rates(
        displacement, claims,
        bins=[-0.001, 900, 1200, float("inf")],
        labels=["≤900 cc", "901–1200 cc", ">1200 cc"],
    )
    gross_weight_rates = _binned_rates(
        gross_weight, claims,
        bins=[-0.001, 1200, 1400, 1600, float("inf")],
        labels=["<1200 kg", "1200–1399 kg", "1400–1599 kg", "1600+ kg"],
    )

    segment_rates = _rate_frame(df, "segment")
    fuel_rates = _rate_frame(df, "fuel_type")
    ncap_rates = _rate_frame(df, "ncap_rating")
    region_rates = _rate_frame(df, "region_code")

    # Average region density per region (observed, not causal).
    region_density_avg = []
    if region_density.notna().any():
        tmp = pd.DataFrame(
            {"key": df["region_code"].astype(str), "density": region_density}
        )
        avg = tmp.groupby("key")["density"].mean()
        region_density_avg = [
            {"key": str(k), "avg_density": round(float(v), 1)}
            for k, v in avg.items()
        ]

    insights = {
        "overall_claim_rate": claim_rate,
        "highest_segment": _highest(segment_rates),
        "highest_fuel": _highest(fuel_rates),
        "highest_region": _highest(region_rates),
        "highest_vehicle_age_group": _highest(vehicle_age_rates),
        "highest_customer_age_group": _highest(customer_age_rates),
        "highest_subscription_group": _highest(subscription_rates),
        "highest_ncap": _highest(ncap_rates),
    }

    _analytics_cache = {
        "summary": {
            "total_policies": total,
            "total_claims": total_claims,
            "total_no_claims": total_no_claims,
            "claim_rate": claim_rate,
        },
        "claim_distribution": [
            {"key": "No claim", "count": total_no_claims},
            {"key": "Claim", "count": total_claims},
        ],
        "segment_claim_rate": segment_rates,
        "fuel_claim_rate": fuel_rates,
        "region_claim_rate": region_rates,
        "region_density_avg": region_density_avg,
        "vehicle_age_claim_rate": vehicle_age_rates,
        "customer_age_claim_rate": customer_age_rates,
        "subscription_length_claim_rate": subscription_rates,
        "ncap_claim_rate": ncap_rates,
        "displacement_claim_rate": displacement_rates,
        "gross_weight_claim_rate": gross_weight_rates,
        "model_comparison": MODEL_COMPARISON,
        "model_comparison_threshold": MODEL_COMPARISON_THRESHOLD,
        "selected_model": SELECTED_MODEL,
        "final_model": {
            "model": final_results["model"],
            "threshold": round(float(threshold), 4),
            "precision": final_results["precision"],
            "recall": final_results["recall"],
            "f1_score": final_results["f1_score"],
            "pr_auc": final_results["pr_auc"],
            "roc_auc": final_results["roc_auc"],
        },
        "insights": insights,
    }
    return _analytics_cache


@app.post("/predict")
def predict(data: ClaimRequest):
    # --------------------------------------------------------
    # Convert request to DataFrame
    # --------------------------------------------------------

    input_df = pd.DataFrame(
        [data.model_dump()]
    )

    # --------------------------------------------------------
    # Build exact model features
    # --------------------------------------------------------

    processed_df = build_features(input_df)

    # --------------------------------------------------------
    # Generate probability
    # --------------------------------------------------------

    probability = float(
        model.predict_proba(processed_df)[0][1]
    )

    # --------------------------------------------------------
    # Apply saved threshold
    # --------------------------------------------------------

    prediction = int(
        probability >= threshold
    )

    return {
        "claim_probability": round(probability, 4),
        "claim_prediction": prediction,
        "threshold": round(threshold, 4),
        "model": final_results["model"],
    }