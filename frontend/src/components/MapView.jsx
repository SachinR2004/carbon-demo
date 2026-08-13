import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertTriangle, Loader } from 'lucide-react';

// Leaflet's default marker icon paths don't resolve correctly through Vite's
// bundler, so we point them at a CDN instead of bundling the images locally.
const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const youAreHereIcon = new L.DivIcon({
  className: '',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#2563eb;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.5)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Free OSM geocoder (Nominatim) — turns an address string into { lat, lng }.
// Works worldwide, including India.
async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error('Geocoding failed');
  const data = await res.json();
  if (!data.length) throw new Error('Address not found');
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

// Free public OSRM routing server — real driving directions, worldwide, no key.
async function getDrivingRoute(origin, destination) {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Routing failed');
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No route found');
  const route = data.routes[0];
  return {
    positions: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  };
}

// Refits the map's view whenever the set of points we care about changes.
function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (!positions || positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 13);
    } else {
      map.fitBounds(positions, { padding: [30, 30] });
    }
  }, [positions, map]);
  return null;
}

/**
 * Real interactive map using OpenStreetMap tiles + the free OSRM routing
 * engine. No API key, no billing account, works worldwide (including India).
 * - Pass `origin` + `destination` (address strings) to draw an actual driving route.
 * - Otherwise pass `markers` ([{ lat, lng, label }]) to drop pins (e.g. live driver positions).
 * - Pass `currentPosition` ({ lat, lng }) to drop a live "you are here" marker on top of a route.
 * - Pass `onRouteInfo` to receive { distanceMeters, durationSeconds, startLocation, endLocation }
 *   once a route resolves — useful for computing real trip progress.
 */
export default function MapView({ routes = [], center = { lat: 40.7128, lng: -74.006 }, zoom = 12, markers = [], origin, destination, currentPosition, onRouteInfo }) {
  const [routeData, setRouteData] = useState(null);
  const [routeError, setRouteError] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false);

  const wantsDirections = Boolean(origin && destination);

  useEffect(() => {
    setRouteData(null);
    setRouteError(false);

    if (!wantsDirections) return;

    let cancelled = false;
    setLoadingRoute(true);

    (async () => {
      try {
        const [originPt, destPt] = await Promise.all([
          geocodeAddress(origin),
          geocodeAddress(destination),
        ]);
        const route = await getDrivingRoute(originPt, destPt);
        if (cancelled) return;
        setRouteData(route);
        if (onRouteInfo) {
          onRouteInfo({
            distanceMeters: route.distanceMeters,
            durationSeconds: route.durationSeconds,
            startLocation: originPt,
            endLocation: destPt,
          });
        }
      } catch (e) {
        if (!cancelled) setRouteError(true);
      } finally {
        if (!cancelled) setLoadingRoute(false);
      }
    })();

    return () => { cancelled = true; };
  }, [origin, destination, wantsDirections, onRouteInfo]);

  const markerPositions = useMemo(() => markers.map(m => [m.lat, m.lng]), [markers]);

  const fitPositions = wantsDirections
    ? (routeData?.positions || [])
    : (markers.length > 0 ? markerPositions : [[center.lat, center.lng]]);

  return (
    <div className="relative w-full h-full min-h-[300px] rounded-2xl overflow-hidden border border-neutral-border">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        style={{ width: '100%', height: '100%', minHeight: 300 }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {wantsDirections && routeData && (
          <>
            <Polyline positions={routeData.positions} pathOptions={{ color: '#16a34a', weight: 5, opacity: 0.85 }} />
            <Marker position={routeData.positions[0]} icon={defaultIcon} />
            <Marker position={routeData.positions[routeData.positions.length - 1]} icon={defaultIcon} />
          </>
        )}

        {!wantsDirections && markers.map((m, i) => (
          <Marker key={i} position={[m.lat, m.lng]} icon={defaultIcon} />
        ))}

        {!wantsDirections && markers.length === 0 && (
          <Marker position={[center.lat, center.lng]} icon={defaultIcon} />
        )}

        {currentPosition && (
          <Marker position={[currentPosition.lat, currentPosition.lng]} icon={youAreHereIcon} />
        )}

        <FitBounds positions={fitPositions} />
      </MapContainer>

      {wantsDirections && loadingRoute && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-[1000]">
          <Loader className="animate-spin text-primary" size={28} />
        </div>
      )}

      {wantsDirections && routeError && (
        <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center text-center p-6 z-[1000]">
          <AlertTriangle className="mb-2 text-warning" size={28} />
          <p className="font-semibold text-neutral-textMain">Couldn't find a route</p>
          <p className="text-xs text-neutral-textMuted mt-1">Try more specific addresses for "{origin}" and "{destination}".</p>
        </div>
      )}

      <div className="absolute top-2 left-2 bg-primary-light text-white px-3 py-1 rounded-full text-xs font-bold shadow-md z-[1000]">
        {routes.length > 0 ? `${routes.length} Candidate Route${routes.length > 1 ? 's' : ''}` : 'Live Map'}
      </div>
    </div>
  );
}
