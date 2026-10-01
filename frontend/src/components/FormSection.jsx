const ICONS = {
  customer: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  vehicle: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 11l1.6-4.6A2 2 0 0 1 8.5 5h7a2 2 0 0 1 1.9 1.4L19 11" />
      <path d="M4 11h16a1 1 0 0 1 1 1v4h-2.4" />
      <path d="M4 12v4h2.4" />
      <circle cx="7.6" cy="16.6" r="1.9" />
      <circle cx="16.4" cy="16.6" r="1.9" />
      <path d="M9.5 16.6h5" />
    </svg>
  ),
  safety: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-3.6 8-10V5l-8-3-8 3v7c0 6.4 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  performance: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 14l4.5-4.5" />
      <path d="M3.5 17a9 9 0 1 1 17 0" />
      <path d="M12 14h.01" />
    </svg>
  ),
};

export default function FormSection({ index, icon, title, subtitle, children }) {
  return (
    <section className="panel form-panel fade-up" style={{ "--d": `${index * 90}ms` }}>
      <div className="panel-head">
        <span className="panel-icon" aria-hidden="true">
          {ICONS[icon] || ICONS.vehicle}
        </span>
        <div className="panel-titles">
          <span className="panel-index">{index}</span>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
