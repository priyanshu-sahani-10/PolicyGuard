export default function PredictionResult({ result }) {
  if (!result) return null;

  const probability = result.claim_probability ?? 0;
  const percent = Math.round(probability * 1000) / 10; // one decimal
  const isLikely = result.claim_prediction === 1;

  // Circular indicator math
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (probability * circumference);

  return (
    <div
      className={`result-card ${isLikely ? "result-likely" : "result-unlikely"}`}
      role="status"
      aria-live="polite"
    >
      <div className="result-main">
        <div className="gauge">
          <svg viewBox="0 0 140 140" width="140" height="140">
            <circle cx="70" cy="70" r={radius} className="gauge-track" />
            <circle
              cx="70"
              cy="70"
              r={radius}
              className="gauge-fill"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
            <text x="70" y="66" textAnchor="middle" className="gauge-percent">
              {percent}%
            </text>
            <text x="70" y="86" textAnchor="middle" className="gauge-label">
              probability
            </text>
          </svg>
        </div>

        <div className="result-text">
          <span
            className={`badge ${isLikely ? "badge-danger" : "badge-success"}`}
          >
            {isLikely ? "Claim Likely" : "Claim Unlikely"}
          </span>
          <p className="result-desc">
            {isLikely
              ? "The model estimates a higher risk of a claim for this profile. Consider manual review."
              : "The model estimates a lower risk of a claim for this profile."}
          </p>
          <div className="progress">
            <div
              className="progress-fill"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="result-meta">
            Claim Probability: <strong>{percent}%</strong>
            {"  •  "}Prediction code:{" "}
            <strong>{result.claim_prediction}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
