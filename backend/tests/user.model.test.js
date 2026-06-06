/**
 * User Model Tests
 * Tests for: schema validation, password hashing, token generation, account lockout
 */

const mongoose = require('mongoose');
const User = require('../models/User');

jest.mock('../utils/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), http: jest.fn(), debug: jest.fn(),
}));

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

describe('User Model', () => {
  // ─── SCHEMA VALIDATION ─────────────────────────────────────────────────────
  describe('Schema Validation', () => {
    it('should create a valid user with required fields', async () => {
      const user = await User.create({ name: 'John Doe', email: 'john@test.com', password: 'Password1!' });
      expect(user._id).toBeDefined();
      expect(user.role).toBe('user');
      expect(user.isActive).toBe(true);
      expect(user.subscription.plan).toBe('free');
    });

    it('should fail without name', async () => {
      await expect(User.create({ email: 'x@test.com', password: 'Password1!' }))
        .rejects.toThrow();
    });

    it('should fail without email', async () => {
      await expect(User.create({ name: 'X', password: 'Password1!' }))
        .rejects.toThrow();
    });

    it('should fail without password', async () => {
      await expect(User.create({ name: 'X', email: 'x@test.com' }))
        .rejects.toThrow();
    });

    it('should enforce unique email constraint', async () => {
      await User.create({ name: 'A', email: 'dup@test.com', password: 'Password1!' });
      await expect(User.create({ name: 'B', email: 'dup@test.com', password: 'Password1!' }))
        .rejects.toThrow();
    });

    it('should reject invalid email format', async () => {
      await expect(User.create({ name: 'A', email: 'notvalid', password: 'Password1!' }))
        .rejects.toThrow();
    });

    it('should only allow valid roles', async () => {
      await expect(User.create({ name: 'A', email: 'a@test.com', password: 'Password1!', role: 'hacker' }))
        .rejects.toThrow();
    });

    it('should only allow valid subscription plans', async () => {
      await expect(
        User.create({ name: 'A', email: 'a@test.com', password: 'Password1!', subscription: { plan: 'gold' } })
      ).rejects.toThrow();
    });

    it('should store timestamps (createdAt, updatedAt)', async () => {
      const user = await User.create({ name: 'TS', email: 'ts@test.com', password: 'Password1!' });
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });
  });

  // ─── PASSWORD ──────────────────────────────────────────────────────────────
  describe('Password Handling', () => {
    it('should hash password before save', async () => {
      const user = await User.create({ name: 'Hash', email: 'hash@test.com', password: 'Password1!' });
      const dbUser = await User.findById(user._id).select('+password');
      expect(dbUser.password).not.toBe('Password1!');
      expect(dbUser.password).toMatch(/^\$2[ab]\$\d{2}\$/);
    });

    it('comparePassword should return true for correct password', async () => {
      const user = await User.create({ name: 'Cmp', email: 'cmp@test.com', password: 'Password1!' });
      const dbUser = await User.findById(user._id).select('+password');
      const result = await dbUser.comparePassword('Password1!');
      expect(result).toBe(true);
    });

    it('comparePassword should return false for wrong password', async () => {
      const user = await User.create({ name: 'Cmp2', email: 'cmp2@test.com', password: 'Password1!' });
      const dbUser = await User.findById(user._id).select('+password');
      const result = await dbUser.comparePassword('WrongPass1!');
      expect(result).toBe(false);
    });

    it('should not re-hash password if unchanged', async () => {
      const user = await User.create({ name: 'NoRehash', email: 'norehash@test.com', password: 'Password1!' });
      const dbUser = await User.findById(user._id).select('+password');
      const originalHash = dbUser.password;

      dbUser.name = 'Updated Name';
      await dbUser.save();

      const after = await User.findById(user._id).select('+password');
      expect(after.password).toBe(originalHash);
    });
  });

  // ─── TOKEN GENERATION ─────────────────────────────────────────────────────
  describe('Token Generation', () => {
    it('generateEmailVerificationToken should return a raw token and store hashed', async () => {
      const user = await User.create({ name: 'Token', email: 'token@test.com', password: 'Password1!' });
      const rawToken = user.generateEmailVerificationToken();
      expect(rawToken).toBeDefined();
      expect(rawToken).toHaveLength(64); // 32 bytes hex
      expect(user.emailVerificationToken).toBeDefined();
      expect(user.emailVerificationExpire).toBeDefined();
      expect(user.emailVerificationToken).not.toBe(rawToken);
    });

    it('generatePasswordResetToken should return a raw token and store hashed', async () => {
      const user = await User.create({ name: 'Reset', email: 'reset@test.com', password: 'Password1!' });
      const rawToken = user.generatePasswordResetToken();
      expect(rawToken).toBeDefined();
      expect(user.resetPasswordToken).toBeDefined();
      expect(user.resetPasswordExpire).toBeDefined();
      expect(user.resetPasswordToken).not.toBe(rawToken);
    });

    it('resetPasswordExpire should be ~10 minutes in the future', async () => {
      const user = await User.create({ name: 'Expire', email: 'expire@test.com', password: 'Password1!' });
      const before = Date.now();
      user.generatePasswordResetToken();
      const after = Date.now();
      const expiry = user.resetPasswordExpire.getTime();
      expect(expiry).toBeGreaterThanOrEqual(before + 9 * 60 * 1000);
      expect(expiry).toBeLessThanOrEqual(after + 10 * 60 * 1000 + 100);
    });
  });

  // ─── ACCOUNT LOCKOUT ──────────────────────────────────────────────────────
  describe('Account Lockout', () => {
    it('isLocked should be false for new user', async () => {
      const user = await User.create({ name: 'Lock', email: 'lock@test.com', password: 'Password1!' });
      expect(user.isLocked).toBe(false);
    });

    it('incrementLoginAttempts should increase loginAttempts', async () => {
      const user = await User.create({ name: 'Attempts', email: 'attempts@test.com', password: 'Password1!' });
      await user.incrementLoginAttempts();
      const updated = await User.findById(user._id);
      expect(updated.loginAttempts).toBe(1);
    });

    it('should set lockUntil after 5 failed attempts', async () => {
      const user = await User.create({ name: 'Lock5', email: 'lock5@test.com', password: 'Password1!' });
      for (let i = 0; i < 5; i++) await user.incrementLoginAttempts();
      const updated = await User.findById(user._id);
      expect(updated.lockUntil).toBeDefined();
      expect(updated.isLocked).toBe(true);
    });
  });

  // ─── DEFAULTS ─────────────────────────────────────────────────────────────
  describe('Default Values', () => {
    it('should default subscription plan to free', async () => {
      const user = await User.create({ name: 'Free', email: 'free@test.com', password: 'Password1!' });
      expect(user.subscription.plan).toBe('free');
      expect(user.subscription.status).toBe('active');
    });

    it('should default usage.apiCalls to 0', async () => {
      const user = await User.create({ name: 'Usage', email: 'usage@test.com', password: 'Password1!' });
      expect(user.usage.apiCalls).toBe(0);
      expect(user.usage.storage).toBe(0);
    });

    it('should default preferences.theme to system', async () => {
      const user = await User.create({ name: 'Prefs', email: 'prefs@test.com', password: 'Password1!' });
      expect(user.preferences.theme).toBe('system');
    });

    it('should default isEmailVerified to false', async () => {
      const user = await User.create({ name: 'Unverified', email: 'unverified@test.com', password: 'Password1!' });
      expect(user.isEmailVerified).toBe(false);
    });
  });
});
