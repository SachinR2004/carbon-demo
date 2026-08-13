import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { History, Leaf, Navigation, Loader, CheckCircle } from 'lucide-react';
import Card from '../../components/Card';
import api from '../../api/api';

export default function TripHistory() {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Note: To show history properly we would need an endpoint like GET /trips/history
    // For now, let's fetch all (which the mock/API would need to support or we'll just mock it)
    // Actually, Phase 3 didn't build GET /trips listing, so let's use a mock list for the UI until Phase 5 Reporting
    setLoading(false);
    
    // In a real app we'd fetch this from the backend
    setTrips([
      { id: 101, source: "Distribution Center", destination: "Store A", status: "completed", date: "2026-07-02", actual_co2_kg: 12.4, eco_score: 85 },
      { id: 102, source: "Store A", destination: "Store B", status: "completed", date: "2026-07-03", actual_co2_kg: 8.1, eco_score: 92 },
    ]);
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-sky/10 rounded-xl flex items-center justify-center text-sky">
          <History size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-textMain">Trip History</h1>
          <p className="text-sm text-neutral-textMuted">View your past deliveries and eco performance</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {trips.length === 0 ? (
          <Card className="text-center py-12">
            <Navigation className="w-12 h-12 text-neutral-textMuted/50 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-neutral-textMain mb-1">No completed trips yet</h2>
            <p className="text-sm text-neutral-textMuted">Your completed trips will appear here.</p>
          </Card>
        ) : (
          trips.map(trip => (
            <Card key={trip.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition-shadow">
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold bg-neutral-bg px-2 py-0.5 rounded text-neutral-textMuted">#{trip.id}</span>
                  <span className="text-xs text-neutral-textMuted">{trip.date}</span>
                </div>
                <h3 className="font-bold text-neutral-textMain text-lg">{trip.source} → {trip.destination}</h3>
                <div className="flex items-center gap-1 mt-1 text-sm text-eco font-medium">
                  <CheckCircle size={14} /> {trip.status}
                </div>
              </div>

              <div className="flex gap-4 sm:border-l border-neutral-border sm:pl-6">
                <div>
                  <p className="text-xs text-neutral-textMuted uppercase font-bold tracking-wide">CO₂ Emitted</p>
                  <p className="font-bold text-neutral-textMain">{trip.actual_co2_kg} kg</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-textMuted uppercase font-bold tracking-wide">Eco Score</p>
                  <div className="flex items-center gap-1 font-bold text-eco">
                    <Leaf size={14} /> {trip.eco_score}
                  </div>
                </div>
              </div>
              
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
