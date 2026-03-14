/**
 * Record page adapter registry.
 * Returns which adapter type to use for a module so ModuleRecordPage can delegate
 * to the correct implementation (deal, task, or generic).
 */
export const MODULE_RECORD_ADAPTER_KEYS = Object.freeze({
  DEAL: 'deal',
  TASK: 'task',
  GENERIC: 'generic'
});

/**
 * @param {string} moduleKey - e.g. 'deals', 'tasks', 'people', 'events'
 * @returns {'deal'|'task'|'generic'}
 */
export function getRecordAdapterKey(moduleKey) {
  const key = (moduleKey || '').toLowerCase().trim();
  if (key === 'deals') return MODULE_RECORD_ADAPTER_KEYS.DEAL;
  if (key === 'tasks') return MODULE_RECORD_ADAPTER_KEYS.TASK;
  return MODULE_RECORD_ADAPTER_KEYS.GENERIC;
}
