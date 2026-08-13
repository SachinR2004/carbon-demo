import React, { useState, useEffect } from 'react';
import { Map, Loader } from 'lucide-react';
import MapView from '../../components/MapView';
import Card from '../../components/Card';
import api from '../../api/api';

export default function LiveFleetMap() {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    api.get('/admin/stats').then(res => setStats(res.data)).catch(() => {});
  }, []);

  // Mock live positions for the drivers shown in the sidebar (backend has no real GPS feed yet)
  const driverMarkers = [
    { lat: 40.7128 + 0.012, lng: -74.006 - 0.018, label: 'John Doe' },
    { lat: 40.7128 - 0.009, lng: -74.006 + 0.022, label: 'Sarah Jenkins' },
    { lat: 40.7128 + 0.021, lng: -74.006 + 0.008, label: 'David Smith' },
  ];

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-6rem)]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
          <Map size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-textMain">Live Fleet Map</h1>
          <p className="text-sm text-neutral-textMuted">Real-time GPS tracking of {stats?.active_trips || 0} active trips</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-[350px] flex flex-col gap-4">
          <Card className="flex-1 overflow-y-auto">
            <h2 className="font-bold text-neutral-textMain mb-4">Active Drivers</h2>
            <div className="flex flex-col gap-3">
              {[
                { name: 'John Doe', status: 'On Route', progress: '45%' },
                { name: 'Sarah Jenkins', status: 'Delivering', progress: '90%' },
                { name: 'David Smith', status: 'Deviated', progress: '12%' },
              ].map((d, i) => (
                <div key={i} className="p-3 border border-neutral-border rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-sm text-neutral-textMain">{d.name}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${d.status === 'Deviated' ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'}`}>
                      {d.status}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-bg rounded-full overflow-hidden">
                    <div className={`h-full ${d.status === 'Deviated' ? 'bg-danger' : 'bg-primary'}`} style={{ width: d.progress }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        
        <div className="flex-1 relative bg-neutral-card rounded-2xl border border-neutral-border shadow-sm overflow-hidden min-h-[400px]">
           <MapView center={{lat: 40.7128, lng: -74.0060}} markers={driverMarkers} />
           <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-xl border border-neutral-border shadow-sm text-xs">
             <p className="font-bold text-neutral-textMain mb-1">Live Telemetry</p>
             <p className="text-neutral-textMuted flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-primary animate-pulse"/> Tracking Active</p>
           </div>
        </div>
      </div>
    </div>
  );
}
