import React, { useState } from 'react';
import Navbar from '../components/shared/Navbar';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwLoading, setPwLoading] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await userAPI.updateProfile({ name });
      updateUser({ name });
      toast.success('Profile updated!');
    } catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
    finally { setLoading(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    setPwLoading(true);
    try {
      await userAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Password change failed'); }
    finally { setPwLoading(false); }
  };

  const s = {
    page: { minHeight: '100vh', background: '#0f0f1a' },
    content: { maxWidth: 720, margin: '0 auto', padding: '32px 20px' },
    card: { background: '#1a1a2e', border: '1px solid #2d2d4e', borderRadius: 16, padding: 28, marginBottom: 24 },
    title: { fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 600, marginBottom: 24 },
  };

  const planBadge = { free: '#94a3b8', basic: '#22c55e', pro: '#6366f1', enterprise: '#f59e0b' };

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.content}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 32 }}>Account Settings</h1>

        <div style={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{ width: 60, height: 60, background: '#6366f1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700 }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 18 }}>{user?.name}</div>
              <div style={{ color: '#94a3b8', fontSize: 14 }}>{user?.email}</div>
              <span style={{ display: 'inline-block', marginTop: 4, padding: '2px 10px', background: `${planBadge[user?.subscription?.plan]}22`, color: planBadge[user?.subscription?.plan], borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                {user?.subscription?.plan?.toUpperCase()} PLAN
              </span>
            </div>
          </div>
          <form onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" value={user?.email} disabled style={{ opacity: 0.6 }} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
          </form>
        </div>

        <div style={s.card}>
          <h3 style={s.title}>Change Password</h3>
          <form onSubmit={handleChangePassword}>
            {[['currentPassword','Current Password'],['newPassword','New Password'],['confirmPassword','Confirm New Password']].map(([key,label]) => (
              <div className="form-group" key={key}>
                <label className="form-label">{label}</label>
                <input className="form-input" type="password" value={pwForm[key]} onChange={e => setPwForm({ ...pwForm, [key]: e.target.value })} required />
              </div>
            ))}
            <button className="btn btn-primary" type="submit" disabled={pwLoading}>{pwLoading ? 'Changing...' : 'Change Password'}</button>
          </form>
        </div>

        <div style={{ ...s.card, borderColor: 'rgba(239,68,68,0.3)' }}>
          <h3 style={{ ...s.title, color: '#ef4444' }}>Danger Zone</h3>
          <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 16 }}>Once you delete your account, all data will be permanently removed.</p>
          <button className="btn btn-danger" onClick={() => toast.error('Please contact support to delete your account')}>Delete Account</button>
        </div>
      </div>
    </div>
  );
}
