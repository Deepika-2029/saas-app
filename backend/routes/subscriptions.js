const express = require('express');
const router = express.Router();
const subController = require('../controllers/subscriptionController');
const { protect } = require('../middleware/auth');

router.get('/plans', subController.getPlans);
router.use(protect);
router.post('/checkout', subController.createCheckout);
router.post('/cancel', subController.cancelSubscription);
router.get('/invoices', subController.getInvoices);

module.exports = router;
