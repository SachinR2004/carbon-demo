import React, { useState, useEffect } from 'react';
import { Cpu, Activity, Server, AlertTriangle, Loader, CheckCircle } from 'lucide-react';
import Card from '../../components/Card';
import KPITile from '../../components/KPITile';
import Button from '../../components/Button';
import api from '../../api/api';

export default function AICommandCenter() {
  const [aiData, setAiData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/ai/fleet-health').then(res => {
      setAiData(res.data);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-dark/10 rounded-xl flex items-center justify-center text-primary-dark">
          <Cpu size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-textMain">AI Command Center</h1>
          <p className="text-sm text-neutral-textMuted">ML Model performance and predictive maintenance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPITile title="System Status" value={aiData?.system_status || 'Unknown'} icon={Server} colorClass="text-eco" />
        <KPITile title="Active Models" value={aiData?.models?.length || 0} icon={Activity} colorClass="text-primary" />
        <KPITile title="Vehicles at Risk" value={aiData?.predictive_maintenance?.vehicles_at_risk || 0} icon={AlertTriangle} colorClass={aiData?.predictive_maintenance?.vehicles_at_risk > 0 ? "text-danger" : "text-eco"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col gap-4">
          <h2 className="font-bold text-neutral-textMain flex items-center gap-2">
            <Activity size={18} className="text-primary" /> ML Model Performance
          </h2>
          <div className="flex flex-col gap-4">
            {aiData?.models?.map((m, i) => (
              <div key={i} className="p-4 bg-neutral-bg rounded-xl border border-neutral-border">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-sm text-neutral-textMain">{m.model_name}</h3>
                    <p className="text-xs text-neutral-textMuted">Version: {m.version}</p>
                  </div>
                  <span className="text-xs bg-eco/10 text-eco px-2 py-1 rounded-full font-bold">Deployed</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-white p-2 rounded border border-neutral-border">
                    <p className="text-[10px] text-neutral-textMuted uppercase font-bold">R² Score</p>
                    <p className="font-bold text-sm">{m.metrics?.r2?.toFixed(4) || 'N/A'}</p>
                  </div>
                  <div className="bg-white p-2 rounded border border-neutral-border">
                    <p className="text-[10px] text-neutral-textMuted uppercase font-bold">MAE</p>
                    <p className="font-bold text-sm">{m.metrics?.mae?.toFixed(4) || 'N/A'}</p>
                  </div>
                </div>
                <p className="text-xs text-neutral-textMuted mt-3">Last trained: {new Date(m.trained_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="font-bold text-neutral-textMain flex items-center gap-2">
            <AlertTriangle size={18} className="text-warning" /> Predictive Maintenance
          </h2>
          <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl">
            <p className="text-sm font-bold text-warning-dark mb-1">Attention Required</p>
            <p className="text-xs text-neutral-textMain">
              AI detected {aiData?.predictive_maintenance?.vehicles_at_risk || 0} vehicles with high risk of breakdown based on age and mileage patterns.
            </p>
          </div>
          <div className="flex flex-col gap-2 mt-2">
            {[1, 2].map(i => (
              <div key={i} className="flex justify-between items-center p-3 border border-neutral-border rounded-xl">
                <div>
                  <p className="font-bold text-sm text-neutral-textMain">Vehicle V-{900+i}</p>
                  <p className="text-xs text-neutral-textMuted">Engine Component Wear</p>
                </div>
                <button className="text-xs font-bold text-primary hover:underline">Schedule Service</button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="flex flex-col gap-4 mt-2">
        <h2 className="font-bold text-neutral-textMain flex items-center gap-2">
          <Cpu size={18} className="text-primary-dark" /> AI Insights & Query
        </h2>
        <div className="flex gap-2">
           <input 
             type="text" 
             id="insight-query"
             placeholder="Ask the AI about drivers, fuel, or maintenance..." 
             className="flex-1 px-4 py-2 rounded-xl border border-neutral-border text-sm"
             onKeyDown={(e) => {
               if (e.key === 'Enter') {
                 const q = e.target.value;
                 api.get(`/ai/insights?q=${encodeURIComponent(q)}`).then(res => alert(res.data.insight));
               }
             }}
           />
           <Button variant="primary" onClick={() => {
              const q = document.getElementById('insight-query').value;
              api.get(`/ai/insights?q=${encodeURIComponent(q)}`).then(res => alert(res.data.insight));
           }}>Ask AI</Button>
        </div>
        <div className="flex gap-2 text-xs text-neutral-textMuted flex-wrap">
           <span>Try asking:</span>
           <button className="text-primary hover:underline" onClick={() => document.getElementById('insight-query').value = 'Who is the top driver?'}>"Who is the top driver?"</button>
           <button className="text-primary hover:underline" onClick={() => document.getElementById('insight-query').value = 'Fuel predictions'}>"Fuel predictions"</button>
        </div>
      </Card>
    </div>
  );
}
