"""Model-improvement experiment (does NOT touch production artifacts).

- Same CSV, same feature engineering (imported from backend.main),
  same random_state=42 stratified train/val/test split.
- Candidates train on the TRAIN split only; selection on VALIDATION PR-AUC.
- Winner retrained once on train+val, evaluated ONCE on the test set.
- Results saved under ml/models/experiments/ (production files untouched).
"""

import json
import sys
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from catboost import CatBoostClassifier
from lightgbm import LGBMClassifier
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from xgboost import XGBClassifier

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT))
from backend.main import TORQUE_RE, POWER_RE, build_features  # exact production logic

RANDOM_STATE = 42
EXP_DIR = HERE / "models" / "experiments"

BASELINE = {
    "validation_pr_auc": 0.1153,
    "test_pr_auc": 0.1059,
    "test_roc_auc": 0.6635,
}


def extract_raw(df):
    """Same torque/power parsing the backend applies to dataset rows."""
    data = df.copy()

    def split_torque(value):
        m = TORQUE_RE.fullmatch(str(value).strip())
        return pd.Series({"torque_nm": float(m.group(1)),
                          "torque_rpm": int(m.group(2))})

    def split_power(value):
        m = POWER_RE.fullmatch(str(value).strip())
        return pd.Series({"power_bhp": float(m.group(1)),
                          "power_rpm": int(m.group(2))})

    data[["torque_nm", "torque_rpm"]] = data["max_torque"].apply(split_torque)
    data[["power_bhp", "power_rpm"]] = data["max_power"].apply(split_power)
    return data.drop(columns=["max_torque", "max_power", "policy_id"])


def load_splits():
    df = pd.read_csv(HERE / "data" / "insurance_claims.csv")
    raw = extract_raw(df)
    y = raw["claim_status"]
    X = build_features(raw.drop(columns=["claim_status"]))
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=RANDOM_STATE, stratify=y)
    X_tr, X_val, y_tr, y_val = train_test_split(
        X_train, y_train, test_size=0.20, random_state=RANDOM_STATE,
        stratify=y_train)
    print(f"train={X_tr.shape} val={X_val.shape} test={X_test.shape} "
          f"pos={y.mean():.4f}", flush=True)
    return X_tr, X_val, X_test, y_tr, y_val, y_test


def best_f1_threshold(probs, labels):
    best = {"threshold": 0.50, "f1": -1.0,
            "precision": 0.0, "recall": 0.0}
    for thr in np.arange(0.05, 0.951, 0.01):
        pred = (np.asarray(probs) >= thr).astype(int)
        f1 = f1_score(labels, pred, zero_division=0)
        if f1 > best["f1"]:
            best = {"threshold": float(thr), "f1": float(f1),
                    "precision": float(precision_score(labels, pred, zero_division=0)),
                    "recall": float(recall_score(labels, pred, zero_division=0))}
    return best


def score_val(name, params, probs, y_val):
    tuned = best_f1_threshold(probs, y_val)
    return {"model": name, "parameters": params,
            "validation_pr_auc": float(average_precision_score(y_val, probs)),
            "validation_roc_auc": float(roc_auc_score(y_val, probs)),
            "validation_threshold": tuned["threshold"],
            "validation_precision": tuned["precision"],
            "validation_recall": tuned["recall"],
            "validation_f1": tuned["f1"]}


