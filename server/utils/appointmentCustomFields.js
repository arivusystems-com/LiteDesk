'use strict';

const FIELD_TYPES = new Set(['text', 'email', 'phone', 'textarea', 'select']);

function slugifyFieldKey(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

/**
 * @param {Array} fields
 * @returns {Array}
 */
function normalizeCustomFields(fields) {
  if (!Array.isArray(fields)) return [];
  const seen = new Set();
  const out = [];

  for (const raw of fields.slice(0, 12)) {
    const label = String(raw?.label || '').trim();
    if (!label) continue;
    let key = String(raw?.key || '').trim() || slugifyFieldKey(label);
    key = slugifyFieldKey(key);
    if (!key || seen.has(key)) {
      key = `${key || 'field'}_${out.length + 1}`;
    }
    seen.add(key);

    const type = FIELD_TYPES.has(raw?.type) ? raw.type : 'text';
    const field = {
      key,
      label: label.slice(0, 120),
      type,
      required: !!raw?.required
    };
    if (type === 'select') {
      field.options = (raw.options || [])
        .map((o) => String(o || '').trim())
        .filter(Boolean)
        .slice(0, 20);
      if (!field.options.length) continue;
    }
    out.push(field);
  }
  return out;
}

module.exports = {
  normalizeCustomFields,
  slugifyFieldKey,
  FIELD_TYPES
};
