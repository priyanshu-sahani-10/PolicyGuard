// Actual held-out test set metrics supplied for the final CatBoost model.
// Do not edit these values in the UI; they are not session statistics.
export const MODEL_INFO = {
  model: "CatBoost",
  threshold: 0.59,
  precision: 0.1153,
  recall: 0.352,
  f1: 0.1737,
  prAuc: 0.1102,
  rocAuc: 0.6652,
};

export const MODEL_METRICS_DISPLAY = [
  { key: "precision", label: "Precision", value: MODEL_INFO.precision, display: "11.53%" },
  { key: "recall", label: "Recall", value: MODEL_INFO.recall, display: "35.20%" },
  { key: "f1", label: "F1 Score", value: MODEL_INFO.f1, display: "17.37%" },
  { key: "prAuc", label: "PR-AUC", value: MODEL_INFO.prAuc, display: "11.02%" },
  { key: "rocAuc", label: "ROC-AUC", value: MODEL_INFO.rocAuc, display: "66.52%" },
];
