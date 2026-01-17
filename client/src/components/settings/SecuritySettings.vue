<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Security</h2>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Configure platform-wide security policies and monitor security activity
      </p>
    </div>

    <!-- Info Banner -->
    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <div>
          <h3 class="text-sm font-semibold text-blue-800 dark:text-blue-300">Platform-Wide Security</h3>
          <p class="text-sm text-blue-700 dark:text-blue-400 mt-1">
            These security policies apply across all applications in your organization. Changes take effect immediately for new sessions. Existing sessions may continue with previous rules until they expire.
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
          {{ error.message || 'Failed to load security settings' }}
        </p>
      </div>
    </div>

    <!-- Settings Form -->
    <form v-else @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Password Policy -->
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Password Policy</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">Configure password requirements for all users</p>
          </div>
        </div>
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Minimum Length
              </label>
              <input
                v-model.number="form.passwordPolicy.minLength"
                type="number"
                min="6"
                max="128"
                class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expiration (Days)
              </label>
              <input
                v-model.number="form.passwordPolicy.expirationDays"
                type="number"
                min="0"
                max="365"
                class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 focus:border-transparent transition-all"
              />
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">0 = no expiration</p>
            </div>
          </div>
          <div class="space-y-3">
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                v-model="form.passwordPolicy.requireUppercase"
                type="checkbox"
                class="w-5 h-5 text-brand-600 focus:ring-brand-500 rounded"
              />
              <div>
                <span class="text-sm font-medium text-gray-900 dark:text-white">Require Uppercase Letters</span>
                <p class="text-xs text-gray-500 dark:text-gray-400">Passwords must contain at least one uppercase letter</p>
              </div>
            </label>
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                v-model="form.passwordPolicy.requireLowercase"
                type="checkbox"
                class="w-5 h-5 text-brand-600 focus:ring-brand-500 rounded"
              />
              <div>
                <span class="text-sm font-medium text-gray-900 dark:text-white">Require Lowercase Letters</span>
                <p class="text-xs text-gray-500 dark:text-gray-400">Passwords must contain at least one lowercase letter</p>
              </div>
            </label>
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                v-model="form.passwordPolicy.requireNumbers"
                type="checkbox"
                class="w-5 h-5 text-brand-600 focus:ring-brand-500 rounded"
              />
              <div>
                <span class="text-sm font-medium text-gray-900 dark:text-white">Require Numbers</span>
                <p class="text-xs text-gray-500 dark:text-gray-400">Passwords must contain at least one number</p>
              </div>
            </label>
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                v-model="form.passwordPolicy.requireSpecialChars"
                type="checkbox"
                class="w-5 h-5 text-brand-600 focus:ring-brand-500 rounded"
              />
              <div>
                <span class="text-sm font-medium text-gray-900 dark:text-white">Require Special Characters</span>
                <p class="text-xs text-gray-500 dark:text-gray-400">Passwords must contain at least one special character (!@#$%^&*)</p>
              </div>
            </label>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prevent Password Reuse (Last N Passwords)
            </label>
            <input
              v-model.number="form.passwordPolicy.preventReuse"
              type="number"
              min="0"
              max="24"
              class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 focus:border-transparent transition-all"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">0 = no restriction</p>
          </div>
        </div>
      </div>

      <!-- Session Rules -->
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Session Rules</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">Control how long users stay logged in</p>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Session Duration (Hours)
            </label>
            <input
              v-model.number="form.sessionRules.durationHours"
              type="number"
              min="1"
              max="168"
              class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Idle Timeout (Minutes)
            </label>
            <input
              v-model.number="form.sessionRules.idleTimeoutMinutes"
              type="number"
              min="5"
              max="480"
              class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Concurrent Sessions
            </label>
            <input
              v-model.number="form.sessionRules.maxConcurrentSessions"
              type="number"
              min="1"
              max="20"
              class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      <!-- Login Restrictions -->
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Login Restrictions</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">Control where and how users can log in</p>
          </div>
        </div>
        <div class="space-y-4">
          <div>
            <label class="flex items-center gap-3 cursor-pointer mb-3">
              <input
                v-model="form.loginRestrictions.blockFailedAttempts"
                type="checkbox"
                class="w-5 h-5 text-brand-600 focus:ring-brand-500 rounded"
              />
              <div>
                <span class="text-sm font-medium text-gray-900 dark:text-white">Block Failed Login Attempts</span>
                <p class="text-xs text-gray-500 dark:text-gray-400">Automatically block accounts after multiple failed login attempts</p>
              </div>
            </label>
            <div v-if="form.loginRestrictions.blockFailedAttempts" class="grid grid-cols-1 md:grid-cols-2 gap-4 ml-8">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Failed Attempts
                </label>
                <input
                  v-model.number="form.loginRestrictions.maxFailedAttempts"
                  type="number"
                  min="1"
                  max="10"
                  class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Lockout Duration (Minutes)
                </label>
                <input
                  v-model.number="form.loginRestrictions.lockoutDurationMinutes"
                  type="number"
                  min="1"
                  max="1440"
                  class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Allowed IP Addresses (Optional)
            </label>
            <textarea
              v-model="ipWhitelistText"
              @blur="updateIpWhitelist"
              rows="3"
              class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 focus:border-transparent transition-all"
              placeholder="Enter one IP address per line (e.g., 192.168.1.1)"
            ></textarea>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Leave empty to allow all IP addresses. Enter one IP per line.</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Blocked IP Addresses
            </label>
            <textarea
              v-model="ipBlacklistText"
              @blur="updateIpBlacklist"
              rows="3"
              class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 focus:border-transparent transition-all"
              placeholder="Enter one IP address per line"
            ></textarea>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Enter one IP per line to block.</p>
          </div>
        </div>
      </div>

      <!-- Two-Factor Authentication -->
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Two-Factor Authentication</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">Add an extra layer of security to user accounts</p>
          </div>
        </div>
        <div class="space-y-4">
          <label class="flex items-center gap-3 cursor-pointer">
            <input
              v-model="form.twoFactorAuth.enabled"
              type="checkbox"
              class="w-5 h-5 text-brand-600 focus:ring-brand-500 rounded"
            />
            <div>
              <span class="text-sm font-medium text-gray-900 dark:text-white">Enable Two-Factor Authentication</span>
              <p class="text-xs text-gray-500 dark:text-gray-400">Allow users to enable 2FA for their accounts</p>
            </div>
          </label>
          <label v-if="form.twoFactorAuth.enabled" class="flex items-center gap-3 cursor-pointer">
            <input
              v-model="form.twoFactorAuth.required"
              type="checkbox"
              class="w-5 h-5 text-brand-600 focus:ring-brand-500 rounded"
            />
            <div>
              <span class="text-sm font-medium text-gray-900 dark:text-white">Require Two-Factor Authentication</span>
              <p class="text-xs text-gray-500 dark:text-gray-400">All users must enable 2FA to access the platform</p>
            </div>
          </label>
          <div v-if="form.twoFactorAuth.enabled">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Allowed Methods
            </label>
            <div class="space-y-2">
              <label class="flex items-center gap-3 cursor-pointer">
                <input
                  :checked="form.twoFactorAuth.methods.includes('totp')"
                  @change="toggle2FAMethod('totp')"
                  type="checkbox"
                  class="w-5 h-5 text-brand-600 focus:ring-brand-500 rounded"
                />
                <span class="text-sm text-gray-900 dark:text-white">TOTP (Authenticator App)</span>
              </label>
              <label class="flex items-center gap-3 cursor-pointer">
                <input
                  :checked="form.twoFactorAuth.methods.includes('sms')"
                  @change="toggle2FAMethod('sms')"
                  type="checkbox"
                  class="w-5 h-5 text-brand-600 focus:ring-brand-500 rounded"
                />
                <span class="text-sm text-gray-900 dark:text-white">SMS</span>
              </label>
              <label class="flex items-center gap-3 cursor-pointer">
                <input
                  :checked="form.twoFactorAuth.methods.includes('email')"
                  @change="toggle2FAMethod('email')"
                  type="checkbox"
                  class="w-5 h-5 text-brand-600 focus:ring-brand-500 rounded"
                />
                <span class="text-sm text-gray-900 dark:text-white">Email</span>
              </label>
            </div>
          </div>
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
          <span v-else>Save Security Settings</span>
          <svg v-if="saving" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </button>
      </div>
    </form>

    <!-- Security Activity Section (Read-only) -->
    <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Security Activity</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">Recent login activity and security events</p>
          </div>
        </div>
        <button
          @click="fetchSecurityActivity"
          class="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Refresh
        </button>
      </div>
      <div v-if="activityLoading" class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600"></div>
      </div>
      <div v-else-if="securityActivity.length === 0" class="text-center py-8">
        <p class="text-sm text-gray-500 dark:text-gray-400">No security activity to display</p>
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="event in securityActivity"
          :key="event.id"
          class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
        >
          <div class="flex items-center gap-3">
            <div
              :class="[
                'w-2 h-2 rounded-full',
                event.status === 'success' ? 'bg-green-500' : 'bg-red-500'
              ]"
            ></div>
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ event.type === 'LOGIN_SUCCESS' ? 'Successful Login' : 'Failed Login Attempt' }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ event.userEmail }} • {{ formatDate(event.timestamp) }}
              </p>
            </div>
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400">
            {{ event.ip }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import apiClient from '@/utils/apiClient';

const loading = ref(true);
const saving = ref(false);
const activityLoading = ref(false);
const error = ref(null);
const originalForm = ref({});
const securityActivity = ref([]);

const form = ref({
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    expirationDays: 90,
    preventReuse: 5
  },
  sessionRules: {
    durationHours: 24,
    idleTimeoutMinutes: 30,
    maxConcurrentSessions: 5
  },
  loginRestrictions: {
    ipWhitelist: [],
    ipBlacklist: [],
    allowedRegions: [],
    blockFailedAttempts: true,
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 15
  },
  twoFactorAuth: {
    enabled: false,
    required: false,
    methods: ['totp']
  }
});

