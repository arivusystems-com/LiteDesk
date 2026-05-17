import { ref } from 'vue';
import apiClient from '@/utils/apiClient';

export interface TimeRange {
  start: string;
  end: string;
}

export interface WeekDay {
  day: number;
  enabled: boolean;
  windows: TimeRange[];
  breaks: TimeRange[];
}

export interface BusinessHourSet {
  _id: string;
  name: string;
  timezone: string;
  week: WeekDay[];
  holidayCalendarId?: string | null;
  holidayCalendarName?: string | null;
  overtimeAllowed: boolean;
  linkedTo: { type: 'company' | 'group' | 'user'; id?: string | null };
  isDefault?: boolean;
  status: 'active' | 'inactive';
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  summary?: string;
}

export interface ResolvedSchedule {
  setId: string | null;
  name: string;
  source: string;
  sourceLabel: string;
  summary: string;
  timezone: string;
  at: string;
}

export interface SimulateResult {
  at: string;
  isOpen: boolean;
  nextOpenAt: string | null;
  targetAfterMinutes: string | null;
  pauseReason: string | null;
  summary: string;
}

export interface HolidayCalendar {
  _id: string;
  name: string;
  region?: string;
  dates: { date: string; name: string }[];
}

export function useBusinessHours() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchSets(params: Record<string, string> = {}) {
    loading.value = true;
    error.value = null;
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/business-hours/sets${qs ? `?${qs}` : ''}`);
      return (res.data || []) as BusinessHourSet[];
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to load schedules';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function fetchSet(id: string) {
    const res = await apiClient.get(`/business-hours/sets/${id}`);
    return res.data as BusinessHourSet;
  }

  async function createSet(payload: Partial<BusinessHourSet>) {
    const res = await apiClient.post('/business-hours/sets', payload);
    return res.data as BusinessHourSet;
  }

  async function updateSet(id: string, payload: Partial<BusinessHourSet>) {
    const res = await apiClient.patch(`/business-hours/sets/${id}`, payload);
    return res.data as BusinessHourSet;
  }

  async function deleteSet(id: string) {
    await apiClient.delete(`/business-hours/sets/${id}`);
  }

  async function resolveSchedule(userId?: string) {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const res = await apiClient.get(`/business-hours/resolve${qs}`);
    return res.data as ResolvedSchedule;
  }

  async function simulate(body: {
    at?: string;
    minutesToAdd?: number;
    userId?: string;
    setId?: string;
  }) {
    const res = await apiClient.post('/business-hours/simulate', body);
    return res.data as SimulateResult;
  }

  async function fetchHolidayCalendars() {
    const res = await apiClient.get('/business-hours/holiday-calendars');
    return (res.data || []) as HolidayCalendar[];
  }

  async function createHolidayCalendar(payload: {
    name: string;
    region?: string;
    dates?: { date: string; name: string }[];
  }) {
    const res = await apiClient.post('/business-hours/holiday-calendars', payload);
    return res.data as HolidayCalendar;
  }

  async function updateHolidayCalendar(
    id: string,
    payload: Partial<{ name: string; region: string; dates: { date: string; name: string }[] }>
  ) {
    const res = await apiClient.patch(`/business-hours/holiday-calendars/${id}`, payload);
    return res.data as HolidayCalendar;
  }

  async function deleteHolidayCalendar(id: string) {
    await apiClient.delete(`/business-hours/holiday-calendars/${id}`);
  }

  async function importHolidayCsv(payload: { name: string; csv: string; region?: string }) {
    const res = await apiClient.post('/business-hours/holiday-calendars/import', payload);
    return res.data as HolidayCalendar;
  }

  return {
    loading,
    error,
    fetchSets,
    fetchSet,
    createSet,
    updateSet,
    deleteSet,
    resolveSchedule,
    simulate,
    fetchHolidayCalendars,
    createHolidayCalendar,
    updateHolidayCalendar,
    deleteHolidayCalendar,
    importHolidayCsv
  };
}
