import { useCallback, useEffect, useMemo, useState } from "react";
import { MODEL_NAME, THRESHOLD } from "../data/fields";

const STORAGE_KEY = "policyguard_history_v1";

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Session prediction history (persisted to localStorage).
 * Record shape: { id, timestamp, claim_probability, claim_prediction, threshold, model }
 */
export default function usePredictionHistory() {
  const [history, setHistory] = useState(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      // storage may be unavailable; session state still works
    }
  }, [history]);

  const addPrediction = useCallback((apiResult) => {
    const record = {
      id:
        (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `pred-${Date.now()}-${Math.floor(Math.random() * 1e6)}`),
      timestamp: new Date().toISOString(),
      claim_probability: apiResult.claim_probability,
      claim_prediction: apiResult.claim_prediction,
      threshold: apiResult.threshold ?? THRESHOLD,
      model: apiResult.model ?? MODEL_NAME,
    };
    setHistory((prev) => [record, ...prev]);
    return record;
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const stats = useMemo(() => {
    const total = history.length;
    const claims = history.filter((h) => h.claim_prediction === 1).length;
    const noClaims = total - claims;
    const avg =
      total === 0
        ? 0
        : history.reduce((sum, h) => sum + (h.claim_probability ?? 0), 0) / total;
    return { total, claims, noClaims, avg };
  }, [history]);

  const latest = history.length > 0 ? history[0] : null;

  return { history, latest, stats, addPrediction, clearHistory };
}
