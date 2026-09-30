export default function FormSection({ title, description, children }) {
  return (
    <section className="form-section">
      <div className="form-section-head">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      <div className="form-grid">{children}</div>
    </section>
  );
}
