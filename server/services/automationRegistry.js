/**
 * ============================================================================
 * PLATFORM CORE: Automation Registry
 * ============================================================================
 *
 * Fetches and matches automation rules against domain events. Configuration-driven;
 * no hardcoded triggers or workflows. Supports trigger definitions (event type +
 * optional condition) and abstract action definitions.
 *
 * ============================================================================
 */

const AutomationRule = require('../models/AutomationRule');
const { createLogger } = require('./automationLogger');

const log = createLogger('automationRegistry');

/**
 * Match a condition object against event payload. Supports simple equality checks
 * on currentState / previousState. E.g. { 'currentState.stage': 'Closed Won' }.
 *
 * @param {Object} condition - Rule trigger condition
 * @param {Object} event - Domain event { previousState, currentState, ... }
 * @returns {boolean}
 */
function matchesCondition(condition, event) {
  if (!condition || typeof condition !== 'object') return true;

  for (const [path, expected] of Object.entries(condition)) {
    const parts = path.split('.');
    let value = event;
    for (const p of parts) {
      value = value != null ? value[p] : undefined;
    }
    if (value !== expected) return false;
  }
  return true;
}

/**
 * Resolve automation rules that match the given domain event.
 *
 * @param {Object} event - Domain event { entityType, entityId, eventType, previousState, currentState, appKey, organizationId }
 * @returns {Promise<Array<{ rule: Object, action: Object }>>}
 */
async function resolveRules(event) {
  if (!event || !event.eventType) return [];

  const appKey = (event.appKey || 'SALES').toUpperCase();
  const organizationId = event.organizationId || null;
  const entityType = event.entityType || null;

  const query = {
    enabled: true,
    appKey,
    'trigger.eventType': event.eventType
  };
  if (entityType) query.entityType = { $in: [null, entityType] };
  if (organizationId) {
    query.$or = [
      { organizationId: null },
      { organizationId: organizationId }
    ];
  } else {
    query.organizationId = null;
  }

  let rules = [];
  try {
    rules = await AutomationRule.find(query).sort({ order: 1, createdAt: 1 }).lean();
  } catch (err) {
    log.error('automation_registry_fetch_error', { error: err.message, eventType: event.eventType });
    return [];
  }

  const matched = [];
  for (const rule of rules) {
    if (!matchesCondition(rule.trigger?.condition, event)) continue;
    matched.push({
      rule: { _id: rule._id, name: rule.name, appKey: rule.appKey, entityType: rule.entityType },
      action: rule.action || { type: 'unknown', params: null }
    });
  }

  log.debug('automation_rules_matched', {
    eventType: event.eventType,
    appKey,
    totalRules: rules.length,
    matchedCount: matched.length,
    ruleIds: matched.map((m) => m.rule._id?.toString())
  });

  return matched;
}

module.exports = {
  resolveRules,
  matchesCondition
};
