import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

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

import NewTrip from './pages/driver/NewTrip';

import ActiveTrip from './pages/driver/ActiveTrip';
import TripHistory from './pages/driver/TripHistory';

// ── Route Guards ──────────────────────────────────────────────────────────────

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-bg">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/driver'} replace />;
  }
  return children;
}

// Redirect logged-in users away from public login/register
function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/driver'} replace />;
  return children;
}

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="approvals" element={<DriverApprovals />} />
            <Route path="vehicles" element={<VehicleManagement />} />
            {/* Phase 5 pages */}
            <Route path="fleet-map" element={<LiveFleetMap />} />
            <Route path="sustainability" element={<Sustainability />} />
            <Route path="reports" element={<Reports />} />
            <Route path="ai" element={<AICommandCenter />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Driver */}
          <Route path="/driver" element={<ProtectedRoute allowedRoles={['driver']}><DriverLayout /></ProtectedRoute>}>
            <Route index element={<DriverDashboard />} />
            {/* Phase 3/4 pages */}
            <Route path="new-trip" element={<NewTrip />} />
            <Route path="active-trip/:id" element={<ActiveTrip />} />
            <Route path="history" element={<TripHistory />} />
            <Route path="notifications" element={<ComingSoon title="Notifications" />} />
            <Route path="profile" element={<ComingSoon title="Profile" />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

// Minimal placeholder for pages not yet built
function ComingSoon({ title }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4">🚧</div>
      <h2 className="text-xl font-bold text-neutral-textMain mb-2">{title}</h2>
      <p className="text-neutral-textMuted text-sm">This screen will be built in a later phase.</p>
    </div>
  );
}

export default App;
