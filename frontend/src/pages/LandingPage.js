import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/shared/Navbar';

const features = [
  { icon: '🔐', title: 'Secure Authentication', desc: 'JWT-based auth with email verification, password reset, and account lockout protection.' },
  { icon: '💳', title: 'Subscription Management', desc: 'Stripe-powered billing with multiple plans, invoices, and webhook handling.' },
  { icon: '👥', title: 'Role-Based Access', desc: 'Fine-grained permissions with user, admin, and superadmin roles.' },
  { icon: '📊', title: 'Analytics Dashboard', desc: 'Real-time usage tracking, API call metrics, and storage monitoring.' },
  { icon: '🔒', title: 'Security First', desc: 'Rate limiting, input sanitization, XSS protection, and audit logging.' },
  { icon: '📈', title: 'Scalable Architecture', desc: 'Modular MERN stack with service layers, proper error handling, and logging.' },
];

const styles = {
  hero: { textAlign: 'center', padding: '100px 20px 60px', maxWidth: 800, margin: '0 auto' },
  heroTitle: { fontSize: 56, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", lineHeight: 1.1, marginBottom: 24 },
  accent: { background: 'linear-gradient(135deg,#6366f1,#14b8a6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  heroSub: { fontSize: 18, color: '#94a3b8', marginBottom: 40, lineHeight: 1.7 },
  cta: { display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' },
  featuresGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24, padding: '60px 20px', maxWidth: 1100, margin: '0 auto' },
  featCard: { background: '#1a1a2e', border: '1px solid #2d2d4e', borderRadius: 16, padding: 28, transition: 'transform 0.2s,border-color 0.2s' },
  featIcon: { fontSize: 32, marginBottom: 16 },
  featTitle: { fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, marginBottom: 10, fontSize: 18 },
  featDesc: { color: '#94a3b8', fontSize: 14, lineHeight: 1.6 },
  footer: { textAlign: 'center', padding: '40px 20px', color: '#94a3b8', borderTop: '1px solid #2d2d4e', fontSize: 14 },
};

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <section style={styles.hero}>
        <h1 style={styles.heroTitle}>Build SaaS Products<br /><span style={styles.accent}>Faster & Smarter</span></h1>
        <p style={styles.heroSub}>A production-ready MERN stack SaaS boilerplate with authentication, billing, RBAC, and everything you need to ship.</p>
        <div style={styles.cta}>
          <Link to="/register" className="btn btn-primary" style={{ padding: '14px 32px', fontSize: 16 }}>Start Free Today</Link>
          <Link to="/pricing" className="btn btn-outline" style={{ padding: '14px 32px', fontSize: 16 }}>View Pricing</Link>
        </div>
      </section>
      <section>
        <div style={styles.featuresGrid}>
          {features.map((f, i) => (
            <div key={i} style={styles.featCard} onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.borderColor='#6366f1'; }} onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.borderColor='#2d2d4e'; }}>
              <div style={styles.featIcon}>{f.icon}</div>
              <h3 style={styles.featTitle}>{f.title}</h3>
              <p style={styles.featDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <footer style={styles.footer}><p>© 2024 SaaSApp. Built with MERN Stack. Production-ready.</p></footer>
    </>
  );
}
