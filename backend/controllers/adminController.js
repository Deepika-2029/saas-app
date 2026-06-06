const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Subscription = require('../models/Subscription');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');

exports.getStats = async (req, res, next) => {
  try {
    const [totalUsers, activeUsers, planCounts] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.aggregate([{ $group: { _id: '$subscription.plan', count: { $sum: 1 } } }]),
    ]);

    // MRR Calculation (Users with active paid subscriptions)
    const activePaidUsersGroup = await User.aggregate([
      { $match: { 'subscription.status': 'active', 'subscription.plan': { $ne: 'free' } } },
      { $group: { _id: '$subscription.plan', count: { $sum: 1 } } }
    ]);
    const planPrices = { basic: 9.99, pro: 29.99, enterprise: 99.99 };
    let mrr = 0;
    activePaidUsersGroup.forEach(group => {
      mrr += (planPrices[group._id] || 0) * group.count;
    });

    // Churn Rate Calculation
    // formula: cancelled subscriptions this month / total active paid last month
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const cancelledThisMonth = await Subscription.countDocuments({
      status: 'cancelled',
      cancelledAt: { $gte: startOfThisMonth }
    });

    const totalPaidLastMonth = await Subscription.countDocuments({
      plan: { $ne: 'free' },
      createdAt: { $lt: startOfThisMonth },
      $or: [
        { cancelledAt: { $exists: false } },
        { cancelledAt: null },
        { cancelledAt: { $gte: startOfThisMonth } }
      ]
    });

    const churnRate = totalPaidLastMonth > 0 ? (cancelledThisMonth / totalPaidLastMonth) * 100 : 0;

    // User Growth LineChart (Signups grouped by day for last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const userGrowthRaw = await User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const userGrowth = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const match = userGrowthRaw.find(u => u._id === dateStr);
      userGrowth.push({
        date: dateStr,
        count: match ? match.count : 0
      });
    }

    ApiResponse.success(res, {
      totalUsers,
      activeUsers,
      planCounts,
      mrr,
      churnRate: Number(churnRate.toFixed(2)),
      userGrowth
    });
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
