import { useState } from "react";
import PredictionForm from "../components/PredictionForm";
import PredictionResult from "../components/PredictionResult";

export default function NewPrediction({ onPrediction }) {
  const [lastResult, setLastResult] = useState(null);

  const handlePrediction = (apiResult) => {
    const record = onPrediction(apiResult);
    setLastResult(record);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>New Prediction</h1>
          <p className="muted">
            Complete the sections below. All 41 fields are required by the model.
          </p>
        </div>
      </div>
      {lastResult && <PredictionResult result={lastResult} />}
      <PredictionForm onPrediction={handlePrediction} />
    </div>
  );
}
