const LINKS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "new", label: "New Prediction" },
  { key: "history", label: "Prediction History" },
  { key: "model", label: "Model" },
];

export default function Navbar({ current, onNavigate }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <button
          type="button"
          className="brand"
          onClick={() => onNavigate("dashboard")}
          aria-label="PolicyGuard home"
        >
          <span className="brand-mark" aria-hidden="true">PG</span>
          <span className="brand-name">PolicyGuard</span>
        </button>
        <nav className="topnav" aria-label="Primary">
          {LINKS.map((l) => (
            <button
              key={l.key}
              type="button"
              className={`nav-link ${current === l.key ? "active" : ""}`}
              onClick={() => onNavigate(l.key)}
              aria-current={current === l.key ? "page" : undefined}
            >
              {l.label}
            </button>
          ))}
        </nav>
        <div className="topbar-right">
          <span className="chip">CatBoost</span>
          <span className="chip chip-online">
            <span className="dot" aria-hidden="true" />
            Online
          </span>
        </div>
      </div>
    </header>
  );
}
