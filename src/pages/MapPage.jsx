import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../supabaseClient';
import PARKING_LOTS from '../data/parkingLots';
import { sortByDistance } from '../utils/distance';
import useGeolocation from '../hooks/useGeolocation';
import { useDummyLots } from '../hooks/useDummyData';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';

// Separate dummy lots for the hook (stable reference)
const DUMMY_LOTS = PARKING_LOTS.filter((l) => !l.isReal);
const REAL_LOT = PARKING_LOTS.find((l) => l.isReal);

// ─── Marker icon factory ───────────────────────────────────
function createMarkerIcon(available, total) {
  const pct = total > 0 ? available / total : 0;
  let color, glowColor;
  if (pct === 0) {
    color = '#ef4444'; glowColor = 'rgba(239,68,68,0.4)';
  } else if (pct < 0.5) {
    color = '#f59e0b'; glowColor = 'rgba(245,158,11,0.4)';
  } else {
    color = '#10b981'; glowColor = 'rgba(16,185,129,0.4)';
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52">
      <defs>
        <filter id="s${available}" x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="${glowColor}" flood-opacity="0.8"/>
        </filter>
      </defs>
      <path d="M20 0C8.954 0 0 8.954 0 20c0 15 20 32 20 32s20-17 20-32C40 8.954 31.046 0 20 0z"
            fill="${color}" filter="url(#s${available})"/>
      <circle cx="20" cy="18" r="12" fill="rgba(0,0,0,0.2)"/>
      <text x="20" y="23" text-anchor="middle" font-family="Inter,sans-serif"
            font-size="13" font-weight="700" fill="white">${available}</text>
    </svg>`;

  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [40, 52],
    iconAnchor: [20, 52],
    popupAnchor: [0, -44],
  });
}

// ─── Fit map bounds to markers ─────────────────────────────
function FitBounds({ lots }) {
  const map = useMap();
  useEffect(() => {
    if (lots.length === 0) return;
    const bounds = L.latLngBounds(lots.map((l) => [l.lat, l.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [map, lots]);
  return null;
}

// ─── Filter button labels ──────────────────────────────────
const FILTERS = [
  { key: 'all', label: 'All', icon: '🗂️' },
  { key: 'nearby', label: 'Nearby (< 5 km)', icon: '📍' },
  { key: 'available', label: 'Available', icon: '🟢' },
  { key: 'full', label: 'Full', icon: '🔴' },
];

// ════════════════════════════════════════════════════════════
export default function MapPage() {
  const navigate = useNavigate();

  // ── Real lot data from Supabase ──
  const [realData, setRealData] = useState(null);
  const [realError, setRealError] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // ── Dummy data ──
  const dummyDataMap = useDummyLots(DUMMY_LOTS);

  // ── Search & filter ──
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // ── Geolocation ──
  const {
    location: userLoc,
    locationName,
    locating,
    hasLocation,
    requestLocation,
  } = useGeolocation();

  // ── Fetch Supabase data for real lot ──
  const fetchRealData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('parking_slots')
        .select('*')
        .eq('lot_name', 'lot_A')
        .single();
      if (error) throw error;
      setRealData(data);
      setRealError(null);
    } catch (err) {
      console.error('Supabase fetch error:', err);
      setRealError(err.message);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRealData();
    const interval = setInterval(fetchRealData, 3000);
    return () => clearInterval(interval);
  }, [fetchRealData]);

  // ── Build unified data for all lots ──
  const allLotsData = useMemo(() => {
    return PARKING_LOTS.map((lot) => {
      if (lot.isReal) {
        return {
          ...lot,
          available: realData?.available ?? 0,
          occupied: realData?.occupied ?? 0,
          updated_at: realData?.updated_at ?? null,
        };
      }
      const dummy = dummyDataMap[lot.id];
      return {
        ...lot,
        available: dummy?.available ?? 0,
        occupied: dummy?.occupied ?? 0,
        updated_at: dummy?.updated_at ?? null,
      };
    });
  }, [realData, dummyDataMap]);

  // ── With distances ──
  const lotsWithDist = useMemo(() => {
    return sortByDistance(allLotsData, userLoc.lat, userLoc.lng);
  }, [allLotsData, userLoc]);

  // ── Filtered lots ──
  const filteredLots = useMemo(() => {
    let list = lotsWithDist;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.address.toLowerCase().includes(q)
      );
    }

    // Filter buttons
    switch (activeFilter) {
      case 'nearby':
        list = list.filter((l) => l.distance < 5);
        break;
      case 'available':
        list = list.filter((l) => l.available > 0);
        break;
      case 'full':
        list = list.filter((l) => l.available === 0);
        break;
      default:
        break;
    }

    return list;
  }, [lotsWithDist, search, activeFilter]);

  // ── Loading / Error ──
  if (initialLoading && !Object.keys(dummyDataMap).length) {
    return <LoadingSpinner />;
  }

  // ── Pin color helper text ──
  function statusBadge(lot) {
    const pct = lot.totalSlots > 0 ? lot.available / lot.totalSlots : 0;
    if (pct === 0) return { cls: 'badge-red', text: 'FULL' };
    if (pct < 0.5) return { cls: 'badge-amber', text: 'FILLING' };
    return { cls: 'badge-green', text: 'AVAILABLE' };
  }

  return (
    <div className="animate-fade-in">
      {/* ── Header row ── */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">🗺️ Parking Overview</h1>
          <p className="page-subtitle">
            {hasLocation && locationName
              ? `Showing parking near ${locationName}`
              : 'Live monitoring across Ludhiana'}
          </p>
        </div>
        <button
          className={`location-btn ${locating ? 'locating' : ''}`}
          onClick={requestLocation}
          disabled={locating}
        >
          {locating ? (
            <>⏳ Detecting...</>
          ) : hasLocation ? (
            <>📍 Location Active</>
          ) : (
            <>📍 Use My Location</>
          )}
        </button>
      </div>

      {/* ── Search bar ── */}
      <div className="search-bar-wrapper">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            id="search-lots"
            type="text"
            placeholder="Search by name or area..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Filter buttons ── */}
      <div className="filter-row">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`filter-btn ${activeFilter === f.key ? 'active' : ''}`}
            onClick={() => setActiveFilter(f.key)}
          >
            <span>{f.icon}</span> {f.label}
          </button>
        ))}
        <div className="filter-count">
          {filteredLots.length} of {PARKING_LOTS.length} lots
        </div>
      </div>

      {/* ── Map + Sidebar ── */}
      <div className="map-section">
        {/* Map */}
        <div className="map-container">
          <MapContainer
            center={[userLoc.lat, userLoc.lng]}
            zoom={13}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds lots={filteredLots.length ? filteredLots : PARKING_LOTS} />

            {/* User location blue dot */}
            {hasLocation && (
              <CircleMarker
                center={[userLoc.lat, userLoc.lng]}
                radius={10}
                pathOptions={{
                  color: '#3b82f6',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.35,
                  weight: 3,
                }}
              >
                <Popup className="custom-popup">
                  <div className="popup-content">
                    <div className="popup-title">📍 You are here</div>
                  </div>
                </Popup>
              </CircleMarker>
            )}

            {/* Lot markers */}
            {filteredLots.map((lot) => (
              <Marker
                key={lot.id}
                position={[lot.lat, lot.lng]}
                icon={createMarkerIcon(lot.available, lot.totalSlots)}
              >
                <Popup className="custom-popup" maxWidth={260}>
                  <div className="popup-content">
                    <div className="popup-title">
                      🅿️ {lot.name}
                      {lot.isReal && <span className="live-dot-inline"></span>}
                    </div>
                    <div className="popup-stats">
                      <div className="popup-stat">
                        <span className="dot green"></span>
                        {lot.available} Available
                      </div>
                      <div className="popup-stat">
                        <span className="dot red"></span>
                        {lot.occupied} Occupied
                      </div>
                    </div>
                    {lot.distance !== undefined && (
                      <div className="popup-distance">
                        📏 {lot.distance.toFixed(1)} km away
                      </div>
                    )}
                    <button
                      className="popup-btn"
                      onClick={() => navigate(`/lot/${lot.id}`)}
                    >
                      View Slots →
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Sidebar — scrollable lot cards */}
        <div className="sidebar">
          {filteredLots.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🚫</div>
              <div className="empty-text">No lots match your filters</div>
            </div>
          )}

          {filteredLots.map((lot, i) => {
            const badge = statusBadge(lot);
            return (
              <div
                className="lot-card"
                key={lot.id}
                onClick={() => navigate(`/lot/${lot.id}`)}
                style={{ animationDelay: `${Math.min(i * 50, 400)}ms` }}
              >
                <div className="lot-card-top">
                  <div className="lot-card-left">
                    <div className="lot-card-name">
                      {lot.name}
                      {lot.isReal && <span className="live-badge">LIVE</span>}
                    </div>
                    <div className="lot-card-address">📍 {lot.address}</div>
                  </div>
                  <span className={`info-card-badge ${badge.cls}`}>
                    {badge.text}
                  </span>
                </div>
                <div className="lot-card-bottom">
                  <div className="lot-card-stat">
                    <span className="stat-value green">{lot.available}</span>
                    <span className="stat-label">Free</span>
                  </div>
                  <div className="lot-card-stat">
                    <span className="stat-value red">{lot.occupied}</span>
                    <span className="stat-label">Used</span>
                  </div>
                  <div className="lot-card-stat">
                    <span className="stat-value blue">{lot.totalSlots}</span>
                    <span className="stat-label">Total</span>
                  </div>
                  {lot.distance !== undefined && (
                    <div className="lot-card-stat">
                      <span className="stat-value amber">
                        {lot.distance.toFixed(1)}
                      </span>
                      <span className="stat-label">km</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Refresh indicator */}
      <div className="refresh-indicator">
        <div className="refresh-dot"></div>
        Live &middot; Real lot 3s &middot; Simulated 10s
      </div>
    </div>
  );
}
