import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/Card';
import api from '../../api/api';
import { Users, Clock, Truck, Activity, CheckCircle2, Leaf, ArrowRight } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalDrivers: 0,
    pendingApprovals: 0,
    fleetVehicles: 2,
    activeTrips: 0,
    totalTrips: 0,
    co2Saved: '0.0 kg'
  });

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        // Fetch pending and approved drivers from SQL backend
        const pendingRes = await api.get('/driver?status=pending');
        const approvedRes = await api.get('/driver?status=approved');
        const fleetList = JSON.parse(localStorage.getItem('fleetVehicles') || '[]');

        setStats({
          totalDrivers: (approvedRes.data || []).length,
          pendingApprovals: (pendingRes.data || []).length,
          fleetVehicles: Math.max(2, fleetList.length),
          activeTrips: 1,
          totalTrips: 4,
          co2Saved: '142.8 kg'
        });
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      }
    };

    fetchAdminStats();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans p-6 text-slate-800">
      
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Administration Dashboard</h1>
        <p className="text-xs text-slate-500 mt-0.5">Manage system resources, driver onboarding verification, and telemetry oversight.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        <Card className="p-4 rounded-lg border border-slate-200 shadow-xs space-y-1 bg-white">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Drivers</span>
            <Users size={15} className="text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 font-mono">{stats.totalDrivers}</h3>
        </Card>

        <Card className="p-4 rounded-lg border border-slate-200 shadow-xs space-y-1 bg-white">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pending</span>
            <Clock size={15} className="text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 font-mono">{stats.pendingApprovals}</h3>
        </Card>

        <Card className="p-4 rounded-lg border border-slate-200 shadow-xs space-y-1 bg-white">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Vehicles</span>
            <Truck size={15} className="text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 font-mono">{stats.fleetVehicles}</h3>
        </Card>

        <Card className="p-4 rounded-lg border border-slate-200 shadow-xs space-y-1 bg-white">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Trips</span>
            <Activity size={15} className="text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 font-mono">{stats.activeTrips}</h3>
        </Card>

        <Card className="p-4 rounded-lg border border-slate-200 shadow-xs space-y-1 bg-white">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Trips</span>
            <CheckCircle2 size={15} className="text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 font-mono">{stats.totalTrips}</h3>
        </Card>

        <Card className="p-4 rounded-lg border border-slate-200 shadow-xs space-y-1 bg-white">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">CO₂ Saved</span>
            <Leaf size={15} className="text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 font-mono">{stats.co2Saved}</h3>
        </Card>

      </div>

      {/* Quick Navigation */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Quick Navigation</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/admin/approvals">
            <Card className="p-5 rounded-lg border border-slate-200 hover:border-slate-400 transition cursor-pointer group bg-white shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">User Management</span>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-slate-700 transition">Review Driver Approvals</h4>
                <p className="text-xs text-slate-500">Process pending account registrations and verify driver credentials.</p>
              </div>
              <ArrowRight size={18} className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-1 transition flex-shrink-0" />
            </Card>
          </Link>

          <Link to="/admin/vehicles">
            <Card className="p-5 rounded-lg border border-slate-200 hover:border-slate-400 transition cursor-pointer group bg-white shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fleet Inventory</span>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-slate-700 transition">Manage Vehicles</h4>
                <p className="text-xs text-slate-500">Add or remove transport units and monitor vehicle assignments.</p>
              </div>
              <ArrowRight size={18} className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-1 transition flex-shrink-0" />
            </Card>
          </Link>

          <Link to="/admin/sustainability">
            <Card className="p-5 rounded-lg border border-slate-200 hover:border-slate-400 transition cursor-pointer group bg-white shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Analytics</span>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-slate-700 transition">Sustainability Reports</h4>
                <p className="text-xs text-slate-500">Evaluate environmental metrics, emissions data, and efficiency logs.</p>
              </div>
              <ArrowRight size={18} className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-1 transition flex-shrink-0" />
            </Card>
          </Link>

          <Link to="/admin/reports">
            <Card className="p-5 rounded-lg border border-slate-200 hover:border-slate-400 transition cursor-pointer group bg-white shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Data Exports</span>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-slate-700 transition">System Logs & Exports</h4>
                <p className="text-xs text-slate-500">Download formatted CSV reports and operational summaries.</p>
              </div>
              <ArrowRight size={18} className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-1 transition flex-shrink-0" />
            </Card>
          </Link>
        </div>
      </div>

    </div>
  );
}