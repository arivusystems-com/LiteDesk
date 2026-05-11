/**
 * Default validation rules for field types in Settings and forms.
 * Keep in sync with server/utils/defaultFieldValidations.js.
 */

/** Matches client/src/utils/fieldValidation.js `case 'email'`. */
export const DEFAULT_EMAIL_VALIDATION_MESSAGE = 'Invalid email format';

export const DEFAULT_PHONE_VALIDATION_MESSAGE =
  'Enter a valid phone number for the selected country, or leave this field empty.';

/**
 * Phone fields are validated by the country-aware PhoneInput at runtime.
 * Do not attach a default regex validation to module metadata.
 */
export function getDefaultPhoneValidations() {
  return [];
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
