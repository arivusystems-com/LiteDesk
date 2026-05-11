/**
 * Default validation rules for field types when none are stored on the module.
 * Phone fields are validated by the country-aware client input and should not receive a default metadata regex.
 * Email: optional; if present, must match basic email shape (see client utils/fieldValidation.js case 'email').
 */

function getDefaultPhoneValidations() {
  return [];
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

function isDefaultPhoneValidation(validation) {
  if (!validation || validation.type !== 'regex') return false;
  return [
    '^(?:\\d{10})?$',
    '^\\d{10}$',
    '^(?:\\+[1-9]\\d{6,14})?$',
  ].includes(validation.pattern);
}

/** Aligned with client/src/utils/fieldValidation.js `case 'email'`. Empty/whitespace-only is allowed (optional field). */
function isOptionalEmailWellFormed(value) {
  if (value === null || value === undefined) return true;
  const s = String(value).trim();
  if (s === '') return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/**
 * Ensures Email fields have default validation when validations are missing or empty.
 * Phone fields intentionally remain without default metadata validations.
 * Does not override when the admin has configured any validation rules.
 */
function ensurePhoneFieldDefaultValidations(fields) {
  if (!Array.isArray(fields)) return fields;
  return fields.map((f) => {
    if (!f) return f;
    const v = f.validations;
    if (f.dataType === 'Phone' && Array.isArray(v) && v.length > 0 && v.every(isDefaultPhoneValidation)) {
      return { ...f, validations: [] };
    }
    if (v && Array.isArray(v) && v.length > 0) return f;
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
