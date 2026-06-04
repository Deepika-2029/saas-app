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

  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
  await sendEmail({
    to: email,
    subject: 'Verify Your Email - SaaSApp',
    html: `<h2>Welcome to SaaSApp!</h2><p>Click <a href="${verifyUrl}">here</a> to verify your email.</p>`,
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
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n🔑 DEV MODE — Password Reset Link:\n${resetUrl}\n`);
    return { devResetUrl: resetUrl };
  }

  await sendEmail({
    to: email,
    subject: 'Password Reset Request - SaaSApp',
    html: `<h2>Reset Your Password</h2><p>Click <a href="${resetUrl}">here</a> to reset. Expires in 10 minutes.</p>`,
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
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) throw new AppError('User not found or inactive', 401);
    return generateTokens(user._id);
  } catch {
    throw new AppError('Invalid refresh token', 401);
  }
};
