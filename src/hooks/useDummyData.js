import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Generate random slot data for a dummy lot
 * @param {number} totalSlots - total number of slots
 * @param {object|null} prev - previous state to create realistic drift
 * @returns {object} simulated parking data
 */
function generateDummyData(totalSlots, prev = null) {
  let occupied;

  if (prev !== null && prev.occupied !== undefined) {
    // Drift: change by -2 to +2 from previous state for realistic feel
    const delta = Math.floor(Math.random() * 5) - 2;
    occupied = Math.max(0, Math.min(totalSlots, prev.occupied + delta));
  } else {
    // Initial: random 30%-80% occupancy
    const ratio = 0.3 + Math.random() * 0.5;
    occupied = Math.round(totalSlots * ratio);
  }

  const available = totalSlots - occupied;

  // Generate individual slot booleans
  const slots = {};
  const occupiedIndices = new Set();
  while (occupiedIndices.size < occupied) {
    occupiedIndices.add(Math.floor(Math.random() * totalSlots) + 1);
  }
  for (let i = 1; i <= totalSlots; i++) {
    slots[`slot_${i}`] = occupiedIndices.has(i);
  }

  return {
    available,
    occupied,
    slots,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Hook to manage simulated data for all dummy lots.
 * Returns a map of lotId -> { available, occupied, slots, updated_at }
 */
export function useDummyLots(dummyLots) {
  const [dataMap, setDataMap] = useState({});
  const prevRef = useRef({});

  // Initialize on first render
  useEffect(() => {
    const initial = {};
    dummyLots.forEach((lot) => {
      initial[lot.id] = generateDummyData(lot.totalSlots);
    });
    setDataMap(initial);
    prevRef.current = initial;
  }, []); // Only run once on mount

  // Refresh every 10 seconds with slight drift
  useEffect(() => {
    const interval = setInterval(() => {
      setDataMap((prev) => {
        const next = {};
        dummyLots.forEach((lot) => {
          next[lot.id] = generateDummyData(lot.totalSlots, prev[lot.id] || null);
        });
        prevRef.current = next;
        return next;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [dummyLots]);

  return dataMap;
}

/**
 * Hook for a single dummy lot's detail page.
 * Returns slot-level data, refreshes every 10 seconds.
 */
export function useSingleDummyLot(totalSlots) {
  const [data, setData] = useState(() => generateDummyData(totalSlots));

  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => generateDummyData(totalSlots, prev));
    }, 10000);
    return () => clearInterval(interval);
  }, [totalSlots]);

  return data;
}
