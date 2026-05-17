import { ref, computed } from 'vue';
import apiClient from '@/utils/apiClient';

const defaultConfig = () => ({
  displayName: '',
  slug: '',
  enabled: true,
  scheduleSource: 'legacy',
  businessHourSetId: null,
  availableDays: [1, 2, 3, 4, 5],
  workingHours: { start: '09:00', end: '18:00', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' },
  slotDurationMinutes: 30,
  bufferMinutes: 10,
  dailyCapacity: null,
  meetingType: 'offline',
  appointmentTypes: ['demo', 'consultation'],
  customFields: [],
  branding: {
    logoUrl: '',
    themeColor: '#4f46e5',
    welcomeNote: 'Pick a time that works for you — I look forward to meeting!'
  }
});

export function useAppointmentConfig() {
  const config = ref(null);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref(null);
  const slugChecking = ref(false);
  const slugAvailable = ref(true);

  const bookingUrl = computed(() => {
    if (!config.value?.slug) return '';
    if (config.value.bookingUrl) return config.value.bookingUrl;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/book/${config.value.slug}`;
  });

  async function fetchUserConfig(userId) {
    loading.value = true;
    error.value = null;
    try {
      const res = await apiClient.get(`/appointments/config/user/${userId}`);
      if (res.success) {
        config.value = res.data ? { ...defaultConfig(), ...res.data } : { ...defaultConfig(), _isNew: true };
      }
    } catch (e) {
      error.value = e.message || 'Failed to load configuration';
      config.value = { ...defaultConfig(), _isNew: true };
    } finally {
      loading.value = false;
    }
  }

  async function saveUserConfig(userId, payload) {
    saving.value = true;
    error.value = null;
    try {
      const res = await apiClient.put(`/appointments/config/user/${userId}`, payload);
      if (res.success) {
        config.value = res.data;
        return res.data;
      }
      throw new Error(res.message || 'Save failed');
    } catch (e) {
      error.value = e.message || 'Failed to save';
      throw e;
    } finally {
      saving.value = false;
    }
  }

  async function fetchMyConfig() {
    loading.value = true;
    error.value = null;
    try {
      const res = await apiClient.get('/appointments/config/me');
      if (res.success) {
        config.value = res.data ? { ...defaultConfig(), ...res.data } : { ...defaultConfig(), _isNew: true };
      }
    } catch (e) {
      error.value = e.message || 'Failed to load configuration';
      config.value = { ...defaultConfig(), _isNew: true };
    } finally {
      loading.value = false;
    }
  }

  async function saveConfig(payload) {
    saving.value = true;
    error.value = null;
    try {
      const res = await apiClient.put('/appointments/config/me', payload);
      if (res.success) {
        config.value = res.data;
        return res.data;
      }
      throw new Error(res.message || 'Save failed');
    } catch (e) {
      error.value = e.message || 'Failed to save';
      throw e;
    } finally {
      saving.value = false;
    }
  }

  async function checkSlug(slug, excludeId = null) {
    if (!slug || slug.length < 2) {
      slugAvailable.value = false;
      return;
    }
    slugChecking.value = true;
    try {
      const params = { slug };
      if (excludeId) params.excludeId = excludeId;
      const res = await apiClient.get('/appointments/config/slug-available', { params });
      slugAvailable.value = res.success && res.available;
    } catch {
      slugAvailable.value = false;
    } finally {
      slugChecking.value = false;
    }
  }

  return {
    config,
    loading,
    saving,
    error,
    slugChecking,
    slugAvailable,
    bookingUrl,
    fetchMyConfig,
    fetchUserConfig,
    saveUserConfig,
    saveConfig,
    checkSlug,
    defaultConfig
  };
}
