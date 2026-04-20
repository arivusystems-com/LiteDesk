/**
 * Default validation rules for field types in Settings and forms.
 * Keep in sync with server/utils/defaultFieldValidations.js (Phone pattern/message, Email message).
 */

/** Shown when value is non-empty but not exactly 10 digits (matches regex validation). */
export const DEFAULT_PHONE_VALIDATION_MESSAGE =
  'Enter a 10-digit phone number using digits 0–9 only, or leave this field empty. Letters and symbols are not allowed.';

/** Matches client/src/utils/fieldValidation.js `case 'email'`. */
export const DEFAULT_EMAIL_VALIDATION_MESSAGE = 'Invalid email format';

export function getDefaultPhoneValidations() {
  return [
    {
      name: '10-digit phone',
      type: 'regex',
      pattern: '^(?:\\d{10})?$',
      message: DEFAULT_PHONE_VALIDATION_MESSAGE,
    },
  ];
}

export function getDefaultEmailValidations() {
  return [
    {
      name: 'Email format',
      type: 'email',
      message: DEFAULT_EMAIL_VALIDATION_MESSAGE,
    },
  ];
}
