export default function LoadingSpinner({ message = 'Loading parking data...', subtext = 'Connecting to IoT sensors' }) {
  return (
    <div className="loading-container animate-fade-in">
      <div className="spinner"></div>
      <div className="loading-text">{message}</div>
      <div className="loading-subtext">{subtext}</div>
    </div>
  );
}
