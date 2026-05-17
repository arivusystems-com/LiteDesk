/** Popular shortcuts shown at the top of the picker. */
const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Africa/Cairo',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Europe/London',
  'Europe/Paris',
  'Australia/Sydney'
];

/** Regions included in the business-hours timezone picker. */
const PICKER_REGION_PREFIXES = ['Africa/', 'America/'] as const;

export interface TimezonePickerOption {
  value: string;
  label: string;
  group: string;
}

function getAllIanaTimezones(): string[] {
  try {
    const supported = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] })
      .supportedValuesOf?.('timeZone');
    if (supported?.length) return [...supported];
  } catch {
    /* ignore */
  }
  return [...COMMON_TIMEZONES];
}

function regionGroup(timezone: string): string {
  if (timezone === 'UTC') return 'UTC';
  if (timezone.startsWith('Africa/')) return 'Africa';
  if (timezone.startsWith('America/')) return 'America';
  if (timezone.startsWith('Asia/')) return 'Asia';
  if (timezone.startsWith('Europe/')) return 'Europe';
  if (timezone.startsWith('Australia/') || timezone.startsWith('Pacific/')) return 'Pacific';
  return 'Other';
}

/**
 * Options for the business-hours timezone picker: Popular, Africa, America,
 * plus the currently selected zone if it falls outside those regions.
 */
export function buildTimezonePickerOptions(selectedTimezone?: string | null): TimezonePickerOption[] {
  const zoneSet = new Set<string>(['UTC']);

  for (const tz of COMMON_TIMEZONES) {
    zoneSet.add(tz);
  }

  for (const tz of getAllIanaTimezones()) {
    if (PICKER_REGION_PREFIXES.some((prefix) => tz.startsWith(prefix))) {
      zoneSet.add(tz);
    }
  }

  if (selectedTimezone?.trim()) {
    zoneSet.add(selectedTimezone.trim());
  }

  const popular = COMMON_TIMEZONES.filter(
    (z) =>
      zoneSet.has(z) &&
      (z === 'UTC' || z.startsWith('Africa/') || z.startsWith('America/'))
  );
  const africa = [...zoneSet].filter((z) => z.startsWith('Africa/')).sort();
  const america = [...zoneSet].filter((z) => z.startsWith('America/')).sort();

  const selected = selectedTimezone?.trim();
  const showCurrentGroup =
    selected &&
    selected !== 'UTC' &&
    !selected.startsWith('Africa/') &&
    !selected.startsWith('America/');

  const options: TimezonePickerOption[] = [];

  if (showCurrentGroup) {
    options.push({ value: selected, label: selected, group: 'Current selection' });
  }

  if (zoneSet.has('UTC') && !popular.includes('UTC')) {
    options.push({ value: 'UTC', label: 'UTC', group: 'UTC' });
  }

  for (const value of popular) {
    options.push({
      value,
      label: value,
      group: value === 'UTC' ? 'UTC' : 'Popular'
    });
  }

  for (const value of africa) {
    if (popular.includes(value)) continue;
    options.push({ value, label: value, group: 'Africa' });
  }

  for (const value of america) {
    if (popular.includes(value)) continue;
    options.push({ value, label: value, group: 'America' });
  }

  return options;
}

/** @deprecated Use buildTimezonePickerOptions for UI. */
export function getTimezoneOptions(): string[] {
  return buildTimezonePickerOptions().map((o) => o.value);
}

export function formatTimeInZone(timezone: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(new Date());
  } catch {
    return '';
  }
}

export function detectUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