const ipWhitelistText = ref('');
const ipBlacklistText = ref('');

const hasChanges = computed(() => {
  return JSON.stringify(form.value) !== JSON.stringify(originalForm.value);
});

const updateIpWhitelist = () => {
  form.value.loginRestrictions.ipWhitelist = ipWhitelistText.value
    .split('\n')
    .map(ip => ip.trim())
    .filter(ip => ip.length > 0);
};

const updateIpBlacklist = () => {
  form.value.loginRestrictions.ipBlacklist = ipBlacklistText.value
    .split('\n')
    .map(ip => ip.trim())
    .filter(ip => ip.length > 0);
};

const toggle2FAMethod = (method) => {
  const methods = form.value.twoFactorAuth.methods || [];
  const index = methods.indexOf(method);
  if (index > -1) {
    methods.splice(index, 1);
  } else {
    methods.push(method);
  }
  form.value.twoFactorAuth.methods = methods;
};

const fetchSecuritySettings = async () => {
  loading.value = true;
  error.value = null;

  try {
    const data = await apiClient('/settings/security', {
      method: 'GET'
    });

    if (data && data.success && data.data) {
      form.value = {
        passwordPolicy: data.data.passwordPolicy,
        sessionRules: data.data.sessionRules,
        loginRestrictions: data.data.loginRestrictions,
        twoFactorAuth: data.data.twoFactorAuth
      };
      originalForm.value = JSON.parse(JSON.stringify(form.value));
      
      // Update IP list text fields
      ipWhitelistText.value = form.value.loginRestrictions.ipWhitelist.join('\n');
      ipBlacklistText.value = form.value.loginRestrictions.ipBlacklist.join('\n');
    } else {
      error.value = new Error('Invalid response from server');
    }
  } catch (err) {
    console.error('Failed to fetch security settings:', err);
    error.value = err;
  } finally {
    loading.value = false;
  }
};

