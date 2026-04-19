export default function ErrorState({ message = 'Unable to connect to parking system', onRetry }) {
  return (
    <div className="error-container animate-fade-in">
      <div className="error-icon">⚠️</div>
      <div className="error-title">Connection Error</div>
      <div className="error-message">{message}</div>
      {onRetry && (
        <button className="retry-btn" onClick={onRetry}>
          ↻ Retry Connection
        </button>
      )}
    </div>
  );
}
