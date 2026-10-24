import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Zap, BarChart3 } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  const handleNavigate = (path) => {
    localStorage.clear();
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      
      {/* Top Header Navigation */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-2">
          {/* Professional Green Leaf SVG Icon */}
          <svg className="w-6 h-6 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.4 19 2c2 2 2.6 3.5 3.7 9.2A7 7 0 0 1 13 20.2z"></path>
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.5 12 13 13 11"></path>
          </svg>
          <span className="text-xl font-black tracking-tight">
            <span className="text-blue-600">GoGreen</span> Logistics
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => handleNavigate('/login')}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 px-4 py-2 transition cursor-pointer"
          >
            Sign In
          </button>
          <button
            onClick={() => handleNavigate('/register')}
            className="text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl shadow-md transition cursor-pointer"
          >
            Register Driver
          </button>
        </div>
      </header>

      {/* Main Hero Content */}
      <main className="w-full max-w-5xl mx-auto px-6 py-16 md:py-24 text-center space-y-8 my-auto">
        
        {/* Hero Title */}
        <div className="space-y-4 max-w-3xl mx-auto">
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-snug">
            Carbon-Aware <span className="text-blue-600">Route Optimization</span> & Intelligence
          </h1>
          <p className="text-xs md:text-sm text-slate-500 max-w-xl mx-auto font-medium">
            Empowering multi-vehicle fleets to reduce their carbon footprint through AI-driven, eco-friendly route predictions and live telemetry management.
          </p>
        </div>

        {/* Call to Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            onClick={() => handleNavigate('/register')}
            className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-xl shadow-blue-600/20 transition flex items-center justify-center gap-2 cursor-pointer group"
          >
            <span>Get Started</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition" />
          </button>
          <button
            onClick={() => handleNavigate('/login')}
            className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-extrabold text-xs rounded-2xl shadow-sm transition cursor-pointer"
          >
            Sign In to Portal
          </button>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 text-left max-w-4xl mx-auto">
          <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <Zap size={18} />
            </div>
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">AI Command Center</h3>
            <p className="text-xs text-slate-500">Natural language telemetry analysis powered by advanced Groq intelligence models.</p>
          </div>

          <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
              <BarChart3 size={18} />
            </div>
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Carbon Analytics</h3>
            <p className="text-xs text-slate-500">Real-time tracking of fuel efficiency, emissions data, and sustainability audit goals.</p>
          </div>

          <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              <ShieldCheck size={18} />
            </div>
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Secure Role Portals</h3>
            <p className="text-xs text-slate-500">Isolated workspace views and approval workflows for drivers and enterprise admins.</p>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 border-t border-slate-100 text-center text-xs text-slate-400 font-mono">
        GoGreen Enterprise Fleet Terminal • Phase-II Deployment
      </footer>

    </div>
  );
}