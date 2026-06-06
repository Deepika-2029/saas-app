import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import Navbar from '../components/shared/Navbar';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('users');
  const [search, setSearch] = useState('');

  useEffect(() => {
    adminAPI.getStats().then(r => setStats(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    adminAPI.getUsers({ search, page: 1, limit: 20 })
      .then(r => { setUsers(r.data.data); setPagination(r.data.pagination); })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  }, [search]);

  const handleToggleStatus = async (id) => {
    try {
      await adminAPI.toggleStatus(id);
      setUsers(prev => prev.map(u => u._id === id ? { ...u, isActive: !u.isActive } : u));
      toast.success('User status updated');
    } catch { toast.error('Failed to update status'); }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await adminAPI.updateRole(id, role);
      setUsers(prev => prev.map(u => u._id === id ? { ...u, role } : u));
      toast.success('Role updated');
    } catch { toast.error('Failed to update role'); }
  };

  const planColor = { free: '#94a3b8', basic: '#22c55e', pro: '#6366f1', enterprise: '#f59e0b' };
  const s = {
    page: { minHeight: '100vh', background: '#0f0f1a' },
    content: { maxWidth: 1200, margin: '0 auto', padding: '32px 20px' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 32 },
    statCard: { background: '#1a1a2e', border: '1px solid #2d2d4e', borderRadius: 14, padding: 20 },
    tabs: { display: 'flex', gap: 4, marginBottom: 24, background: '#1a1a2e', padding: 4, borderRadius: 10, width: 'fit-content' },
    tab: (active) => ({ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: 14, background: active ? '#6366f1' : 'transparent', color: active ? 'white' : '#94a3b8' }),
  };

  const AdminSkeleton = () => (
    <div style={s.page}>
      <Navbar />
      <div style={s.content}>
        <div style={{ marginBottom: 32 }}>
          <div className="skeleton" style={{ width: 220, height: 36 }}></div>
        </div>
        <div style={s.statsGrid}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} style={s.statCard}>
              <div className="skeleton" style={{ width: 80, height: 13, marginBottom: 12 }}></div>
              <div className="skeleton" style={{ width: 100, height: 28 }}></div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20, marginBottom: 32 }}>
          {[1, 2].map(i => (
            <div key={i} className="card" style={{ padding: 24, minHeight: 340 }}>
              <div className="skeleton" style={{ width: 150, height: 20, marginBottom: 20 }}></div>
              <div className="skeleton" style={{ width: '100%', height: 240 }}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (!stats) return <AdminSkeleton />;

  const planDist = stats?.planCounts || [];
  
  const pieData = (stats.planCounts || [])
    .filter(p => p.count > 0)
    .map(p => ({ name: p._id, value: p.count }));

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.content}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 32 }}>Admin Dashboard</h1>

        <div style={s.statsGrid}>
          {[
            { label: 'Total Users', value: stats?.totalUsers || 0, color: '#6366f1' },
            { label: 'Active Users', value: stats?.activeUsers || 0, color: '#22c55e' },
            { label: 'MRR', value: `$${(stats?.mrr || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: '#10b981' },
            { label: 'Churn Rate', value: `${stats?.churnRate || 0}%`, color: '#ef4444' },
            ...planDist.map(p => ({ label: `${p._id?.charAt(0).toUpperCase()+p._id?.slice(1)} Plan`, value: p.count, color: planColor[p._id] })),
          ].map((s2, i) => (
            <div key={i} style={s.statCard}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 6 }}>{s2.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: s2.color, fontFamily: "'Space Grotesk',sans-serif" }}>{s2.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20, marginBottom: 32 }}>
          <div className="card" style={{ padding: 24, minHeight: 340 }}>
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, marginBottom: 20 }}>Plan Distribution</h3>
            {pieData.length === 0 ? (
              <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    minAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={planColor[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2d2d4e', borderRadius: 8, color: '#e2e8f0' }} />
                  <Legend formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 13 }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card" style={{ padding: 24, minHeight: 340 }}>
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, marginBottom: 20 }}>User Growth (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={stats?.userGrowth || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2d4e" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(tick) => tick.slice(5)} stroke="#2d2d4e" />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#2d2d4e" allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2d2d4e', borderRadius: 8, color: '#e2e8f0' }} />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 8 }} name="New Signups" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={s.tabs}>
          {['users','logs'].map(t => <button key={t} style={s.tab(tab===t)} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}
        </div>

        {tab === 'users' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #2d2d4e' }}>
              <input className="form-input" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
            </div>
            {loading ? <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div> : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead><tr><th>Name</th><th>Email</th><th>Plan</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id}>
                        <td>{u.name}</td>
                        <td style={{ color: '#94a3b8' }}>{u.email}</td>
                        <td><span style={{ color: planColor[u.subscription?.plan] || '#94a3b8' }}>{u.subscription?.plan || 'free'}</span></td>
                        <td>
                          <select value={u.role} onChange={e => handleRoleChange(u._id, e.target.value)} style={{ background: '#0f0f1a', border: '1px solid #2d2d4e', color: '#e2e8f0', borderRadius: 6, padding: '4px 8px', fontSize: 13 }}>
                            {['user','admin','superadmin'].map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </td>
                        <td><span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                        <td>
                          <button className={`btn ${u.isActive ? 'btn-danger' : 'btn-outline'}`} style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => handleToggleStatus(u._id)}>
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No users found</div>}
              </div>
            )}
          </div>
        )}

        {tab === 'logs' && (
          <div style={{ background: '#1a1a2e', border: '1px solid #2d2d4e', borderRadius: 16, padding: 24, color: '#94a3b8', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <p>Audit logs are available via the API endpoint <code style={{ background: '#0f0f1a', padding: '2px 8px', borderRadius: 4 }}>/api/admin/audit-logs</code></p>
          </div>
        )}
      </div>
    </div>
  );
}
