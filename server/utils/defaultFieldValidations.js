/**
 * Default validation rules for field types when none are stored on the module.
 * Phone: optional; if present, exactly 10 digits (common local mobile format).
 * Email: optional; if present, must match basic email shape (see client utils/fieldValidation.js case 'email').
 */

function getDefaultPhoneValidations() {
  return [
    {
      name: '10-digit phone',
      type: 'regex',
      pattern: '^(?:\\d{10})?$',
      message:
        'Enter a 10-digit phone number using digits 0–9 only, or leave this field empty. Letters and symbols are not allowed.',
    },
  ];
}

function getDefaultEmailValidations() {
  return [
    {
      name: 'Email format',
      type: 'email',
      message: 'Invalid email format',
    },
  ];
}

/** Aligned with client/src/utils/fieldValidation.js `case 'email'`. Empty/whitespace-only is allowed (optional field). */
function isOptionalEmailWellFormed(value) {
  if (value === null || value === undefined) return true;
  const s = String(value).trim();
  if (s === '') return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/**
 * Ensures Phone and Email fields have default validation when validations are missing or empty.
 * Does not override when the admin has configured any validation rules.
 */
function ensurePhoneFieldDefaultValidations(fields) {
  if (!Array.isArray(fields)) return fields;
  return fields.map((f) => {
    if (!f) return f;
    const v = f.validations;
    if (v && Array.isArray(v) && v.length > 0) return f;
    if (f.dataType === 'Phone') {
      return { ...f, validations: getDefaultPhoneValidations() };
    }
    if (f.dataType === 'Email') {
      return { ...f, validations: getDefaultEmailValidations() };
    }
    return f;
  });
}

module.exports = {
  getDefaultPhoneValidations,
  getDefaultEmailValidations,
  ensurePhoneFieldDefaultValidations,
  isOptionalEmailWellFormed,
};
