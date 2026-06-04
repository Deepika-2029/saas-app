import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await register({ name: form.name, email: form.email, password: form.password });
      toast.success('Account created! Please verify your email.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const s = { page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }, card: { background: '#1a1a2e', border: '1px solid #2d2d4e', borderRadius: 20, padding: 40, width: '100%', maxWidth: 440 } };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <Link to="/" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 700, fontSize: 18 }}>⚡ SaaSApp</Link>
        <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 700, marginTop: 24, marginBottom: 8 }}>Create account</h2>
        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 32 }}>Start your free account today</p>
        <form onSubmit={handleSubmit}>
          {[['name', 'Full Name', 'text', 'John Doe'], ['email', 'Email', 'email', 'you@example.com'], ['password', 'Password', 'password', '••••••••'], ['confirmPassword', 'Confirm Password', 'password', '••••••••']].map(([key, label, type, ph]) => (
            <div className="form-group" key={key}>
              <label className="form-label">{label}</label>
              <input className="form-input" type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={ph} required />
            </div>
          ))}
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 12, marginTop: 4 }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#94a3b8' }}>
          Already have an account? <Link to="/login" style={{ color: '#6366f1' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
