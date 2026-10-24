import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';

export default function TripHistory() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      let local = [];
      try {
        local = JSON.parse(localStorage.getItem('tripHistory') || '[]');
      } catch { /* ignore corrupt storage */ }

      // retry uploading trips that couldn't reach the server when they finished
      for (const t of local.filter((x) => !x.synced && x.tripId)) {
        try {
          await api.post('/trips/complete', t);
          t.synced = true;
        } catch { /* still offline; try next time */ }
      }
      localStorage.setItem('tripHistory', JSON.stringify(local));

      let server = [];
      try {
        const res = await api.get('/trips/history');
        server = Array.isArray(res.data?.trips) ? res.data.trips : [];
      } catch { /* server unreachable: show local only */ }

      const seen = new Set(server.map((t) => t.tripId));
      setTrips([...server, ...local.filter((t) => !seen.has(t.tripId))]);
      setLoading(false);
    }
    load();
  }, []);

  const fmt = (v, d = 2) => (v === null || v === undefined || Number.isNaN(Number(v)) ? '—' : Number(v).toFixed(d));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-extrabold text-slate-800">📜 Trip History</h2>
        <span className="text-xs font-semibold text-slate-500">Completed Trips: {trips.length}</span>
      </div>

      {loading ? (
        <div className="text-center p-8 text-slate-400">Loading trip history...</div>
      ) : trips.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl text-center text-slate-400 border border-slate-100">
          No completed trips found. Start and complete a trip from the <b>New Trip</b> tab!
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((trip, idx) => (
            <div key={trip.tripId || idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">{trip.origin} ➔ {trip.destination}</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">{trip.status || 'COMPLETED'}</span>
                  {trip.synced === false && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">Not synced</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Completed: {trip.completedAt || 'Recently'} | Route: {trip.title || 'Standard'} | {fmt(trip.distanceKm, 1)} km
                </p>
              </div>
              <div className="flex gap-4 text-xs">
                <div className="text-center">
                  <span className="text-slate-400 block">{trip.fuelUnit === 'kWh' ? 'Energy' : 'Fuel'}</span>
                  <span className="font-bold text-slate-700">{fmt(trip.fuelLiters)} {trip.fuelUnit || 'L'}</span>
                </div>
                <div className="text-center">
                  <span className="text-slate-400 block">CO₂</span>
                  <span className="font-bold text-slate-700">{fmt(trip.co2Kg)} kg</span>
                </div>
                <div className="text-center">
                  <span className="text-slate-400 block">Eco Score</span>
                  <span className="font-bold text-emerald-600">{trip.ecoScore != null ? `${trip.ecoScore}/100` : '—'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
