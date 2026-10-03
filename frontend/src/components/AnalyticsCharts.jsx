/**
 * Minimal dependency-free charts for the Analytics dashboard.
 * Styled to match the existing PolicyGuard theme (App.css).
 * All values come from GET /analytics — nothing is hardcoded.
 */

function pct(rate) {
  return `${(Math.round(Number(rate) * 10000) / 100).toFixed(2)}%`;
}

/** Donut for Claim vs No Claim distribution. */
export function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + (d.count ?? 0), 0);
  if (total === 0) return <p className="muted">No data.</p>;
  const claim = data.find((d) => d.key === "Claim")?.count ?? 0;
  const frac = claim / total;
  // SVG circle: r=54, circumference ≈ 339.29
  const C = 2 * Math.PI * 54;
  const claimLen = Math.max(frac * C, 0);
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 140 140" className="donut" role="img" aria-label="Claim vs no claim distribution">
        <circle cx="70" cy="70" r="54" className="donut-track" />
        <circle
          cx="70"
          cy="70"
          r="54"
          className="donut-claim"
          strokeDasharray={`${claimLen.toFixed(1)} ${(C - claimLen).toFixed(1)}`}
        />
        <text x="70" y="66" textAnchor="middle" className="donut-big">
          {pct(frac)}
        </text>
        <text x="70" y="84" textAnchor="middle" className="donut-small">
          claim rate
        </text>
      </svg>
      <ul className="legend">
        {data.map((d) => (
          <li key={d.key}>
            <span className={`swatch ${d.key === "Claim" ? "sw-claim" : "sw-no"}`} aria-hidden="true" />
            {d.key}: <strong>{d.count.toLocaleString()}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Horizontal bar list for claim-rate breakdowns.
 * `rows`: [{ key, total, claims, claim_rate }], `sub`: optional fn(row) -> string.
 */
export function RateBars({ rows, sub }) {
  if (!rows || rows.length === 0) return <p className="muted">No data.</p>;
  const max = Math.max(...rows.map((r) => Number(r.claim_rate) || 0), 0.0001);
  return (
    <div className="ratebars">
      {rows.map((r) => (
        <div className="ratebar-row" key={r.key}>
          <div className="ratebar-top">
            <span className="ratebar-key" title={`${r.claims.toLocaleString()} claims / ${r.total.toLocaleString()} policies`}>
              {r.key}
            </span>
            <span className="num">{pct(r.claim_rate)}</span>
          </div>
          <div className="ratebar-track" aria-hidden="true">
            <div
              className="ratebar-fill"
              style={{ width: `${(Number(r.claim_rate) / max) * 100}%` }}
            />
          </div>
          <div className="ratebar-sub muted small">
            {r.claims.toLocaleString()} / {r.total.toLocaleString()}
            {sub && r && ` · ${sub(r)}`}
          </div>
        </div>
      ))}
    </div>
  );
}
