import { MODEL_INFO, MODEL_METRICS_DISPLAY } from "../data/modelMetrics";

export default function ModelMetrics() {
  return (
    <div className="card">
      <p className="card-title">Model Information</p>
      <dl className="kv">
        <div className="kv-row">
          <dt>Model</dt>
          <dd>{MODEL_INFO.model}</dd>
        </div>
        <div className="kv-row">
          <dt>Decision Threshold</dt>
          <dd>{Math.round(MODEL_INFO.threshold * 100)}%</dd>
        </div>
      </dl>
      <p className="card-subtitle">Test-set metrics</p>
      <p className="muted small">These metrics were measured on the held-out test set.</p>
      <div className="metrics">
        {MODEL_METRICS_DISPLAY.map((m) => (
          <div className="metric" key={m.key}>
            <div className="metric-top">
              <span>{m.label}</span>
              <span className="num">{m.display}</span>
            </div>
            <div className="metric-bar" aria-hidden="true">
              <div
                className="metric-fill"
                style={{ width: `${Math.min(Math.max(m.value, 0), 1) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="muted small">
        These values describe test-set performance and do not represent production performance.
      </p>
    </div>
  );
}
