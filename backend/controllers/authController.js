const authService = require('../services/authService');
const ApiResponse = require('../utils/apiResponse');

exports.register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    ApiResponse.success(res, result, 'Registration successful. Please verify your email.', 201);
  } catch (error) { next(error); }
};

exports.login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    ApiResponse.success(res, result, 'Login successful');
  } catch (error) { next(error); }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    await authService.verifyEmail(req.params.token);
    ApiResponse.success(res, {}, 'Email verified successfully');
  } catch (error) { next(error); }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.forgotPassword(req.body.email);
    ApiResponse.success(res, result || {}, 'Password reset email sent');
  } catch (error) { next(error); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const tokens = await authService.resetPassword(req.params.token, req.body.password);
    ApiResponse.success(res, tokens, 'Password reset successful');
  } catch (error) { next(error); }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const tokens = await authService.refreshAccessToken(req.body.refreshToken);
    ApiResponse.success(res, tokens, 'Token refreshed');
  } catch (error) { next(error); }
};

exports.getMe = async (req, res) => {
  ApiResponse.success(res, { user: req.user }, 'User profile retrieved');
};

exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
    ApiResponse.success(res, {}, 'Logged out successfully');
  } catch (error) { next(error); }
};
