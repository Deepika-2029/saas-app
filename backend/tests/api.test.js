/**
 * API Integration Tests (E2E Route Testing)
 * Tests for: Auth API routes, User routes, Subscription routes, Admin routes
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');

jest.mock('../utils/sendEmail', () => jest.fn().mockResolvedValue(true));
jest.mock('../utils/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), http: jest.fn(), debug: jest.fn(),
}));
jest.mock('stripe', () => jest.fn(() => ({
  customers: { create: jest.fn().mockResolvedValue({ id: 'cus_test' }) },
  checkout: { sessions: { create: jest.fn().mockResolvedValue({ id: 'cs_test', url: 'https://stripe.test' }) } },
  subscriptions: { update: jest.fn().mockResolvedValue({ id: 'sub_test' }) },
  invoices: { list: jest.fn().mockResolvedValue({ data: [] }) },
})));

const TEST_DB = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/saasapp_test_api';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_DB);
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

afterEach(async () => {
  await User.deleteMany({});
});

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const registerUser = (overrides = {}) =>
  request(app).post('/api/v1/auth/register').send({
    name: 'Test User',
    email: 'test@api.com',
    password: 'Password1!',
    ...overrides,
  });

const loginUser = (email = 'test@api.com', password = 'Password1!') =>
  request(app).post('/api/v1/auth/login').send({ email, password });

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('should return 200 with server status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('environment');
  });
});

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────
describe('POST /api/v1/auth/register', () => {
  it('should register a user and return 201', async () => {
    const res = await registerUser();
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data.user.email).toBe('test@api.com');
  });

  it('should return 400 for missing name', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ email: 'x@x.com', password: 'Password1!' });
    expect(res.status).toBe(400);
  });

  it('should return 400 for invalid email', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ name: 'A', email: 'notanemail', password: 'Password1!' });
    expect(res.status).toBe(400);
  });

  it('should return 400 for weak password', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ name: 'A', email: 'a@b.com', password: 'weak' });
    expect(res.status).toBe(400);
  });

  it('should return 400 for duplicate email', async () => {
    await registerUser();
    const res = await registerUser();
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => { await registerUser(); });

  it('should login with correct credentials and return 200', async () => {
    const res = await loginUser();
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
  });

  it('should return 401 for wrong password', async () => {
    const res = await loginUser('test@api.com', 'WrongPass1!');
    expect(res.status).toBe(401);
  });

  it('should return 401 for unknown email', async () => {
    const res = await loginUser('ghost@api.com');
    expect(res.status).toBe(401);
  });

  it('should return 400 for missing email field', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ password: 'Password1!' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('should return current user for authenticated request', async () => {
    await registerUser();
    const loginRes = await loginUser();
    const token = loginRes.body.data.accessToken;

    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('test@api.com');
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('should return 401 with invalid token', async () => {
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer invalid.token');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('should logout successfully', async () => {
    await registerUser();
    const loginRes = await loginUser();
    const token = loginRes.body.data.accessToken;

    const res = await request(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

describe('POST /api/v1/auth/forgot-password', () => {
  it('should return 200 for valid email', async () => {
    await registerUser();
    const res = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'test@api.com' });
    expect(res.status).toBe(200);
  });

  it('should return 404 for unknown email', async () => {
    const res = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'ghost@api.com' });
    expect(res.status).toBe(404);
  });
});

// ─── USER ROUTES ──────────────────────────────────────────────────────────────
describe('GET /api/v1/users/profile', () => {
  it('should return user profile when authenticated', async () => {
    await registerUser();
    const loginRes = await loginUser();
    const token = loginRes.body.data.accessToken;

    const res = await request(app).get('/api/v1/users/profile').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('test@api.com');
  });

  it('should return 401 without auth', async () => {
    const res = await request(app).get('/api/v1/users/profile');
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/v1/users/profile', () => {
  it('should update user name', async () => {
    await registerUser();
    const loginRes = await loginUser();
    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .put('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Updated Name');
  });
});

// ─── SUBSCRIPTION ROUTES ──────────────────────────────────────────────────────
describe('GET /api/v1/subscriptions/plans', () => {
  it('should return plans without auth', async () => {
    const res = await request(app).get('/api/v1/subscriptions/plans');
    expect(res.status).toBe(200);
    expect(res.body.data.plans).toHaveProperty('free');
    expect(res.body.data.plans).toHaveProperty('pro');
  });
});

describe('POST /api/v1/subscriptions/checkout', () => {
  it('should create checkout session for authenticated user', async () => {
    await registerUser();
    const loginRes = await loginUser();
    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .post('/api/v1/subscriptions/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan: 'basic' });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('sessionId');
  });

  it('should return 401 without auth', async () => {
    const res = await request(app).post('/api/v1/subscriptions/checkout').send({ plan: 'basic' });
    expect(res.status).toBe(401);
  });
});

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────
describe('GET /api/v1/admin/stats', () => {
  it('should return 401 for unauthenticated request', async () => {
    const res = await request(app).get('/api/v1/admin/stats');
    expect(res.status).toBe(401);
  });

  it('should return 403 for non-admin users', async () => {
    await registerUser();
    const loginRes = await loginUser();
    const token = loginRes.body.data.accessToken;

    const res = await request(app).get('/api/v1/admin/stats').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('should return 200 for admin users', async () => {
    const admin = await User.create({ name: 'Admin', email: 'admin@api.com', password: 'Password1!', role: 'admin' });
    const token = require('jsonwebtoken').sign(
      { id: admin._id },
      process.env.JWT_SECRET || 'test_secret_key_for_jest',
      { expiresIn: '1h' }
    );

    const res = await request(app).get('/api/v1/admin/stats').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

// ─── 404 HANDLER ──────────────────────────────────────────────────────────────
describe('Unknown routes', () => {
  it('should return 404 for unknown API routes', async () => {
    const res = await request(app).get('/api/v1/unknown-route');
    expect(res.status).toBe(404);
  });
});
