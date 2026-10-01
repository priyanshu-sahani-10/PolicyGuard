import PredictionHistory from "../components/PredictionHistory";

export default function History({ history, onClear, onNavigate }) {
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Prediction History</h1>
          <p className="muted">
            Every successful prediction in this browser session. Stored locally only.
          </p>
        </div>
        {history.length > 0 && (
          <button type="button" className="btn btn-secondary" onClick={() => onNavigate("new")}>
            New Prediction
          </button>
        )}
      </div>
      <PredictionHistory history={history} onClear={onClear} />
    </div>
  );
}
