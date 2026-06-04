const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');

exports.getStats = async (req, res, next) => {
  try {
    const [totalUsers, activeUsers, planCounts] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.aggregate([{ $group: { _id: '$subscription.plan', count: { $sum: 1 } } }]),
    ]);
    ApiResponse.success(res, { totalUsers, activeUsers, planCounts });
  } catch (error) { next(error); }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.plan) filter['subscription.plan'] = req.query.plan;
    if (req.query.search) filter.$or = [{ name: { $regex: req.query.search, $options: 'i' } }, { email: { $regex: req.query.search, $options: 'i' } }];

    const [users, total] = await Promise.all([
      User.find(filter).select('-password').skip(skip).limit(limit).sort('-createdAt'),
      User.countDocuments(filter),
    ]);
    ApiResponse.paginated(res, users, { page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true });
    if (!user) return next(new AppError('User not found', 404));
    ApiResponse.success(res, { user }, 'User role updated');
  } catch (error) { next(error); }
};

exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError('User not found', 404));
    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });
    ApiResponse.success(res, { user }, `User ${user.isActive ? 'activated' : 'deactivated'}`);
  } catch (error) { next(error); }
};

exports.getAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const logs = await AuditLog.find().populate('user', 'name email').sort('-createdAt').skip((page-1)*limit).limit(limit);
    const total = await AuditLog.countDocuments();
    ApiResponse.paginated(res, logs, { page, limit, total, pages: Math.ceil(total/limit) });
  } catch (error) { next(error); }
};
