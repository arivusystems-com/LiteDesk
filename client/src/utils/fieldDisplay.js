/**
 * Utility functions for displaying field values based on field definitions
 */

/**
 * Format a field key (camelCase or snake_case) to a human-readable label (Title Case with spaces).
 * @param {string} key - Field key, e.g. "assignedTo", "start_date"
 * @returns {string} Human-readable label, e.g. "Assigned To", "Start Date"
 */
export function formatKeyToLabel(key) {
  if (key == null || key === '') return '';
  return String(key)
    .replace(/_/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Get display label for a field from its configuration.
 * Uses field.label when present and not the same as the key (e.g. not raw camelCase);
 * otherwise formats field.key to a readable label. Use everywhere we show field labels.
 * @param {{ key?: string, label?: string }|null} field - Field definition with key and optional label
 * @returns {string} Human-readable label to show in UI
 */
export function getFieldDisplayLabel(field) {
  if (!field) return '';
  const label = String(field.label || '').trim();
  const key = String(field.key || '').trim();
  if (!label) return formatKeyToLabel(key);
  const keyNorm = key.replace(/\s+/g, '').toLowerCase();
  const labelNorm = label.replace(/\s+/g, '').toLowerCase();
  if (keyNorm && labelNorm === keyNorm) return formatKeyToLabel(key);
  return label;
}

/**
 * Strip HTML tags and normalize whitespace to get plain text (e.g. for Rich Text in list/kanban).
 * @param {string} html - HTML string
 * @returns {string} Plain text
 */
export const getPlainTextFromHtml = (html) => {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

/**
 * Get key fields from a module definition
 * @param {Object} moduleDefinition - The module definition object
 * @returns {Array} Array of key field definitions
 */
export const getKeyFields = (moduleDefinition) => {
  if (!moduleDefinition?.fields) return [];
  
  return moduleDefinition.fields
    .filter(field => field.keyField === true)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
};

/**
 * Get formatted field value from a record based on field definition
 * @param {Object} fieldDef - The field definition
 * @param {Object} record - The record data
 * @returns {string|null} Formatted value or null if empty
 */
export const getFieldValue = (fieldDef, record) => {
  const value = record?.[fieldDef.key];
  
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  // Handle different data types
  switch (fieldDef.dataType) {
    case 'Date':
      return value ? new Date(value).toLocaleDateString() : null;
    case 'Date-Time':
      return value ? new Date(value).toLocaleString() : null;
    case 'Currency':
      const currencySymbol = fieldDef.numberSettings?.currencySymbol || '$';
      const decimalPlaces = fieldDef.numberSettings?.decimalPlaces || 2;
      return value !== undefined ? `${currencySymbol}${parseFloat(value).toFixed(decimalPlaces)}` : null;
    case 'Decimal':
      const decimalPlaces2 = fieldDef.numberSettings?.decimalPlaces || 2;
      return value !== undefined ? parseFloat(value).toFixed(decimalPlaces2) : null;
    case 'Integer':
      return value !== undefined ? parseInt(value).toLocaleString() : null;
    case 'Picklist':
      return value;
    case 'Multi-Picklist':
      return Array.isArray(value) ? value.join(', ') : value;
    case 'Checkbox':
      return value ? 'Yes' : 'No';
    case 'Lookup (Relationship)':
      // Handle lookup fields (populated objects)
      if (typeof value === 'object' && value !== null && value._id) {
        // Try common display fields
        return value.name || value.title || value.firstName || value.first_name || value.label || value._id;
      }
      return value;
    case 'Rich Text':
    case 'Text-Area':
      // Strip HTML for list/table display so we show plain text, not raw tags
      return getPlainTextFromHtml(value) || null;
    default:
      return value;
  }
};

/**
 * Get all key field values for a record
 * @param {Object} moduleDefinition - The module definition object
 * @param {Object} record - The record data
 * @returns {Array} Array of { fieldDef, value, label } objects
 */
export const getKeyFieldValues = (moduleDefinition, record) => {
  const keyFields = getKeyFields(moduleDefinition);
  return keyFields.map(fieldDef => ({
    fieldDef,
    value: getFieldValue(fieldDef, record),
    label: getFieldDisplayLabel(fieldDef) || fieldDef.key
  }));
};

