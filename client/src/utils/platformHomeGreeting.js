/**
 * Platform home greeting copy from API payload or local fallback.
 */

const TIME_LABELS = {
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening'
};

export function getLocalTimeOfDay(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/**
 * @param {{ firstName?: string, timeOfDay?: string } | null} greeting
 * @param {string} [fallbackFirstName]
 */
export function formatPlatformGreeting(greeting, fallbackFirstName = '') {
  const firstName = (greeting?.firstName || fallbackFirstName || '').trim();
  const timeOfDay = greeting?.timeOfDay || getLocalTimeOfDay();
  const label = TIME_LABELS[timeOfDay] || TIME_LABELS.morning;
  if (firstName) {
    return `${label}, ${firstName}`;
  }
  return label;
}
