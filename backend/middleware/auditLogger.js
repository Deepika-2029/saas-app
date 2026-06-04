const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const auditLog = (action, resource) => async (req, res, next) => {
  const originalSend = res.json.bind(res);
  res.json = async (body) => {
    try {
      await AuditLog.create({
        user: req.user?._id,
        action,
        resource,
        resourceId: req.params.id,
        details: { method: req.method, url: req.originalUrl, body: req.body },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: res.statusCode < 400 ? 'success' : 'failure',
      });
    } catch (err) {
      logger.error(`Audit log failed: ${err.message}`);
    }
    return originalSend(body);
  };
  next();
};

module.exports = auditLog;
