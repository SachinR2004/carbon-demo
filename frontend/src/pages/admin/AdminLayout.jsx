import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Leaf, LayoutDashboard, Users, Car, Map, BarChart2, Cpu, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';

const NAV = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
  { label: 'Driver Approvals', to: '/admin/approvals', icon: Users },
  { label: 'Vehicles', to: '/admin/vehicles', icon: Car },
  { label: 'Live Fleet Map', to: '/admin/fleet-map', icon: Map },
  { label: 'Sustainability', to: '/admin/sustainability', icon: Leaf },
  { label: 'Reports', to: '/admin/reports', icon: BarChart2 },
  { label: 'AI Command Center', to: '/admin/ai', icon: Cpu },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex min-h-screen bg-neutral-bg">
      {/* Sidebar */}
      <aside className={`flex flex-col bg-primary-dark text-white transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'} min-h-screen flex-shrink-0`}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-5 border-b border-white/10">
          <Leaf className="text-eco w-6 h-6 flex-shrink-0" />
          {!collapsed && <span className="text-lg font-extrabold tracking-tight">GoGreen</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 flex flex-col gap-1 px-2">
          {NAV.map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/admin'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`
              }>
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div className="border-t border-white/10 p-3">
          {!collapsed && (
            <div className="text-xs text-white/60 px-2 mb-2 truncate">{user?.name}</div>
          )}
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors">
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && 'Logout'}
          </button>
        </div>

        {/* Collapse toggle */}
        <button onClick={() => setCollapsed(c => !c)}
          className="absolute bottom-20 -right-3 w-6 h-6 bg-primary-dark border border-white/20 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors z-10">
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto relative">
        <Outlet />
      </main>
    </div>
  );
}
