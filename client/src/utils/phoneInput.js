/**
 * Phone inputs: digits only, limited length (default 10).
 * Strips letters, spaces, +, etc., so non-numeric characters are not accepted.
 */
export function sanitizePhoneDigits(value, maxLen = 10) {
  if (value == null || value === '') return '';
  return String(value).replace(/\D/g, '').slice(0, maxLen);
}

/**
 * Keydown: block printable non-digits so text never appears (paste is still cleaned in @input).
 * Does not interfere with Ctrl/Cmd/Alt shortcuts or navigation keys.
 */
export function preventNonDigitPhoneKeys(event) {
  if (!event || event.defaultPrevented) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const k = event.key;
  if (k.length === 1 && !/\d/.test(k)) {
    event.preventDefault();
  }
}
