/**
 * Writes activity log entries to RecordActivity for modules that use the generic
 * activity API (people, organizations, events, items, etc.). Used so the
 * ModuleRecordPage Activity panel shows "Updates" when records are edited.
 */
const RecordActivity = require('../models/RecordActivity');
const mongoose = require('mongoose');

const SYSTEM_KEYS = new Set([
  '_id', '__v', 'organizationId', 'createdAt', 'updatedAt', 'createdBy', 'modifiedBy',
  'deletedAt', 'deletedBy', 'deletionReason', 'customFields', 'auditHistory'
]);

/**
 * Format a value for display in an activity log (from/to).
 * @param {*} value
 * @param {number} maxLength
 * @returns {string}
 */
function formatValueForLog(value, maxLength = 200) {
  if (value === undefined || value === null) return 'Empty';
  if (typeof value === 'string') return value.trim() || 'Empty';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (value instanceof Date) return value.toISOString();
  if (mongoose.Types.ObjectId.isValid(value) && String(value).length === 24) return '[Reference]';
  if (typeof value === 'object') {
    const str = JSON.stringify(value);
    return str.length <= maxLength ? str : str.slice(0, maxLength) + '…';
  }
  return String(value);
}

/**
 * Get display label for a field key from module definition or humanize the key.
 * @param {string} fieldKey
 * @param {Array<{ key?: string, name?: string, label?: string }>} [fields]
 * @returns {string}
 */
function getFieldLabel(fieldKey, fields) {
  if (Array.isArray(fields)) {
    const f = fields.find((x) => (x.key || x.name || '').toString() === fieldKey);
    if (f && (f.label || f.name || f.key)) return String(f.label || f.name || f.key).trim();
  }
  return fieldKey
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

/**
 * Append a single activity log entry to RecordActivity.
 * @param {{
 *   organizationId: mongoose.Types.ObjectId,
 *   moduleKey: string,
 *   recordId: string | mongoose.Types.ObjectId,
 *   authorId: mongoose.Types.ObjectId,
 *   action: string,
 *   message?: string,
 *   details?: Record<string, any>
 * }} params
 * @returns {Promise<import('../models/RecordActivity')>}
 */
async function appendRecordActivityLog({ organizationId, moduleKey, recordId, authorId, action, message = '', details = {} }) {
  const recordIdObj = mongoose.Types.ObjectId.isValid(recordId) ? new mongoose.Types.ObjectId(recordId) : recordId;
  const doc = await RecordActivity.create({
    organizationId,
    moduleKey: String(moduleKey).trim().toLowerCase(),
    recordId: recordIdObj,
    type: 'activity',
    action: String(action || 'updated').trim(),
    message: String(message).trim(),
    details: details && typeof details === 'object' ? details : {},
    author: authorId
  });
  return doc;
}

/**
 * Build field-change log entries and append them to RecordActivity.
 * Skips system keys and fields where from === to.
 * @param {{
 *   organizationId: mongoose.Types.ObjectId,
 *   moduleKey: string,
 *   recordId: string | mongoose.Types.ObjectId,
 *   authorId: mongoose.Types.ObjectId,
 *   previous: Record<string, any>,
 *   updated: Record<string, any>,
 *   updateDataKeys?: string[],
 *   fieldLabels?: Array<{ key?: string, name?: string, label?: string }>
 * }} params
 * @returns {Promise<number>} Number of entries created
 */
async function appendFieldChangeLogs({
  organizationId,
  moduleKey,
  recordId,
  authorId,
  previous,
  updated,
  updateDataKeys,
  fieldLabels
}) {
  const keys = Array.isArray(updateDataKeys) && updateDataKeys.length > 0
    ? updateDataKeys
    : Object.keys(updated || {}).filter((k) => !SYSTEM_KEYS.has(k));
  const prev = previous || {};
  const entries = [];

  for (const fieldKey of keys) {
    if (SYSTEM_KEYS.has(fieldKey)) continue;
    const fromVal = prev[fieldKey];
    const toVal = updated[fieldKey];
    const fromStr = formatValueForLog(fromVal);
    const toStr = formatValueForLog(toVal);
    if (fromStr === toStr) continue;

    const fieldLabel = getFieldLabel(fieldKey, fieldLabels);
    const action = fieldKey === 'status' || fieldKey === 'stage' || fieldKey === 'lead_status' || fieldKey === 'contact_status'
      ? 'status_changed'
      : 'field_changed';

    entries.push({
      organizationId,
      moduleKey: String(moduleKey).trim().toLowerCase(),
      recordId: mongoose.Types.ObjectId.isValid(recordId) ? new mongoose.Types.ObjectId(recordId) : recordId,
      type: 'activity',
      action,
      message: '',
      details: {
        field: fieldKey,
        fieldLabel,
        from: fromStr,
        to: toStr
      },
      author: authorId
    });
  }

  if (entries.length === 0) return 0;
  await RecordActivity.insertMany(entries);
  return entries.length;
}

module.exports = {
  appendRecordActivityLog,
  appendFieldChangeLogs,
  formatValueForLog,
  getFieldLabel,
  SYSTEM_KEYS
};
