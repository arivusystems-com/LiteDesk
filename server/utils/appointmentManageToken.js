'use strict';

const { randomBytes } = require('crypto');

function generateManageToken() {
  return randomBytes(24).toString('base64url');
}

function buildManageUrl(token) {
  const base = String(process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${base}/appointments/manage/${token}`;
}

module.exports = {
  generateManageToken,
  buildManageUrl
};
