/**
 * Minimal SVG line chart of session prediction probabilities over time.
 * Uses only actual history records; renders nothing fabricated.
 */
export default function ProbabilityChart({ history }) {
  if (history.length < 2) {
    return (
      <div className="card">
        <p className="card-title">Prediction Probability Over Time</p>
        <p className="muted">Make more predictions to see the trend.</p>
      </div>
    );
  }

  const chrono = [...history].reverse(); // oldest -> newest
  const W = 560;
  const H = 160;
  const PAD = 28;
  const pts = chrono.map((r, i) => {
    const x =
      chrono.length === 1
        ? W / 2
        : PAD + (i * (W - PAD * 2)) / (chrono.length - 1);
    const y = H - PAD - Math.min(Math.max(r.claim_probability, 0), 1) * (H - PAD * 2);
    return { x, y };
  });
  const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const thresholdY = H - PAD - 0.59 * (H - PAD * 2);

  return (
    <div className="card">
      <p className="card-title">Prediction Probability Over Time</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Prediction probability over time">
        <line x1={PAD} x2={W - PAD} y1={thresholdY} y2={thresholdY} className="chart-threshold" />
        <text x={W - PAD} y={thresholdY - 6} textAnchor="end" className="chart-label">
          59% threshold
        </text>
        <polyline points={line} className="chart-line" fill="none" />
        {pts.map((p, i) => (
          <circle key={chrono[i].id} cx={p.x} cy={p.y} r="4" className="chart-dot">
            <title>{`${(chrono[i].claim_probability * 100).toFixed(1)}%`}</title>
          </circle>
        ))}
      </svg>
      <p className="muted small">
        {history.length} session predictions, oldest to newest left to right.
      </p>
    </div>
  );
}
