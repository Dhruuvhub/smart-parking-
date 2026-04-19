import { useState, useCallback } from 'react';

const DEFAULT_CENTER = { lat: 30.9010, lng: 75.8573 }; // Ludhiana center

/**
 * Custom hook for browser geolocation with permission handling
 */
export default function useGeolocation() {
  const [location, setLocation] = useState(DEFAULT_CENTER);
  const [locationName, setLocationName] = useState(null);
  const [locating, setLocating] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [hasLocation, setHasLocation] = useState(false);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setPermissionDenied(true);
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        setHasLocation(true);
        setLocating(false);
        setPermissionDenied(false);

        // Reverse geocode to get a rough area name
        reverseGeocode(latitude, longitude).then((name) => {
          setLocationName(name);
        });
      },
      (error) => {
        console.warn('Geolocation error:', error.message);
        setPermissionDenied(true);
        setLocating(false);
        // Keep using default center
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // Cache for 5 min
      }
    );
  }, []);

  return {
    location,
    locationName,
    locating,
    permissionDenied,
    hasLocation,
    requestLocation,
  };
}

/**
 * Simple reverse geocode using free Nominatim API
 */
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    const addr = data.address;
    // Return suburb / neighbourhood / city
    return (
      addr?.suburb ||
      addr?.neighbourhood ||
      addr?.city_district ||
      addr?.city ||
      addr?.town ||
      'your area'
    );
  } catch {
    return 'your area';
  }
}
