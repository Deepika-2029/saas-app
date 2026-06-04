const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const router = express.Router();
const subscriptionService = require('../services/subscriptionService');
const logger = require('../utils/logger');

router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  try {
    await subscriptionService.handleWebhook(event);
    res.json({ received: true });
  } catch (err) {
    logger.error(`Webhook processing failed: ${err.message}`);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
