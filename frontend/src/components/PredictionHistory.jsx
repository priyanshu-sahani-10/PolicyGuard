import { useState } from "react";
import { formatPercent, formatTime } from "./PredictionResult";

export default function PredictionHistory({ history, onClear, compact }) {
  const [expandedId, setExpandedId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const rows = compact ? history.slice(0, 5) : history;

  if (history.length === 0) {
    return (
      <div className="card">
        <p className="card-title">Prediction History</p>
        <p className="muted">No predictions yet. Run your first prediction to populate this table.</p>
      </div>
    );
  }

  return (
    <div className="card table-card">
      <div className="table-head">
        <p className="card-title">Prediction History</p>
        {!compact && (
          <button type="button" className="btn btn-danger-ghost" onClick={onClear}>
            Clear History
          </button>
        )}
      </div>
      <div className="table-wrap">
        <table className="htable">
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Probability</th>
              <th scope="col">Prediction</th>
              <th scope="col">Threshold</th>
              <th scope="col">Model</th>
              {!compact && <th scope="col">Details</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isLikely = r.claim_prediction === 1;
              const expanded = expandedId === r.id;
              return (
                <tr key={r.id} className={selectedId === r.id ? "row-selected" : undefined}>
                  <td>{new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="num">{formatPercent(r.claim_probability)}</td>
                  <td>
                    <span className={`badge ${isLikely ? "badge-bad" : "badge-good"}`}>
                      {isLikely ? "Claim Likely" : "Claim Unlikely"}
                    </span>
                  </td>
                  <td className="num">{Math.round((r.threshold ?? 0.57) * 100)}%</td>
                  <td>{r.model ?? "CatBoost Native + Engineered Features"}</td>
                  {!compact && (
                    <td>
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => {
                          setExpandedId(expanded ? null : r.id);
                          setSelectedId(r.id);
                        }}
                        aria-expanded={expanded}
                      >
                        {expanded ? "Hide" : "View Details"}
                      </button>
                      {expanded && (
                        <div className="row-detail">
                          <span>ID: {r.id}</span>
                          <span>Timestamp: {formatTime(r.timestamp)}</span>
                          <span>Raw probability: {r.claim_probability}</span>
                          <span>Raw prediction: {r.claim_prediction}</span>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
