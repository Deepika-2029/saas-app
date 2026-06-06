const stripeFn = require('stripe');
let stripe;
if (!stripeFn.__instance) {
  stripe = stripeFn(process.env.STRIPE_SECRET_KEY);
  stripeFn.__instance = stripe;
  // Ensure subsequent calls return the same mocked client (important for tests)
  if (typeof stripeFn.mockImplementation === 'function') {
    stripeFn.mockImplementation(() => stripe);
  }
} else {
  stripe = stripeFn.__instance;
}
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const PLAN_PRICES = {
  basic: process.env.STRIPE_PRICE_BASIC,
  pro: process.env.STRIPE_PRICE_PRO,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
};

const PLAN_LIMITS = {
  free: { apiCalls: 100, storage: 100 },
  basic: { apiCalls: 1000, storage: 1024 },
  pro: { apiCalls: 10000, storage: 10240 },
  enterprise: { apiCalls: -1, storage: -1 },
};

exports.getPlans = () => ({
  free: { name: 'Free', price: 0, ...PLAN_LIMITS.free, features: ['100 API calls/month', '100MB storage', 'Community support'] },
  basic: { name: 'Basic', price: 9.99, ...PLAN_LIMITS.basic, features: ['1,000 API calls/month', '1GB storage', 'Email support', 'Analytics'] },
  pro: { name: 'Pro', price: 29.99, ...PLAN_LIMITS.pro, features: ['10,000 API calls/month', '10GB storage', 'Priority support', 'Advanced analytics', 'API access'] },
  enterprise: { name: 'Enterprise', price: 99.99, ...PLAN_LIMITS.enterprise, features: ['Unlimited API calls', 'Unlimited storage', '24/7 dedicated support', 'Custom integrations', 'SLA guarantee'] },
});

exports.createCheckoutSession = async (userId, plan) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  let customerId = user.subscription.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, name: user.name, metadata: { userId: userId.toString() } });
    customerId = customer.id;
    user.subscription.stripeCustomerId = customerId;
    await user.save({ validateBeforeSave: false });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: PLAN_PRICES[plan], quantity: 1 }],
    mode: 'subscription',
    success_url: `${process.env.CLIENT_URL}/dashboard?subscription=success`,
    cancel_url: `${process.env.CLIENT_URL}/pricing?subscription=cancelled`,
    metadata: { userId: userId.toString(), plan },
  });

  return session;
};

exports.cancelSubscription = async (userId) => {
  const user = await User.findById(userId);
  if (!user?.subscription?.stripeSubscriptionId) throw new AppError('No active subscription found', 404);

  const subscription = await stripe.subscriptions.update(user.subscription.stripeSubscriptionId, { cancel_at_period_end: true });
  user.subscription.cancelAtPeriodEnd = true;
  await user.save({ validateBeforeSave: false });
  return subscription;
};

exports.getInvoices = async (userId) => {
  const user = await User.findById(userId);
  if (!user?.subscription?.stripeCustomerId) return [];
  const invoices = await stripe.invoices.list({ customer: user.subscription.stripeCustomerId, limit: 20 });
  return invoices.data.map((inv) => ({
    id: inv.id, amount: inv.amount_paid / 100, currency: inv.currency,
    status: inv.status, date: new Date(inv.created * 1000), url: inv.hosted_invoice_url,
  }));
};

const getPlanFromPriceId = (priceId) => {
  const plan = Object.keys(PLAN_PRICES).find(key => PLAN_PRICES[key] === priceId);
  return plan || 'free';
};

exports.handleWebhook = async (event) => {
  const sendEmail = require('../utils/sendEmail');
  const { getPaymentFailedEmail } = require('../utils/emailTemplates');

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const user = await User.findById(session.metadata.userId);
      if (!user) break;
      const sub = await stripe.subscriptions.retrieve(session.subscription);
      user.subscription.plan = session.metadata.plan;
      user.subscription.status = 'active';
      user.subscription.stripeSubscriptionId = session.subscription;
      user.subscription.currentPeriodStart = new Date(sub.current_period_start * 1000);
      user.subscription.currentPeriodEnd = new Date(sub.current_period_end * 1000);
      user.subscription.cancelAtPeriodEnd = sub.cancel_at_period_end;
      await user.save({ validateBeforeSave: false });

      await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: session.subscription },
        {
          user: user._id,
          plan: session.metadata.plan,
          status: 'active',
          stripeCustomerId: session.customer,
          currentPeriodStart: user.subscription.currentPeriodStart,
          currentPeriodEnd: user.subscription.currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        },
        { upsert: true, new: true }
      );
      logger.info(`Subscription created/updated via checkout for user ${user._id}`);
      break;
    }
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const plan = getPlanFromPriceId(subscription.items.data[0].price.id);
      const user = await User.findOne({ 'subscription.stripeSubscriptionId': subscription.id });
      if (user) {
        user.subscription.plan = plan;
        user.subscription.status = subscription.status;
        user.subscription.currentPeriodStart = new Date(subscription.current_period_start * 1000);
        user.subscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        user.subscription.cancelAtPeriodEnd = subscription.cancel_at_period_end;
        await user.save({ validateBeforeSave: false });
      }

      await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: subscription.id },
        {
          plan,
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
        { upsert: true, new: true }
      );
      logger.info(`Subscription ${subscription.id} updated to status ${subscription.status}`);
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const user = await User.findOne({ 'subscription.stripeSubscriptionId': subscription.id });
      if (user) {
        user.subscription.plan = 'free';
        user.subscription.status = 'cancelled';
        user.subscription.stripeSubscriptionId = null;
        await user.save({ validateBeforeSave: false });
      }
      await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: subscription.id },
        { status: 'cancelled', plan: 'free', cancelledAt: new Date() }
      );
      logger.info(`Subscription ${subscription.id} deleted (downgraded user to free)`);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const user = await User.findOne({ 'subscription.stripeCustomerId': invoice.customer });
      if (user) {
        user.subscription.status = 'past_due';
        await user.save({ validateBeforeSave: false });

        await Subscription.findOneAndUpdate(
          { stripeCustomerId: invoice.customer },
          { status: 'past_due' }
        );

        // Send payment failed email
        const billingUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/profile`;
        await sendEmail({
          to: user.email,
          subject: 'Payment Failed - SaaSApp',
          html: getPaymentFailedEmail(user.name, billingUrl),
        });
        logger.warn(`Invoice payment failed for customer ${invoice.customer}, status set to past_due`);
      }
      break;
    }
    case 'invoice.paid': {
      const invoice = event.data.object;
      const user = await User.findOne({ 'subscription.stripeCustomerId': invoice.customer });
      if (user) {
        user.subscription.status = 'active';
        await user.save({ validateBeforeSave: false });

        await Subscription.findOneAndUpdate(
          { stripeCustomerId: invoice.customer },
          { status: 'active' }
        );
        logger.info(`Invoice paid for customer ${invoice.customer}, status set to active`);
      }
      break;
    }
    default:
      logger.info(`Unhandled webhook event: ${event.type}`);
  }
};
