const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 50 }),
  body('email').isEmail().withMessage('Valid email required').toLowerCase().trim(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email required').toLowerCase().trim(),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post('/register', registerValidation, validate, authController.register);
router.post('/login', loginValidation, validate, authController.login);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/forgot-password', [body('email').isEmail()], validate, authController.forgotPassword);
router.post('/reset-password/:token', [body('password').isLength({ min: 8 })], validate, authController.resetPassword);
router.post('/refresh-token', authController.refreshToken);
router.get('/me', protect, authController.getMe);
router.post('/logout', protect, authController.logout);

module.exports = router;
