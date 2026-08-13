import React, { useState, useEffect } from 'react';
import { Users, Car, TrendingUp, Leaf, Clock, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { Link } from 'react-router-dom';
import KPITile from '../../components/KPITile';
import Card from '../../components/Card';
import api from '../../api/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to get real stats; use demo data if admin endpoint not yet registered
    const load = async () => {
      try {
        const res = await api.get('/admin/stats');
        setStats(res.data);
      } catch {
        // Fallback demo stats until Phase 5 wires the endpoint
        setStats({
          total_drivers: 1,
          pending_approvals: 0,
          total_vehicles: 1,
          active_trips: 0,
          co2_saved_kg: 0,
          total_trips: 0,
        });
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const kpis = stats ? [
    { title: 'Total Drivers', value: stats.total_drivers, icon: Users, colorClass: 'text-primary' },
    { title: 'Pending Approvals', value: stats.pending_approvals, icon: Clock, colorClass: 'text-warning' },
    { title: 'Fleet Vehicles', value: stats.total_vehicles, icon: Car, colorClass: 'text-primary-light' },
    { title: 'Active Trips', value: stats.active_trips, icon: TrendingUp, colorClass: 'text-sky' },
    { title: 'Total Trips', value: stats.total_trips, icon: CheckCircle, colorClass: 'text-primary' },
    { title: 'CO₂ Saved (kg)', value: stats.co2_saved_kg?.toFixed(1) ?? '0.0', icon: Leaf, colorClass: 'text-eco' },
  ] : [];

  const quickLinks = [
    { label: 'Review Pending Drivers', to: '/admin/approvals', color: 'border-warning/40 hover:border-warning', icon: Clock },
    { label: 'Manage Vehicles', to: '/admin/vehicles', color: 'border-primary/40 hover:border-primary', icon: Car },
    { label: 'Sustainability Dashboard', to: '/admin/sustainability', color: 'border-eco/40 hover:border-eco', icon: Leaf },
    { label: 'Reports', to: '/admin/reports', color: 'border-sky/40 hover:border-sky', icon: TrendingUp },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-textMain">Admin Dashboard</h1>
        <p className="text-neutral-textMuted">Fleet overview and quick actions</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader className="animate-spin text-primary w-8 h-8" /></div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {kpis.map(k => <KPITile key={k.title} {...k} />)}
          </div>

          {/* Quick Links */}
          <Card>
            <h2 className="text-lg font-bold text-neutral-textMain mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quickLinks.map(({ label, to, color, icon: Icon }) => (
                <Link key={to} to={to}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${color} bg-neutral-bg`}>
                  <Icon className="text-neutral-textMuted w-5 h-5" />
                  <span className="font-medium text-neutral-textMain text-sm">{label}</span>
                </Link>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
