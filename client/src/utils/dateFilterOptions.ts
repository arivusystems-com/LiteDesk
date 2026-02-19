/**
 * Date filter option groups and helpers for list view date filters.
 * Used by ListView and ModuleList for Quick Filters, Relative, Specific Date, and Data Status.
 */

export type DateFilterPreset = 'today' | 'thisWeek' | 'thisMonth' | 'thisQuarter' | 'thisYear';
export type DateFilterOp = 'lastDays' | 'nextDays' | 'on' | 'before' | 'after' | 'between' | 'empty' | 'notEmpty';

export interface DateFilterValue {
  preset?: DateFilterPreset;
  op?: DateFilterOp;
  days?: number;
  date?: string;
  from?: string;
  to?: string;
}

/** Option groups for the date filter dropdown */
export const DATE_FILTER_OPTION_GROUPS = [
  {
    label: 'Quick Filters',
    options: [
      { value: 'preset:today', label: 'Today' },
      { value: 'preset:thisWeek', label: 'This Week' },
      { value: 'preset:thisMonth', label: 'This Month' },
      { value: 'preset:thisQuarter', label: 'This Quarter' },
      { value: 'preset:thisYear', label: 'This Year' }
    ]
  },
  {
    label: 'Relative',
    options: [
      { value: 'op:lastDays', label: 'In the Last X Days', needsInput: 'days' },
      { value: 'op:nextDays', label: 'In the Next X Days', needsInput: 'days' }
    ]
  },
  {
    label: 'Specific Date',
    options: [
      { value: 'op:on', label: 'On', needsInput: 'date' },
      { value: 'op:before', label: 'Before', needsInput: 'date' },
      { value: 'op:after', label: 'After', needsInput: 'date' },
      { value: 'op:between', label: 'Between', needsInput: 'between' }
    ]
  },
  {
    label: 'Data Status',
    options: [
      { value: 'op:empty', label: 'Is Empty' },
      { value: 'op:notEmpty', label: 'Is Not Empty' }
    ]
  }
];

/** Parse stored filter value (object or legacy string) into DateFilterValue */
export function parseDateFilterValue(value: unknown): DateFilterValue | null {
  if (value == null || value === '') return null;
  if (typeof value === 'object' && 'preset' in (value as object)) {
    return value as DateFilterValue;
  }
  if (typeof value === 'object' && 'op' in (value as object)) {
    return value as DateFilterValue;
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return { op: 'on', date: value };
  }
  return null;
}

/** Get start and end of today (UTC-like local) */
export function getTodayRange(): { from: Date; to: Date } {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  to.setMilliseconds(-1);
  return { from, to };
}

/** Get start and end of this week (Sun–Sat) */
export function getThisWeekRange(): { from: Date; to: Date } {
  const now = new Date();
  const day = now.getDay();
  const from = new Date(now);
  from.setDate(now.getDate() - day);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(from.getDate() + 7);
  to.setMilliseconds(-1);
  return { from, to };
}

/** Get start and end of this month */
export function getThisMonthRange(): { from: Date; to: Date } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { from, to };
}

/** Get start and end of this quarter */
export function getThisQuarterRange(): { from: Date; to: Date } {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) + 1;
  const from = new Date(now.getFullYear(), (q - 1) * 3, 1, 0, 0, 0, 0);
  const to = new Date(now.getFullYear(), q * 3, 0, 23, 59, 59, 999);
  return { from, to };
}

/** Get start and end of this year */
export function getThisYearRange(): { from: Date; to: Date } {
  const now = new Date();
  const from = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  const to = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  return { from, to };
}

/** Convert DateFilterValue to API-friendly params for a given field key (e.g. dueDate, startDateTime) */
export function dateFilterValueToParams(
  fieldKey: string,
  value: DateFilterValue | null
): Record<string, string | number | undefined> {
  if (!value) return {};
  const params: Record<string, string | number | undefined> = {};

  if (value.preset) {
    params[`${fieldKey}Preset`] = value.preset;
    return params;
  }
  if (value.op === 'empty') {
    params[`${fieldKey}Op`] = 'empty';
    return params;
  }
  if (value.op === 'notEmpty') {
    params[`${fieldKey}Op`] = 'notEmpty';
    return params;
  }
  if (value.op === 'lastDays' && value.days != null) {
    params[`${fieldKey}Op`] = 'lastDays';
    params[`${fieldKey}Days`] = value.days;
    return params;
  }
  if (value.op === 'nextDays' && value.days != null) {
    params[`${fieldKey}Op`] = 'nextDays';
    params[`${fieldKey}Days`] = value.days;
    return params;
  }
  if (value.op === 'on' && value.date) {
    params[`${fieldKey}Op`] = 'on';
    params[fieldKey] = value.date;
    return params;
  }
  if (value.op === 'before' && value.date) {
    params[`${fieldKey}Op`] = 'before';
    params[`${fieldKey}To`] = value.date;
    return params;
  }
  if (value.op === 'after' && value.date) {
    params[`${fieldKey}Op`] = 'after';
    params[`${fieldKey}From`] = value.date;
    return params;
  }
  if (value.op === 'between' && value.from != null && value.to != null) {
    params[`${fieldKey}Op`] = 'between';
    params[`${fieldKey}From`] = value.from;
    params[`${fieldKey}To`] = value.to;
    return params;
  }
  return {};
}

/** Human-readable label for current date filter value */
export function getDateFilterLabel(value: DateFilterValue | null): string {
  if (!value) return '';
  if (value.preset) {
    const labels: Record<string, string> = {
      today: 'Today',
      thisWeek: 'This Week',
      thisMonth: 'This Month',
      thisQuarter: 'This Quarter',
      thisYear: 'This Year'
    };
    return labels[value.preset] || value.preset;
  }
  if (value.op === 'empty') return 'Is Empty';
  if (value.op === 'notEmpty') return 'Is Not Empty';
  if (value.op === 'lastDays' && value.days != null) return `In the Last ${value.days} Days`;
  if (value.op === 'nextDays' && value.days != null) return `In the Next ${value.days} Days`;
  if (value.op === 'on' && value.date) return `On ${formatDateLabel(value.date)}`;
  if (value.op === 'before' && value.date) return `Before ${formatDateLabel(value.date)}`;
  if (value.op === 'after' && value.date) return `After ${formatDateLabel(value.date)}`;
  if (value.op === 'between' && value.from != null && value.to != null) {
    return `${formatDateLabel(value.from)} – ${formatDateLabel(value.to)}`;
  }
  return '';
}

function formatDateLabel(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}
