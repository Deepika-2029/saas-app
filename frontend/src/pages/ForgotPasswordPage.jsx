import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.forgotPassword(email);
      setSent(true);
      // Dev mode: backend returns direct reset link
      if (res?.data?.data?.devResetUrl) {
        setDevResetUrl(res.data.data.devResetUrl);
        toast.success('Reset link ready! Click below 👇');
      } else {
        toast.success('Reset email sent! Check your inbox.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reset email');
    } finally { setLoading(false); }
  };

  const s = {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    card: { background: '#1a1a2e', border: '1px solid #2d2d4e', borderRadius: 20, padding: 40, width: '100%', maxWidth: 460 },
    devBox: { background: '#0f2d1a', border: '1px solid #22c55e', borderRadius: 12, padding: 16, marginBottom: 20 },
    devLink: { color: '#22c55e', wordBreak: 'break-all', fontSize: 13, fontFamily: 'monospace' }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <Link to="/" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 700, fontSize: 18 }}>⚡ SaaSApp</Link>
        <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 700, marginTop: 24, marginBottom: 8 }}>Reset Password</h2>
        {sent ? (
          <div>
            {devResetUrl ? (
              <div style={s.devBox}>
                <p style={{ color: '#22c55e', fontWeight: 700, marginBottom: 8 }}>🔑 Dev Mode — Click to Reset Password:</p>
                <a href={devResetUrl} style={s.devLink}>{devResetUrl}</a>
                <br /><br />
                <a href={devResetUrl} className="btn btn-primary" style={{ display: 'inline-block', textDecoration: 'none', padding: '10px 20px', borderRadius: 8 }}>
                  👉 Reset My Password
                </a>
              </div>
            ) : (
              <p style={{ color: '#22c55e', marginBottom: 24 }}>✅ Check your email for a password reset link.</p>
            )}
            <Link to="/login" className="btn btn-outline" style={{ display: 'block', textAlign: 'center' }}>Back to Login</Link>
          </div>
        ) : (
          <>
            <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 28 }}>Enter your email and we'll send a reset link.</p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14 }}><Link to="/login" style={{ color: '#6366f1' }}>Back to Login</Link></p>
          </>
        )}
      </div>
    </div>
  );
}
