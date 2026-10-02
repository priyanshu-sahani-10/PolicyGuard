import { useEffect, useState } from "react";
import { getDatasetSample } from "../services/api";

/**
 * Lets the user fill the prediction form from a real dataset row.
 * onSelect(inputs, { policyId, actualClaim })
 */
export default function DatasetRowPicker({ onSelect }) {
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(null);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    getDatasetSample(100, 42)
      .then((data) => {
        if (live) {
          setRows(data.rows || []);
          setTotalRows(data.total_rows ?? null);
        }
      })
      .catch(() => {
        if (live)
          setError(
            "Could not load dataset rows. Make sure the FastAPI backend is running on http://127.0.0.1:8000."
          );
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  const handleLoad = () => {
    const row = rows.find((r) => r.policy_id === selected);
    if (row) {
      onSelect(row.inputs, {
        policyId: row.policy_id,
        actualClaim: row.actual_claim,
      });
    }
  };

  return (
    <div className="card">
      <p className="card-title">Fill from dataset</p>
      {loading && <p className="muted">Loading real policy rows…</p>}
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}
      {!loading && !error && (
        <div className="picker-row">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            aria-label="Dataset row"
          >
            <option value="">Select a real policy row…</option>
            {rows.map((r) => (
              <option key={r.policy_id} value={r.policy_id}>
                {r.policy_id} · {r.inputs.segment}/{r.inputs.model} · actual:{" "}
                {r.actual_claim === 1 ? "Claim" : "No claim"}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleLoad}
            disabled={!selected}
          >
            Load into form
          </button>
        </div>
      )}
      <p className="muted small">
        {rows.length > 0 && (
          <>
            Showing {rows.length}
            {totalRows ? ` of ${totalRows.toLocaleString()}` : ""} sampled
            policies.{" "}
          </>
        )}
        Rows come straight from the training dataset. The actual outcome is
        shown so you can compare it with the model&apos;s prediction.
      </p>
    </div>
  );
}
