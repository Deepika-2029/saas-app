const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(protect);
router.get('/profile', userController.getProfile);
router.put('/profile', [body('name').trim().notEmpty().isLength({ max: 50 })], validate, userController.updateProfile);
router.put('/change-password',
  [body('currentPassword').notEmpty(), body('newPassword').isLength({ min: 8 })],
  validate, userController.changePassword);
router.get('/usage', userController.getUsage);
router.delete('/account', userController.deleteAccount);

module.exports = router;
