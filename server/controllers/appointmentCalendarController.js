const AppointmentBookingConfig = require('../models/AppointmentBookingConfig');
const {
  buildCalendarAuthorizeUrl,
  completeCalendarOAuthCallback,
  disconnectGoogleCalendar,
  getExpectedCalendarRedirectUri
} = require('../services/appointmentCalendarService');

function requireConfigAccess(req, config) {
  if (!config) return false;
  const isAdmin =
    req.user.isOwner || req.user.role === 'admin' || req.user.isPlatformAdmin;
  if (isAdmin) return true;
  return (
    config.ownerType === 'user' &&
    String(config.ownerId) === String(req.user._id)
  );
}

exports.googleOAuthStart = async (req, res) => {
  try {
    const config = await AppointmentBookingConfig.findOne({
      _id: req.params.configId,
      organizationId: req.user.organizationId
    });
    if (!config) {
      return res.status(404).json({ success: false, message: 'Configuration not found' });
    }
    if (!requireConfigAccess(req, config)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const result = await buildCalendarAuthorizeUrl({
      configId: config._id,
      userId: req.user._id,
      organizationId: req.user.organizationId
    });
    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }
    res.status(200).json({
      success: true,
      data: { url: result.url, redirectUri: result.redirectUri }
    });
  } catch (error) {
    const message =
      error.code === 'GOOGLEAPIS_MISSING' || error.code === 'MODULE_NOT_FOUND'
        ? 'Google Calendar requires server dependencies. Run npm install in the server folder, then restart the API.'
        : error.message;
    res.status(500).json({ success: false, message });
  }
};

exports.googleOAuthCallback = async (req, res) => {
  let base = String(process.env.CLIENT_URL || '').replace(/\/$/, '');
  if (!base) base = 'http://localhost:5173';

  try {
    const result = await completeCalendarOAuthCallback({
      code: req.query.code,
      state: req.query.state
    });
    if (result.ok) {
      return res.redirect(`${base}/appointments/configure?calendar=connected`);
    }
    const msg = encodeURIComponent(String(result.error || 'oauth_failed').slice(0, 800));
    return res.redirect(`${base}/appointments/configure?calendar=error&message=${msg}`);
  } catch (err) {
    console.error('[appointmentCalendar] callback:', err);
    return res.redirect(
      `${base}/appointments/configure?calendar=error&message=${encodeURIComponent(err.message || 'oauth_failed')}`
    );
  }
};

exports.googleDisconnect = async (req, res) => {
  try {
    const config = await AppointmentBookingConfig.findOne({
      _id: req.params.configId,
      organizationId: req.user.organizationId
    });
    if (!config) {
      return res.status(404).json({ success: false, message: 'Configuration not found' });
    }
    if (!requireConfigAccess(req, config)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    await disconnectGoogleCalendar(config._id, req.user.organizationId);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCalendarStatus = async (req, res) => {
  try {
    const config = await AppointmentBookingConfig.findOne({
      _id: req.params.configId,
      organizationId: req.user.organizationId
    }).lean();
    if (!config) {
      return res.status(404).json({ success: false, message: 'Configuration not found' });
    }
    if (!requireConfigAccess(req, config)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const connected = !!config.googleCalendar?.encryptedRefreshToken;
    const redirect = await getExpectedCalendarRedirectUri(req.user.organizationId);
    res.status(200).json({
      success: true,
      data: {
        connected,
        accountEmail: config.googleCalendar?.accountEmail || null,
        connectedAt: config.googleCalendar?.connectedAt || null,
        redirectUri: redirect.redirectUri || null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
