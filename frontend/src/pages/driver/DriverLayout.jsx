import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Leaf, LayoutDashboard, Plus, History, Bell, User, LogOut } from 'lucide-react';

const NAV = [
  { label: 'Dashboard', to: '/driver', icon: LayoutDashboard },
  { label: 'New Trip', to: '/driver/new-trip', icon: Plus },
  { label: 'Trip History', to: '/driver/history', icon: History },
  { label: 'Notifications', to: '/driver/notifications', icon: Bell },
  { label: 'Profile', to: '/driver/profile', icon: User },
];

export default function DriverLayout() {
  const navigate = useNavigate();

  // Read saved user metadata safely from localStorage
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const userName = userData.name || 'Demo Driver';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-neutral-bg flex flex-col">
      {/* Top nav (desktop) */}
      <header className="hidden md:flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-neutral-border sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Leaf className="text-eco w-6 h-6" />
          <span className="text-xl font-extrabold text-primary">GoGreen</span>
        </div>
        <nav className="flex items-center gap-1">
          {NAV.map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/driver'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'text-neutral-textMuted hover:bg-neutral-bg hover:text-primary'}`
              }>
              <Icon size={15} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-700">{userName}</span>
          <button onClick={handleLogout} className="text-neutral-textMuted hover:text-danger cursor-pointer"><LogOut size={18} /></button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6">
        <Outlet />
      </main>

      {/* Bottom tab bar (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-border flex justify-around py-2 z-10">
        {NAV.map(({ label, to, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/driver'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-xs font-medium transition-colors ${isActive ? 'text-primary' : 'text-neutral-textMuted'}`
            }>
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}