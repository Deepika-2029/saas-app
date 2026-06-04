const subscriptionService = require('../services/subscriptionService');
const ApiResponse = require('../utils/apiResponse');

exports.getPlans = (req, res) => {
  const plans = subscriptionService.getPlans();
  ApiResponse.success(res, { plans });
};

exports.createCheckout = async (req, res, next) => {
  try {
    const session = await subscriptionService.createCheckoutSession(req.user.id, req.body.plan);
    ApiResponse.success(res, { sessionId: session.id, url: session.url });
  } catch (error) { next(error); }
};

exports.cancelSubscription = async (req, res, next) => {
  try {
    await subscriptionService.cancelSubscription(req.user.id);
    ApiResponse.success(res, {}, 'Subscription will be cancelled at period end');
  } catch (error) { next(error); }
};

exports.getInvoices = async (req, res, next) => {
  try {
    const invoices = await subscriptionService.getInvoices(req.user.id);
    ApiResponse.success(res, { invoices });
  } catch (error) { next(error); }
};
