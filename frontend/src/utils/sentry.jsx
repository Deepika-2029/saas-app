/**
 * Frontend Sentry Monitoring
 * Initialize this before rendering <App /> in index.js
 */

import * as Sentry from '@sentry/react';

export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Sentry] VITE_SENTRY_DSN not set — error tracking disabled.');
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: import.meta.env.VITE_VERSION || '1.0.0',

    // Capture 100% of transactions in dev, 10% in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Replay 10% of sessions, 100% with errors
        sessionSampleRate: 0.1,
        errorSampleRate: 1.0,
      }),
    ],

    // Scrub sensitive PII from breadcrumbs
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
      }
      return event;
    },
  });
};

/**
 * Set authenticated user context in Sentry.
 * Call this after successful login.
 * @param {{ id: string, email: string, role: string }} user
 */
export const setSentryUser = (user) => {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  Sentry.setUser({ id: user.id, email: user.email, role: user.role });
};

/**
 * Clear user context from Sentry (call on logout).
 */
export const clearSentryUser = () => {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  Sentry.setUser(null);
};

/**
 * Manually capture an exception with optional context.
 * @param {Error} error
 * @param {Object} [extras]
 */
export const captureException = (error, extras = {}) => {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  Sentry.withScope((scope) => {
    Object.entries(extras).forEach(([k, v]) => scope.setExtra(k, v));
    Sentry.captureException(error);
  });
};

/**
 * Higher-order component to wrap routes/pages with Sentry error boundary.
 * Usage: export default withSentryErrorBoundary(MyPage, { fallback: <ErrorPage /> });
 */
export const withSentryErrorBoundary = Sentry.withErrorBoundary;

/**
 * React Error Boundary component from Sentry.
 * Wrap your app root or individual pages to catch render errors.
 *
 * Usage:
 *   <SentryErrorBoundary fallback={<p>Something went wrong</p>}>
 *     <YourComponent />
 *   </SentryErrorBoundary>
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;
