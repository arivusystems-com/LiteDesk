'use strict';

const jwt = require('jsonwebtoken');
const AppointmentBookingConfig = require('../models/AppointmentBookingConfig');
const { encryptTenantSecret, decryptTenantSecret } = require('../utils/tenantSecretCrypto');

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

const MICROSOFT_SCOPES = [
  'offline_access',
  'User.Read',
  'Calendars.Read',
  'Calendars.ReadWrite',
  'OnlineMeetings.ReadWrite'
];

function getMicrosoftOAuthConfig() {
  const clientId = String(process.env.MICROSOFT_CALENDAR_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.MICROSOFT_CALENDAR_CLIENT_SECRET || '').trim();
  const tenantId = String(process.env.MICROSOFT_CALENDAR_TENANT_ID || 'common').trim() || 'common';

  if (!clientId || !clientSecret) {
    return {
      error:
        'Microsoft Calendar is not configured on the API server. Set MICROSOFT_CALENDAR_CLIENT_ID and MICROSOFT_CALENDAR_CLIENT_SECRET in server/.env (Azure App Registration).'
    };
  }

  return { clientId, clientSecret, tenantId };
}

function resolveOAuthRedirectOrigin() {
  const explicit = String(process.env.MICROSOFT_CALENDAR_REDIRECT_URI || '').trim();
  if (explicit) {
    try {
      return new URL(explicit).origin;
    } catch {
      /* fall through */
    }
  }
  const gmailRedirect = String(process.env.GOOGLE_GMAIL_REDIRECT_URI || '').trim();
  if (gmailRedirect) {
    try {
      return new URL(gmailRedirect).origin;
    } catch {
      /* fall through */
    }
  }
  const apiPublic = String(process.env.API_PUBLIC_URL || '').trim().replace(/\/$/, '');
  if (apiPublic) return apiPublic;
  return 'http://localhost:3000';
}

function microsoftCalendarRedirectUri() {
  return `${resolveOAuthRedirectOrigin()}/api/appointments/calendar/microsoft/callback`;
}

function authorizeUrl(tenantId) {
  return `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/authorize`;
}

function tokenUrl(tenantId) {
  return `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`;
}

async function buildMicrosoftAuthorizeUrl({ configId, userId, organizationId }) {
  const creds = getMicrosoftOAuthConfig();
  if (creds.error) return { error: creds.error };

  if (!process.env.JWT_SECRET) {
    return { error: 'JWT_SECRET is required for OAuth state signing.' };
  }

  const redirectUri = microsoftCalendarRedirectUri();
  const state = jwt.sign(
    { cid: String(configId), uid: String(userId), oid: String(organizationId), provider: 'microsoft' },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  );

  const params = new URLSearchParams({
    client_id: creds.clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: MICROSOFT_SCOPES.join(' '),
    state,
    prompt: 'consent'
  });

  return {
    url: `${authorizeUrl(creds.tenantId)}?${params.toString()}`,
    redirectUri
  };
}

async function exchangeCodeForTokens(code) {
  const creds = getMicrosoftOAuthConfig();
  if (creds.error) return { error: creds.error };

  const body = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    code: String(code || ''),
    redirect_uri: microsoftCalendarRedirectUri(),
    grant_type: 'authorization_code',
    scope: MICROSOFT_SCOPES.join(' ')
  });

  const res = await fetch(tokenUrl(creds.tenantId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      error: data.error_description || data.error || `Token exchange failed (${res.status})`
    };
  }
  if (!data.refresh_token) {
    return {
      error:
        'No refresh token returned. Disconnect the app in your Microsoft account and connect again with consent.'
    };
  }
  return { tokens: data };
}

async function refreshAccessToken(refreshToken) {
  const creds = getMicrosoftOAuthConfig();
  if (creds.error) return { error: creds.error };

  const body = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    scope: MICROSOFT_SCOPES.join(' ')
  });

  const res = await fetch(tokenUrl(creds.tenantId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: data.error_description || data.error || `Token refresh failed (${res.status})` };
  }
  return { accessToken: data.access_token };
}

async function graphRequest(accessToken, path, options = {}) {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error?.message || `Graph API ${res.status}`);
    err.status = res.status;
    err.graph = data.error;
    throw err;
  }
  return data;
}

async function getAccessTokenForConfig(bookingConfig) {
  const refreshToken = decryptTenantSecret(
    bookingConfig?.microsoftCalendar?.encryptedRefreshToken
  );
  if (!refreshToken) return { error: 'Microsoft Calendar is not connected' };
  return refreshAccessToken(refreshToken);
}

