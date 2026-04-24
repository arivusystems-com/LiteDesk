const mongoose = require('mongoose');

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function validateCaseRecordId(id) {
  if (!id || !isValidObjectId(id)) {
    return { valid: false, error: 'Invalid case id' };
  }
  return { valid: true };
}

function normalizeRelatedItemIds(value) {
  if (value == null) return { valid: true, ids: [] };
  if (!Array.isArray(value)) {
    return { valid: false, error: 'relatedItemIds must be an array of ids' };
  }
  const normalized = [];
  const seen = new Set();
  for (const rawId of value) {
    if (!isValidObjectId(rawId)) {
      return { valid: false, error: 'relatedItemIds must contain valid ObjectIds' };
    }
    const id = String(rawId);
    if (!seen.has(id)) {
      seen.add(id);
      normalized.push(id);
    }
  }
  return { valid: true, ids: normalized };
}

function normalizeOptionalText(value, maxLength) {
  if (value == null) return { valid: true, value: undefined };
  if (typeof value !== 'string') {
    return { valid: false, error: 'Text fields must be strings' };
  }
  const normalized = value.trim();
  if (maxLength && normalized.length > maxLength) {
    return { valid: false, error: `Text field exceeds max length of ${maxLength}` };
  }
  return { valid: true, value: normalized };
}

module.exports = {
  validateCaseRecordId,
  normalizeRelatedItemIds,
  normalizeOptionalText
};
