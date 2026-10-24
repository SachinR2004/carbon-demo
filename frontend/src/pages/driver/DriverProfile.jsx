import React, { useState, useEffect } from 'react';
import Card from '../../components/Card';
import api from '../../api/api';

export default function DriverProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await api.get('/driver/me');
        setProfile(res.data);
      } catch (err) {
        console.error('Failed to load driver profile from backend:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-xs">Loading profile…</div>;
  }

  if (!profile) {
    return <div className="p-8 text-center text-slate-500 text-xs">Driver profile not found. Please contact your administrator.</div>;
  }

  const isPending = profile.approval_status === 'pending';

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6 font-sans">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Driver Profile & Credentials</h1>
        <p className="text-xs text-slate-500 mt-1">Manage your active fleet identification and compliance records</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 md:col-span-1 text-center flex flex-col items-center rounded-3xl border border-slate-200">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl font-black mb-4">
            {profile.name ? profile.name.charAt(0).toUpperCase() : 'D'}
          </div>
          <h3 className="text-lg font-extrabold text-slate-900">{profile.name}</h3>
          <p className="text-xs text-slate-500 font-mono mt-0.5">{profile.email}</p>
          
          <span className={`mt-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
            isPending 
              ? 'bg-amber-50 text-amber-700 border-amber-200' 
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            Status: {profile.approval_status || 'Approved'}
          </span>
        </Card>

        <Card className="p-8 md:col-span-2 rounded-3xl border border-slate-200 space-y-4">
          <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-2">Professional Details</h4>
          
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-bold block mb-0.5">Driver ID</span>
              <span className="font-mono font-bold text-slate-800">DRV-{profile.id}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block mb-0.5">License Number</span>
              <span className="font-mono font-bold text-slate-800">{profile.license_no}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block mb-0.5">Assigned Terminal Hub</span>
              <span className="font-semibold text-slate-800">{profile.address || 'Bengaluru Fleet Terminal'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block mb-0.5">Experience</span>
              <span className="font-semibold text-emerald-600">{profile.experience_years} Years</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}