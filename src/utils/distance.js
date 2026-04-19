// Haversine formula to calculate distance between two coordinates in kilometers

const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Calculate distance between two lat/lng points using Haversine formula
 * @returns {number} distance in kilometers
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Sort an array of lots by distance from a reference point
 * @param {Array} lots - parking lots array
 * @param {number} userLat - user latitude
 * @param {number} userLng - user longitude
 * @returns {Array} lots with .distance property, sorted ascending
 */
export function sortByDistance(lots, userLat, userLng) {
  return lots
    .map((lot) => ({
      ...lot,
      distance: haversineDistance(userLat, userLng, lot.lat, lot.lng),
    }))
    .sort((a, b) => a.distance - b.distance);
}