const fetchSecurityActivity = async () => {
  activityLoading.value = true;
  try {
    const data = await apiClient('/settings/security/activity', {
      method: 'GET'
    });

    if (data && data.success && data.data) {
      securityActivity.value = data.data.activity || [];
    }
  } catch (err) {
    console.error('Failed to fetch security activity:', err);
  } finally {
    activityLoading.value = false;
  }
};

const resetForm = () => {
  form.value = JSON.parse(JSON.stringify(originalForm.value));
  ipWhitelistText.value = form.value.loginRestrictions.ipWhitelist.join('\n');
  ipBlacklistText.value = form.value.loginRestrictions.ipBlacklist.join('\n');
};

const handleSubmit = async () => {
  // Confirm high-risk changes
  const requiresConfirmation = 
    form.value.twoFactorAuth.required !== originalForm.value.twoFactorAuth.required ||
    form.value.loginRestrictions.blockFailedAttempts !== originalForm.value.loginRestrictions.blockFailedAttempts;

  if (requiresConfirmation) {
    const confirmed = confirm('You are making changes that affect user access. Are you sure you want to continue?');
    if (!confirmed) return;
  }

  saving.value = true;
  error.value = null;

  // Update IP lists before submitting
  updateIpWhitelist();
  updateIpBlacklist();

  try {
    const data = await apiClient('/settings/security', {
      method: 'PUT',
      body: JSON.stringify({
        passwordPolicy: form.value.passwordPolicy,
        sessionRules: form.value.sessionRules,
        loginRestrictions: form.value.loginRestrictions,
        twoFactorAuth: form.value.twoFactorAuth
      })
    });

    if (data && data.success) {
      originalForm.value = JSON.parse(JSON.stringify(form.value));
      alert('Security settings updated successfully');
    } else {
      error.value = new Error(data.message || 'Failed to update security settings');
    }
  } catch (err) {
    console.error('Failed to update security settings:', err);
    error.value = err;
  } finally {
    saving.value = false;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

onMounted(() => {
  fetchSecuritySettings();
  fetchSecurityActivity();
});
</script>

