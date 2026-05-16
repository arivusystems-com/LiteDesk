'use strict';

/**
 * Lazy load googleapis (optional at runtime until npm install completes).
 */
function loadGoogleapis() {
  try {
    return require('googleapis');
  } catch (err) {
    if (err && err.code === 'MODULE_NOT_FOUND') {
      const missing = new Error(
        'Google APIs are not installed on this server. In the server folder run: npm install (then restart the API). If you use sudo for npm start, run: sudo npm install in server/ as well.'
      );
      missing.code = 'GOOGLEAPIS_MISSING';
      throw missing;
    }
    throw err;
  }
}

module.exports = { loadGoogleapis };
