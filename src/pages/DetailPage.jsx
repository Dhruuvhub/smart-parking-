import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import PARKING_LOTS from '../data/parkingLots';
import { useSingleDummyLot } from '../hooks/useDummyData';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import SlotCard from '../components/SlotCard';

export default function DetailPage() {
  const { lotName } = useParams();
  const lotConfig = PARKING_LOTS.find((l) => l.id === lotName);

  if (!lotConfig) {
    return (
      <div className="detail-page animate-fade-in">
        <Link to="/" className="back-button">← Back to Map</Link>
        <ErrorState message={`Parking lot "${lotName}" not found.`} />
      </div>
    );
  }

  return lotConfig.isReal ? (
    <RealLotDetail lot={lotConfig} />
  ) : (
    <DummyLotDetail lot={lotConfig} />
  );
}

// ════════════════════════════════════════════════════════════
// REAL LOT — fetches from Supabase every 3 seconds
// ════════════════════════════════════════════════════════════
function RealLotDetail({ lot }) {
  const [parkingData, setParkingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('parking_slots')
        .select('*')
        .eq('lot_name', lot.id)
        .single();
      if (fetchError) throw fetchError;
      setParkingData(data);
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to fetch parking data');
    } finally {
      setLoading(false);
    }
  }, [lot.id]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) return <LoadingSpinner message="Loading slot details..." subtext="Reading sensor data from ESP32" />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  const slots = [
    { number: 1, occupied: parkingData?.slot_1 ?? false },
    { number: 2, occupied: parkingData?.slot_2 ?? false },
    { number: 3, occupied: parkingData?.slot_3 ?? false },
    { number: 4, occupied: parkingData?.slot_4 ?? false },
  ];

  const available = parkingData?.available ?? 0;
  const occupied = parkingData?.occupied ?? 0;

  return (
    <div className="detail-page animate-fade-in">
      <Link to="/" className="back-button">← Back to Map</Link>

      {/* Header */}
      <div className="detail-header">
        <div className="detail-lot-name">
          <div className="icon">🅿️</div>
          {lot.name}
          <span className="live-badge lg">🟢 LIVE</span>
        </div>
        <div className="detail-address">📍 {lot.address}</div>
        <div className="detail-source-tag">
          Data source: <strong>ESP32 + IR Sensors → Supabase</strong> &middot; Refreshing every 3s
        </div>
      </div>

      {/* Stats */}
      <div className="detail-stats">
        <div className="detail-stat-card total animate-fade-in-up-1">
          <div className="detail-stat-value" style={{ color: 'var(--accent-blue)' }}>
            {lot.totalSlots}
          </div>
          <div className="detail-stat-label">Total Slots</div>
        </div>
        <div className="detail-stat-card available animate-fade-in-up-2">
          <div className="detail-stat-value" style={{ color: 'var(--accent-green)' }}>
            {available}
          </div>
          <div className="detail-stat-label">Available</div>
        </div>
        <div className="detail-stat-card occupied animate-fade-in-up-3">
          <div className="detail-stat-value" style={{ color: 'var(--accent-red)' }}>
            {occupied}
          </div>
          <div className="detail-stat-label">Occupied</div>
        </div>
      </div>

      {/* Slot Grid */}
      <div className="slots-section-title">🚗 Individual Slot Status</div>
      <div className="slot-grid">
        {slots.map((slot) => (
          <SlotCard
            key={slot.number}
            slotNumber={slot.number}
            isOccupied={slot.occupied}
            animationDelay={slot.number}
          />
        ))}
      </div>

      {/* Timestamp */}
      <div className="timestamp">
        🕐 Last Updated:{' '}
        {parkingData?.updated_at
          ? new Date(parkingData.updated_at).toLocaleString('en-IN', {
              dateStyle: 'medium',
              timeStyle: 'medium',
            })
          : 'N/A'}
      </div>

      <div className="refresh-indicator">
        <div className="refresh-dot"></div>
        Auto-refreshing every 3s
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// DUMMY LOT — simulated data refreshing every 10 seconds
// ════════════════════════════════════════════════════════════
function DummyLotDetail({ lot }) {
  const dummyData = useSingleDummyLot(lot.totalSlots);

  const available = dummyData.available;
  const occupied = dummyData.occupied;

  // Build slot array from dummyData.slots
  const slots = [];
  for (let i = 1; i <= lot.totalSlots; i++) {
    slots.push({
      number: i,
      occupied: dummyData.slots?.[`slot_${i}`] ?? false,
    });
  }

  // Decide grid columns based on total slots
  const gridClass =
    lot.totalSlots <= 6
      ? 'slot-grid cols-2'
      : lot.totalSlots <= 20
        ? 'slot-grid cols-4'
        : 'slot-grid cols-5';

  return (
    <div className="detail-page animate-fade-in">
      <Link to="/" className="back-button">← Back to Map</Link>

      {/* Header */}
      <div className="detail-header">
        <div className="detail-lot-name">
          <div className="icon">🅿️</div>
          {lot.name}
        </div>
        <div className="detail-address">📍 {lot.address}</div>
        <div className="detail-source-tag">
          Simulated data &middot; Refreshing every 10s
        </div>
      </div>

      {/* Stats */}
      <div className="detail-stats">
        <div className="detail-stat-card total animate-fade-in-up-1">
          <div className="detail-stat-value" style={{ color: 'var(--accent-blue)' }}>
            {lot.totalSlots}
          </div>
          <div className="detail-stat-label">Total Slots</div>
        </div>
        <div className="detail-stat-card available animate-fade-in-up-2">
          <div className="detail-stat-value" style={{ color: 'var(--accent-green)' }}>
            {available}
          </div>
          <div className="detail-stat-label">Available</div>
        </div>
        <div className="detail-stat-card occupied animate-fade-in-up-3">
          <div className="detail-stat-value" style={{ color: 'var(--accent-red)' }}>
            {occupied}
          </div>
          <div className="detail-stat-label">Occupied</div>
        </div>
      </div>

      {/* Occupancy bar */}
      <div className="occupancy-bar-wrapper">
        <div className="occupancy-bar-label">
          Occupancy: {lot.totalSlots > 0 ? Math.round((occupied / lot.totalSlots) * 100) : 0}%
        </div>
        <div className="occupancy-bar-track">
          <div
            className="occupancy-bar-fill"
            style={{
              width: `${lot.totalSlots > 0 ? (occupied / lot.totalSlots) * 100 : 0}%`,
            }}
          ></div>
        </div>
      </div>

      {/* Slot Grid */}
      <div className="slots-section-title">🚗 Individual Slot Status</div>
      <div className={gridClass}>
        {slots.map((slot) => (
          <SlotCard
            key={slot.number}
            slotNumber={slot.number}
            isOccupied={slot.occupied}
            animationDelay={((slot.number - 1) % 4) + 1}
          />
        ))}
      </div>

      {/* Timestamp */}
      <div className="timestamp">
        🕐 Last Simulated:{' '}
        {dummyData.updated_at
          ? new Date(dummyData.updated_at).toLocaleString('en-IN', {
              dateStyle: 'medium',
              timeStyle: 'medium',
            })
          : 'N/A'}
      </div>

      <div className="refresh-indicator">
        <div className="refresh-dot"></div>
        Simulated &middot; Refreshing every 10s
      </div>
    </div>
  );
}
