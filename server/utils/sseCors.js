'use strict';

const { isAllowedCorsOrigin } = require('../config/corsConfig');

/**
 * CORS for Server-Sent Events (must be set on every response, including errors).
 * EventSource cross-origin from app.arivusystems.com → api.arivusystems.com.
 */
function applySseCors(req, res) {
  const origin = req.headers.origin;
  const isProduction = process.env.NODE_ENV === 'production';
  if (
    origin
    && isAllowedCorsOrigin(origin, {
      allowLocalhost: !isProduction,
      allowTenantSubdomains: isProduction
    })
  ) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Vary', 'Origin');
}

function handleSseCorsPreflight(req, res) {
  applySseCors(req, res);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  return res.status(204).end();
}

module.exports = {
  applySseCors,
  handleSseCorsPreflight
};
