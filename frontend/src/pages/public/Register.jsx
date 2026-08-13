import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { Leaf, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import api from '../../api/api';

const STEPS = ['Verify Email', 'Personal Info', 'Set Password', 'Done'];

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [demoOtp, setDemoOtp] = useState('');

  const [form, setForm] = useState({
    email: '', otp: '',
    name: '', phone: '', dob: '', address: '',
    license_no: '', experience_years: '', emergency_contact: '',
    password: '', confirm_password: ''
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const inputClass = "w-full px-4 py-2 rounded-xl border border-neutral-border focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm";
  const labelClass = "block text-xs font-semibold text-neutral-textMuted mb-1 uppercase tracking-wide";

  // ── Step 0: Request OTP ────────────────────────────────────────────────────
  async function requestOtp(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.post('/auth/request-otp', { email: form.email });
      if (res.data.demo_otp) setDemoOtp(res.data.demo_otp);
      setStep(0.5); // OTP sent — show verify sub-step
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/auth/verify-otp', { email: form.email, otp: form.otp });
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally { setLoading(false); }
  }

  // ── Step 1: Personal info ─────────────────────────────────────────────────
  function submitPersonal(e) {
    e.preventDefault();
    setError('');
    if (!form.name || !form.phone || !form.license_no) {
      setError('Name, phone and license number are required'); return;
    }
    setStep(2);
  }

  // ── Step 2: Password ──────────────────────────────────────────────────────
  async function submitRegistration(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match'); return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters'); return;
    }
    setLoading(true);
    try {
      await api.post('/auth/register', {
        email: form.email,
        otp: form.otp,
        name: form.name,
        phone: form.phone,
        dob: form.dob || undefined,
        address: form.address || undefined,
        license_no: form.license_no,
        experience_years: form.experience_years ? parseInt(form.experience_years) : undefined,
        emergency_contact: form.emergency_contact || undefined,
        password: form.password,
      });
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  }

  // ── Progress bar ──────────────────────────────────────────────────────────
  const displayStep = step === 0.5 ? 0 : Math.floor(step);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-sky/5 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 mb-8">
        <Leaf className="text-eco w-7 h-7" />
        <span className="text-2xl font-extrabold text-primary">GoGreen</span>
      </Link>

      <div className="w-full max-w-lg">
        {/* Step progress */}
        {step < 3 && (
          <div className="flex items-center mb-8">
            {STEPS.slice(0, 3).map((label, i) => (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    i < displayStep ? 'bg-eco text-white' : i === displayStep ? 'bg-primary text-white' : 'bg-neutral-border text-neutral-textMuted'
                  }`}>
                    {i < displayStep ? <CheckCircle size={16} /> : i + 1}
                  </div>
                  <span className="text-xs mt-1 text-neutral-textMuted hidden sm:block">{label}</span>
                </div>
                {i < 2 && <div className={`flex-1 h-0.5 mx-2 ${i < displayStep ? 'bg-eco' : 'bg-neutral-border'}`} />}
              </React.Fragment>
            ))}
          </div>
        )}

        <Card>
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-danger/10 text-danger text-sm p-3 rounded-xl mb-4 border border-danger/20">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* ── STEP 0: email input ─────────────────────────────────────── */}
          {step === 0 && (
            <form onSubmit={requestOtp}>
              <h2 className="text-xl font-bold text-neutral-textMain mb-1">Create your account</h2>
              <p className="text-sm text-neutral-textMuted mb-6">Enter your email to receive a one-time verification code.</p>
              <label className={labelClass}>Email address</label>
              <input type="email" className={inputClass} value={form.email} onChange={set('email')} required />
              <Button type="submit" className="w-full mt-5" disabled={loading}>
                {loading ? <Loader className="animate-spin" size={16} /> : 'Send OTP'}
              </Button>
              <p className="text-center text-sm text-neutral-textMuted mt-4">
                Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
              </p>
            </form>
          )}

          {/* ── STEP 0.5: OTP verify ────────────────────────────────────── */}
          {step === 0.5 && (
            <form onSubmit={verifyOtp}>
              <h2 className="text-xl font-bold text-neutral-textMain mb-1">Check your email</h2>
              <p className="text-sm text-neutral-textMuted mb-4">We sent a code to <strong>{form.email}</strong></p>
              {demoOtp && (
                <div className="bg-sky/10 border border-sky/30 text-sky rounded-xl p-3 text-sm mb-4 font-mono">
                  🔧 Demo Mode — OTP: <strong>{demoOtp}</strong>
                </div>
              )}
              <label className={labelClass}>6-digit code</label>
              <input type="text" className={`${inputClass} tracking-widest text-center text-xl`} maxLength={6}
                value={form.otp} onChange={set('otp')} placeholder="------" required />
              <Button type="submit" className="w-full mt-5" disabled={loading}>
                {loading ? <Loader className="animate-spin" size={16} /> : 'Verify OTP'}
              </Button>
              <button type="button" onClick={() => setStep(0)} className="w-full text-sm text-neutral-textMuted mt-3 hover:text-primary">
                ← Change email
              </button>
            </form>
          )}

          {/* ── STEP 1: personal info ────────────────────────────────────── */}
          {step === 1 && (
            <form onSubmit={submitPersonal}>
              <h2 className="text-xl font-bold text-neutral-textMain mb-5">Personal Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Full Name *</label>
                  <input className={inputClass} value={form.name} onChange={set('name')} required />
                </div>
                <div>
                  <label className={labelClass}>Phone Number *</label>
                  <input className={inputClass} value={form.phone} onChange={set('phone')} required />
                </div>
                <div>
                  <label className={labelClass}>Date of Birth</label>
                  <input type="date" className={inputClass} value={form.dob} onChange={set('dob')} />
                </div>
                <div>
                  <label className={labelClass}>License Number *</label>
                  <input className={inputClass} value={form.license_no} onChange={set('license_no')} required />
                </div>
                <div>
                  <label className={labelClass}>Years of Experience</label>
                  <input type="number" min="0" max="50" className={inputClass} value={form.experience_years} onChange={set('experience_years')} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Address</label>
                  <textarea rows={2} className={`${inputClass} resize-none`} value={form.address} onChange={set('address')} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Emergency Contact</label>
                  <input className={inputClass} placeholder="Name and phone number" value={form.emergency_contact} onChange={set('emergency_contact')} />
                </div>
              </div>
              <Button type="submit" className="w-full mt-6">Continue →</Button>
            </form>
          )}

          {/* ── STEP 2: password ─────────────────────────────────────────── */}
          {step === 2 && (
            <form onSubmit={submitRegistration}>
              <h2 className="text-xl font-bold text-neutral-textMain mb-5">Set Your Password</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className={labelClass}>Password</label>
                  <input type="password" className={inputClass} value={form.password} onChange={set('password')} required minLength={8} />
                  <p className="text-xs text-neutral-textMuted mt-1">Minimum 8 characters</p>
                </div>
                <div>
                  <label className={labelClass}>Confirm Password</label>
                  <input type="password" className={inputClass} value={form.confirm_password} onChange={set('confirm_password')} required />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">← Back</Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? <Loader className="animate-spin" size={16} /> : 'Submit Application'}
                </Button>
              </div>
            </form>
          )}

          {/* ── STEP 3: success ──────────────────────────────────────────── */}
          {step === 3 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-eco/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-eco w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-neutral-textMain mb-2">Application Submitted!</h2>
              <p className="text-sm text-neutral-textMuted mb-6">
                Your driver registration is pending admin approval. You'll be notified once reviewed.
              </p>
              <Link to="/login"><Button variant="primary" className="w-full">Go to Login</Button></Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
