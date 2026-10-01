import { useRef, useState } from "react";
import FormSection from "./FormSection";
import SafetyToggle from "./SafetyToggle";
import PredictionResult from "./PredictionResult";
import LoadingButton from "./LoadingButton";
import { predictClaim } from "../services/api";
import {
  OPTIONS,
  RANGES,
  INITIAL_VALUES,
  SAFETY_FIELDS,
  validate,
  toPayload,
} from "../data/fields";

function Field({ id, label, desc, error, children }) {
  return (
    <div className={`field ${error ? "field-invalid" : ""}`}>
      <label htmlFor={id}>
        <span className="field-label">{label}</span>
        {desc && <span className="field-desc">{desc}</span>}
      </label>
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
  const resultRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleToggle = (key, next) => {
    setValues((prev) => ({ ...prev, [key]: next }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
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
    if (Object.values(validationErrors).some(Boolean)) {
      const firstBad = document.querySelector(".field-invalid");
      firstBad?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setLoading(true);
    try {
      const data = await predictClaim(toPayload(values));
      setResult(data);
      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
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

  const numberInput = (key, { metric = false } = {}) => {
    const cfg = RANGES[key];
    const input = (
      <input
        id={key}
        name={key}
        type="number"
        value={values[key]}
        min={cfg.min}
        max={cfg.max}
        step={cfg.step || "any"}
        placeholder={cfg.placeholder}
        onChange={handleChange}
        aria-invalid={Boolean(errors[key])}
      />
    );
    return (
      <Field key={key} id={key} label={cfg.label} desc={cfg.desc} error={errors[key]}>
        {cfg.unit ? (
          <span className={metric ? "metric-input" : "unit-input"}>
            {input}
            <span className="unit">{cfg.unit}</span>
          </span>
        ) : (
          input
        )}
      </Field>
    );
  };

  const selectInput = (key, label, desc, options) => (
    <Field key={key} id={key} label={label} desc={desc} error={errors[key]}>
      <select
        id={key}
        name={key}
        value={values[key]}
        onChange={handleChange}
        aria-invalid={Boolean(errors[key])}
      >
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
    <div className="dash">
      <form className="dash-form" onSubmit={handleSubmit} noValidate>
        <FormSection
          index="01"
          icon="customer"
          title="Customer Profile"
          subtitle="Who is being insured and where the vehicle operates."
        >
          <div className="grid-3">
            {numberInput("subscription_length")}
            {numberInput("vehicle_age")}
            {numberInput("customer_age")}
            {selectInput("region_code", "Region Code", "Insurance zone identifier", OPTIONS.region_code)}
            {numberInput("region_density")}
          </div>
        </FormSection>

        <FormSection
          index="02"
          icon="vehicle"
          title="Vehicle Details"
          subtitle="Model, powertrain and body specifications."
        >
          <div className="grid-3">
            {selectInput("segment", "Segment", "Vehicle class segment", OPTIONS.segment)}
            {selectInput("model", "Model", "Manufacturer model code", OPTIONS.model)}
            {selectInput("fuel_type", "Fuel Type", "Primary fuel used", OPTIONS.fuel_type)}
            {selectInput("engine_type", "Engine Type", "Engine family", OPTIONS.engine_type)}
            {numberInput("airbags")}
            {selectInput("rear_brakes_type", "Rear Brakes", "Rear brake technology", OPTIONS.rear_brakes_type)}
            {numberInput("displacement")}
            {numberInput("cylinder")}
            {selectInput("transmission_type", "Transmission", "Gearbox type", OPTIONS.transmission_type)}
            {selectInput("steering_type", "Steering", "Steering system", OPTIONS.steering_type)}
            {numberInput("turning_radius")}
            {numberInput("length")}
            {numberInput("width")}
            {numberInput("gross_weight")}
            {numberInput("ncap_rating")}
          </div>
        </FormSection>

        <FormSection
          index="03"
          icon="safety"
          title="Safety & Security"
          subtitle="Factory-fitted protection and assistance systems."
        >
          <div className="safety-grid">
            {SAFETY_FIELDS.map((f) => (
              <SafetyToggle
                key={f.key}
                id={f.key}
                label={f.label}
                desc={f.desc}
                value={values[f.key]}
                onChange={handleToggle}
                invalid={Boolean(errors[f.key])}
              />
            ))}
          </div>
        </FormSection>

        <FormSection
          index="04"
          icon="performance"
          title="Vehicle Performance"
          subtitle="Peak output figures as separate numbers — no coded strings needed."
        >
          <div className="metric-grid">
            {numberInput("torque_nm", { metric: true })}
            {numberInput("torque_rpm", { metric: true })}
            {numberInput("power_bhp", { metric: true })}
            {numberInput("power_rpm", { metric: true })}
          </div>
        </FormSection>

        {apiError && (
          <div className="alert alert-error" role="alert">
            {apiError}
          </div>
        )}

        <div className="actions">
          <LoadingButton loading={loading}>Predict Claim</LoadingButton>
          <button
            type="button"
            className="reset-btn"
            onClick={handleReset}
            disabled={loading}
          >
            Reset Form
          </button>
        </div>
      </form>

      <aside className="dash-side" ref={resultRef} aria-label="Prediction result">
        <div className="result-panel fade-up" style={{ "--d": "180ms" }}>
          <PredictionResult result={result} loading={loading} />
        </div>
      </aside>
    </div>
  );
}
