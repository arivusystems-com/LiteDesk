<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Organization</h2>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Manage your organization's identity and global settings that apply across the platform
      </p>
    </div>

    <!-- Info Banner -->
    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3 class="text-sm font-semibold text-blue-800 dark:text-blue-300">Organization Identity</h3>
          <p class="text-sm text-blue-700 dark:text-blue-400 mt-1">
            These settings define your organization's identity and defaults. Changes here affect display and defaults across all applications, but do not modify application logic or permissions.
          </p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-sm text-red-800 dark:text-red-300">
          {{ error.message || 'Failed to load organization settings' }}
        </p>
      </div>
    </div>

    <!-- Settings Form -->
    <form v-else @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Organization Name -->
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Organization Name</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">Your organization's display name</p>
          </div>
        </div>
        <div>
          <input
            v-model="form.name"
            type="text"
            required
            class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 focus:border-transparent transition-all"
            placeholder="Enter organization name"
          />
        </div>
      </div>

      <!-- Logo / Brand Image -->
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Logo / Brand Image</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">Your organization's logo URL</p>
          </div>
        </div>
        <div class="space-y-4">
          <div>
            <input
              v-model="form.logoUrl"
              type="url"
              class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 focus:border-transparent transition-all"
              placeholder="https://example.com/logo.png"
            />
          </div>
          <div v-if="form.logoUrl" class="flex items-center gap-4">
            <img
              :src="form.logoUrl"
              alt="Organization logo"
              class="w-20 h-20 object-contain rounded-lg border border-gray-200 dark:border-gray-700"
              @error="handleImageError"
            />
            <button
              type="button"
              @click="form.logoUrl = ''"
              class="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              Remove logo
            </button>
          </div>
        </div>
      </div>

      <!-- Timezone -->
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Timezone</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">Your organization's default timezone</p>
          </div>
        </div>
        <div>
          <select
            v-model="form.timeZone"
            @change="handleTimezoneChange"
            class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 focus:border-transparent transition-all"
          >
            <option v-for="tz in timezones" :key="tz.value" :value="tz.value">
              {{ tz.label }}
            </option>
          </select>
          <p v-if="showTimezoneWarning" class="mt-2 text-sm text-amber-600 dark:text-amber-400">
            ⚠️ Changing timezone will affect how dates and times are displayed across the platform.
          </p>
        </div>
      </div>

      <!-- Currency -->
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Currency</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">Default currency for financial values</p>
          </div>
        </div>
        <div>
          <select
            v-model="form.currency"
            class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 focus:border-transparent transition-all"
          >
            <option v-for="curr in currencies" :key="curr.code" :value="curr.code">
              {{ curr.code }} - {{ curr.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Locale / Language -->
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Locale / Language</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">Default language and locale for the platform</p>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Language</label>
            <select
              v-model="form.language"
              class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 focus:border-transparent transition-all"
            >
              <option v-for="lang in languages" :key="lang.code" :value="lang.code">
                {{ lang.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Locale</label>
            <input
              v-model="form.locale"
              type="text"
              class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 focus:border-transparent transition-all"
              placeholder="en-US"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Format: language-COUNTRY (e.g., en-US, fr-FR)</p>
          </div>
        </div>
      </div>

      <!-- Data Region (Read-only) -->
      <div class="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Data Region</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">Your organization's data storage region</p>
          </div>
        </div>
        <div>
          <input
            :value="form.dataRegion"
            type="text"
            disabled
            class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
          />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Data region is set during organization creation and cannot be changed.</p>
        </div>
      </div>

      <!-- Save Button -->
      <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          @click="resetForm"
          :disabled="saving"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset
        </button>
        <button
          type="submit"
          :disabled="saving || !hasChanges"
          class="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          <span v-if="saving">Saving...</span>
          <span v-else>Save Changes</span>
          <svg v-if="saving" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import apiClient from '@/utils/apiClient';

const loading = ref(true);
const saving = ref(false);
const error = ref(null);
const showTimezoneWarning = ref(false);
const originalForm = ref({});

const form = ref({
  name: '',
  logoUrl: '',
  timeZone: 'UTC',
  currency: 'USD',
  locale: 'en-US',
  language: 'en',
  dataRegion: 'us-east-1'
});

// Common timezones
const timezones = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'America/New_York (Eastern Time)' },
  { value: 'America/Chicago', label: 'America/Chicago (Central Time)' },
  { value: 'America/Denver', label: 'America/Denver (Mountain Time)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (Pacific Time)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEDT)' }
];

// Common currencies
const currencies = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'SGD', name: 'Singapore Dollar' }
];

// Common languages
const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' }
];

const hasChanges = computed(() => {
  return JSON.stringify(form.value) !== JSON.stringify(originalForm.value);
});

const fetchOrganizationSettings = async () => {
  loading.value = true;
  error.value = null;

  try {
    const data = await apiClient('/settings/organization', {
      method: 'GET'
    });

    if (data && data.success && data.data) {
      form.value = {
        name: data.data.name || '',
        logoUrl: data.data.logoUrl || '',
        timeZone: data.data.timeZone || 'UTC',
        currency: data.data.currency || 'USD',
        locale: data.data.locale || 'en-US',
        language: data.data.language || 'en',
        dataRegion: data.data.dataRegion || 'us-east-1'
      };
      originalForm.value = JSON.parse(JSON.stringify(form.value));
    } else {
      error.value = new Error('Invalid response from server');
    }
  } catch (err) {
    console.error('Failed to fetch organization settings:', err);
    error.value = err;
  } finally {
    loading.value = false;
  }
};

const handleTimezoneChange = () => {
  if (form.value.timeZone !== originalForm.value.timeZone) {
    showTimezoneWarning.value = true;
  } else {
    showTimezoneWarning.value = false;
  }
};

const handleImageError = () => {
  // Handle image load error
  console.warn('Failed to load logo image');
};

const resetForm = () => {
  form.value = JSON.parse(JSON.stringify(originalForm.value));
  showTimezoneWarning.value = false;
};

const handleSubmit = async () => {
  saving.value = true;
  error.value = null;

  try {
    const data = await apiClient('/settings/organization', {
      method: 'PUT',
      body: JSON.stringify({
        name: form.value.name,
        logoUrl: form.value.logoUrl,
        timeZone: form.value.timeZone,
        currency: form.value.currency,
        locale: form.value.locale,
        language: form.value.language
      })
    });

    if (data && data.success) {
      // Update original form to reflect saved state
      originalForm.value = JSON.parse(JSON.stringify(form.value));
      showTimezoneWarning.value = false;
      
      // Show success message (you could use a toast notification here)
      alert('Organization settings updated successfully');
    } else {
      error.value = new Error(data.message || 'Failed to update organization settings');
    }
  } catch (err) {
    console.error('Failed to update organization settings:', err);
    error.value = err;
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  fetchOrganizationSettings();
});
</script>

