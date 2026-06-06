/**
 * Auth Service Tests
 * Tests for: register, login, forgotPassword, resetPassword, verifyEmail, refreshAccessToken
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ─── Mock dependencies ────────────────────────────────────────────────────────
jest.mock('../utils/sendEmail', () => jest.fn().mockResolvedValue(true));
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  http: jest.fn(),
  debug: jest.fn(),
}));

const authService = require('../services/authService');
const User = require('../models/User');

// ─── Test DB Setup ────────────────────────────────────────────────────────────
beforeAll(async () => {
  const url = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/saasapp_test';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(url);
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

afterEach(async () => {
  await User.deleteMany({});
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const makeUser = async (overrides = {}) => {
  const defaults = { name: 'Test User', email: 'test@example.com', password: 'Password1!' };
  return User.create({ ...defaults, ...overrides });
};

// ─── REGISTER ─────────────────────────────────────────────────────────────────
describe('authService.register()', () => {
  it('should register a new user and return tokens', async () => {
    const result = await authService.register({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'Password1!',
    });

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result.user.email).toBe('alice@example.com');
    expect(result.user.role).toBe('user');
  });

  it('should hash the password before saving', async () => {
    await authService.register({ name: 'Bob', email: 'bob@example.com', password: 'Password1!' });
    const user = await User.findOne({ email: 'bob@example.com' }).select('+password');
    expect(user.password).not.toBe('Password1!');
    const isMatch = await bcrypt.compare('Password1!', user.password);
    expect(isMatch).toBe(true);
  });

  it('should throw 400 if email already registered', async () => {
    await makeUser({ email: 'dup@example.com' });
    await expect(
      authService.register({ name: 'Dup', email: 'dup@example.com', password: 'Password1!' })
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('already registered') });
  });

  it('should send a verification email after registration', async () => {
    const sendEmail = require('../utils/sendEmail');
    await authService.register({ name: 'Carol', email: 'carol@example.com', password: 'Password1!' });
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'carol@example.com' }));
  });
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
describe('authService.login()', () => {
  it('should login with correct credentials and return tokens', async () => {
    await authService.register({ name: 'Dave', email: 'dave@example.com', password: 'Password1!' });
    const result = await authService.login({ email: 'dave@example.com', password: 'Password1!' });

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result.user.email).toBe('dave@example.com');
  });

  it('should update lastLogin on successful login', async () => {
    await authService.register({ name: 'Eve', email: 'eve@example.com', password: 'Password1!' });
    await authService.login({ email: 'eve@example.com', password: 'Password1!' });
    const user = await User.findOne({ email: 'eve@example.com' });
    expect(user.lastLogin).toBeDefined();
  });

  it('should throw 401 for wrong password', async () => {
    await authService.register({ name: 'Frank', email: 'frank@example.com', password: 'Password1!' });
    await expect(
      authService.login({ email: 'frank@example.com', password: 'WrongPass1!' })
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('should throw 401 for non-existent email', async () => {
    await expect(
      authService.login({ email: 'nobody@example.com', password: 'Password1!' })
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('should increment loginAttempts on failed login', async () => {
    await authService.register({ name: 'Grace', email: 'grace@example.com', password: 'Password1!' });
    try { await authService.login({ email: 'grace@example.com', password: 'Wrong1!' }); } catch (_) {}
    const user = await User.findOne({ email: 'grace@example.com' });
    expect(user.loginAttempts).toBeGreaterThan(0);
  });

  it('should lock account after 5 failed login attempts', async () => {
    await authService.register({ name: 'Hank', email: 'hank@example.com', password: 'Password1!' });
    for (let i = 0; i < 5; i++) {
      try { await authService.login({ email: 'hank@example.com', password: 'Wrong1!' }); } catch (_) {}
    }
    await expect(
      authService.login({ email: 'hank@example.com', password: 'Password1!' })
    ).rejects.toMatchObject({ statusCode: 423 });
  });
});

// ─── VERIFY EMAIL ─────────────────────────────────────────────────────────────
describe('authService.verifyEmail()', () => {
  it('should verify email with valid token', async () => {
    const result = await authService.register({ name: 'Ivy', email: 'ivy@example.com', password: 'Password1!' });
    const user = await User.findById(result.user.id);
    const rawToken = user.emailVerificationToken
      ? require('crypto').randomBytes(32).toString('hex')
      : null;

    // Re-generate properly
    const freshUser = await User.findById(result.user.id);
    const token = freshUser.generateEmailVerificationToken();
    await freshUser.save({ validateBeforeSave: false });

    await authService.verifyEmail(token);
    const verified = await User.findById(result.user.id);
    expect(verified.isEmailVerified).toBe(true);
    expect(verified.emailVerificationToken).toBeUndefined();
  });

  it('should throw 400 for invalid/expired token', async () => {
    await expect(authService.verifyEmail('invalidtoken123')).rejects.toMatchObject({ statusCode: 400 });
  });
});

// ─── FORGOT / RESET PASSWORD ──────────────────────────────────────────────────
describe('authService.forgotPassword()', () => {
  it('should send reset email for valid user', async () => {
    const sendEmail = require('../utils/sendEmail');
    sendEmail.mockClear();
    await makeUser({ email: 'jack@example.com' });
    await authService.forgotPassword('jack@example.com');
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'jack@example.com' }));
  });

  it('should throw 404 for unknown email', async () => {
    await expect(authService.forgotPassword('ghost@example.com')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('authService.resetPassword()', () => {
  it('should reset password with valid token', async () => {
    await makeUser({ email: 'kate@example.com', password: 'OldPass1!' });
    const user = await User.findOne({ email: 'kate@example.com' });
    const token = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });

    await authService.resetPassword(token, 'NewPass1!');
    const updated = await User.findOne({ email: 'kate@example.com' }).select('+password');
    const isMatch = await bcrypt.compare('NewPass1!', updated.password);
    expect(isMatch).toBe(true);
  });

  it('should clear reset token after successful reset', async () => {
    await makeUser({ email: 'leo@example.com', password: 'OldPass1!' });
    const user = await User.findOne({ email: 'leo@example.com' });
    const token = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });

    await authService.resetPassword(token, 'NewPass1!');
    const updated = await User.findOne({ email: 'leo@example.com' });
    expect(updated.resetPasswordToken).toBeUndefined();
  });

  it('should throw 400 for invalid reset token', async () => {
    await expect(authService.resetPassword('faketoken', 'NewPass1!')).rejects.toMatchObject({ statusCode: 400 });
  });
});

// ─── REFRESH TOKEN ────────────────────────────────────────────────────────────
describe('authService.refreshAccessToken()', () => {
  it('should return new tokens with valid refresh token', async () => {
    const result = await authService.register({ name: 'Mia', email: 'mia@example.com', password: 'Password1!' });
    const newTokens = await authService.refreshAccessToken(result.refreshToken);
    expect(newTokens).toHaveProperty('accessToken');
    expect(newTokens).toHaveProperty('refreshToken');
  });

  it('should throw 401 for missing refresh token', async () => {
    await expect(authService.refreshAccessToken(null)).rejects.toMatchObject({ statusCode: 401 });
  });

  it('should throw 401 for invalid refresh token', async () => {
    await expect(authService.refreshAccessToken('invalid.token.here')).rejects.toMatchObject({ statusCode: 401 });
  });
});

// ─── JWT TOKEN VALIDATION ─────────────────────────────────────────────────────
describe('JWT Token Structure', () => {
  it('should generate a valid JWT access token containing user id', async () => {
    const result = await authService.register({ name: 'Nina', email: 'nina@example.com', password: 'Password1!' });
    const decoded = jwt.verify(result.accessToken, process.env.JWT_SECRET || 'test_secret_key_for_jest');
    expect(decoded).toHaveProperty('id');
  });
});
