'use strict';

const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const AppointmentBookingConfig = require('../models/AppointmentBookingConfig');
const { getGmailOAuthAppCredentialsForServer } = require('../platform/communication/config/communicationConfigService');
const { encryptTenantSecret, decryptTenantSecret } = require('../utils/tenantSecretCrypto');
const { loadGoogleapis } = require('../utils/loadGoogleapis');

/** calendar.events = create/update events + Meet; userinfo.email = show connected account */
const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email'
];

async function getOAuthClient(organizationId) {
  const creds = await getGmailOAuthAppCredentialsForServer(organizationId);
  if (creds.error) return { error: creds.error };
  let google;
  try {
    google = loadGoogleapis().google;
  } catch (err) {
    return { error: err.message };
  }
  const oauth2Client = new google.auth.OAuth2(creds.clientId, creds.clientSecret, creds.redirectUri);
  return { google, oauth2Client, redirectUri: creds.redirectUri };
}

function calendarRedirectUri(apiRedirectUri) {
  try {
    const u = new URL(apiRedirectUri);
    return `${u.origin}/api/appointments/calendar/google/callback`;
  } catch {
    return '';
  }
}

async function buildCalendarAuthorizeUrl({ configId, userId, organizationId }) {
  const r = await getOAuthClient(organizationId);
  if (r.error) return { error: r.error };
  const { oauth2Client, redirectUri: gmailRedirect } = r;
  const redirectUri = calendarRedirectUri(gmailRedirect);
  if (!redirectUri) {
    return { error: 'Google OAuth redirect URI is not configured.' };
  }
  oauth2Client.redirectUri = redirectUri;

  if (!process.env.JWT_SECRET) {
    return { error: 'JWT_SECRET is required for OAuth state signing.' };
  }

  const state = jwt.sign(
    { cid: String(configId), uid: String(userId), oid: String(organizationId) },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: CALENDAR_SCOPES,
    state
  });
  return { url, redirectUri };
}

async function completeCalendarOAuthCallback({ code, state }) {
  let payload;
  try {
    payload = jwt.verify(String(state || ''), process.env.JWT_SECRET);
  } catch {
    return { ok: false, error: 'Invalid or expired OAuth state' };
  }

  const configId = payload.cid;
  const organizationId = payload.oid;
  if (!configId || !organizationId) {
    return { ok: false, error: 'OAuth state missing context' };
  }

  const r = await getOAuthClient(organizationId);
  if (r.error) return { ok: false, error: r.error };
  const { google, oauth2Client, redirectUri: gmailRedirect } = r;
  oauth2Client.redirectUri = calendarRedirectUri(gmailRedirect);

  const { tokens } = await oauth2Client.getToken(String(code || ''));
  if (!tokens?.refresh_token) {
    return {
      ok: false,
      error:
        'No refresh token returned. Disconnect the app in Google account settings and try again.'
    };
  }

  oauth2Client.setCredentials(tokens);

  let accountEmail = '';
  try {
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();
    accountEmail = String(profile.email || '').toLowerCase().trim();
  } catch (err) {
    console.error('[appointmentCalendar] userinfo after connect:', err.message);
    const reason = err?.response?.data?.error?.message || err.message || 'Unknown error';
    const hint =
      reason.toLowerCase().includes('insufficient') || err?.code === 403
        ? ' Reconnect after removing this app at https://myaccount.google.com/permissions (old token may lack Calendar scopes).'
        : '';
    return { ok: false, error: `Google Calendar connection failed: ${reason}.${hint}` };
  }

  const config = await AppointmentBookingConfig.findOne({
    _id: configId,
    organizationId
  });
  if (!config) {
    return { ok: false, error: 'Booking configuration not found' };
  }

  config.googleCalendar = config.googleCalendar || {};
  config.googleCalendar.encryptedRefreshToken = encryptTenantSecret(tokens.refresh_token);
  config.googleCalendar.accountEmail = accountEmail;
  config.googleCalendar.connectedAt = new Date();
  await config.save();

  return { ok: true, accountEmail };
}

async function getCalendarClientForConfig(config) {
  const refreshToken = decryptTenantSecret(config.googleCalendar?.encryptedRefreshToken);
  if (!refreshToken) return { error: 'Google Calendar is not connected' };

  const r = await getOAuthClient(config.organizationId);
  if (r.error) return { error: r.error };
  const { google, oauth2Client, redirectUri: gmailRedirect } = r;
  oauth2Client.redirectUri = calendarRedirectUri(gmailRedirect);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return { google, oauth2Client, calendar: google.calendar({ version: 'v3', auth: oauth2Client }) };
}

/**
 * Create a Google Calendar event with a Meet link.
 * @returns {Promise<{ meetLink?: string, eventId?: string, error?: string }>}
 */
async function createGoogleMeetForAppointment({
  bookingConfig,
  title,
  startDateTime,
  endDateTime,
  attendeeEmail,
  timezone
}) {
  try {
    const client = await getCalendarClientForConfig(bookingConfig);
    if (client.error) return { error: client.error };

    const tz = timezone || bookingConfig.workingHours?.timezone || 'UTC';
    const requestId = randomUUID();

    const res = await client.calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: {
        summary: title,
        start: { dateTime: startDateTime.toISOString(), timeZone: tz },
        end: { dateTime: endDateTime.toISOString(), timeZone: tz },
        attendees: attendeeEmail ? [{ email: attendeeEmail }] : [],
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        }
      }
    });

    const meetLink =
      res.data.hangoutLink ||
      res.data.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri ||
      null;

    return { meetLink, eventId: res.data.id };
  } catch (err) {
    console.error('[appointmentCalendar] createGoogleMeetForAppointment:', err.message);
    return { error: err.message || 'Failed to create Google Meet' };
  }
}

async function disconnectGoogleCalendar(configId, organizationId) {
  await AppointmentBookingConfig.updateOne(
    { _id: configId, organizationId },
    {
      $set: {
        'googleCalendar.encryptedRefreshToken': '',
        'googleCalendar.accountEmail': '',
        'googleCalendar.connectedAt': null
      }
    }
  );
}

async function resolveHostCalendarConfig(organizationId, hostUserId) {
  return AppointmentBookingConfig.findOne({
    organizationId,
    ownerType: 'user',
    ownerId: hostUserId
  });
}

async function getExpectedCalendarRedirectUri(organizationId) {
  const creds = await getGmailOAuthAppCredentialsForServer(organizationId);
  if (creds.error || !creds.redirectUri) return { error: creds.error || 'OAuth not configured' };
  const redirectUri = calendarRedirectUri(creds.redirectUri);
  if (!redirectUri) return { error: 'Invalid OAuth redirect URI' };
  return { redirectUri };
}

module.exports = {
  buildCalendarAuthorizeUrl,
  completeCalendarOAuthCallback,
  createGoogleMeetForAppointment,
  disconnectGoogleCalendar,
  resolveHostCalendarConfig,
  getExpectedCalendarRedirectUri,
  calendarRedirectUri
};
