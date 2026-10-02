function formatMetric(x) {
  return Number(x).toFixed(4);
}

/**
 * Initial model screening table (threshold 0.50) plus the factual
 * reason CatBoost was selected. Data comes from GET /model-info —
 * nothing here is part of the prediction pipeline.
 */
export default function ModelComparison({ comparison, threshold, selected }) {
  if (!Array.isArray(comparison) || comparison.length === 0) return null;

  return (
    <div className="card table-card">
      <div className="table-head">
        <p className="card-title">Model Comparison</p>
      </div>
      <div className="table-wrap">
        <table className="htable">
          <thead>
            <tr>
              <th scope="col">Model</th>
              <th scope="col">Precision</th>
              <th scope="col">Recall</th>
              <th scope="col">F1</th>
              <th scope="col">PR-AUC</th>
              <th scope="col">ROC-AUC</th>
            </tr>
          </thead>
          <tbody>
            {comparison.map((row) => {
              const isSelected = row.model === selected;
              return (
                <tr key={row.model} className={isSelected ? "row-selected" : undefined}>
                  <td>
                    {row.model}{" "}
                    {isSelected && (
                      <span className="badge badge-good">Selected Model</span>
                    )}
                  </td>
                  <td className="num">{formatMetric(row.precision)}</td>
                  <td className="num">{formatMetric(row.recall)}</td>
                  <td className="num">{formatMetric(row.f1_score)}</td>
                  <td className="num">{formatMetric(row.pr_auc)}</td>
                  <td className="num">{formatMetric(row.roc_auc)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="compare-foot">
        <p className="muted small">
          Initial evaluation at threshold {Number(threshold).toFixed(2)}. These
          screening numbers are not the final production metrics.
        </p>
        <p className="card-subtitle">Why CatBoost?</p>
        <ul className="why-list">
          <li>CatBoost achieved the highest PR-AUC among the four evaluated models.</li>
          <li>CatBoost achieved the highest ROC-AUC among the four evaluated models.</li>
          <li>
            CatBoost had substantially higher recall than Decision Tree and
            Random Forest in the initial comparison.
          </li>
          <li>
            The final implementation also uses CatBoost&apos;s native
            categorical-feature handling.
          </li>
          <li>
            The final model additionally uses engineered features and a
            validation-selected classification threshold.
          </li>
        </ul>
        <p className="muted small">
          CatBoost was selected for this project based on our validation/model
          comparison.
        </p>
      </div>
    </div>
  );
}
