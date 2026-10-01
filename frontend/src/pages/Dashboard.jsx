import StatCard from "../components/StatCard";
import PredictionResult, { formatTime } from "../components/PredictionResult";
import PredictionHistory from "../components/PredictionHistory";
import ProbabilityChart from "../components/ProbabilityChart";

export default function Dashboard({ stats, latest, history, onNavigate }) {
  const avgPct = `${(Math.round(stats.avg * 1000) / 10).toFixed(1)}%`;

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Session overview of claim predictions.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => onNavigate("new")}>
          New Prediction
        </button>
      </div>

      <div className="stats-grid">
        <StatCard label="Total Predictions" value={stats.total} sub="This session" />
        <StatCard label="Claims Predicted" value={stats.claims} sub="Claim Likely" />
        <StatCard label="No Claims" value={stats.noClaims} sub="Claim Unlikely" />
        <StatCard label="Average Probability" value={avgPct} sub="Mean of session" />
      </div>

      <div className="dash-grid">
        <div className="stack">
          <div className="card">
            <p className="card-title">Latest Prediction</p>
            {latest ? (
              <PredictionResult result={latest} />
            ) : (
              <div className="empty">
                <p>No prediction yet</p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onNavigate("new")}
                >
                  Create Prediction
                </button>
              </div>
            )}
            {latest && (
              <p className="muted small">Last scored: {formatTime(latest.timestamp)}</p>
            )}
          </div>
          <ProbabilityChart history={history} />
        </div>
        <div className="stack">
          <PredictionHistory history={history} compact />
          {history.length > 5 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onNavigate("history")}
            >
              View Full History
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
