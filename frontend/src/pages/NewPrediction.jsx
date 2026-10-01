import { useState } from "react";
import PredictionForm from "../components/PredictionForm";
import PredictionResult from "../components/PredictionResult";
import DatasetRowPicker from "../components/DatasetRowPicker";

export default function NewPrediction({ onPrediction }) {
  const [lastResult, setLastResult] = useState(null);
  const [preset, setPreset] = useState(null);
  const [datasetActual, setDatasetActual] = useState(null);

  const handlePrediction = (apiResult) => {
    const record = onPrediction(apiResult);
    setLastResult(record);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRowSelect = (inputs, meta) => {
    setPreset({ inputs });
    setDatasetActual(meta);
    setLastResult(null);
  };

  const predictedClaim =
    lastResult && lastResult.claim_prediction === 1;
  const actualClaim = datasetActual && datasetActual.actualClaim === 1;
  const showComparison = lastResult && datasetActual;

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>New Prediction</h1>
          <p className="muted">
            Fill the form manually or load a real dataset row. All 41 fields
            are required by the model.
          </p>
        </div>
      </div>
      {lastResult && <PredictionResult result={lastResult} />}
      {showComparison && (
        <div className="card">
          <p className="card-title">Dataset comparison</p>
          <p className="muted">
            Actual outcome for {datasetActual.policyId}:{" "}
            <strong>{actualClaim ? "Claim" : "No claim"}</strong> — the model{" "}
            {predictedClaim === actualClaim ? "matched it." : "missed it."}
          </p>
        </div>
      )}
      <DatasetRowPicker onSelect={handleRowSelect} />
      <PredictionForm onPrediction={handlePrediction} preset={preset} />
    </div>
  );
}
