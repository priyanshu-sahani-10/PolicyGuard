"""Learn a constrained soft-voting blend where EVERY base model contributes.

Method (mirrors ml/insurance_claim_prediction.ipynb, same seeds/configs):
  1. Reproduce the exact data pipeline: CSV -> torque/power extraction ->
     drop(max_torque, max_power, policy_id, claim_status) -> stratified
     80/20 test split (rs=42) -> stratified 80/20 validation split (rs=42).
  2. Fit a preprocessor on the train split; train temporary train-only
     copies of the 4 base models (identical configs/seeds, NOT saved).
  3. Sanity check: score the SAVED finalized models + saved preprocessor on
     the reproduced test split with the ORIGINAL weights/threshold and assert
     the metrics match ml/models/final_results.pkl exactly.
  4. Grid-search blend weights with each model >= MIN_WEIGHT, maximizing
     validation F1 (threshold tuned jointly on validation).
  5. Evaluate the winning blend once on the untouched test set using the
     SAVED finalized models, and print an honest comparison.

Nothing in this script overwrites saved artifacts. It writes only
ml/models/constrained_candidate.json for review.
"""

import json
import re
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.tree import DecisionTreeClassifier
from catboost import CatBoostClassifier
from lightgbm import LGBMClassifier

HERE = Path(__file__).resolve().parent
MODELS_DIR = HERE / "models"
MIN_WEIGHT = 0.10  # every base model contributes at least 10%
MODEL_NAMES = ["Decision Tree", "Random Forest", "CatBoost", "LightGBM"]
MODEL_FILES = [
    "decision_tree_model.pkl",
    "random_forest_model.pkl",
    "catboost_model.pkl",
    "lightgbm_model.pkl",
]

TORQUE_RE = re.compile(r"([\d.]+)Nm@(\d+)rpm")
POWER_RE = re.compile(r"([\d.]+)bhp@(\d+)rpm")


def make_models():
    """Identical configs/seeds to the training notebook."""
    return {
        "Decision Tree": DecisionTreeClassifier(
            class_weight="balanced", random_state=42
        ),
        "Random Forest": RandomForestClassifier(
            n_estimators=200, class_weight="balanced",
            random_state=42, n_jobs=-1,
        ),
        "CatBoost": CatBoostClassifier(
            iterations=300, depth=6, learning_rate=0.05,
            loss_function="Logloss", eval_metric="AUC",
            verbose=False, random_seed=42,
            auto_class_weights="Balanced",
        ),
        "LightGBM": LGBMClassifier(
            n_estimators=300, learning_rate=0.05, num_leaves=31,
            class_weight="balanced", random_state=42,
            n_jobs=-1, verbosity=-1,
        ),
    }


def load_features():
    df = pd.read_csv(HERE / "data" / "insurance_claims.csv")

    def extract_torque(value):
        m = TORQUE_RE.match(value)
        return pd.Series({"torque_nm": float(m.group(1)),
                          "torque_rpm": int(m.group(2))})

    def extract_power(value):
        m = POWER_RE.match(value)
        return pd.Series({"power_bhp": float(m.group(1)),
                          "power_rpm": int(m.group(2))})

    df[["torque_nm", "torque_rpm"]] = df["max_torque"].apply(extract_torque)
    df[["power_bhp", "power_rpm"]] = df["max_power"].apply(extract_power)
    df = df.drop(columns=["max_torque", "max_power", "policy_id"])

    X = df.drop(columns=["claim_status"])
    y = df["claim_status"]
    assert X.shape == (58592, 41), f"Unexpected X shape {X.shape}"
    return X, y


def best_f1_for_probs(probs, y_true):
    """Best (F1, threshold) over all distinct probability cutoffs."""
    precision, recall, thresholds = precision_recall_curve(y_true, probs)
    f1 = np.where(
        precision + recall > 0,
        2 * precision * recall / np.maximum(precision + recall, 1e-12),
        0.0,
    )
    # precision_recall_curve returns len(thresholds)+1 values; last point
    # corresponds to an empty positive set. Align: f1[i] uses thresholds[i].
    f1 = f1[:-1]
    i = int(np.argmax(f1))
    return float(f1[i]), float(thresholds[i])


