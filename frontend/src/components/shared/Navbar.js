import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const styles = {
  nav: { background: 'rgba(15,15,26,0.95)', borderBottom: '1px solid #2d2d4e', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)' },
  logo: { fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 20, color: '#6366f1', textDecoration: 'none' },
  links: { display: 'flex', alignItems: 'center', gap: 8 },
  link: { padding: '8px 14px', color: '#94a3b8', textDecoration: 'none', borderRadius: 8, fontSize: 14, transition: 'all 0.2s' },
  avatar: { width: 36, height: 36, background: '#6366f1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  dropdown: { position: 'absolute', top: 60, right: 24, background: '#1a1a2e', border: '1px solid #2d2d4e', borderRadius: 12, padding: 8, minWidth: 180, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' },
  dropItem: { display: 'block', padding: '10px 14px', color: '#e2e8f0', textDecoration: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer', border: 'none', background: 'none', width: '100%', textAlign: 'left' },
};

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
    setShowDropdown(false);
  };

  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.logo}>⚡ SaaSApp</Link>
      <div style={styles.links}>
        {isAuthenticated ? (
          <>
            <Link to="/dashboard" style={styles.link}>Dashboard</Link>
            <Link to="/pricing" style={styles.link}>Pricing</Link>
            {['admin','superadmin'].includes(user?.role) && <Link to="/admin" style={styles.link}>Admin</Link>}
            <div style={{ position: 'relative' }}>
              <div style={styles.avatar} onClick={() => setShowDropdown(!showDropdown)}>
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              {showDropdown && (
                <div style={styles.dropdown}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid #2d2d4e', marginBottom: 4 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{user?.name}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{user?.email}</div>
                  </div>
                  <Link to="/profile" style={styles.dropItem} onClick={() => setShowDropdown(false)}>Profile Settings</Link>
                  <button style={{ ...styles.dropItem, color: '#ef4444' }} onClick={handleLogout}>Logout</button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/pricing" style={styles.link}>Pricing</Link>
            <Link to="/login" style={styles.link}>Login</Link>
            <Link to="/register" style={{ ...styles.link, background: '#6366f1', color: 'white', padding: '8px 16px' }}>Get Started</Link>
          </>
        )}
      </div>
    </nav>
  );
}
