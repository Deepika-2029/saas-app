const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { setSentryUser, clearSentryUser } = require('../config/sentry');

exports.protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return next(new AppError('Not authorized to access this route', 401));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return next(new AppError('User no longer exists', 401));
    if (!user.isActive) return next(new AppError('Account has been deactivated', 401));

    req.user = user;
    // Set Sentry user context for error reporting
    setSentryUser({ id: user._id.toString(), email: user.email, role: user.role });
    next();
  } catch (error) {
    return next(new AppError('Not authorized, token failed', 401));
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError(`Role '${req.user.role}' is not authorized to access this route`, 403));
    }
    next();
  };
};

exports.requireSubscription = (...plans) => {
  return (req, res, next) => {
    const userPlan = req.user.subscription.plan;
    const userStatus = req.user.subscription.status;
    if (!plans.includes(userPlan) || userStatus !== 'active') {
      return next(new AppError('This feature requires a higher subscription plan', 403));
    }
    next();
  };
};
