import React, { useState, useEffect, useRef } from 'react';
import Card from '../../components/Card';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet Default Marker Icons in React
import iconMarker from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: iconMarker,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function LiveFleetMap() {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const layersGroupRef = useRef(null);

  const [fleetList, setFleetList] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  useEffect(() => {
    const storedVehicles = JSON.parse(localStorage.getItem('fleetVehicles') || '[]');
    
    const activeFleet = storedVehicles.length > 0 ? storedVehicles : [
      { regNo: 'EV-2024-X', type: 'Electric Van', fuel: 'Electric', capacity: '2,000', emission: '0 g/km', driver: 'Demo Driver', status: 'Active' }
    ];

    setFleetList(activeFleet);
    setSelectedVehicle(activeFleet[0]);
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletMapRef.current) {
      const map = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([12.75, 77.1], 9);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      layersGroupRef.current = L.layerGroup().addTo(map);
      leafletMapRef.current = map;
    }

    const timer = setTimeout(() => {
      leafletMapRef.current?.invalidateSize();
    }, 300);

    return () => {
      clearTimeout(timer);
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = leafletMapRef.current;
    const layerGroup = layersGroupRef.current;
    if (!map || !layerGroup || !selectedVehicle) return;

    layerGroup.clearLayers();
    const bounds = L.latLngBounds([]);
    const markerColor = '#1e293b'; // Sleek slate/light-black

    const routeCorridors = [
      { origin: 'Bengaluru Hub', dest: 'Mysuru Eco-Corridor', coords: [12.5218, 76.8951], points: [[12.9716, 77.5946], [12.7226, 77.2811], [12.5218, 76.8951], [12.2958, 76.6394]] },
      { origin: 'Bengaluru North', dest: 'Tumakuru Industrial Zone', coords: [13.3409, 77.1010], points: [[12.9716, 77.5946], [13.1986, 77.7066], [13.3409, 77.1010]] },
      { origin: 'Bengaluru East', dest: 'Kolar Logistics Park', coords: [13.1343, 78.1272], points: [[12.9716, 77.5946], [13.0827, 77.7010], [13.1343, 78.1272]] }
    ];

    const corridor = routeCorridors[selectedVehicle.regNo.length % routeCorridors.length];

    const polyline = L.polyline(corridor.points, {
      color: markerColor,
      weight: 5,
      opacity: 0.8,
    }).addTo(layerGroup);

    bounds.extend(polyline.getBounds());

    const vehicleMarker = L.circleMarker(corridor.coords, {
      radius: 13,
      fillColor: markerColor,
      color: '#ffffff',
      weight: 3,
      opacity: 1,
      fillOpacity: 1,
    }).addTo(layerGroup);

    vehicleMarker.bindPopup(`
      <div style="font-family: sans-serif; padding: 4px;">
        <h4 style="margin: 0; font-weight: bold; font-size: 13px; color: #0f172a;">${selectedVehicle.driver || 'Assigned Driver'}</h4>
        <p style="margin: 2px 0; font-size: 11px; color: #475569;">Vehicle: ${selectedVehicle.regNo}</p>
        <p style="margin: 2px 0; font-size: 11px; color: #475569;">Route: ${corridor.origin} ➔ ${corridor.dest}</p>
        <div style="margin-top: 6px; padding: 2px 6px; background: #0f172a; color: white; border-radius: 4px; font-size: 10px; font-weight: bold; display: inline-block;">
          ${selectedVehicle.status || 'ACTIVE'} • 58 km/h
        </div>
      </div>
    `);

    bounds.extend(corridor.coords);
    vehicleMarker.openPopup();

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [60, 60] });
    }

    map.invalidateSize();
  }, [selectedVehicle]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans p-6 text-slate-800">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Live Fleet Map & Telemetry</h1>
          <p className="text-xs text-slate-500 mt-0.5">Real-time GPS tracking across registered commercial vehicles.</p>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-900 text-white rounded-full text-xs font-bold shadow-xs">
          <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
          {fleetList.length} Vehicles Managed in Fleet
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Sidebar: Fleet Selection & Unit Telemetry (4 Columns) */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Select Fleet Unit</h3>
          
          <div className="space-y-3">
            {fleetList.map((v, idx) => {
              const isSelected = selectedVehicle?.regNo === v.regNo;
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedVehicle(v)}
                  className={`p-4 rounded-2xl border transition cursor-pointer bg-white shadow-xs space-y-2 ${
                    isSelected ? 'border-slate-900 ring-2 ring-slate-900/10 bg-slate-50/50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-slate-900 text-sm block">{v.regNo}</span>
                      <span className="text-xs font-semibold text-slate-600">{v.type} ({v.fuel})</span>
                    </div>
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-[9px] font-black uppercase tracking-wider">
                      {v.status || 'Active'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span>Driver: <strong className="text-slate-900">{v.driver}</strong></span>
                    <span className="font-mono text-slate-500">{v.capacity} kg</span>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedVehicle && (
            <div className="p-5 rounded-3xl border border-slate-200 shadow-sm bg-white space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-full bg-slate-900" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Telemetry Feed</h4>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Payload</span>
                  <span className="font-bold text-slate-900">{selectedVehicle.capacity} kg</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Emission Profile</span>
                  <span className="font-bold text-slate-900">{selectedVehicle.emission || '0 g/km'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Area: Expanded Full Leaflet Map View (8 Columns) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative">
          <div ref={mapRef} className="w-full h-[600px] z-0" />

          {/* Map Overlay Badge */}
          <div className="absolute bottom-6 left-6 bg-slate-900/95 text-white backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-800 shadow-lg text-xs space-y-1 z-[400]">
            <div className="font-black text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" /> Live Telemetry Target: {selectedVehicle?.regNo || 'Fleet Unit'}
            </div>
            <p className="text-[11px] text-slate-400">Autonomous corridor tracking active.</p>
          </div>
        </div>

      </div>
    </div>
  );
}