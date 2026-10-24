import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { Truck, PlusCircle, History, ShieldCheck, BarChart3, ArrowRight } from 'lucide-react';

export default function DriverDashboard() {
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    completed_runs: 0,
    distance_km: 0.0,
    co2_kg: 0.0,
    fuel_used: 0.0,
    avg_eco_score: null,
  });
  
  const [vehicle, setVehicle] = useState(null);
  const [driverName, setDriverName] = useState('Driver');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [profileRes, statsRes] = await Promise.all([
          api.get('/driver/me'),
          api.get('/driver/stats')
        ]);
        
        if (profileRes.data) {
          setDriverName(profileRes.data.name || 'Driver');
          setVehicle(profileRes.data.vehicle || null);
        }
        if (statsRes.data) {
          setStats(statsRes.data);
        }
      } catch (err) {
        console.error('Failed to load driver dashboard metrics from backend:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      
      {/* Professional Corporate Blue Hero Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 rounded-2xl p-6 shadow-md text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md bg-blue-700/60 text-blue-200 text-[10px] font-extrabold tracking-wider uppercase border border-blue-500/30">
              Verified & Active Duty
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Welcome back, {driverName}
          </h1>
          <p className="text-xs text-blue-200 mt-0.5">
            Fleet telemetry online. Ready for optimized corridor dispatch.
          </p>
        </div>

        <button
          onClick={() => navigate('/driver/new-trip')}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer border border-blue-400/30"
        >
          <PlusCircle size={15} /> Plan New Route
        </button>
      </div>

      {/* Assigned Vehicle Specifications Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Truck size={15} className="text-blue-600" /> Assigned Vehicle Specifications
          </h2>
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-lg border border-emerald-200 flex items-center gap-1.5">
            <ShieldCheck size={13} /> Active & Certified
          </span>
        </div>

        {vehicle ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Vehicle Reg</span>
              <span className="text-xs font-black text-slate-800 mt-0.5 block font-mono">{vehicle.vehicle_no}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Classification</span>
              <span className="text-xs font-bold text-slate-800 mt-0.5 block">{vehicle.type}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Powertrain</span>
              <span className="text-xs font-bold text-slate-800 mt-0.5 block">{vehicle.fuel_type}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Max Payload</span>
              <span className="text-xs font-black text-slate-800 mt-0.5 block font-mono">{vehicle.load_capacity_kg?.toLocaleString()} kg</span>
            </div>
          </div>
        ) : (
          <div className="p-4 text-xs text-slate-400 text-center">No vehicle assigned yet. Contact your administrator.</div>
        )}
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div 
          onClick={() => navigate('/driver/new-trip')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-md transition cursor-pointer flex items-center justify-between group"
        >
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-2">
              <PlusCircle size={20} />
            </div>
            <h3 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition">Plan New Eco-Trip</h3>
            <p className="text-xs text-slate-500">Configure AI-optimized road corridors with live telemetry.</p>
          </div>
          <div className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition">
            <ArrowRight size={20} />
          </div>
        </div>

        <div 
          onClick={() => navigate('/driver/history')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-md transition cursor-pointer flex items-center justify-between group"
        >
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold mb-2">
              <History size={20} />
            </div>
            <h3 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition">Trip History & Logs</h3>
            <p className="text-xs text-slate-500">Review completed runs, emissions logs, and eco-scores.</p>
          </div>
          <div className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition">
            <ArrowRight size={20} />
          </div>
        </div>
      </div>

      {/* Environmental Performance Aggregate Metrics */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 size={15} className="text-blue-600" /> Fleet Environmental Performance
          </h2>
          <span className="text-[11px] font-bold text-slate-400">Real-Time Fleet Aggregate</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Completed Runs</span>
            <span className="text-lg font-black text-slate-900 mt-1 block font-mono">{stats.completed_runs}</span>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Distance Traveled</span>
            <span className="text-lg font-black text-blue-600 mt-1 block font-mono">{stats.distance_km} km</span>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Net CO₂ Saved</span>
            <span className="text-lg font-black text-emerald-600 mt-1 block font-mono">{stats.co2_kg} kg</span>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Avg Eco-Score</span>
            <span className="text-lg font-black text-indigo-600 mt-1 block font-mono">
              {stats.avg_eco_score != null ? `${stats.avg_eco_score}/100` : '—'}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}