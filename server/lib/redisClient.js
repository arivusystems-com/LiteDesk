const { createClient } = require('redis');

let client = null;
let connectPromise = null;
let warnedMissingConfig = false;

function buildRedisUrl() {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  const host = process.env.REDIS_HOST;
  if (!host) return null;

  const port = process.env.REDIS_PORT || 6379;
  const pass = process.env.REDIS_PASSWORD;
  if (pass) {
    return `redis://:${encodeURIComponent(pass)}@${host}:${port}`;
  }
  return `redis://${host}:${port}`;
}

function isRedisConfigured() {
  return Boolean(buildRedisUrl());
}

async function getRedisClient({ component = 'redis', required = false } = {}) {
  const url = buildRedisUrl();
  if (!url) {
    if (required) {
      throw new Error(`[${component}] Redis is required but REDIS_URL/REDIS_HOST is not configured`);
    }
    if (!warnedMissingConfig) {
      warnedMissingConfig = true;
      console.warn('[redis] REDIS_URL/REDIS_HOST not configured; Redis-backed features will use their fallback behavior');
    }
    return null;
  }

  if (client?.isOpen) {
    return client;
  }

  if (!client) {
    client = createClient({
      url,
      socket: {
        connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT_MS || '5000', 10),
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
      },
    });

    client.on('error', (error) => {
      console.error(`[redis] ${component} client error:`, error.message);
    });
  }

  if (!connectPromise) {
    connectPromise = client.connect().catch((error) => {
      connectPromise = null;
      throw error;
    });
  }

  await connectPromise;
  return client;
}

async function closeRedisClient() {
  if (!client) return;
  try {
    await client.quit();
  } catch (_error) {
    try {
      await client.disconnect();
    } catch (_disconnectError) {
      // Ignore shutdown failures.
    }
  } finally {
    client = null;
    connectPromise = null;
  }
}

module.exports = {
  buildRedisUrl,
  closeRedisClient,
  getRedisClient,
  isRedisConfigured,
};
