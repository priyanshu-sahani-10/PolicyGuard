import { useState } from "react";
import { predictClaim } from "../services/api";
import {
  OPTIONS,
  RANGES,
  INITIAL_VALUES,
  SAFETY_FIELDS,
  validate,
  toPayload,
} from "../data/fields";

function FieldError({ message }) {
  if (!message) return null;
  return <span className="field-error">{message}</span>;
}

function Accordion({ id, title, count, open, onToggle, children }) {
  return (
    <section className="card accordion">
      <button
        type="button"
        className="accordion-head"
        onClick={() => onToggle(id)}
        aria-expanded={open}
        aria-controls={`${id}-body`}
      >
        <span className="accordion-title">{title}</span>
        <span className="accordion-meta">
          {count} fields
          <span className={`chev ${open ? "open" : ""}`} aria-hidden="true">
            ▾
          </span>
        </span>
      </button>
      {open && (
        <div className="accordion-body" id={`${id}-body`}>
          {children}
        </div>
      )}
    </section>
  );
}

/**
 * Compact 41-field prediction form with collapsible sections.
 * Keeps the exact POST /predict payload via toPayload().
 */
export default function PredictionForm({ onPrediction }) {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [open, setOpen] = useState({
    customer: true,
    vehicle: false,
    safety: false,
    performance: false,
  });

  const toggle = (key) => setOpen((p) => ({ ...p, [key]: !p[key] }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSafety = (key, next) => {
    setValues((prev) => ({ ...prev, [key]: next }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleReset = () => {
    setValues(INITIAL_VALUES);
    setErrors({});
    setApiError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.values(validationErrors).some(Boolean)) {
      // open every section so the user can see all errors
      setOpen({ customer: true, vehicle: true, safety: true, performance: true });
      return;
    }
    setLoading(true);
    try {
      const data = await predictClaim(toPayload(values));
      onPrediction(data);
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

  const numberInput = (key) => {
    const cfg = RANGES[key];
    return (
      <div className={`field ${errors[key] ? "field-invalid" : ""}`} key={key}>
        <label htmlFor={key}>
          <span className="field-label">{cfg.label}</span>
        </label>
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
        <FieldError message={errors[key]} />
      </div>
    );
  };

  const selectInput = (key, label, options) => (
    <div className={`field ${errors[key] ? "field-invalid" : ""}`} key={key}>
      <label htmlFor={key}>
        <span className="field-label">{label}</span>
      </label>
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
      <FieldError message={errors[key]} />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="predform">
      <Accordion
        id="customer"
        title="Customer Information"
        count={5}
        open={open.customer}
        onToggle={toggle}
      >
        <div className="grid">
          {numberInput("subscription_length")}
          {numberInput("vehicle_age")}
          {numberInput("customer_age")}
          {selectInput("region_code", "Region Code", OPTIONS.region_code)}
          {numberInput("region_density")}
        </div>
      </Accordion>

      <Accordion
        id="vehicle"
        title="Vehicle Information"
        count={15}
        open={open.vehicle}
        onToggle={toggle}
      >
        <div className="grid">
          {selectInput("segment", "Segment", OPTIONS.segment)}
          {selectInput("model", "Model", OPTIONS.model)}
          {selectInput("fuel_type", "Fuel Type", OPTIONS.fuel_type)}
          {selectInput("engine_type", "Engine Type", OPTIONS.engine_type)}
          {numberInput("airbags")}
          {selectInput("rear_brakes_type", "Rear Brakes", OPTIONS.rear_brakes_type)}
          {numberInput("displacement")}
          {numberInput("cylinder")}
          {selectInput("transmission_type", "Transmission", OPTIONS.transmission_type)}
          {selectInput("steering_type", "Steering", OPTIONS.steering_type)}
          {numberInput("turning_radius")}
          {numberInput("length")}
          {numberInput("width")}
          {numberInput("gross_weight")}
          {numberInput("ncap_rating")}
        </div>
      </Accordion>

      <Accordion
        id="safety"
        title="Safety & Security"
        count={17}
        open={open.safety}
        onToggle={toggle}
      >
        <div className="grid grid-safety">
          {SAFETY_FIELDS.map((f) => (
            <div key={f.key} className="safety-row">
              <span className="safety-name" title={f.desc}>
                {f.label}
              </span>
              <div className="seg" role="radiogroup" aria-label={f.label}>
                {["Yes", "No"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={values[f.key] === opt}
                    className={`seg-opt ${values[f.key] === opt ? "active" : ""}`}
                    onClick={() => handleSafety(f.key, opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Accordion>

      <Accordion
        id="performance"
        title="Vehicle Performance"
        count={4}
        open={open.performance}
        onToggle={toggle}
      >
        <div className="grid">
          {numberInput("torque_nm")}
          {numberInput("torque_rpm")}
          {numberInput("power_bhp")}
          {numberInput("power_rpm")}
        </div>
      </Accordion>

      {apiError && (
        <div className="alert alert-error" role="alert">
          {apiError}
        </div>
      )}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Analyzing…" : "Predict Claim"}
        </button>
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
  );
}
