let loaded = false;
let Sentry = null;

function getSentry() {
  if (loaded) return Sentry;
  loaded = true;
  try {
    Sentry = require('@sentry/node');
  } catch (e) {
    Sentry = null;
  }
  return Sentry;
}

/**
 * Init Sentry as early as possible in process (after env is loaded).
 */
function initSentryNode() {
  const sdk = getSentry();
  if (!sdk || !process.env.SENTRY_DSN) return;
  const pkg = require('../package.json');
  sdk.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE || `server@${pkg.version}`,
    tracesSampleRate: Math.min(
      1,
      Math.max(0, Number.parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1') || 0.1),
    ),
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[unhandledRejection]', reason);
    if (typeof sdk.captureException === 'function') {
      sdk.captureException(reason);
    }
  });
}

/**
 * Express error handler from Sentry (place after all routes + HTTP handlers).
 */
function installExpressSentryErrorHandler(app) {
  const sdk = getSentry();
  if (!sdk || !process.env.SENTRY_DSN) return;
  if (typeof sdk.setupExpressErrorHandler === 'function') {
    sdk.setupExpressErrorHandler(app);
  } else if (typeof sdk.Handlers?.errorHandler === 'function') {
    app.use(sdk.Handlers.errorHandler());
  }
}

function captureException(err) {
  const sdk = getSentry();
  if (!sdk || !process.env.SENTRY_DSN) return;
  sdk.captureException(err);
}

function flush(timeoutMs) {
  const sdk = getSentry();
  if (!sdk || !process.env.SENTRY_DSN) return Promise.resolve();
  if (typeof sdk.close === 'function') return sdk.close(timeoutMs);
  return Promise.resolve();
}

module.exports = {
  initSentryNode,
  installExpressSentryErrorHandler,
  captureException,
  flushSentry: flush,
  getSentry,
};
