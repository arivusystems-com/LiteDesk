const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const APPOINTMENT_TYPE_OPTIONS = [
  { value: 'demo', label: 'Demo', description: 'Product walkthrough' },
  { value: 'consultation', label: 'Consultation', description: 'Explore fit & needs' },
  { value: 'support', label: 'Support', description: 'Get help with an issue' },
  { value: 'other', label: 'Other', description: 'General meeting' }
];

export const SLOT_DURATION_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' }
];

export const BUFFER_OPTIONS = [
  { value: 0, label: 'No buffer' },
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' }
];

export const MEETING_TYPE_OPTIONS = [
  { value: 'offline', label: 'In person', icon: 'location' },
  { value: 'google_meet', label: 'Google Meet', icon: 'video' },
  { value: 'ms_teams', label: 'Microsoft Teams', icon: 'video' }
];

export function formatSlotTime(iso, locale = undefined) {
  const d = new Date(iso);
  return d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
}

export function formatSlotDate(iso, locale = undefined) {
  const d = new Date(iso);
  return d.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });
}

export function slugifyClient(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export { DAY_LABELS };

export function appointmentSourceLabel(source) {
  const map = {
    public_page: 'Public page',
    manual: 'Manual',
    integration: 'Integration',
    campaign: 'Campaign'
  };
  return map[source] || source || '—';
}

export function appointmentTypeLabel(type) {
  const found = APPOINTMENT_TYPE_OPTIONS.find((o) => o.value === type);
  return found?.label || type || '—';
}
