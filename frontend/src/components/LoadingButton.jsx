export default function LoadingButton({ loading, children, ...props }) {
  return (
    <button
      type="submit"
      className="btn btn-primary"
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span className="btn-loading">
          <span className="spinner" aria-hidden="true" />
          Predicting…
        </span>
      ) : (
        children
      )}
    </button>
  );
}
