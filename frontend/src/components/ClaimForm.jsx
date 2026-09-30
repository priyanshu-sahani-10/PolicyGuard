import { useState } from "react";
import FormSection from "./FormSection";
import PredictionResult from "./PredictionResult";
import LoadingButton from "./LoadingButton";
import { predictClaim } from "../services/api";

const YES_NO = ["Yes", "No"];

const OPTIONS = {
  region_code: ["C1","C10","C11","C12","C13","C14","C15","C16","C17","C18","C19","C2","C20","C21","C22","C3","C4","C5","C6","C7","C8","C9"],
  segment: ["A", "B1", "B2", "C1", "C2", "Utility"],
  model: ["M1","M2","M3","M4","M5","M6","M7","M8","M9","M10","M11"],
  fuel_type: ["CNG", "Diesel", "Petrol"],
  engine_type: ["1.0 SCe","1.2 L K Series Engine","1.2 L K12N Dualjet","1.5 L U2 CRDi","1.5 Turbocharged Revotorq","1.5 Turbocharged Revotron","F8D Petrol Engine","G12B","K Series Dual jet","K10C","i-DTEC"],
  rear_brakes_type: ["Disc", "Drum"],
  transmission_type: ["Automatic", "Manual"],
  steering_type: ["Electric", "Manual", "Power"],
};

// Sensible ranges taken from the training dataset.
const RANGES = {
  subscription_length: { min: 0, max: 14, label: "Subscription length (years)" },
  vehicle_age: { min: 0, max: 20, label: "Vehicle age (years)" },
  customer_age: { min: 35, max: 75, label: "Customer age" },
  region_density: { min: 290, max: 73430, label: "Region density" },
  airbags: { min: 1, max: 6, label: "Airbags" },
  displacement: { min: 796, max: 1498, label: "Displacement (cc)" },
  cylinder: { min: 3, max: 4, label: "Cylinders" },
  turning_radius: { min: 4.5, max: 5.2, label: "Turning radius (m)", step: "0.01" },
  length: { min: 3445, max: 4300, label: "Length (mm)" },
  width: { min: 1475, max: 1811, label: "Width (mm)" },
  gross_weight: { min: 1051, max: 1720, label: "Gross weight (kg)" },
  ncap_rating: { min: 0, max: 5, label: "NCAP rating (0-5)" },
  torque_nm: { min: 50, max: 260, label: "Torque (Nm)" },
  torque_rpm: { min: 1500, max: 4500, label: "Torque RPM" },
  power_bhp: { min: 30, max: 130, label: "Power (bhp)", step: "0.01" },
  power_rpm: { min: 3000, max: 6500, label: "Power RPM" },
};

const INITIAL_VALUES = {
  subscription_length: 9.3,
  vehicle_age: 1.2,
  customer_age: 41,
  region_code: "C8",
  region_density: 8794,
  segment: "C2",
  model: "M4",
  fuel_type: "Diesel",
  engine_type: "1.5 L U2 CRDi",
  airbags: 6,
  is_esc: "Yes",
  is_adjustable_steering: "Yes",
  is_tpms: "Yes",
  is_parking_sensors: "Yes",
  is_parking_camera: "Yes",
  rear_brakes_type: "Disc",
  displacement: 1493,
  cylinder: 4,
  transmission_type: "Automatic",
  steering_type: "Power",
  turning_radius: 5.2,
  length: 4300,
  width: 1790,
  gross_weight: 1720,
  is_front_fog_lights: "Yes",
  is_rear_window_wiper: "Yes",
  is_rear_window_washer: "Yes",
  is_rear_window_defogger: "Yes",
  is_brake_assist: "Yes",
  is_power_door_locks: "Yes",
  is_central_locking: "Yes",
  is_power_steering: "Yes",
  is_driver_seat_height_adjustable: "Yes",
  is_day_night_rear_view_mirror: "No",
  is_ecw: "Yes",
  is_speed_alert: "Yes",
  ncap_rating: 3,
  torque_nm: 250,
  torque_rpm: 2750,
  power_bhp: 113.45,
  power_rpm: 4000,
};

const BINARY_FIELDS = [
  "is_esc",
  "is_adjustable_steering",
  "is_tpms",
  "is_parking_sensors",
  "is_parking_camera",
  "is_front_fog_lights",
  "is_rear_window_wiper",
  "is_rear_window_washer",
  "is_rear_window_defogger",
  "is_brake_assist",
  "is_power_door_locks",
  "is_central_locking",
  "is_power_steering",
  "is_driver_seat_height_adjustable",
  "is_day_night_rear_view_mirror",
  "is_ecw",
  "is_speed_alert",
];

