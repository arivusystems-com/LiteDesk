/**
 * Contextual validation for website / URL text inputs.
 * Used instead of <input type="url"> so browsers do not show generic native tooltips.
 */

const websiteHostnamePattern = /^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
const ipv4Pattern = /^(?:\d{1,3}\.){3}\d{1,3}$/;

/**
 * @param {string|null|undefined} rawValue
 * @returns {string|null} Error message, or null if valid / empty
 */
export function getWebsiteValidationMessage(rawValue) {
  if (rawValue === null || rawValue === undefined) return null;
  if (typeof rawValue !== 'string') return null;

  const value = rawValue.trim();
  if (!value) return null;

  if (/\s/.test(value)) {
    return 'Website cannot contain spaces';
  }

  if (/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(value) && !/^https?:\/\//i.test(value)) {
    return 'Use http:// or https:// (or omit protocol)';
  }

  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return 'Use http:// or https:// (or omit protocol)';
    }

    if (!parsed.hostname) {
      return 'Add a domain name (e.g., example.com)';
    }

    if (parsed.hostname === 'localhost' || ipv4Pattern.test(parsed.hostname)) {
      return 'Use a public domain with a suffix like .com or .org';
    }

    if (!parsed.hostname.includes('.')) {
      return 'Include a domain suffix like .com or .org';
    }

    if (!websiteHostnamePattern.test(parsed.hostname)) {
      const tld = parsed.hostname.split('.').pop() || '';
      if (!/^[a-zA-Z]{2,}$/.test(tld)) {
        return 'Domain suffix is invalid. Use letters only (e.g., .com, .org)';
      }
      return 'Domain format is invalid (e.g., example.com)';
    }

    return null;
  } catch {
    return 'Enter a valid website URL (e.g., example.com or https://example.org)';
  }
}

/**
 * @param {string|null|undefined} rawValue
 * @returns {boolean}
 */
export function isValidWebsiteInput(rawValue) {
  return !getWebsiteValidationMessage(rawValue);
}
