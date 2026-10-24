import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Leaf,
  LayoutDashboard,
  Users,
  Car,
  Map,
  BarChart2,
  Cpu,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

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
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  // Read saved user metadata safely from localStorage
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const adminName = userData.name || userData.email || 'System Admin';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-neutral-bg font-sans">
      {/* Collapsible Admin Sidebar */}
      <aside
        className={`relative flex flex-col bg-slate-900 text-white transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-60'
        } min-h-screen flex-shrink-0 z-20`}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-white/10 overflow-hidden">
          <Leaf className="text-emerald-400 w-6 h-6 flex-shrink-0" />
          {!collapsed && (
            <span className="text-lg font-extrabold tracking-tight truncate">
              GoGreen
            </span>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-4 flex flex-col gap-1 px-2 overflow-y-auto">
          {NAV.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/20 text-white shadow-sm font-semibold'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User Footer & Logout */}
        <div className="border-t border-white/10 p-3">
          {!collapsed && (
            <div className="text-xs text-white/60 px-2 mb-2 truncate font-medium">
              {adminName}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span className="truncate">Logout</span>}
          </button>
        </div>

        {/* Collapse Toggle Floating Button */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute bottom-20 -right-3 w-6 h-6 bg-slate-900 border border-white/20 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors shadow-md z-30 cursor-pointer"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto relative min-w-0">
        <Outlet />
      </main>
    </div>
  );
}