/**
 * ============================================================================
 * PLATFORM CORE: Automation Logger
 * ============================================================================
 *
 * Structured logging for domain events, automation resolution, and execution planning.
 * Used by domainEvents, automationEngine, and automationRegistry.
 *
 * ============================================================================
 */

const LOG_LEVEL = (process.env.AUTOMATION_LOG_LEVEL || 'info').toLowerCase();
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

function shouldLog(level) {
  return (LEVELS[level] ?? 1) <= (LEVELS[LOG_LEVEL] ?? 1);
}

function createLogger(name) {
  const prefix = `[automation:${name}]`;
  return {
    info(event, data = {}) {
      if (!shouldLog('info')) return;
      const out = { ...data, event, _logger: name };
      console.log(prefix, JSON.stringify(out));
    },
    warn(event, data = {}) {
      if (!shouldLog('warn')) return;
      const out = { ...data, event, _logger: name };
      console.warn(prefix, JSON.stringify(out));
    },
    error(event, data = {}) {
      if (!shouldLog('error')) return;
      const out = { ...data, event, _logger: name };
      console.error(prefix, JSON.stringify(out));
    },
    debug(event, data = {}) {
      if (!shouldLog('debug')) return;
      const out = { ...data, event, _logger: name };
      console.log(prefix, JSON.stringify(out));
    }
  };
}

module.exports = { createLogger };
