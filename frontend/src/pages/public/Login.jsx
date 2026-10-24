import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { Lock, Mail, Eye, EyeOff, CheckCircle2, X, AlertCircle } from 'lucide-react';

const apiMessage = (err, fallback) =>
  err.response?.data?.message ||
  (err.response?.status === 429 ? 'Too many attempts. Please wait a minute and try again.' : null) ||
  (err.request ? 'Cannot reach the server. Check your connection and try again.' : fallback);

const inputCls =
  'w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 text-slate-800';
const labelCls = 'block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password modal states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);

    localStorage.clear();

    try {
      const response = await api.post('/auth/login', { 
        email: email.trim(), 
        password 
      });
      const { access_token, refresh_token, role, name } = response.data;

      localStorage.setItem('token', access_token);
      if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('userRole', role ? role.toUpperCase() : 'DRIVER');
      localStorage.setItem('userData', JSON.stringify({ name, email: email.trim() }));

      const resolvedRole = (role || 'DRIVER').toUpperCase();
      if (resolvedRole === 'ADMIN') {
        window.location.replace('/admin');
      } else {
        window.location.replace('/driver');
      }
    } catch (err) {
      setError(apiMessage(err, 'Invalid email or password. Please try again.'));
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail.trim() });
      setForgotSuccess(true);
    } catch (err) {
      setForgotError(apiMessage(err, 'Could not send reset code.'));
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 font-sans">
      <div className="mb-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <svg className="w-6 h-6 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.4 19 2c2 2 2.6 3.5 3.7 9.2A7 7 0 0 1 13 20.2z"></path>
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.5 12 13 13 11"></path>
          </svg>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            <span className="text-blue-600">GoGreen</span> Logistics
          </h1>
        </div>
        <p className="text-xs text-slate-500">Enterprise Carbon-Aware Fleet & Route Intelligence</p>
      </div>

      <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
        <div>
          <h2 className="text-xl font-black text-slate-900">Sign In</h2>
          <p className="text-xs text-slate-500 mt-0.5">Enter your registered credentials to access your portal.</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" /> <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className={labelCls}>Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 text-slate-400" size={16} />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@gogreen.com"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelCls} style={{ marginBottom: 0 }}>Password</label>
              <button
                type="button"
                onClick={() => { setShowForgotModal(true); setForgotSuccess(false); setForgotError(''); setForgotEmail(''); }}
                className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 text-slate-400" size={16} />
              <input
                type={showPw ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 text-slate-800"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-3 text-slate-400 cursor-pointer"
                aria-label="Toggle password visibility"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-500">
            New driver? <Link to="/register" className="text-blue-600 font-bold hover:underline">Apply & Register here</Link>
          </span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200 text-slate-800">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X size={20} />
            </button>

            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Reset Password</h3>
              <p className="text-xs text-slate-500 mt-1">Enter your registered email address to receive a reset code.</p>
            </div>

            {forgotSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>If an account exists for that email, reset instructions have been dispatched.</span>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                {forgotError && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">{forgotError}</div>}
                <div className="space-y-1.5">
                  <label className={labelCls}>Registered Email</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@gogreen.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {forgotLoading ? 'Sending...' : 'Send Reset Code'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}