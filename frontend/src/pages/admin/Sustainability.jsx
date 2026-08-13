import React, { useState, useEffect } from 'react';
import { Leaf, TrendingDown, Target, Loader } from 'lucide-react';
import Card from '../../components/Card';
import KPITile from '../../components/KPITile';
import api from '../../api/api';

export default function Sustainability() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats').then(res => {
      setStats(res.data);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-eco/10 rounded-xl flex items-center justify-center text-eco">
          <Leaf size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-textMain">Sustainability Dashboard</h1>
          <p className="text-sm text-neutral-textMuted">Monitor fleet carbon footprint and eco goals</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPITile title="Total CO₂ Saved" value={`${stats?.co2_saved_kg || 0} kg`} icon={Leaf} colorClass="text-eco" />
        <KPITile title="Avg Eco Score" value="84.2" icon={Target} colorClass="text-sky" />
        <KPITile title="Emissions Trend" value="-12%" icon={TrendingDown} colorClass="text-eco" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col gap-4">
          <h2 className="font-bold text-neutral-textMain">Monthly CO₂ Savings (kg)</h2>
          <div className="h-64 flex items-end gap-2 pt-4 border-b border-l border-neutral-border pl-2">
            {[30, 45, 20, 60, 55, 80].map((h, i) => (
              <div key={i} className="flex-1 bg-eco hover:bg-eco-dark transition-colors rounded-t-sm relative group cursor-pointer" style={{ height: `${h}%` }}>
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-neutral-card text-xs px-2 py-1 rounded border border-neutral-border opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-sm">
                  {h * 10} kg
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-neutral-textMuted pl-2">
            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="font-bold text-neutral-textMain">Top Eco Drivers</h2>
          <div className="flex flex-col gap-3">
            {[
              { name: 'Sarah Jenkins', score: 96, trips: 142 },
              { name: 'Michael Chen', score: 92, trips: 89 },
              { name: 'David Smith', score: 88, trips: 204 },
            ].map((d, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-neutral-bg rounded-xl border border-neutral-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs">
                    {d.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-neutral-textMain">{d.name}</p>
                    <p className="text-xs text-neutral-textMuted">{d.trips} trips</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-eco">{d.score}</p>
                  <p className="text-[10px] text-neutral-textMuted uppercase tracking-wider">Score</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
