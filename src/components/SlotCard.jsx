export default function SlotCard({ slotNumber, isOccupied, animationDelay = 0 }) {
  const status = isOccupied ? 'occupied' : 'available';
  const statusText = isOccupied ? 'Occupied' : 'Available';
  const icon = isOccupied ? '🚗' : '✓';
  const delayClass = `animate-fade-in-up-${animationDelay}`;

  return (
    <div className={`slot-card ${status} ${delayClass}`}>
      <div className="slot-icon">
        {icon}
      </div>
      <div className="slot-number">Slot {slotNumber}</div>
      <div className="slot-status">{statusText}</div>
    </div>
  );
}
