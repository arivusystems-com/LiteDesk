const mongoose = require('mongoose');

const MASTER_DB = 'litedesk_master';
const MAX_ATTEMPTS = Number(process.env.MONGO_CONNECT_RETRIES) || 5;
const DELAY_MS = Number(process.env.MONGO_CONNECT_RETRY_DELAY_MS) || 3000;

/**
 * Same URI resolution as the historical server entry (MONGODB_URI / MONGO_URI / prod|local).
 */
function getMongoUris() {
  const isProduction = process.env.NODE_ENV === 'production';
  const MONGO_URI =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    (isProduction
      ? process.env.MONGO_URI_PRODUCTION
      : process.env.MONGO_URI_LOCAL);

  if (!MONGO_URI) {
    const err = new Error(
      'MONGODB_URI (or MONGO_URI) is not set. Set it in your environment (Atlas connection string in production).',
    );
    err.code = 'MONGODB_CONFIG_MISSING';
    throw err;
  }

  const [mongoUriWithoutQuery, mongoUriQueryPart] = MONGO_URI.split('?');
  const mongoQueryString = mongoUriQueryPart ? `?${mongoUriQueryPart}` : '';
  const baseUri = mongoUriWithoutQuery.split('/').slice(0, -1).join('/');
  const masterUri = `${baseUri}/${MASTER_DB}${mongoQueryString}`;

  return { MONGO_URI, mongoQueryString, baseUri, masterUri, masterDbName: MASTER_DB };
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Connect to the master database with retry (Atlas / transient network blips).
 */
async function connectMasterWithRetry(masterUri) {
  const pool = Number(process.env.MONGO_MAX_POOL_SIZE) || 10;
  const serverSelection = Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS) || 30000;

  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await mongoose.connect(masterUri, {
        serverSelectionTimeoutMS: serverSelection,
        maxPoolSize: pool,
        retryWrites: true,
        autoIndex: process.env.NODE_ENV !== 'production',
      });
      return;
    } catch (err) {
      lastErr = err;
      console.error(
        `[mongo] connection attempt ${attempt}/${MAX_ATTEMPTS} failed:`,
        err.message,
      );
      if (attempt < MAX_ATTEMPTS) {
        await wait(DELAY_MS);
      }
    }
  }
  throw lastErr;
}

module.exports = {
  getMongoUris,
  connectMasterWithRetry,
  MASTER_DB,
};
