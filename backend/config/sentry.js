/**
 * Sentry Monitoring Configuration
 * Initializes Sentry SDK for error tracking and performance monitoring.
 * Import this file at the VERY TOP of server.js (before all other imports).
 */

const Sentry = require('@sentry/node');
let nodeProfilingIntegration;
if (process.env.NODE_ENV !== 'test') {
  try {
    // Import profiling integration only in non-test environments to avoid missing native bindings on Windows CI
    ({ nodeProfilingIntegration } = require('@sentry/profiling-node'));
  } catch (e) {
    console.warn('[Sentry] Profiling integration not available:', e.message);
    nodeProfilingIntegration = undefined;
  }
}

const initSentry = () => {
  // Only initialize if DSN is configured
  if (!process.env.SENTRY_DSN) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[Sentry] SENTRY_DSN not set — error tracking disabled.');
    }
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.APP_VERSION || '1.0.0',

    // Capture 100% of transactions in dev, 10% in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Profile 10% of sampled transactions
    profilesSampleRate: 0.1,

    integrations: [
      // Automatic instrumentation for Express, MongoDB, HTTP
      ...(nodeProfilingIntegration ? [nodeProfilingIntegration()] : []),
    ],

    // Scrub sensitive data from events
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request && event.request.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      // Don't send events in test environment
      if (process.env.NODE_ENV === 'test') return null;
      return event;
    },

    // Ignore common non-critical errors
    ignoreErrors: [
      'Not authorized to access this route',
      'Invalid email or password',
      'Token expired',
    ],
  });

  console.log(`[Sentry] Initialized — env: ${process.env.NODE_ENV}`);
};

/**
 * Express error handler that reports errors to Sentry.
 * Must be registered AFTER all routes but BEFORE your custom error handler.
 */
const sentryErrorHandler = () => {
  if (!process.env.SENTRY_DSN) return (err, req, res, next) => next(err);
  return Sentry.expressErrorHandler({
    shouldHandleError(error) {
      // Report 4xx and all 5xx errors
      return !error.isOperational || error.statusCode >= 500;
    },
  });
};

/**
 * Express request handler for Sentry tracing.
 * Must be registered BEFORE all routes.
 */
const sentryRequestHandler = () => {
  if (!process.env.SENTRY_DSN) return (req, res, next) => next();
  return Sentry.requestHandler();
};

/**
 * Express tracing handler for Sentry performance monitoring.
 * Must be registered BEFORE all routes but AFTER sentryRequestHandler.
 */
const sentryTracingHandler = () => {
  if (!process.env.SENTRY_DSN) return (req, res, next) => next();
  return Sentry.tracingHandler();
};

/**
 * Manually capture an exception (use in catch blocks where you want
 * to report an error to Sentry without crashing).
 * @param {Error} error
 * @param {Object} [context] - extra context (userId, action, etc.)
 */
const captureException = (error, context = {}) => {
  if (!process.env.SENTRY_DSN || process.env.NODE_ENV === 'test') return;
  Sentry.withScope((scope) => {
    Object.entries(context).forEach(([key, value]) => scope.setExtra(key, value));
    Sentry.captureException(error);
  });
};

/**
 * Set user context for Sentry — call after authentication.
 * @param {Object} user - { id, email, role }
 */
const setSentryUser = (user) => {
  if (!process.env.SENTRY_DSN || process.env.NODE_ENV === 'test') return;
  Sentry.setUser({ id: user.id, email: user.email, role: user.role });
};

/**
 * Clear user context (call on logout).
 */
const clearSentryUser = () => {
  if (!process.env.SENTRY_DSN || process.env.NODE_ENV === 'test') return;
  Sentry.setUser(null);
};

module.exports = {
  initSentry,
  sentryRequestHandler,
  sentryTracingHandler,
  sentryErrorHandler,
  captureException,
  setSentryUser,
  clearSentryUser,
};
