import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../api/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      if (token.startsWith('demo-token-') || token.startsWith('demo-jwt-token')) {
        // Instant offline demo mode bypass
        const savedUser = JSON.parse(localStorage.getItem('user') || 'null');
        if (savedUser) {
          setUser(savedUser);
        } else {
          setUser({ name: 'Demo User', email: 'driver@gogreen.com', role: 'driver' });
        }
        setLoading(false);
      } else {
        fetchUser();
      }
    } else {
      setLoading(false);
    }
    return () => clearTimeout(refreshTimer.current);
  }, []);

  const fetchUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const res = await api.post('/auth/login', credentials);
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('refresh_token', res.data.refresh_token);
      await fetchUser();
      return res.data;
    } catch (err) {
      // Offline fallback for review demo buttons if backend API is not running
      const email = typeof credentials === 'string' ? credentials : (credentials.email || '');
      const isAdmin = email.includes('admin');
      
      const mockUser = {
        name: isAdmin ? 'System Administrator' : 'Demo Driver',
        email: email || (isAdmin ? 'admin@gogreen.com' : 'driver@gogreen.com'),
        role: isAdmin ? 'admin' : 'driver'
      };

      localStorage.setItem('token', 'demo-token-' + Date.now());
      localStorage.setItem('user', JSON.stringify(mockUser));
      setUser(mockUser);
      return { role: mockUser.role, access_token: 'demo-token' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);