function prettyLabel(key) {
  return key
    .replace(/^is_/, "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function validate(values) {
  const errors = {};

  // Required categoricals
  ["region_code", "segment", "model", "fuel_type", "engine_type",
   "rear_brakes_type", "transmission_type", "steering_type",
   ...BINARY_FIELDS,
  ].forEach((key) => {
    if (!values[key] && values[key] !== 0) errors[key] = "This field is required.";
  });

  // Numeric ranges
  Object.entries(RANGES).forEach(([key, { min, max }]) => {
    const raw = values[key];
    if (raw === "" || raw === null || raw === undefined) {
      errors[key] = "This field is required.";
      return;
    }
    const num = Number(raw);
    if (Number.isNaN(num)) {
      errors[key] = "Enter a valid number.";
    } else if (num < min || num > max) {
      errors[key] = `Must be between ${min} and ${max}.`;
    }
  });

  return errors;
}

function Field({ label, error, children, htmlFor }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

export default function ClaimForm() {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [apiError, setApiError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    // Clear field error as user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleReset = () => {
    setValues(INITIAL_VALUES);
    setErrors({});
    setResult(null);
    setApiError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    setResult(null);

    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.values(validationErrors).some(Boolean)) return;

    // Convert numeric strings to numbers for the API
    const payload = { ...values };
    Object.keys(RANGES).forEach((key) => {
      payload[key] = Number(values[key]);
    });

    setLoading(true);
    try {
      const data = await predictClaim(payload);
      setResult(data);
    } catch (err) {
      const serverMsg = err?.response?.data?.detail;
      const friendly = Array.isArray(serverMsg)
        ? serverMsg.map((d) => d.msg).join(" ")
        : typeof serverMsg === "string"
          ? serverMsg
          : null;
      setApiError(
        friendly ||
          "Could not reach the prediction service. Make sure the FastAPI backend is running on http://127.0.0.1:8000 and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const numberInput = (key) => (
    <Field key={key} label={RANGES[key].label} error={errors[key]} htmlFor={key}>
      <input
        id={key}
        name={key}
        type="number"
        value={values[key]}
        min={RANGES[key].min}
        max={RANGES[key].max}
        step={RANGES[key].step || "any"}
        onChange={handleChange}
      />
    </Field>
  );

  const selectInput = (key, options) => (
    <Field key={key} label={prettyLabel(key)} error={errors[key]} htmlFor={key}>
      <select id={key} name={key} value={values[key]} onChange={handleChange}>
        <option value="">Select…</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </Field>
  );

  return (
    <div className="form-wrap">
      <form onSubmit={handleSubmit} noValidate>
        <FormSection
          title="Customer Information"
          description="Policy holder and region details."
        >
          {numberInput("subscription_length")}
          {numberInput("vehicle_age")}
          {numberInput("customer_age")}
          {selectInput("region_code", OPTIONS.region_code)}
          {numberInput("region_density")}
          {selectInput("segment", OPTIONS.segment)}
        </FormSection>

        <FormSection
          title="Vehicle Information"
          description="Model, engine and body specifications."
        >
          {selectInput("model", OPTIONS.model)}
          {selectInput("fuel_type", OPTIONS.fuel_type)}
          {selectInput("engine_type", OPTIONS.engine_type)}
          {numberInput("airbags")}
          {selectInput("rear_brakes_type", OPTIONS.rear_brakes_type)}
          {numberInput("displacement")}
          {numberInput("cylinder")}
          {selectInput("transmission_type", OPTIONS.transmission_type)}
          {selectInput("steering_type", OPTIONS.steering_type)}
          {numberInput("turning_radius")}
          {numberInput("length")}
          {numberInput("width")}
          {numberInput("gross_weight")}
          {numberInput("ncap_rating")}
        </FormSection>

        <FormSection
          title="Safety Features"
          description="Driver-assistance and safety equipment."
        >
          {BINARY_FIELDS.map((key) => selectInput(key, YES_NO))}
        </FormSection>

        <FormSection
          title="Vehicle Performance"
          description="Enter torque and power as separate numbers (no need for strings like 250Nm@2750rpm)."
        >
          {numberInput("torque_nm")}
          {numberInput("torque_rpm")}
          {numberInput("power_bhp")}
          {numberInput("power_rpm")}
        </FormSection>

        {apiError && (
          <div className="alert alert-error" role="alert">
            {apiError}
          </div>
        )}

        <div className="form-actions">
          <LoadingButton loading={loading}>Predict Claim</LoadingButton>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleReset}
            disabled={loading}
          >
            Reset Form
          </button>
        </div>
      </form>

      <PredictionResult result={result} />
    </div>
  );
}