def main():
    X, y = load_features()
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y,
    )
    X_tr, X_val, y_tr, y_val = train_test_split(
        X_train, y_train, test_size=0.20, random_state=42,
        stratify=y_train,
    )
    print(f"train={X_tr.shape} val={X_val.shape} test={X_test.shape}")
    assert (len(X_tr), len(X_val), len(X_test)) == (37498, 9375, 11719)

    cat_cols = X.select_dtypes(include=["object"]).columns.tolist()
    print(f"categorical={len(cat_cols)}")
    assert len(cat_cols) == 25, cat_cols

    pre = ColumnTransformer(
        [("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols)],
        remainder="passthrough",
    )
    X_tr_enc = pre.fit_transform(X_tr)
    X_val_enc = pre.transform(X_val)
    assert X_val_enc.shape == (9375, 110), X_val_enc.shape

    # Temporary train-only models (never saved) for weight learning.
    val_probs = {}
    for name, model in make_models().items():
        model.fit(X_tr_enc, y_tr)
        val_probs[name] = model.predict_proba(X_val_enc)[:, 1]
        print(f"{name} train-only fit done.")
    y_val_arr = np.asarray(y_val)
    P_val = np.column_stack([val_probs[n] for n in MODEL_NAMES])

    # ---- Sanity: reproduce the shipped test metrics exactly ----
    saved_pre = joblib.load(MODELS_DIR / "preprocessor.pkl")
    saved_models = [joblib.load(MODELS_DIR / f) for f in MODEL_FILES]
    saved_w = np.asarray(joblib.load(MODELS_DIR / "ensemble_weights.pkl"))
    saved_t = float(joblib.load(MODELS_DIR / "threshold.pkl"))
    shipped = joblib.load(MODELS_DIR / "final_results.pkl")
    X_test_saved = saved_pre.transform(X_test)
    P_test_saved = np.column_stack(
        [m.predict_proba(X_test_saved)[:, 1] for m in saved_models]
    )
    y_test_arr = np.asarray(y_test)
    repro_prob = P_test_saved @ saved_w
    repro_pred = (repro_prob >= saved_t).astype(int)
    repro = {
        "precision": precision_score(y_test_arr, repro_pred, zero_division=0),
        "recall": recall_score(y_test_arr, repro_pred, zero_division=0),
        "f1_score": f1_score(y_test_arr, repro_pred, zero_division=0),
        "pr_auc": average_precision_score(y_test_arr, repro_prob),
        "roc_auc": roc_auc_score(y_test_arr, repro_prob),
    }
    print("\nReproduction check vs final_results.pkl:")
    for k, v in repro.items():
        ref = shipped[k]
        ok = abs(v - ref) < 1e-9
        print(f"  {k:10s} reproduced={v:.6f} shipped={ref:.6f} "
              f"{'MATCH' if ok else 'MISMATCH'}")
        assert ok, f"Pipeline reproduction diverged on {k}"

    # ---- Constrained search: every weight >= MIN_WEIGHT, maximise val F1 ----
    grid = np.arange(MIN_WEIGHT, 1.0 + 1e-9, 0.05)
    best = None
    combos = 0
    for w1 in grid:
        for w2 in grid:
            for w3 in grid:
                w4 = 1.0 - w1 - w2 - w3
                if w4 < MIN_WEIGHT - 1e-9:
                    continue
                w = np.array([w1, w2, w3, w4])
                f1, thr = best_f1_for_probs(P_val @ w, y_val_arr)
                combos += 1
                if best is None or f1 > best[0]:
                    best = (f1, thr, w)
    print(f"\nSearched {combos} constrained blends.")
    val_f1, val_thr, val_w = best
    print(f"Best val blend: weights={np.round(val_w, 3)} "
          f"threshold={val_thr:.4f} val-F1={val_f1:.4f}")

    # ---- Final: single evaluation on the untouched test set ----
    test_prob = P_test_saved @ val_w
    test_pred = (test_prob >= val_thr).astype(int)
    new_metrics = {
        "precision": float(precision_score(y_test_arr, test_pred,
                                           zero_division=0)),
        "recall": float(recall_score(y_test_arr, test_pred, zero_division=0)),
        "f1_score": float(f1_score(y_test_arr, test_pred, zero_division=0)),
        "pr_auc": float(average_precision_score(y_test_arr, test_prob)),
        "roc_auc": float(roc_auc_score(y_test_arr, test_prob)),
    }
    tn, fp, fn, tp = confusion_matrix(y_test_arr, test_pred).ravel()
    print("\nTEST COMPARISON (untouched test set):")
    print(f"  {'metric':10s} {'shipped':>10s} {'constrained':>12s}")
    for k in ["precision", "recall", "f1_score", "pr_auc", "roc_auc"]:
        print(f"  {k:10s} {shipped[k]:10.4f} {new_metrics[k]:12.4f}")
    print(f"  confusion: TN={tn} FP={fp} FN={fn} TP={tp} "
          f"(shipped TN=8921 FP=2048 FN=479 TP=271)")

    candidate = {
        "model": "Constrained Soft Voting Ensemble (min 10% per model)",
        "weights": [float(v) for v in val_w],
        "threshold": float(val_thr),
        "test_metrics": new_metrics,
        "confusion": {"tn": int(tn), "fp": int(fp),
                      "fn": int(fn), "tp": int(tp)},
    }
    out = MODELS_DIR / "constrained_candidate.json"
    out.write_text(json.dumps(candidate, indent=2))
    print(f"\nCandidate written to {out} (artifacts NOT overwritten).")


if __name__ == "__main__":
    main()
