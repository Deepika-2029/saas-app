const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    ApiResponse.success(res, { user });
  } catch (error) { next(error); }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, preferences } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, preferences },
      { new: true, runValidators: true }
    );
    ApiResponse.success(res, { user }, 'Profile updated');
  } catch (error) { next(error); }
};

exports.changePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');
    const isMatch = await user.comparePassword(req.body.currentPassword);
    if (!isMatch) return next(new AppError('Current password is incorrect', 400));
    user.password = req.body.newPassword;
    await user.save();
    ApiResponse.success(res, {}, 'Password changed successfully');
  } catch (error) { next(error); }
};

exports.deleteAccount = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { isActive: false });
    ApiResponse.success(res, {}, 'Account deactivated successfully');
  } catch (error) { next(error); }
};

exports.getUsage = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('usage subscription');
    ApiResponse.success(res, { usage: user.usage, subscription: user.subscription });
  } catch (error) { next(error); }
};
