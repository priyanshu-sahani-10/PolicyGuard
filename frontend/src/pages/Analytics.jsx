import { useEffect, useMemo, useState } from "react";
import StatCard from "../components/StatCard";
import ModelComparison from "../components/ModelComparison";
import { DonutChart, RateBars } from "../components/AnalyticsCharts";
import { getAnalytics } from "../services/api";

function pct(rate) {
  return `${(Math.round(Number(rate) * 10000) / 100).toFixed(2)}%`;
}

function SectionTitle({ kicker, title, blurb }) {
  return (
    <div className="ana-section-head">
      <p className="card-title">{kicker}</p>
      <h2 className="ana-h2">{title}</h2>
      {blurb && <p className="muted small">{blurb}</p>}
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    getAnalytics()
      .then((d) => {
        if (live) setData(d);
      })
      .catch(() => {
        if (live)
          setError(
            "Could not load analytics. Make sure the FastAPI backend is running on http://127.0.0.1:8000."
          );
      });
    return () => {
      live = false;
    };
  }, []);

  const densityByRegion = useMemo(() => {
    if (!data?.region_density_avg) return {};
    return Object.fromEntries(data.region_density_avg.map((r) => [r.key, r.avg_density]));
  }, [data]);

  if (error) {
    return (
      <div className="stack">
        <div className="page-head">
          <div>
            <h1>Analytics</h1>
            <p className="muted">Dataset insights calculated from the training CSV.</p>
          </div>
        </div>
        <div className="card">
          <p className="card-title">Dataset Analytics</p>
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="stack">
        <div className="page-head">
          <div>
            <h1>Analytics</h1>
            <p className="muted">Dataset insights calculated from the training CSV.</p>
          </div>
        </div>
        <div className="card">
          <p className="card-title">Dataset Analytics</p>
          <p className="muted">Loading aggregated statistics from the API…</p>
        </div>
      </div>
    );
  }

  const s = data.summary;
  const ins = data.insights || {};
  const insightsList = [
    ins.highest_segment && {
      label: "Segment with the highest observed claim rate",
      value: `${ins.highest_segment.key} · ${pct(ins.highest_segment.claim_rate)} (${ins.highest_segment.claims.toLocaleString()} claims / ${ins.highest_segment.total.toLocaleString()} policies)`,
    },
    ins.highest_fuel && {
      label: "Fuel type with the highest observed claim rate",
      value: `${ins.highest_fuel.key} · ${pct(ins.highest_fuel.claim_rate)}`,
    },
    ins.highest_region && {
      label: "Region with the highest observed claim rate",
      value: `${ins.highest_region.key} · ${pct(ins.highest_region.claim_rate)} (${ins.highest_region.total.toLocaleString()} policies)`,
    },
    ins.highest_vehicle_age_group && {
      label: "Vehicle-age group with the highest observed claim rate",
      value: `${ins.highest_vehicle_age_group.key} years · ${pct(ins.highest_vehicle_age_group.claim_rate)}`,
    },
    ins.highest_customer_age_group && {
      label: "Customer-age group with the highest observed claim rate",
      value: `${ins.highest_customer_age_group.key} · ${pct(ins.highest_customer_age_group.claim_rate)}`,
    },
    ins.highest_subscription_group && {
      label: "Subscription-length group with the highest observed claim rate",
      value: `${ins.highest_subscription_group.key} · ${pct(ins.highest_subscription_group.claim_rate)}`,
    },
  ].filter(Boolean);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Analytics</h1>
          <p className="muted">
            Descriptive statistics from {s.total_policies.toLocaleString()} policies in the training dataset.
            Observed rates only — not causal conclusions.
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard label="Total Policies" value={s.total_policies.toLocaleString()} sub="Rows in dataset" />
        <StatCard label="Total Claims" value={s.total_claims.toLocaleString()} sub="claim_status = 1" />
        <StatCard label="No Claims" value={s.total_no_claims.toLocaleString()} sub="claim_status = 0" />
        <StatCard label="Overall Claim Rate" value={pct(s.claim_rate)} sub="Claims / total policies" />
      </div>

      <SectionTitle kicker="Section 1 · Claim overview" title="How common are claims?" />

      <div className="ana-grid-3">
        <div className="card">
          <p className="card-title">Claim vs No Claim</p>
          <DonutChart data={data.claim_distribution} />
        </div>
        <div className="card">
          <p className="card-title">Observed claim rate by Segment</p>
          <RateBars rows={data.segment_claim_rate} />
        </div>
        <div className="card">
          <p className="card-title">Observed claim rate by Fuel Type</p>
          <RateBars rows={data.fuel_claim_rate} />
        </div>
      </div>

      <SectionTitle
        kicker="Section 2 · Customer / Vehicle analysis"
        title="Who and what shows higher observed rates?"
        blurb="Bins are descriptive groupings of the actual numeric ranges, not model inputs."
      />

      <div className="ana-grid-3">
        <div className="card">
          <p className="card-title">Claim rate by Vehicle Age group</p>
          <RateBars rows={data.vehicle_age_claim_rate} />
          <p className="muted small">Most policies cover young vehicles; the 10+ group has very few policies.</p>
        </div>
        <div className="card">
          <p className="card-title">Claim rate by Customer Age group</p>
          <RateBars rows={data.customer_age_claim_rate} />
          <p className="muted small">Dataset ages start at 35, so bins start there.</p>
        </div>
        <div className="card">
          <p className="card-title">Claim rate by Subscription Length</p>
          <RateBars rows={data.subscription_length_claim_rate} />
        </div>
      </div>

      <SectionTitle
        kicker="Section 3 · Region analysis"
        title="Observed Claim Rate by Region"
        blurb="Regional differences are observed associations. They do not imply that a region causes claims."
      />

      <div className="card">
        <p className="card-title">Observed claim rate by region_code</p>
        <div className="region-scroll">
          <RateBars
            rows={data.region_claim_rate}
            sub={(r) =>
              densityByRegion[r.key] != null
                ? `avg density ${Number(densityByRegion[r.key]).toLocaleString()}`
                : undefined
            }
          />
        </div>
        <p className="muted small">
          Small regions (e.g. C18, C22, C20) have few policies, so their observed rates are noisier
          than large regions such as C8.
        </p>
      </div>

      <SectionTitle
        kicker="Section 4 · Vehicle features"
        title="Which vehicle attributes vary with claim rate?"
      />

      <div className="ana-grid-3">
        <div className="card">
          <p className="card-title">Claim rate by NCAP Rating</p>
          <RateBars rows={data.ncap_claim_rate} />
        </div>
        <div className="card">
          <p className="card-title">Claim rate by Displacement</p>
          <RateBars rows={data.displacement_claim_rate} />
        </div>
        <div className="card">
          <p className="card-title">Claim rate by Gross Weight</p>
          <RateBars rows={data.gross_weight_claim_rate} />
        </div>
      </div>

      <SectionTitle
        kicker="Section 5 · Model performance"
        title="Model evaluation results"
        blurb="The table below is the model evaluation used during development (fixed threshold 0.50). It is separate from the final production metrics."
      />

      <ModelComparison
        comparison={data.model_comparison}
        threshold={data.model_comparison_threshold}
        selected={data.selected_model}
      />

      {data.final_model && (
        <div className="card">
          <p className="card-title">Final deployed model</p>
          <dl className="kv">
            <div className="kv-row">
              <dt>Model</dt>
              <dd>{data.final_model.model}</dd>
            </div>
            <div className="kv-row">
              <dt>Production threshold</dt>
              <dd>{Math.round(data.final_model.threshold * 100)}% (validation-selected)</dd>
            </div>
            <div className="kv-row">
              <dt>Test precision</dt>
              <dd>{pct(data.final_model.precision)}</dd>
            </div>
            <div className="kv-row">
              <dt>Test recall</dt>
              <dd>{pct(data.final_model.recall)}</dd>
            </div>
            <div className="kv-row">
              <dt>Test F1</dt>
              <dd>{pct(data.final_model.f1_score)}</dd>
            </div>
            <div className="kv-row">
              <dt>Test PR-AUC</dt>
              <dd>{pct(data.final_model.pr_auc)}</dd>
            </div>
            <div className="kv-row">
              <dt>Test ROC-AUC</dt>
              <dd>{pct(data.final_model.roc_auc)}</dd>
            </div>
          </dl>
          <p className="muted small">
            CatBoost was selected for this project based on the model comparison and validation results.
          </p>
        </div>
      )}

      <SectionTitle kicker="Section 6 · Key dataset insights" title="What stands out?" />

      <div className="card">
        <p className="card-title">Calculated from the dataset</p>
        <ul className="why-list">
          <li>
            Overall claim prevalence is <strong>{pct(s.claim_rate)}</strong> —{" "}
            {s.total_claims.toLocaleString()} claims out of {s.total_policies.toLocaleString()} policies.
          </li>
          {insightsList.map((i) => (
            <li key={i.label}>
              {i.label}: <strong>{i.value}</strong>
            </li>
          ))}
        </ul>
        <p className="muted small">
          These are descriptive statistics showing observed differences in claim rates.
          They do not establish that any factor causes claims.
        </p>
      </div>
    </div>
  );
}
