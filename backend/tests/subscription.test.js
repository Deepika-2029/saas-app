/**
 * Subscription Service Tests
 * Tests for: getPlans, plan limits, webhook handling
 */

const mongoose = require('mongoose');

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  http: jest.fn(),
  debug: jest.fn(),
}));

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn(() => ({
    customers: { create: jest.fn().mockResolvedValue({ id: 'cus_test123' }) },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({ id: 'cs_test123', url: 'https://checkout.stripe.com/test' }),
      },
    },
    subscriptions: {
      update: jest.fn().mockResolvedValue({ id: 'sub_test123', cancel_at_period_end: true }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'sub_test123',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
      }),
    },
    invoices: {
      list: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'inv_test1',
            amount_paid: 999,
            currency: 'usd',
            status: 'paid',
            created: Math.floor(Date.now() / 1000),
            hosted_invoice_url: 'https://invoice.stripe.com/test',
          },
        ],
      }),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  }));
});

const subscriptionService = require('../services/subscriptionService');
const User = require('../models/User');
const Subscription = require('../models/Subscription');

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
  await Subscription.deleteMany({});
});

// ─── GET PLANS ────────────────────────────────────────────────────────────────
describe('subscriptionService.getPlans()', () => {
  it('should return all 4 plans', () => {
    const plans = subscriptionService.getPlans();
    expect(Object.keys(plans)).toEqual(['free', 'basic', 'pro', 'enterprise']);
  });

  it('Free plan should have price 0', () => {
    const plans = subscriptionService.getPlans();
    expect(plans.free.price).toBe(0);
  });

  it('Basic plan should cost $9.99', () => {
    const plans = subscriptionService.getPlans();
    expect(plans.basic.price).toBe(9.99);
  });

  it('Pro plan should cost $29.99', () => {
    const plans = subscriptionService.getPlans();
    expect(plans.pro.price).toBe(29.99);
  });

  it('Enterprise plan should cost $99.99', () => {
    const plans = subscriptionService.getPlans();
    expect(plans.enterprise.price).toBe(99.99);
  });

  it('each plan should have apiCalls and storage limits', () => {
    const plans = subscriptionService.getPlans();
    for (const [, plan] of Object.entries(plans)) {
      expect(plan).toHaveProperty('apiCalls');
      expect(plan).toHaveProperty('storage');
    }
  });

  it('Enterprise plan should have unlimited limits (-1)', () => {
    const plans = subscriptionService.getPlans();
    expect(plans.enterprise.apiCalls).toBe(-1);
    expect(plans.enterprise.storage).toBe(-1);
  });

  it('each plan should have a features array', () => {
    const plans = subscriptionService.getPlans();
    for (const [, plan] of Object.entries(plans)) {
      expect(Array.isArray(plan.features)).toBe(true);
      expect(plan.features.length).toBeGreaterThan(0);
    }
  });
});

// ─── CREATE CHECKOUT SESSION ──────────────────────────────────────────────────
describe('subscriptionService.createCheckoutSession()', () => {
  it('should create a checkout session for valid user and plan', async () => {
    const user = await User.create({ name: 'Test User', email: 'sub@example.com', password: 'Password1!' });
    const session = await subscriptionService.createCheckoutSession(user._id, 'basic');
    expect(session).toHaveProperty('id');
    expect(session.id).toBe('cs_test123');
  });

  it('should create a Stripe customer if one does not exist', async () => {
    const stripe = require('stripe')();
    const user = await User.create({ name: 'New Customer', email: 'newcust@example.com', password: 'Password1!' });
    await subscriptionService.createCheckoutSession(user._id, 'pro');
    expect(stripe.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'newcust@example.com' })
    );
  });

  it('should throw 404 for non-existent user', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    await expect(subscriptionService.createCheckoutSession(fakeId, 'basic')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── CANCEL SUBSCRIPTION ──────────────────────────────────────────────────────
describe('subscriptionService.cancelSubscription()', () => {
  it('should cancel subscription and set cancelAtPeriodEnd', async () => {
    const user = await User.create({
      name: 'Cancel User',
      email: 'cancel@example.com',
      password: 'Password1!',
      subscription: {
        plan: 'pro',
        status: 'active',
        stripeSubscriptionId: 'sub_existing123',
        stripeCustomerId: 'cus_existing123',
      },
    });

    await subscriptionService.cancelSubscription(user._id);
    const updated = await User.findById(user._id);
    expect(updated.subscription.cancelAtPeriodEnd).toBe(true);
  });

  it('should throw 404 if user has no active subscription', async () => {
    const user = await User.create({ name: 'No Sub', email: 'nosub@example.com', password: 'Password1!' });
    await expect(subscriptionService.cancelSubscription(user._id)).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── GET INVOICES ─────────────────────────────────────────────────────────────
describe('subscriptionService.getInvoices()', () => {
  it('should return invoices for user with stripe customer', async () => {
    const user = await User.create({
      name: 'Invoice User',
      email: 'invoice@example.com',
      password: 'Password1!',
      subscription: { stripeCustomerId: 'cus_test123' },
    });

    const invoices = await subscriptionService.getInvoices(user._id);
    expect(Array.isArray(invoices)).toBe(true);
    expect(invoices[0]).toHaveProperty('id');
    expect(invoices[0]).toHaveProperty('amount');
    expect(invoices[0]).toHaveProperty('status');
  });

  it('should return empty array for user with no stripe customer', async () => {
    const user = await User.create({ name: 'No Stripe', email: 'nostripe@example.com', password: 'Password1!' });
    const invoices = await subscriptionService.getInvoices(user._id);
    expect(invoices).toEqual([]);
  });
});

// ─── WEBHOOK HANDLING ─────────────────────────────────────────────────────────
describe('subscriptionService.handleWebhook()', () => {
  it('should handle checkout.session.completed and activate subscription', async () => {
    const user = await User.create({ name: 'Webhook User', email: 'webhook@example.com', password: 'Password1!' });

    await subscriptionService.handleWebhook({
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { userId: user._id.toString(), plan: 'pro' },
          subscription: 'sub_webhook123',
          customer: 'cus_webhook123',
        },
      },
    });

    const updated = await User.findById(user._id);
    expect(updated.subscription.plan).toBe('pro');
    expect(updated.subscription.status).toBe('active');
    expect(updated.subscription.stripeSubscriptionId).toBe('sub_webhook123');
  });

  it('should handle invoice.payment_failed and mark status as past_due', async () => {
    const user = await User.create({
      name: 'Past Due User',
      email: 'pastdue@example.com',
      password: 'Password1!',
      subscription: { stripeCustomerId: 'cus_pastdue123', status: 'active' },
    });

    await subscriptionService.handleWebhook({
      type: 'invoice.payment_failed',
      data: { object: { customer: 'cus_pastdue123' } },
    });

    const updated = await User.findById(user._id);
    expect(updated.subscription.status).toBe('past_due');
  });

  it('should handle customer.subscription.deleted and downgrade to free', async () => {
    const user = await User.create({
      name: 'Deleted Sub',
      email: 'delsub@example.com',
      password: 'Password1!',
      subscription: {
        plan: 'pro',
        status: 'active',
        stripeSubscriptionId: 'sub_deleted123',
      },
    });

    await subscriptionService.handleWebhook({
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_deleted123' } },
    });

    const updated = await User.findById(user._id);
    expect(updated.subscription.plan).toBe('free');
    expect(updated.subscription.status).toBe('cancelled');
  });
});
