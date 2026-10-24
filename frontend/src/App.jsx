import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import api from './api/api';

// Public pages
import Landing from './pages/public/Landing';
import Login from './pages/public/Login';
import Register from './pages/public/Register';

// Admin pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import DriverApprovals from './pages/admin/DriverApprovals';
import VehicleManagement from './pages/admin/VehicleManagement';
import LiveFleetMap from './pages/admin/LiveFleetMap';
import Sustainability from './pages/admin/Sustainability';
import AICommandCenter from './pages/admin/AICommandCenter';
import AdminSettings from './pages/admin/AdminSettings';
import Reports from './pages/admin/Reports';

// Driver pages
import DriverLayout from './pages/driver/DriverLayout';
import DriverDashboard from './pages/driver/DriverDashboard';
import DriverProfile from './pages/driver/DriverProfile';
import DriverNotifications from './pages/driver/DriverNotifications';
import NewTrip from './pages/driver/NewTrip';
import ActiveTrip from './pages/driver/ActiveTrip';
import TripHistory from './pages/driver/TripHistory';

// ── Direct Route Guards ──────────────────────────────────────────────────────

function ProtectedRoute({ children, allowedRoles }) {
  const [authorized, setAuthorized] = useState(null);
  const [resolvedRole, setResolvedRole] = useState(null);
  const hasChecked = useRef(false);

  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole') || localStorage.getItem('role');

  useEffect(() => {
    if (!token) {
      setAuthorized(false);
      return;
    }

    if (allowedRoles && userRole) {
      const isAllowed = allowedRoles.map(r => r.toUpperCase()).includes(userRole.toUpperCase());
      if (!isAllowed) {
        setAuthorized(false);
        setResolvedRole(userRole.toLowerCase());
        return;
      }
    }

    if (hasChecked.current) return;
    hasChecked.current = true;

    api.get('/auth/me')
      .then((res) => {
        if (res.data) {
          setAuthorized(true);
          setResolvedRole(res.data.role ? res.data.role.toLowerCase() : 'driver');
        } else {
          setAuthorized(false);
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        setAuthorized(false);
      });
  }, [token, allowedRoles, userRole]);

  if (authorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authorized) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && resolvedRole) {
    const isAllowed = allowedRoles.map(r => r.toLowerCase()).includes(resolvedRole);
    if (!isAllowed) {
      return <Navigate to={resolvedRole === 'admin' ? '/admin' : '/driver'} replace />;
    }
  }

  return children;
}

function PublicOnlyRoute({ children }) {
  const token = localStorage.getItem('token');
  const userRole = (localStorage.getItem('userRole') || localStorage.getItem('role') || 'driver').toLowerCase();

  if (token) {
    return <Navigate to={userRole === 'admin' ? '/admin' : '/driver'} replace />;
  }
  return children;
}

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />

        {/* Admin Protected Routes */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="approvals" element={<DriverApprovals />} />
          <Route path="vehicles" element={<VehicleManagement />} />
          <Route path="fleet-map" element={<LiveFleetMap />} />
          <Route path="sustainability" element={<Sustainability />} />
          <Route path="reports" element={<Reports />} />
          <Route path="ai" element={<AICommandCenter />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Driver Protected Routes */}
        <Route path="/driver" element={<ProtectedRoute allowedRoles={['driver', 'admin']}><DriverLayout /></ProtectedRoute>}>
          <Route index element={<DriverDashboard />} />
          <Route path="new-trip" element={<NewTrip />} />
          <Route path="active-trip/:id" element={<ActiveTrip />} />
          <Route path="history" element={<TripHistory />} />
          <Route path="notifications" element={<DriverNotifications />} />
          <Route path="profile" element={<DriverProfile />} />
        </Route>

        {/* Global Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;