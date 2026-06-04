import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initSentry, SentryErrorBoundary } from './utils/sentry';

// Initialize Sentry before app renders
initSentry();

const FallbackUI = () => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', background: '#0f0f1a', color: '#e2e8f0', fontFamily: 'Inter, sans-serif', textAlign: 'center', padding: 20,
  }}>
    <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
    <h2 style={{ marginBottom: 12, fontSize: 22 }}>Something went wrong</h2>
    <p style={{ color: '#94a3b8', marginBottom: 24 }}>An unexpected error occurred. Our team has been notified.</p>
    <button
      onClick={() => window.location.reload()}
      style={{ padding: '10px 24px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}
    >
      Reload Page
    </button>
  </div>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <SentryErrorBoundary fallback={<FallbackUI />}>
      <App />
    </SentryErrorBoundary>
  </React.StrictMode>
);