async function completeMicrosoftOAuthCallback({ code, state }) {
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

  const tokenResult = await exchangeCodeForTokens(code);
  if (tokenResult.error) return { ok: false, error: tokenResult.error };

  let accountEmail = '';
  try {
    const profile = await graphRequest(tokenResult.tokens.access_token, '/me?$select=mail,userPrincipalName');
    accountEmail = String(profile.mail || profile.userPrincipalName || '')
      .toLowerCase()
      .trim();
  } catch (err) {
    console.error('[appointmentMicrosoftCalendar] profile after connect:', err.message);
    return {
      ok: false,
      error: `Microsoft connection failed: ${err.message}`
    };
  }

  const config = await AppointmentBookingConfig.findOne({
    _id: configId,
    organizationId
  });
  if (!config) {
    return { ok: false, error: 'Booking configuration not found' };
  }

  config.microsoftCalendar = config.microsoftCalendar || {};
  config.microsoftCalendar.encryptedRefreshToken = encryptTenantSecret(
    tokenResult.tokens.refresh_token
  );
  config.microsoftCalendar.accountEmail = accountEmail;
  config.microsoftCalendar.connectedAt = new Date();
  await config.save();

  return { ok: true, accountEmail };
}

/**
 * Busy intervals from Outlook calendar via calendarView.
 * @returns {Promise<Array<{ start: Date, end: Date }>>}
 */
async function getMicrosoftFreeBusyIntervals(bookingConfig, rangeStart, rangeEnd) {
  if (!bookingConfig?.microsoftCalendar?.encryptedRefreshToken) return [];

  const tokenResult = await getAccessTokenForConfig(bookingConfig);
  if (tokenResult.error) return [];

  try {
    const start = encodeURIComponent(new Date(rangeStart).toISOString());
    const end = encodeURIComponent(new Date(rangeEnd).toISOString());
    const data = await graphRequest(
      tokenResult.accessToken,
      `/me/calendarView?startDateTime=${start}&endDateTime=${end}&$select=start,end,showAs&$top=200`
    );
    const events = data.value || [];
    return events
      .filter((ev) => ev.showAs !== 'free')
      .map((ev) => ({
        start: new Date(ev.start?.dateTime),
        end: new Date(ev.end?.dateTime)
      }))
      .filter((b) => !Number.isNaN(b.start.getTime()) && !Number.isNaN(b.end.getTime()));
  } catch (err) {
    console.warn('[appointmentMicrosoftCalendar] calendarView failed:', err.message);
    return [];
  }
}

/**
 * Create Outlook event with Teams online meeting.
 */
async function createTeamsMeetingForAppointment({
  bookingConfig,
  title,
  startDateTime,
  endDateTime,
  attendeeEmail,
  timezone
}) {
  try {
    const tokenResult = await getAccessTokenForConfig(bookingConfig);
    if (tokenResult.error) return { error: tokenResult.error };

    const tz = timezone || bookingConfig.workingHours?.timezone || 'UTC';
    const startLocal = startDateTime.toISOString().slice(0, 19);
    const endLocal = endDateTime.toISOString().slice(0, 19);

    const body = {
      subject: title,
      start: { dateTime: startLocal, timeZone: tz },
      end: { dateTime: endLocal, timeZone: tz },
      attendees: attendeeEmail
        ? [{ emailAddress: { address: attendeeEmail }, type: 'required' }]
        : [],
      isOnlineMeeting: true,
      onlineMeetingProvider: 'teamsForBusiness'
    };

    const event = await graphRequest(tokenResult.accessToken, '/me/events', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    const meetLink =
      event.onlineMeeting?.joinUrl ||
      event.onlineMeetingUrl ||
      event.webLink ||
      null;

    return { meetLink, eventId: event.id };
  } catch (err) {
    console.error('[appointmentMicrosoftCalendar] createTeamsMeeting:', err.message);
    return { error: err.message || 'Failed to create Teams meeting' };
  }
}

async function disconnectMicrosoftCalendar(configId, organizationId) {
  await AppointmentBookingConfig.updateOne(
    { _id: configId, organizationId },
    {
      $set: {
        'microsoftCalendar.encryptedRefreshToken': '',
        'microsoftCalendar.accountEmail': '',
        'microsoftCalendar.connectedAt': null
      }
    }
  );
}

function getExpectedMicrosoftRedirectUri() {
  const creds = getMicrosoftOAuthConfig();
  if (creds.error) return { error: creds.error };
  return { redirectUri: microsoftCalendarRedirectUri() };
}

function isMicrosoftCalendarConfigured() {
  return !getMicrosoftOAuthConfig().error;
}

module.exports = {
  buildMicrosoftAuthorizeUrl,
  completeMicrosoftOAuthCallback,
  disconnectMicrosoftCalendar,
  getMicrosoftFreeBusyIntervals,
  createTeamsMeetingForAppointment,
  getExpectedMicrosoftRedirectUri,
  isMicrosoftCalendarConfigured,
  microsoftCalendarRedirectUri,
  getAccessTokenForConfig,
  graphRequest
};