def ohe_encoder(cat_cols):
    return ColumnTransformer(
        [("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols)],
        remainder="passthrough")


def main():
    t0 = time.time()
    X_tr, X_val, X_test, y_tr, y_val, y_test = load_splits()
    cat_cols = X_tr.select_dtypes(include=["object"]).columns.tolist()
    pos_ratio = float((np.asarray(y_tr) == 0).sum() / (np.asarray(y_tr) == 1).sum())
    print(f"categorical={len(cat_cols)} pos_ratio(neg/pos)={pos_ratio:.2f}", flush=True)

    ohe = ohe_encoder(cat_cols)
    X_tr_enc = ohe.fit_transform(X_tr)
    X_val_enc = ohe.transform(X_val)
    print(f"encoded train={X_tr_enc.shape}", flush=True)

    results, fitted = [], {}

    def run_cb(name, params, max_iter, es_rounds):
        m = CatBoostClassifier(verbose=False, random_seed=RANDOM_STATE,
                               allow_writing_files=False, **params)
        m.fit(X_tr, y_tr, cat_features=cat_cols, eval_set=(X_val, y_val),
              use_best_model=True, early_stopping_rounds=es_rounds, verbose=False)
        p = m.predict_proba(X_val)[:, 1]
        full = dict(params, best_iteration=int(m.get_best_iteration()))
        results.append(score_val(name, full, p, y_val))
        fitted[name] = ("catboost", m, full)
        print(f"{name}: PR-AUC={results[-1]['validation_pr_auc']:.4f} "
              f"ROC={results[-1]['validation_roc_auc']:.4f} "
              f"iter={m.get_best_iteration()} "
              f"({time.time() - t0:.0f}s)", flush=True)

    run_cb("cb_current",
           {"iterations": 800, "depth": 8, "learning_rate": 0.03,
            "l2_leaf_reg": 5, "loss_function": "Logloss", "eval_metric": "PRAUC",
            "auto_class_weights": "Balanced", "random_strength": 1,
            "thread_count": 8}, 800, 100)
    run_cb("cb_d6_lr05",
           {"iterations": 1000, "depth": 6, "learning_rate": 0.05,
            "l2_leaf_reg": 3, "loss_function": "Logloss", "eval_metric": "PRAUC",
            "auto_class_weights": "Balanced", "random_strength": 1,
            "thread_count": 8}, 1000, 100)
    run_cb("cb_deep_slow",
           {"iterations": 1500, "depth": 8, "learning_rate": 0.015,
            "l2_leaf_reg": 10, "loss_function": "Logloss", "eval_metric": "PRAUC",
            "auto_class_weights": "Balanced", "random_strength": 1,
            "thread_count": 8}, 1500, 150)
    run_cb("cb_manual_weight",
           {"iterations": 1000, "depth": 6, "learning_rate": 0.05,
            "l2_leaf_reg": 3, "loss_function": "Logloss", "eval_metric": "PRAUC",
            "class_weights": [1.0, round(pos_ratio, 2)],
            "random_strength": 1, "thread_count": 8}, 1000, 100)

    def run_sk(name, make, max_iter=None, es_rounds=100):
        m = make()
        fit_kw = {}
        if max_iter is not None:
            fit_kw = {"eval_set": [(X_val_enc, y_val)]}
            if isinstance(m, LGBMClassifier):
                import lightgbm as lgb
                fit_kw["callbacks"] = [lgb.early_stopping(es_rounds, verbose=False)]
            elif isinstance(m, XGBClassifier):
                # xgboost 3.x sklearn API: no fit-time early stopping;
                # n_estimators is fixed in each candidate config.
                fit_kw["verbose"] = False
        m.fit(X_tr_enc, y_tr, **fit_kw)
        p = m.predict_proba(X_val_enc)[:, 1]
        results.append(score_val(name, m.get_params(), p, y_val))
        fitted[name] = ("ohe", m, None)
        print(f"{name}: PR-AUC={results[-1]['validation_pr_auc']:.4f} "
              f"ROC={results[-1]['validation_roc_auc']:.4f} "
              f"({time.time() - t0:.0f}s)", flush=True)

    run_sk("lgb_balanced",
           lambda: LGBMClassifier(n_estimators=1000, learning_rate=0.05,
                                  num_leaves=31, class_weight="balanced",
                                  random_state=RANDOM_STATE, n_jobs=-1,
                                  verbosity=-1),
           max_iter=1000)
    run_sk("lgb_spw",
           lambda: LGBMClassifier(n_estimators=1500, learning_rate=0.03,
                                  num_leaves=63, scale_pos_weight=pos_ratio,
                                  min_child_samples=50, subsample=0.8,
                                  subsample_freq=1, colsample_bytree=0.8,
                                  random_state=RANDOM_STATE, n_jobs=-1,
                                  verbosity=-1),
           max_iter=1500, es_rounds=150)
    run_sk("xgb_spw",
           lambda: XGBClassifier(n_estimators=500, max_depth=6,
                                 learning_rate=0.05, subsample=0.8,
                                 colsample_bytree=0.8, reg_lambda=1.0,
                                 scale_pos_weight=pos_ratio,
                                 tree_method="hist", eval_metric="logloss",
                                 random_state=RANDOM_STATE, n_jobs=-1))
    run_sk("xgb_shallow",
           lambda: XGBClassifier(n_estimators=300, max_depth=4,
                                 learning_rate=0.1, subsample=0.8,
                                 colsample_bytree=0.8, reg_lambda=5.0,
                                 scale_pos_weight=pos_ratio,
                                 tree_method="hist", eval_metric="logloss",
                                 random_state=RANDOM_STATE, n_jobs=-1))
    run_sk("rf_balanced",
           lambda: RandomForestClassifier(n_estimators=300,
                                          class_weight="balanced",
                                          random_state=RANDOM_STATE, n_jobs=-1))
    run_sk("rf_leaf5",
           lambda: RandomForestClassifier(n_estimators=500, class_weight="balanced",
                                          min_samples_leaf=5,
                                          random_state=RANDOM_STATE, n_jobs=-1))

    ranked = sorted(results, key=lambda r: r["validation_pr_auc"], reverse=True)
    print("\nRANKED BY VALIDATION PR-AUC:", flush=True)
    for r in ranked:
        print(f"  {r['model']:15s} PR={r['validation_pr_auc']:.4f} "
              f"ROC={r['validation_roc_auc']:.4f} F1={r['validation_f1']:.4f} "
              f"(thr={r['validation_threshold']:.2f}) P={r['validation_precision']:.4f} "
              f"R={r['validation_recall']:.4f}", flush=True)
    winner = ranked[0]
    print(f"\nWINNER: {winner['model']} "
          f"(val PR-AUC={winner['validation_pr_auc']:.4f})", flush=True)

    # ---- Retrain winner once on train+val, single test evaluation ----
    X_full = pd.concat([X_tr, X_val], ignore_index=True)
    y_full = pd.concat([y_tr, y_val], ignore_index=True)
    kind, _, full_params = fitted[winner["model"]]
    if kind == "catboost":
        n_iter = int(full_params.get("best_iteration", 85)) + 1
        init = {k: v for k, v in full_params.items()
                if k not in ("best_iteration", "iterations")}
        final = CatBoostClassifier(verbose=False, random_seed=RANDOM_STATE,
                                   allow_writing_files=False,
                                   iterations=n_iter, **init)
        final.fit(X_full, y_full, cat_features=cat_cols, verbose=False)
        X_test_in, pre = X_test, None
    else:
        final = fitted[winner["model"]][1].__class__(
            **fitted[winner["model"]][1].get_params())
        final.fit(ohe.transform(X_full), y_full)
        X_test_in, pre = X_test, ohe
    tp = final.predict_proba(X_test_in if pre is None else pre.transform(X_test_in))[:, 1]
    thr = winner["validation_threshold"]
    tp_pred = (tp >= thr).astype(int)
    tn, fp, fn, tp_n = confusion_matrix(y_test, tp_pred).ravel()
    test_eval = {
        "threshold": thr,
        "precision": float(precision_score(y_test, tp_pred, zero_division=0)),
        "recall": float(recall_score(y_test, tp_pred, zero_division=0)),
        "f1_score": float(f1_score(y_test, tp_pred, zero_division=0)),
        "pr_auc": float(average_precision_score(y_test, tp)),
        "roc_auc": float(roc_auc_score(y_test, tp)),
        "confusion": {"tn": int(tn), "fp": int(fp),
                      "fn": int(fn), "tp": int(tp_n)},
    }
    print("\nTEST (single evaluation):", flush=True)
    for k, v in test_eval.items():
        print(f"  {k}: {v}", flush=True)

    EXP_DIR.mkdir(parents=True, exist_ok=True)
    payload = {"baseline": BASELINE, "candidates": ranked,
               "winner": winner["model"], "test_eval": test_eval,
               "production_untouched": True}
    (EXP_DIR / "experiment_results.json").write_text(json.dumps(payload, indent=2))
    joblib.dump({"model": final, "kind": kind, "preprocessor": pre,
                 "categorical_columns": cat_cols, "threshold": thr,
                 "winner": winner["model"], "test_eval": test_eval},
                EXP_DIR / "best_candidate.pkl")
    print(f"\nSaved to {EXP_DIR} in {time.time() - t0:.0f}s", flush=True)


if __name__ == "__main__":
    main()
