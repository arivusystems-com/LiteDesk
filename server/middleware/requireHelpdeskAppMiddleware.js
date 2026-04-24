const { APP_KEYS } = require('../constants/appKeys');

const requireHelpdeskApp = (req, res, next) => {
  if (!req.appKey) {
    return res.status(403).json({
      success: false,
      message: 'This endpoint requires Helpdesk application context',
      code: 'HELPDESK_APP_REQUIRED',
      error: 'Application context not resolved.'
    });
  }

  if (req.appKey !== APP_KEYS.HELPDESK) {
    return res.status(403).json({
      success: false,
      message: 'This endpoint is only accessible from the Helpdesk application',
      code: 'HELPDESK_APP_REQUIRED',
      currentApp: req.appKey,
      requiredApp: APP_KEYS.HELPDESK
    });
  }

  return next();
};

module.exports = {
  requireHelpdeskApp
};
