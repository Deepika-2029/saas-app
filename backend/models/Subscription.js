const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan: { type: String, enum: ['free', 'basic', 'pro', 'enterprise'], required: true },
  status: { type: String, enum: ['active', 'inactive', 'cancelled', 'past_due', 'trialing'], default: 'active' },
  stripeSubscriptionId: { type: String, unique: true, sparse: true },
  stripeCustomerId: String,
  stripePriceId: String,
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  cancelAtPeriodEnd: { type: Boolean, default: false },
  cancelledAt: Date,
  trialStart: Date,
  trialEnd: Date,
  invoices: [{
    stripeInvoiceId: String,
    amount: Number,
    currency: { type: String, default: 'usd' },
    status: String,
    paidAt: Date,
    invoiceUrl: String,
  }],
  metadata: { type: Map, of: String },
}, { timestamps: true });

subscriptionSchema.index({ user: 1 });


module.exports = mongoose.model('Subscription', subscriptionSchema);
