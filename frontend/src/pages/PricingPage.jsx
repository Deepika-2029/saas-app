import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/shared/Navbar';
import { subscriptionAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const plans = [
  { id: 'free', name: 'Free', price: 0, period: 'forever', color: '#94a3b8', features: ['100 API calls/month','100MB storage','Community support','Basic analytics'], cta: 'Get Started' },
  { id: 'basic', name: 'Basic', price: 9.99, period: 'month', color: '#22c55e', features: ['1,000 API calls/month','1GB storage','Email support','Full analytics','API access'], cta: 'Start Basic', popular: false },
  { id: 'pro', name: 'Pro', price: 29.99, period: 'month', color: '#6366f1', features: ['10,000 API calls/month','10GB storage','Priority support','Advanced analytics','Webhooks','Team seats (5)'], cta: 'Start Pro', popular: true },
  { id: 'enterprise', name: 'Enterprise', price: 99.99, period: 'month', color: '#f59e0b', features: ['Unlimited API calls','Unlimited storage','24/7 dedicated support','Custom integrations','SLA guarantee','Unlimited seats'], cta: 'Contact Sales' },
];

export default function PricingPage() {
  const { isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState(null);
  const navigate = useNavigate();

  const handleSubscribe = async (planId) => {
    if (!isAuthenticated) { navigate('/register'); return; }
    if (planId === 'free') { toast('You are already on the free plan'); return; }
    setLoading(planId);
    try {
      const res = await subscriptionAPI.createCheckout(planId);
      window.location.href = res.data.data.url;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start checkout');
    } finally { setLoading(null); }
  };

  const s = {
    page: { minHeight: '100vh', background: '#0f0f1a' },
    hero: { textAlign: 'center', padding: '60px 20px 40px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 24, maxWidth: 1100, margin: '0 auto', padding: '0 20px 60px' },
    card: (color, popular) => ({ background: '#1a1a2e', border: `2px solid ${popular ? color : '#2d2d4e'}`, borderRadius: 20, padding: 28, position: 'relative', transition: 'transform 0.2s', ...(popular ? { transform: 'scale(1.02)' } : {}) }),
    badge: { position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#6366f1', color: 'white', padding: '4px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' },
    planName: { fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 4 },
    price: { fontSize: 40, fontWeight: 800, fontFamily: "'Space Grotesk',sans-serif" },
    feature: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#94a3b8', marginBottom: 10 },
  };

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.hero}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 44, fontWeight: 700, marginBottom: 16 }}>Simple, Transparent Pricing</h1>
        <p style={{ color: '#94a3b8', fontSize: 18, maxWidth: 500, margin: '0 auto' }}>Choose the plan that fits your needs. Upgrade or downgrade at any time.</p>
      </div>
      <div style={s.grid}>
        {plans.map(plan => (
          <div key={plan.id} style={s.card(plan.color, plan.popular)}
            onMouseEnter={e => e.currentTarget.style.transform = plan.popular ? 'scale(1.04)' : 'translateY(-4px)'}
            onMouseLeave={e => e.currentTarget.style.transform = plan.popular ? 'scale(1.02)' : ''}>
            {plan.popular && <div style={s.badge}>⭐ Most Popular</div>}
            <div style={s.planName}>{plan.name}</div>
            <div style={{ marginBottom: 20 }}>
              <span style={{ ...s.price, color: plan.color }}>${plan.price}</span>
              <span style={{ color: '#94a3b8', fontSize: 14 }}>/{plan.period}</span>
            </div>
            <div style={{ marginBottom: 24 }}>
              {plan.features.map((f, i) => <div key={i} style={s.feature}><span style={{ color: plan.color }}>✓</span>{f}</div>)}
            </div>
            <button
              className={`btn ${plan.popular ? 'btn-primary' : 'btn-outline'}`}
              style={{ width: '100%', justifyContent: 'center', padding: 12, borderColor: plan.color, ...(plan.popular ? {} : { color: plan.color }) }}
              onClick={() => handleSubscribe(plan.id)}
              disabled={loading === plan.id || (isAuthenticated && user?.subscription?.plan === plan.id)}>
              {loading === plan.id ? 'Loading...' : isAuthenticated && user?.subscription?.plan === plan.id ? 'Current Plan' : plan.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
