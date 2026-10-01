export default function LoadingButton({ loading, children, ...props }) {
  return (
    <button
      type="submit"
      className="predict-btn"
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span className="predict-loading">
          <span className="spinner" aria-hidden="true" />
          Analyzing profile…
        </span>
      ) : (
        <>
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v3" />
            <path d="M18.4 5.6l-2.1 2.1" />
            <path d="M21 12h-3" />
            <path d="M18.4 18.4l-2.1-2.1" />
            <path d="M12 18v3" />
            <rect x="8" y="8" width="8" height="8" rx="2" />
          </svg>
          {children}
        </>
      )}
    </button>
  );
}
