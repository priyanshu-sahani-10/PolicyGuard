/**
 * Segmented Yes/No control for the safety equipment fields.
 * Stores plain "Yes" / "No" strings, exactly what the API expects.
 */
export default function SafetyToggle({ id, label, desc, value, onChange, invalid }) {
  const set = (next) => onChange(id, next);

  return (
    <div className={`safety-card ${value === "Yes" ? "is-on" : "is-off"} ${invalid ? "has-error" : ""}`}>
      <div className="safety-text">
        <span className="safety-label">{label}</span>
        <span className="safety-desc">{desc}</span>
      </div>
      <div className="toggle" role="radiogroup" aria-label={label}>
        {["Yes", "No"].map((opt) => (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={value === opt}
            className={`toggle-opt ${value === opt ? "active" : ""}`}
            onClick={() => set(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
