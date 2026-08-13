import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { Plus, Map, Leaf, Car, TrendingUp } from 'lucide-react';

export default function DriverDashboard() {
  const { user } = useAuth();
  const driver = user?.driver;
  const vehicle = driver?.vehicle;

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto md:max-w-none">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-primary to-primary-light rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-white/80 text-sm">Ready to make an eco-friendly trip today?</p>
      </div>

      {/* Assigned vehicle */}
      <Card>
        <div className="flex items-center gap-3 mb-3">
          <Car className="text-primary w-5 h-5" />
          <h2 className="font-bold text-neutral-textMain">Assigned Vehicle</h2>
        </div>
        {vehicle ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div><p className="text-neutral-textMuted text-xs">Vehicle No.</p><p className="font-mono font-bold text-primary">{vehicle.vehicle_no}</p></div>
            <div><p className="text-neutral-textMuted text-xs">Type</p><p className="font-medium">{vehicle.type}</p></div>
            <div><p className="text-neutral-textMuted text-xs">Fuel</p><p className="font-medium">{vehicle.fuel_type}</p></div>
            <div><p className="text-neutral-textMuted text-xs">Capacity</p><p className="font-medium">{vehicle.load_capacity_kg} kg</p></div>
            <div><p className="text-neutral-textMuted text-xs">Status</p>
              <span className="text-xs font-semibold text-eco capitalize">{vehicle.status}</span>
            </div>
          </div>
        ) : (
          <p className="text-neutral-textMuted text-sm">No vehicle assigned yet. Contact your fleet admin.</p>
        )}
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/driver/new-trip">
          <Card className="flex items-center gap-4 hover:shadow-lg transition-shadow cursor-pointer border-primary/20 hover:border-primary/50">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Plus className="text-primary w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-neutral-textMain">New Trip</p>
              <p className="text-xs text-neutral-textMuted">Plan an eco-optimized route</p>
            </div>
          </Card>
        </Link>
        <Link to="/driver/history">
          <Card className="flex items-center gap-4 hover:shadow-lg transition-shadow cursor-pointer border-sky/20 hover:border-sky/50">
            <div className="w-12 h-12 bg-sky/10 rounded-xl flex items-center justify-center">
              <TrendingUp className="text-sky w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-neutral-textMain">Trip History</p>
              <p className="text-xs text-neutral-textMuted">View past trips & eco-scores</p>
            </div>
          </Card>
        </Link>
      </div>

      {/* Eco stats placeholder */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Leaf className="text-eco w-5 h-5" />
          <h2 className="font-bold text-neutral-textMain">My Eco Stats</h2>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-neutral-bg rounded-xl p-3">
            <p className="text-2xl font-bold text-eco">—</p>
            <p className="text-xs text-neutral-textMuted mt-1">Total Trips</p>
          </div>
          <div className="bg-neutral-bg rounded-xl p-3">
            <p className="text-2xl font-bold text-primary">—</p>
            <p className="text-xs text-neutral-textMuted mt-1">CO₂ Saved (kg)</p>
          </div>
          <div className="bg-neutral-bg rounded-xl p-3">
            <p className="text-2xl font-bold text-sky">—</p>
            <p className="text-xs text-neutral-textMuted mt-1">Eco Score</p>
          </div>
        </div>
        <p className="text-xs text-neutral-textMuted text-center mt-3">Complete trips to see your stats</p>
      </Card>
    </div>
  );
}
