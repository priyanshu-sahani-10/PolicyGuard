import { MODEL_NAME, THRESHOLD } from "../data/fields";

export function formatPercent(p) {
  return `${(Math.round(Number(p) * 1000) / 10).toFixed(1)}%`;
}

export function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/**
 * Compact result panel. `result` is a history record or raw API response
 * { claim_probability, claim_prediction, timestamp?, threshold?, model? }.
 */
export default function PredictionResult({ result, loading }) {
  if (loading) {
    return (
      <div className="card result" aria-live="polite">
        <p className="card-title">Prediction Result</p>
        <p className="muted">Scoring profile with {MODEL_NAME}…</p>
      </div>
    );
  }

  if (!result) return null;

  const probability = Number(result.claim_probability ?? 0);
  const isLikely = result.claim_prediction === 1;
  const threshold = result.threshold ?? THRESHOLD;
  const model = result.model ?? MODEL_NAME;
  const percent = formatPercent(probability);
  const above = probability >= threshold;

  return (
    <div className="card result" role="status" aria-live="polite">
      <p className="card-title">Prediction Result</p>
      <div className="result-head">
        <span className="result-prob">{percent}</span>
        <span className={`badge ${isLikely ? "badge-bad" : "badge-good"}`}>
          {isLikely ? "Claim Likely" : "Claim Unlikely"}
        </span>
      </div>

      <div className="probbar" aria-hidden="true">
        <div
          className={`probbar-fill ${isLikely ? "fill-bad" : "fill-good"}`}
          style={{ width: `${Math.min(Math.max(probability, 0), 1) * 100}%` }}
        />
        <span
          className="probbar-threshold"
          style={{ left: `${threshold * 100}%` }}
          title={`Threshold ${Math.round(threshold * 100)}%`}
        />
      </div>
      <p className={`threshold-note ${above ? "is-above" : "is-below"}`}>
        {above ? "Above decision threshold" : "Below decision threshold"}
      </p>

      <dl className="kv">
        <div className="kv-row">
          <dt>Probability</dt>
          <dd>{percent}</dd>
        </div>
        <div className="kv-row">
          <dt>Decision Threshold</dt>
          <dd>{Math.round(threshold * 100)}%</dd>
        </div>
        <div className="kv-row">
          <dt>Model</dt>
          <dd>{model}</dd>
        </div>
        {result.timestamp && (
          <div className="kv-row">
            <dt>Timestamp</dt>
            <dd>{formatTime(result.timestamp)}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
