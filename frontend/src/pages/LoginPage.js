import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#0f0f1a' },
  card: { background: '#1a1a2e', border: '1px solid #2d2d4e', borderRadius: 20, padding: 40, width: '100%', maxWidth: 420 },
  title: { fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 8 },
  sub: { color: '#94a3b8', fontSize: 14, marginBottom: 32 },
};

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  const handleQuickLogin = async (email, password) => {
    setLoading(true);
    try {
      await login({ email, password });
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <Link to="/" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600, fontSize: 18 }}>⚡ SaaSApp</Link>
        <h2 style={{ ...s.title, marginTop: 24 }}>Welcome back</h2>
        <p style={s.sub}>Sign in to your account</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required />
          </div>
          <div style={{ textAlign: 'right', marginBottom: 20 }}>
            <Link to="/forgot-password" style={{ color: '#6366f1', fontSize: 13, textDecoration: 'none' }}>Forgot password?</Link>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', color: '#4b5563' }}>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #2d2d4e' }} />
          <span style={{ padding: '0 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#64748b', fontWeight: 600 }}>Quick Demo Access</span>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #2d2d4e' }} />
        </div>

        <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
          <button 
            type="button" 
            onClick={() => handleQuickLogin('admin@saasapp.com', 'Password123!')}
            className="btn btn-outline btn-sm"
            style={{ width: '100%', justifyContent: 'center', borderColor: '#818cf8', color: '#a5b4fc', background: 'rgba(99,102,241,0.1)' }}
          >
            🛡️ Login as Admin
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              type="button" 
              onClick={() => handleQuickLogin('jeenandra.2003@gmail.com', 'Password123!')}
              className="btn btn-outline btn-sm"
              style={{ flex: 1, justifyContent: 'center' }}
            >
              👤 Pro User
            </button>
            <button 
              type="button" 
              onClick={() => handleQuickLogin('free@saasapp.com', 'Password123!')}
              className="btn btn-outline btn-sm"
              style={{ flex: 1, justifyContent: 'center' }}
            >
              👤 Free User
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#94a3b8' }}>
          Don't have an account? <Link to="/register" style={{ color: '#6366f1' }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}
