export const DEFAULT_CURRENCY_CODE = 'USD';

export const CURRENCY_OPTIONS = Object.freeze([
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'SGD', name: 'Singapore Dollar' },
]);

export function getCurrencySymbolFromCode(currencyCode = DEFAULT_CURRENCY_CODE) {
  try {
    const parts = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'symbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(0);
    const symbolPart = parts.find((part) => part.type === 'currency');
    return symbolPart?.value || '$';
  } catch (error) {
    return '$';
  }
}

export function formatCurrencyValue(value, {
  currencyCode = DEFAULT_CURRENCY_CODE,
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
  locale = 'en-US',
} = {}) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(numericValue);
  } catch (error) {
    const fallbackSymbol = getCurrencySymbolFromCode(currencyCode);
    return `${fallbackSymbol}${numericValue.toFixed(maximumFractionDigits)}`;
  }
}
