import ModelMetrics from "../components/ModelMetrics";

export default function Model() {
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Model</h1>
          <p className="muted">CatBoost claim classifier and its test-set evaluation.</p>
        </div>
      </div>
      <ModelMetrics />
    </div>
  );
}
