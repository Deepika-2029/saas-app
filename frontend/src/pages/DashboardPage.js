import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Navbar from '../components/shared/Navbar';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import toast from 'react-hot-toast';

const mockUsageData = [
  { day: 'Mon', calls: 40 }, { day: 'Tue', calls: 85 }, { day: 'Wed', calls: 62 },
  { day: 'Thu', calls: 110 }, { day: 'Fri', calls: 95 }, { day: 'Sat', calls: 30 }, { day: 'Sun', calls: 20 },
];

const planColors = { free: '#94a3b8', basic: '#22c55e', pro: '#6366f1', enterprise: '#f59e0b' };

export default function DashboardPage() {
  const { user } = useAuth();
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    userAPI.getUsage().then(r => setUsage(r.data.data)).catch(() => toast.error('Failed to load usage'));
  }, []);

  const plan = user?.subscription?.plan || 'free';
  const planLimits = { free: 100, basic: 1000, pro: 10000, enterprise: Infinity };
  const limit = planLimits[plan];
  const apiUsed = usage?.usage?.apiCalls || 0;
  const pct = limit === Infinity ? 0 : Math.min((apiUsed / limit) * 100, 100);

  const s = {
    page: { minHeight: '100vh', background: '#0f0f1a' },
    content: { maxWidth: 1100, margin: '0 auto', padding: '32px 20px' },
    header: { marginBottom: 32 },
    greeting: { fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 4 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 20, marginBottom: 32 },
    statCard: { background: '#1a1a2e', border: '1px solid #2d2d4e', borderRadius: 16, padding: 24 },
    statLabel: { color: '#94a3b8', fontSize: 13, marginBottom: 8 },
    statValue: { fontSize: 32, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif" },
    chartCard: { background: '#1a1a2e', border: '1px solid #2d2d4e', borderRadius: 16, padding: 24, marginBottom: 24 },
    progressBar: { background: '#2d2d4e', borderRadius: 8, height: 8, overflow: 'hidden', marginTop: 8 },
    progressFill: { height: '100%', borderRadius: 8, background: pct > 80 ? '#ef4444' : '#6366f1', width: `${pct}%`, transition: 'width 0.5s ease' },
  };

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.content}>
        <div style={s.header}>
          <h1 style={s.greeting}>Good day, {user?.name?.split(' ')[0]} 👋</h1>
          <p style={{ color: '#94a3b8' }}>Here's your account overview</p>
        </div>

        <div style={s.grid}>
          {[
            { label: 'Current Plan', value: plan.charAt(0).toUpperCase()+plan.slice(1), color: planColors[plan] },
            { label: 'API Calls Used', value: apiUsed.toLocaleString(), color: '#6366f1' },
            { label: 'Storage Used', value: `${((usage?.usage?.storage || 0)/1024).toFixed(1)} MB`, color: '#14b8a6' },
            { label: 'Account Status', value: user?.isEmailVerified ? 'Verified' : 'Unverified', color: user?.isEmailVerified ? '#22c55e' : '#f59e0b' },
          ].map((stat, i) => (
            <div key={i} style={s.statCard}>
              <div style={s.statLabel}>{stat.label}</div>
              <div style={{ ...s.statValue, color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div style={s.chartCard}>
          <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", marginBottom: 20 }}>API Usage This Week</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={mockUsageData}>
              <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2d2d4e', borderRadius: 8 }} />
              <Area type="monotone" dataKey="calls" stroke="#6366f1" fill="url(#grad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={s.chartCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>API Call Quota</span>
            <span style={{ fontSize: 14, color: '#94a3b8' }}>{apiUsed} / {limit === Infinity ? '∞' : limit.toLocaleString()}</span>
          </div>
          <div style={s.progressBar}><div style={s.progressFill}></div></div>
          {pct > 80 && <p style={{ color: '#f59e0b', fontSize: 12, marginTop: 8 }}>⚠️ You're using {pct.toFixed(0)}% of your quota. Consider upgrading.</p>}
        </div>

        {!user?.isEmailVerified && (
          <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: 16, color: '#f59e0b', fontSize: 14 }}>
            ⚠️ Please verify your email address to unlock all features. Check your inbox.
          </div>
        )}
      </div>
    </div>
  );
}
