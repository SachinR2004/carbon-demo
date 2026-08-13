import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { Leaf, Loader, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login({ email, password });
      navigate(data.role === 'admin' ? '/admin' : '/driver', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message;
      const status = err.response?.data?.status;
      if (status === 'pending') {
        setError('Your account is pending admin approval. Please check back later.');
      } else if (status === 'rejected') {
        setError('Your registration was rejected. Please contact support.');
      } else {
        setError('Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-neutral-border focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-white to-sky/5 px-4">
      <Link to="/" className="flex items-center gap-2 mb-8">
        <Leaf className="text-eco w-7 h-7" />
        <span className="text-2xl font-extrabold text-primary">GoGreen</span>
      </Link>

      <Card className="w-full max-w-sm">
        <h2 className="text-xl font-bold text-neutral-textMain mb-1">Sign in</h2>
        <p className="text-sm text-neutral-textMuted mb-6">Welcome back to GoGreen</p>

        {error && (
          <div className="flex items-start gap-2 bg-danger/10 text-danger text-sm p-3 rounded-xl mb-4 border border-danger/20">
            <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-textMuted mb-1 uppercase tracking-wide">Email</label>
            <input type="email" className={inputClass} value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-textMuted mb-1 uppercase tracking-wide">Password</label>
            <input type="password" className={inputClass} value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          <Button type="submit" variant="primary" className="w-full mt-1" disabled={loading}>
            {loading ? <Loader className="animate-spin" size={16} /> : 'Sign In'}
          </Button>
        </form>

        {/* Demo credentials hint */}
        <div className="mt-5 pt-4 border-t border-neutral-border text-xs text-neutral-textMuted space-y-1">
          <p className="font-semibold text-neutral-textMain text-xs mb-1">Demo accounts:</p>
          <button onClick={() => { setEmail('admin@gogreen.com'); setPassword('AdminPass123!'); }} className="block w-full text-left hover:text-primary transition-colors">
            🔑 Admin: admin@gogreen.com / AdminPass123!
          </button>
          <button onClick={() => { setEmail('driver@gogreen.com'); setPassword('DriverPass123!'); }} className="block w-full text-left hover:text-primary transition-colors">
            🚗 Driver: driver@gogreen.com / DriverPass123!
          </button>
        </div>

        <p className="text-center text-sm text-neutral-textMuted mt-4">
          New driver? <Link to="/register" className="text-primary hover:underline font-medium">Apply here</Link>
        </p>
      </Card>
    </div>
  );
}
