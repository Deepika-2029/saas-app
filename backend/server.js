const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

// Sentry must be initialized before other imports
const {
  initSentry,
  sentryRequestHandler,
  sentryTracingHandler,
  sentryErrorHandler,
} = require('./config/sentry');
initSentry();

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const connectDB = require('./config/database');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const subscriptionRoutes = require('./routes/subscriptions');
const adminRoutes = require('./routes/admin');
const webhookRoutes = require('./routes/webhooks');

const app = express();

// Sentry request & tracing handlers — must be FIRST
app.use(sentryRequestHandler());
app.use(sentryTracingHandler());

// Connect to Database
connectDB();

// Security Middleware
// crossOriginResourcePolicy disabled so CORS headers are not blocked by helmet
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(mongoSanitize());

// Rate Limiting — only active in production
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX || 100,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts, please try again after 15 minutes.' }
});
if (process.env.NODE_ENV === 'production') {
  app.use('/api/v1/', limiter);
}



// CORS — must be BEFORE body parser and routes to handle preflight OPTIONS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  (process.env.CLIENT_URL || '').replace(/\/$/, ''),
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200, // some legacy browsers choke on 204
};

app.use(cors(corsOptions));
// Explicitly handle preflight for all routes (important for Render cold starts)
app.options('*', cors(corsOptions));

// Stripe webhooks need raw body
app.use('/api/v1/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

// Body Parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Compression
app.use(compression());

// HTTP Request Logger
app.use(morgan('combined', {
  stream: { write: (message) => logger.http(message.trim()) }
}));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// API Routes
// Auth limiter only in production — no limits in development/test
if (process.env.NODE_ENV === 'production') {
  app.use('/api/v1/auth', authLimiter, authRoutes);
} else {
  app.use('/api/v1/auth', authRoutes);
}
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/admin', adminRoutes);

// Serve Frontend in Production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/build', 'index.html'));
  });
}

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Sentry error handler — must be BEFORE custom error handler
app.use(sentryErrorHandler());

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);

  // Auto-seed demo users after server starts (non-blocking)
  setTimeout(async () => {
    try {
      const User = require('./models/User');
      const bcrypt = require('bcryptjs');
      const demoUsers = [
        { name: 'Admin User', email: 'admin@saasapp.com', password: 'Password123!', role: 'admin', isEmailVerified: true, subscription: { plan: 'enterprise', status: 'active' } },
        { name: 'Pro User', email: 'pro@saasapp.com', password: 'Password123!', role: 'user', isEmailVerified: true, subscription: { plan: 'pro', status: 'active' } },
        { name: 'Free User', email: 'free@saasapp.com', password: 'Password123!', role: 'user', isEmailVerified: true, subscription: { plan: 'free', status: 'active' } },
      ];
      for (const u of demoUsers) {
        const exists = await User.findOne({ email: u.email });
        if (!exists) {
          await User.create(u);
          logger.info(`Demo user created: ${u.email}`);
        } else if (exists.loginAttempts > 0 || exists.lockUntil) {
          // Reset locked accounts
          exists.loginAttempts = 0;
          exists.lockUntil = undefined;
          await exists.save({ validateBeforeSave: false });
        }
      }
    } catch (e) {
      logger.warn(`Auto-seed skipped: ${e.message}`);
    }
  }, 3000);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

module.exports = app;
