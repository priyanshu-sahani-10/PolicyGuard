import { useEffect, useState } from "react";
import { getModelInfo } from "../services/api";

function formatPct(x) {
  return `${(Math.round(Number(x) * 10000) / 100).toFixed(2)}%`;
}

export default function ModelMetrics() {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    getModelInfo()
      .then((data) => {
        if (live) setInfo(data);
      })
      .catch(() => {
        if (live)
          setError(
            "Could not load model information. Make sure the FastAPI backend is running on http://127.0.0.1:8000."
          );
      });
    return () => {
      live = false;
    };
  }, []);

  if (error) {
    return (
      <div className="card">
        <p className="card-title">Model Information</p>
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="card">
        <p className="card-title">Model Information</p>
        <p className="muted">Loading model information from the API…</p>
      </div>
    );
  }

  const metrics = [
    { key: "precision", label: "Precision", value: info.precision },
    { key: "recall", label: "Recall", value: info.recall },
    { key: "f1_score", label: "F1 Score", value: info.f1_score },
    { key: "pr_auc", label: "PR-AUC", value: info.pr_auc },
    { key: "roc_auc", label: "ROC-AUC", value: info.roc_auc },
  ];

  return (
    <div className="card">
      <p className="card-title">Model Information</p>
      <dl className="kv">
        <div className="kv-row">
          <dt>Model</dt>
          <dd>{info.model}</dd>
        </div>
        <div className="kv-row">
          <dt>Decision Threshold</dt>
          <dd>{Math.round(info.threshold * 100)}%</dd>
        </div>
        {info.weights &&
          Object.entries(info.weights).map(([name, w]) => (
            <div className="kv-row" key={name}>
              <dt>Weight: {name}</dt>
              <dd>{Number(w).toFixed(2)}</dd>
            </div>
          ))}
      </dl>
      <p className="card-subtitle">Test-set metrics</p>
      <p className="muted small">These metrics were measured on the held-out test set.</p>
      <div className="metrics">
        {metrics.map((m) => (
          <div className="metric" key={m.key}>
            <div className="metric-top">
              <span>{m.label}</span>
              <span className="num">{formatPct(m.value)}</span>
            </div>
            <div className="metric-bar" aria-hidden="true">
              <div
                className="metric-fill"
                style={{ width: `${Math.min(Math.max(Number(m.value), 0), 1) * 100}%` }}
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
