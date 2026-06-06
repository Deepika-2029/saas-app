const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const sendEmail = require('../utils/sendEmail');
const logger = require('../utils/logger');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' });
  return { accessToken, refreshToken };
};

exports.register = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) throw new AppError('Email already registered', 400);

  const user = await User.create({ name, email, password });
  const verificationToken = user.generateEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  const { getWelcomeEmail } = require('../utils/emailTemplates');
  const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email/${verificationToken}`;
  await sendEmail({
    to: email,
    subject: 'Verify Your Email - SaaSApp',
    html: getWelcomeEmail(user.name, verifyUrl),
  });

  const tokens = generateTokens(user._id);
  return { user: { id: user._id, name: user.name, email: user.email, role: user.role, subscription: user.subscription }, ...tokens };
};

exports.login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user) throw new AppError('Invalid email or password', 401);

  if (user.isLocked) throw new AppError('Account temporarily locked due to too many failed attempts', 423);

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await user.incrementLoginAttempts();
    throw new AppError('Invalid email or password', 401);
  }

  user.loginAttempts = 0;
  user.lockUntil = undefined;
  user.lastLogin = Date.now();
  await user.save({ validateBeforeSave: false });

  const tokens = generateTokens(user._id);
  return { user: { id: user._id, name: user.name, email: user.email, role: user.role, subscription: user.subscription, isEmailVerified: user.isEmailVerified }, ...tokens };
};

exports.verifyEmail = async (token) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpire: { $gt: Date.now() },
  });
  if (!user) throw new AppError('Invalid or expired verification token', 400);

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save({ validateBeforeSave: false });
  return user;
};

exports.forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError('No account found with that email', 404);

  const resetToken = user.generatePasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

  // In development: skip email, just return the link directly
  if (process.env.NODE_ENV === 'development') {
    console.log(`\n🔑 DEV MODE — Password Reset Link:\n${resetUrl}\n`);
    return { devResetUrl: resetUrl };
  }

  const { getPasswordResetEmail } = require('../utils/emailTemplates');
  await sendEmail({
    to: email,
    subject: 'Password Reset Request - SaaSApp',
    html: getPasswordResetEmail(user.name, resetUrl),
  });
  return {};
};

exports.resetPassword = async (token, newPassword) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });
  if (!user) throw new AppError('Invalid or expired reset token', 400);

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();
  return generateTokens(user._id);
};

exports.refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) throw new AppError('Refresh token required', 401);

  // Check if token is blacklisted in Redis
  try {
    const redis = require('../utils/redisClient');
    const isBlacklisted = await redis.get(`blacklist:${refreshToken}`);
    if (isBlacklisted) {
      throw new AppError('Refresh token is blacklisted', 401);
    }
  } catch (err) {
    if (err.statusCode === 401) throw err;
    logger.error(`Redis blacklist check error: ${err.message}`);
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) throw new AppError('User not found or inactive', 401);
    return generateTokens(user._id);
  } catch (error) {
    if (error.statusCode === 401) throw error;
    throw new AppError('Invalid refresh token', 401);
  }
};

exports.logout = async (refreshToken) => {
  if (!refreshToken) return;
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const remainingSeconds = decoded.exp - Math.floor(Date.now() / 1000);
    if (remainingSeconds > 0) {
      const redis = require('../utils/redisClient');
      await redis.set(`blacklist:${refreshToken}`, 'true', 'EX', remainingSeconds);
      logger.info('Refresh token blacklisted successfully in Redis');
    }
  } catch (error) {
    logger.warn(`Failed to blacklist refresh token on logout: ${error.message}`);
  }
};
