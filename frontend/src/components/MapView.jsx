import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function bearingBetween(p1, p2) {
  const lat1 = (p1[0] * Math.PI) / 180;
  const lon1 = (p1[1] * Math.PI) / 180;
  const lat2 = (p2[0] * Math.PI) / 180;
  const lon2 = (p2[1] * Math.PI) / 180;
  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Fallback heading when the device gives none: direction of the road ahead.
function roadBearing(currentPos, path) {
  if (!path || path.length < 2 || !currentPos) return 0;
  let closest = 0;
  let min = Infinity;
  for (let i = 0; i < path.length; i++) {
    const d = (path[i][0] - currentPos[0]) ** 2 + (path[i][1] - currentPos[1]) ** 2;
    if (d < min) { min = d; closest = i; }
  }
  const next = Math.min(closest + 1, path.length - 1);
  return closest === next ? 0 : bearingBetween(path[closest], path[next]);
}

const pin = (color, label) =>
  L.divIcon({
    className: '',
    html: `<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);color:#fff;font:700 12px sans-serif">${label}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });

const isPoint = (p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]);

export default function MapView({
  routes = [],
  selectedRouteId,
  originCoords,          // [lat, lng] optional start pin
  destinationCoords,     // [lat, lng] optional end pin
  currentLocation,       // [lat, lng]
  accuracyM,             // GPS accuracy circle radius in metres (optional)
  heading = 0,
  autoCenterOnGps = false,
  onUserInteract,        // called when the user drags/zooms the map (so the page can stop auto-follow)
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const routeGroupRef = useRef(null);
  const markerGroupRef = useRef(null);
  const vehicleRef = useRef(null);
  const accuracyRef = useRef(null);
  const fittedKeyRef = useRef('');
  const interactRef = useRef(onUserInteract);
  interactRef.current = onUserInteract;

  // create the map once
  useEffect(() => {
    if (!containerRef.current) return undefined;
    const map = L.map(containerRef.current, { zoomControl: false }).setView([12.9716, 77.5946], 14);
    // OpenStreetMap's tile policy requires attribution to stay visible.
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    routeGroupRef.current = L.layerGroup().addTo(map);
    markerGroupRef.current = L.layerGroup().addTo(map);
    // only real user gestures (not our own panTo) stop auto-follow
    map.on('dragstart', () => interactRef.current?.());
    map.on('zoomstart', (e) => { if (e.originalEvent) interactRef.current?.(); });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      routeGroupRef.current = null;
      markerGroupRef.current = null;
      vehicleRef.current = null;   // reset, otherwise a remounted map keeps a marker from the dead one
      accuracyRef.current = null;
      fittedKeyRef.current = '';
    };
  }, []);

  // route lines + start/end pins
  useEffect(() => {
    const map = mapRef.current;
    const group = routeGroupRef.current;
    if (!map || !group) return;
    group.clearLayers();
    const all = [];
    routes.forEach((route) => {
      if (!route.pathPoints?.length) return;
      const selected = route.id === selectedRouteId || routes.length === 1;
      group.addLayer(L.polyline(route.pathPoints, { color: selected ? '#2563eb' : '#94a3b8', weight: selected ? 6 : 4, opacity: 0.9 }));
      route.pathPoints.forEach((p) => all.push(p));
    });
    const start = isPoint(originCoords) ? originCoords : all[0];
    const end = isPoint(destinationCoords) ? destinationCoords : all[all.length - 1];
    if (isPoint(start) && all.length) group.addLayer(L.marker(start, { icon: pin('#16a34a', 'A'), interactive: false }));
    if (isPoint(end) && all.length) group.addLayer(L.marker(end, { icon: pin('#dc2626', 'B'), interactive: false }));

    // fit the view when the route itself changes (not on every GPS tick)
    const key = `${all.length}:${all[0]}:${all[all.length - 1]}`;
    if (all.length && key !== fittedKeyRef.current) {
      fittedKeyRef.current = key;
      map.fitBounds(L.latLngBounds(all), { padding: [60, 60], maxZoom: 16 });
    }
  }, [routes, selectedRouteId, originCoords, destinationCoords]);

  // vehicle marker + accuracy circle
  useEffect(() => {
    const map = mapRef.current;
    const group = markerGroupRef.current;
    if (!map || !group) return;

    if (!isPoint(currentLocation)) {
      if (vehicleRef.current) { group.removeLayer(vehicleRef.current); vehicleRef.current = null; }
      if (accuracyRef.current) { group.removeLayer(accuracyRef.current); accuracyRef.current = null; }
      return;
    }

    const path = (routes.find((r) => r.id === selectedRouteId) || routes[0])?.pathPoints || [];
    const angle = heading || roadBearing(currentLocation, path);
    const icon = L.divIcon({
      className: 'vehicle-marker',
      html: `<div style="transform:rotate(${angle}deg);transition:transform .4s ease-out;width:44px;height:44px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 4px 8px rgba(0,0,0,.4))"><svg width="40" height="40" viewBox="0 0 24 24" fill="#2563eb" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"><polygon points="12 2 19 21 12 17 5 21 12 2"/></svg></div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
    if (!vehicleRef.current) {
      vehicleRef.current = L.marker(currentLocation, { icon, zIndexOffset: 1000, interactive: false }).addTo(group);
    } else {
      vehicleRef.current.setLatLng(currentLocation);
      vehicleRef.current.setIcon(icon);
    }

    if (Number.isFinite(accuracyM) && accuracyM > 0) {
      if (!accuracyRef.current) {
        accuracyRef.current = L.circle(currentLocation, { radius: accuracyM, color: '#2563eb', weight: 1, fillOpacity: 0.1, interactive: false }).addTo(group);
      } else {
        accuracyRef.current.setLatLng(currentLocation);
        accuracyRef.current.setRadius(accuracyM);
      }
    } else if (accuracyRef.current) {
      group.removeLayer(accuracyRef.current);
      accuracyRef.current = null;
    }

    if (autoCenterOnGps) {
      // follow the vehicle but never fight the user's zoom: only zoom in if we're far out
      if (map.getZoom() < 15) map.setView(currentLocation, 16, { animate: true });
      else map.panTo(currentLocation, { animate: true, duration: 0.5 });
    }
  }, [currentLocation, accuracyM, heading, autoCenterOnGps, routes, selectedRouteId]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-inner z-0 bg-slate-100">
      <div ref={containerRef} className="w-full h-full" style={{ minHeight: '100%', minWidth: '100%' }} />
    </div>
  );
}
