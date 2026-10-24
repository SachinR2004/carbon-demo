import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/api';
import { Upload, ShieldCheck, Truck, CheckCircle2, Eye, EyeOff } from 'lucide-react';

const apiMessage = (err, fallback) =>
  err.response?.data?.message ||
  (err.response?.status === 429 ? 'Too many attempts. Please wait a minute and try again.' : null) ||
  (err.request ? 'Cannot reach the server. Check your connection and try again.' : fallback);

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 text-slate-800';
const labelCls = 'block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1';

export default function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState('DRIVER'); 
  const [step, setStep] = useState(1); // 1: email, 2: otp, 3: details, 4: submitted
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    licenseNo: '',
    experience: '',
    fileName: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [showPw, setShowPw] = useState(false);
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData({ ...formData, phone: val });
  };

  const handleLicenseChange = (e) => {
    const val = e.target.value.toUpperCase().slice(0, 15);
    setFormData({ ...formData, licenseNo: val });
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/send-otp', { email: email.trim(), role });
      setCooldown(res.data.resend_after || 60);
      setStep(2);
    } catch (err) {
      if (err.response?.data?.retry_after) setCooldown(err.response.data.retry_after);
      setError(apiMessage(err, 'Could not send verification code. Please check your email.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/verify-otp', { email: email.trim(), otp: otp.trim() });
      setStep(3);
    } catch (err) {
      setError(apiMessage(err, 'Invalid or expired verification code.'));
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setError('License document must be 5 MB or smaller.');
      e.target.value = '';
      return;
    }
    setError('');
    setFile(f);
    setFormData({ ...formData, fileName: f.name });
  };

  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 8 || !/[A-Za-z]/.test(formData.password) || !/\d/.test(formData.password)) {
      setError('Password needs at least 8 characters, including a letter and a number.');
      return;
    }
    if (formData.phone.length !== 10) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }
    if (!file) {
      setError('Please upload your commercial license document.');
      return;
    }

    setLoading(true);
    localStorage.clear();

    const body = new FormData();
    body.append('email', email.trim());
    body.append('otp', otp.trim());
    body.append('name', formData.fullName.trim());
    body.append('phone', formData.phone);
    body.append('license_no', formData.licenseNo);
    body.append('experience_years', formData.experience || '0');
    body.append('password', formData.password);
    body.append('license_doc', file);

    try {
      await api.post('/auth/register', body);
      setStep(4);
    } catch (err) {
      const code = err.response?.data?.error;
      if (code === 'invalid_otp' || code === 'otp_locked') setStep(2);
      setError(apiMessage(err, 'Registration failed. Please check your inputs.'));
    } finally {
      setLoading(false);
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
        <p className="text-xs text-slate-500 font-medium">
          {role === 'DRIVER' ? 'New Commercial Driver Onboarding' : 'Fleet Administrator Registration'}
        </p>
      </div>

      {step < 4 && (
        <div className="max-w-md w-full flex items-center justify-between mb-8 px-4">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>1</div>
            <span className={`text-xs font-bold ${step === 1 ? 'text-slate-900' : 'text-slate-400'}`}>Verify Email</span>
          </div>
          <div className="flex-1 h-0.5 bg-slate-200 mx-3" />
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>2</div>
            <span className={`text-xs font-bold ${step === 2 ? 'text-slate-900' : 'text-slate-400'}`}>Details & Docs</span>
          </div>
          <div className="flex-1 h-0.5 bg-slate-200 mx-3" />
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>3</div>
            <span className={`text-xs font-bold ${step === 3 ? 'text-slate-900' : 'text-slate-400'}`}>Password</span>
          </div>
        </div>
      )}

      <div className="max-w-xl w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">{error}</div>
        )}

        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-5">
            <div>
              <h2 className="text-xl font-black text-slate-900">Create your account</h2>
              <p className="text-xs text-slate-500 mt-0.5">Select your system role and enter your professional email.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('DRIVER')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-extrabold transition cursor-pointer ${
                  role === 'DRIVER' ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <Truck size={16} /> Driver Portal
              </button>
              <button
                type="button"
                onClick={() => setRole('ADMIN')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-extrabold transition cursor-pointer ${
                  role === 'ADMIN' ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <ShieldCheck size={16} /> Admin Portal
              </button>
            </div>

            <div>
              <label className={labelCls}>Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@gogreen.com"
                className={inputCls}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? 'Dispatching OTP...' : 'Send Verification OTP ➔'}
            </button>

            <div className="text-center pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Already have an account? <Link to="/login" className="text-blue-600 font-bold hover:underline">Sign in</Link>
              </span>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <h2 className="text-xl font-black text-slate-900">Verify Email OTP</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verification code dispatched to <span className="font-bold text-slate-800">{email}</span>. It expires in 5 minutes.
              </p>
            </div>

            <div>
              <label className={labelCls}>6-Digit Verification Code *</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono tracking-widest font-black text-center focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 text-slate-800"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? 'Verifying...' : 'Verify & Proceed ➔'}
            </button>

            <div className="flex items-center justify-between text-xs font-bold pt-2">
              <button
                type="button"
                onClick={() => { setStep(1); setOtp(''); setError(''); }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ← Change email address
              </button>
              <button
                type="button"
                disabled={cooldown > 0 || loading}
                onClick={handleRequestOtp}
                className="text-blue-600 disabled:text-slate-300 cursor-pointer"
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleCompleteRegistration} className="space-y-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                {role === 'DRIVER' ? 'Driver Credentials & Compliance' : 'Administrator Credentials'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Provide regulatory details and compliance documentation.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Enter full name"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Phone Number (10 Digits Strict) *</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  placeholder="9876543210"
                  className={`${inputCls} font-mono`}
                />
              </div>
            </div>

            {role === 'DRIVER' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Heavy License Number (Uppercase) *</label>
                    <input
                      type="text"
                      required
                      maxLength={15}
                      value={formData.licenseNo}
                      onChange={handleLicenseChange}
                      placeholder="KA0520230098412"
                      className={`${inputCls} font-mono tracking-wider`}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Years of Experience</label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={formData.experience}
                      onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                      placeholder="e.g. 3"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>
                    Upload Commercial License / Permit (PDF, JPG, PNG · max 5 MB) *
                  </label>
                  <label className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 bg-slate-50 transition">
                    <Upload size={20} className="text-blue-600 mb-1" />
                    <span className="text-xs font-bold text-slate-700">
                      {file ? file.name : 'Click to browse or drop document here'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Supported formats: PDF, PNG, JPG (Max 5MB)</span>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>
              </>
            )}

            <div>
              <label className={labelCls}>Secure Password *</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-2.5 text-slate-400 cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">At least 8 characters with a letter and a number.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {loading ? 'Submitting...' : '✓ Complete Onboarding & Submit for Approval'}
            </button>
          </form>
        )}

        {step === 4 && (
          <div className="text-center space-y-4 py-4">
            <CheckCircle2 size={44} className="text-emerald-500 mx-auto" />
            <h2 className="text-xl font-black text-slate-900">Application submitted</h2>
            <p className="text-sm text-slate-500">
              An administrator will review your license. You can sign in as soon as your account is approved.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
            >
              Go to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}