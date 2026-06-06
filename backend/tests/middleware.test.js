/**
 * Middleware Tests
 * Tests for: auth middleware (protect, authorize, requireSubscription),
 *            errorHandler, validate
 */

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const httpMocks = require('node-mocks-http');

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  http: jest.fn(),
  debug: jest.fn(),
}));

const { protect, authorize, requireSubscription } = require('../middleware/auth');
const errorHandler = require('../middleware/errorHandler');
const validate = require('../middleware/validate');
const AppError = require('../utils/AppError');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key_for_jest';

beforeAll(async () => {
  const url = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/saasapp_test';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(url);
  }
  process.env.JWT_SECRET = JWT_SECRET;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

afterEach(async () => {
  await User.deleteMany({});
});

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const makeReqRes = (overrides = {}) => {
  const req = httpMocks.createRequest(overrides);
  const res = httpMocks.createResponse();
  const next = jest.fn();
  return { req, res, next };
};

const makeToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

// ─── PROTECT MIDDLEWARE ───────────────────────────────────────────────────────
describe('protect middleware', () => {
  it('should call next() for valid token and attach user to req', async () => {
    const user = await User.create({ name: 'Protected', email: 'prot@test.com', password: 'Password1!' });
    const token = makeToken({ id: user._id.toString() });
    const { req, res, next } = makeReqRes({ headers: { authorization: `Bearer ${token}` } });

    await protect(req, res, next);

    expect(next).toHaveBeenCalledWith(); // called with no error
    expect(req.user).toBeDefined();
    expect(req.user.email).toBe('prot@test.com');
  });

  it('should call next(error) with 401 if no token provided', async () => {
    const { req, res, next } = makeReqRes();
    await protect(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('should call next(error) with 401 for malformed token', async () => {
    const { req, res, next } = makeReqRes({ headers: { authorization: 'Bearer invalid.token' } });
    await protect(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('should return 401 if user account is deactivated', async () => {
    const user = await User.create({ name: 'Inactive', email: 'inactive@test.com', password: 'Password1!', isActive: false });
    const token = makeToken({ id: user._id.toString() });
    const { req, res, next } = makeReqRes({ headers: { authorization: `Bearer ${token}` } });

    await protect(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});

// ─── AUTHORIZE MIDDLEWARE ─────────────────────────────────────────────────────
describe('authorize middleware', () => {
  it('should allow access for correct role', () => {
    const { req, res, next } = makeReqRes();
    req.user = { role: 'admin' };
    authorize('admin', 'superadmin')(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('should block access for incorrect role', () => {
    const { req, res, next } = makeReqRes();
    req.user = { role: 'user' };
    authorize('admin')(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('should allow superadmin when admin is required', () => {
    const { req, res, next } = makeReqRes();
    req.user = { role: 'superadmin' };
    authorize('admin', 'superadmin')(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });
});

// ─── REQUIRE SUBSCRIPTION MIDDLEWARE ─────────────────────────────────────────
describe('requireSubscription middleware', () => {
  it('should allow access for active matching plan', () => {
    const { req, res, next } = makeReqRes();
    req.user = { subscription: { plan: 'pro', status: 'active' } };
    requireSubscription('pro', 'enterprise')(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('should block access for lower plan', () => {
    const { req, res, next } = makeReqRes();
    req.user = { subscription: { plan: 'free', status: 'active' } };
    requireSubscription('pro', 'enterprise')(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('should block access for cancelled subscription', () => {
    const { req, res, next } = makeReqRes();
    req.user = { subscription: { plan: 'pro', status: 'cancelled' } };
    requireSubscription('pro')(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });
});

// ─── ERROR HANDLER MIDDLEWARE ─────────────────────────────────────────────────
describe('errorHandler middleware', () => {
  it('should return error response with correct status code', () => {
    const { req, res, next } = makeReqRes();
    const err = new AppError('Test error', 422);
    process.env.NODE_ENV = 'production';
    errorHandler(err, req, res, next);
    expect(res.statusCode).toBe(422);
    const data = res._getJSONData();
    expect(data.success).toBe(false);
    expect(data.message).toBe('Test error');
  });

  it('should default to 500 if no statusCode on error', () => {
    const { req, res, next } = makeReqRes();
    const err = new Error('Unexpected');
    process.env.NODE_ENV = 'production';
    errorHandler(err, req, res, next);
    expect(res.statusCode).toBe(500);
  });

  it('should include stack trace in development mode', () => {
    const { req, res, next } = makeReqRes();
    const err = new AppError('Dev error', 400);
    process.env.NODE_ENV = 'development';
    errorHandler(err, req, res, next);
    const data = res._getJSONData();
    expect(data).toHaveProperty('stack');
  });
});

// ─── VALIDATE MIDDLEWARE ──────────────────────────────────────────────────────
describe('validate middleware', () => {
  it('should call next() when no validation errors', () => {
    const { req, res, next } = makeReqRes();
    // mock validationResult to return no errors
    jest.doMock('express-validator', () => ({
      validationResult: () => ({ isEmpty: () => true, array: () => [] }),
    }));
    validate(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

// ─── APP ERROR CLASS ──────────────────────────────────────────────────────────
describe('AppError class', () => {
  it('should create operational error with correct statusCode', () => {
    const err = new AppError('Not found', 404);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.isOperational).toBe(true);
    expect(err.status).toBe('fail');
  });

  it('should set status to error for 5xx codes', () => {
    const err = new AppError('Server error', 500);
    expect(err.status).toBe('error');
  });
});
