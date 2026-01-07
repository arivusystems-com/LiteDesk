<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 overflow-y-auto"
      @click.self="close"
    >
      <div class="flex min-h-screen items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"></div>

        <!-- Modal -->
        <div class="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl transform transition-all max-h-[90vh] overflow-y-auto">
          <!-- Header -->
          <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 rounded-t-2xl z-10">
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-bold text-gray-900 dark:text-white">Invite New User</h2>
              <button
                @click="close"
                class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Body -->
          <form @submit.prevent="handleSubmit" class="p-6 space-y-6">
            <!-- Name Fields -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  First Name *
                </label>
                <input
                  v-model="form.firstName"
                  type="text"
                  required
                  class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 focus:border-transparent transition-all"
                  placeholder="John"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Last Name *
                </label>
                <input
                  v-model="form.lastName"
                  type="text"
                  required
                  class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 focus:border-transparent transition-all"
                  placeholder="Doe"
                />
              </div>
            </div>

            <!-- Email -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address *
              </label>
              <input
                v-model="form.email"
                type="email"
                required
                class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 focus:border-transparent transition-all"
                placeholder="john.doe@company.com"
              />
            </div>

            <!-- User Type Selection -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                User Type *
              </label>
              <div class="flex items-center gap-4">
                <label class="flex items-center gap-2">
                  <input
                    type="radio"
                    v-model="form.userType"
                    value="INTERNAL"
                    @change="onUserTypeChange"
                    class="w-4 h-4 text-brand-600 focus:ring-brand-500"
                  />
                  <span class="text-sm text-gray-700 dark:text-gray-300">Internal</span>
                </label>
                <label class="flex items-center gap-2">
                  <input
                    type="radio"
                    v-model="form.userType"
                    value="EXTERNAL"
                    @change="onUserTypeChange"
                    class="w-4 h-4 text-brand-600 focus:ring-brand-500"
                  />
                  <span class="text-sm text-gray-700 dark:text-gray-300">External</span>
                </label>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Internal users are employees. External users are customers, partners, or auditors.
              </p>
            </div>

            <!-- App Access Selection -->
            <div v-if="form.userType">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                App Access *
              </label>
              <div v-if="loadingCapabilities" class="text-sm text-gray-500 dark:text-gray-400">
                Loading available apps...
              </div>
              <div v-else-if="availableApps.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
                No apps available for this user type.
              </div>
              <div v-else class="space-y-3">
                <div
                  v-for="app in availableApps"
                  :key="app.appKey"
                  class="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  :class="{
                    'bg-gray-50 dark:bg-gray-900/50': isAppSelected(app.appKey),
                    'opacity-50': !isAppEnabled(app)
                  }"
                >
                  <div class="flex items-start gap-3">
                    <input
                      type="checkbox"
                      :id="`app-${app.appKey}`"
                      :checked="isAppSelected(app.appKey)"
                      :disabled="!isAppEnabled(app)"
                      @change="toggleApp(app)"
                      class="mt-1 w-4 h-4 text-brand-600 focus:ring-brand-500 rounded"
                    />
                    <div class="flex-1">
                      <label
                        :for="`app-${app.appKey}`"
                        class="flex items-center justify-between cursor-pointer"
                        :class="{ 'cursor-not-allowed': !isAppEnabled(app) }"
                      >
                        <div>
                          <div class="font-medium text-gray-900 dark:text-white">
                            {{ getAppDisplayName(app.appKey) }}
                          </div>
                          <!-- Seat Usage Info -->
                          <div v-if="app.seatInfo && app.seatInfo.limit !== null" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <span v-if="app.seatInfo.available !== null">
                              {{ app.seatInfo.used }}/{{ app.seatInfo.limit }} seats used
                              <span v-if="app.seatInfo.available === 0" class="text-red-600 dark:text-red-400 font-medium">
                                (No seats available)
                              </span>
                              <span v-else class="text-green-600 dark:text-green-400">
                                ({{ app.seatInfo.available }} available)
                              </span>
                            </span>
                            <span v-else>
                              Unlimited seats
                            </span>
                          </div>
                        </div>
                      </label>

                      <!-- Role Selection for Selected App -->
                      <div v-if="isAppSelected(app.appKey)" class="mt-3 ml-7">
                        <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Role for {{ getAppDisplayName(app.appKey) }}:
                        </label>
                        <select
                          v-model="selectedAppRoles[app.appKey]"
                          @change="updateAppRole(app.appKey, $event.target.value)"
                          class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 focus:border-transparent transition-all"
                        >
                          <option v-for="roleKey in app.roles" :key="roleKey" :value="roleKey">
                            {{ getRoleDisplayName(app.appKey, roleKey) }}
                          </option>
                        </select>
                      </div>

                      <!-- Disabled Reason -->
                      <div v-if="!isAppEnabled(app) && app.seatInfo && !app.seatInfo.canAdd" class="mt-2 ml-7 text-xs text-red-600 dark:text-red-400">
                        {{ app.seatInfo.reason }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p v-if="validationErrors.appAccess" class="text-xs text-red-600 dark:text-red-400 mt-1">
                {{ validationErrors.appAccess }}
              </p>
            </div>

            <!-- Legacy Role Selection (for backward compatibility) -->
            <div v-if="!form.userType && availableRoles.length > 0">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role *
              </label>
              <select
                v-model="form.roleId"
                class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 focus:border-transparent transition-all"
              >
                <option value="">Select a role</option>
                <option v-for="role in availableRoles" :key="role._id" :value="role._id">
                  {{ role.name }} - {{ role.description }}
                </option>
              </select>
            </div>

            <!-- Password Option -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div class="flex items-center gap-3 mb-2">
                <label class="flex items-center gap-2">
                  <input
                    type="radio"
                    v-model="passwordOption"
                    value="auto"
                    class="w-4 h-4 text-brand-600 focus:ring-brand-500"
                  />
                  <span class="text-sm text-gray-700 dark:text-gray-300">Auto-generate</span>
                </label>
                <label class="flex items-center gap-2">
                  <input
                    type="radio"
                    v-model="passwordOption"
                    value="manual"
                    class="w-4 h-4 text-brand-600 focus:ring-brand-500"
                  />
                  <span class="text-sm text-gray-700 dark:text-gray-300">Set manually</span>
                </label>
              </div>

              <input
                v-if="passwordOption === 'manual'"
                v-model="form.password"
                type="password"
                required
                minlength="8"
                class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 focus:border-transparent transition-all"
                placeholder="Minimum 8 characters"
              />
              <p v-else class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                A secure password will be auto-generated. {{ form.sendEmail ? 'It will be sent via email.' : 'You will need to share it with the user manually.' }}
              </p>
            </div>

            <!-- Send Invite Email -->
            <div class="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <input
                type="checkbox"
                v-model="form.sendEmail"
                id="sendEmail"
                class="w-4 h-4 text-brand-600 focus:ring-brand-500 rounded"
              />
              <div class="flex-1">
                <label for="sendEmail" class="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Send invitation email with login credentials
                </label>
                <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {{ form.sendEmail ? 'Email will be sent with password' : 'User will be created without email notification' }}
                </p>
              </div>
            </div>

            <!-- Error Message -->
            <div v-if="error" class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p class="text-sm text-red-800 dark:text-red-300">{{ error }}</p>
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                @click="close"
                class="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="saving || !isFormValid"
                class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <svg v-if="saving" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{{ saving ? 'Inviting...' : 'Invite User' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import apiClient from '@/utils/apiClient';

const props = defineProps({
  isOpen: Boolean
});

const emit = defineEmits(['close', 'user-invited']);

const authStore = useAuthStore();

const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  userType: '',
  roleId: '', // Legacy support
  password: '',
  sendEmail: false
});

const passwordOption = ref('auto');
const saving = ref(false);
const error = ref('');
const availableRoles = ref([]);
const capabilities = ref([]);
const loadingCapabilities = ref(false);
const selectedAppRoles = ref({});
const validationErrors = ref({});

// App display names
const appDisplayNames = {
  CRM: 'CRM',
  AUDIT: 'Audit',
  PORTAL: 'Portal'
};

// Role display names
const roleDisplayNames = {
  CRM: {
    ADMIN: 'Admin',
    MANAGER: 'Manager',
    USER: 'User'
  },
  AUDIT: {
    AUDITOR: 'Auditor'
  },
  PORTAL: {
    CUSTOMER: 'Customer',
    VIEWER: 'Viewer'
  }
};

// Computed: Available apps filtered by userType
const availableApps = computed(() => {
  if (!form.value.userType) return [];
  return capabilities.value.filter(app => 
    app.userTypesAllowed.includes(form.value.userType)
  );
});

// Computed: Selected apps
const selectedApps = computed(() => {
  return Object.keys(selectedAppRoles.value);
});

// Computed: Form validation
const isFormValid = computed(() => {
  // Basic fields
  if (!form.value.firstName || !form.value.lastName || !form.value.email) {
    return false;
  }

  // If userType is selected, require appAccess
  if (form.value.userType) {
    if (selectedApps.value.length === 0) {
      return false;
    }
    // Check if any selected app has exhausted seats
    for (const appKey of selectedApps.value) {
      const app = availableApps.value.find(a => a.appKey === appKey);
      if (app && !isAppEnabled(app)) {
        return false;
      }
    }
  } else {
    // Legacy: require roleId
    if (!form.value.roleId) {
      return false;
    }
  }

  return true;
});

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    resetForm();
    fetchRoles();
    fetchCapabilities();
  }
});

const fetchRoles = async () => {
  try {
    const response = await apiClient.get('/roles');
    if (response.success) {
      availableRoles.value = response.data;
    }
  } catch (err) {
    console.error('Error fetching roles:', err);
  }
};

const fetchCapabilities = async () => {
  loadingCapabilities.value = true;
  try {
    const response = await apiClient.get('/users/add-capabilities');
    if (response.success) {
      capabilities.value = response.data.apps || [];
    }
  } catch (err) {
    console.error('Error fetching capabilities:', err);
    error.value = 'Failed to load available apps. Please try again.';
  } finally {
    loadingCapabilities.value = false;
  }
};

const resetForm = () => {
  form.value = {
    firstName: '',
    lastName: '',
    email: '',
    userType: '',
    roleId: '',
    password: '',
    sendEmail: false
  };
  passwordOption.value = 'auto';
  error.value = '';
  selectedAppRoles.value = {};
  validationErrors.value = {};
};

const close = () => {
  if (!saving.value) {
    emit('close');
  }
};

const onUserTypeChange = () => {
  // Clear app selections when userType changes
  selectedAppRoles.value = {};
  validationErrors.value = {};
};

const isAppSelected = (appKey) => {
  return appKey in selectedAppRoles.value;
};

const isAppEnabled = (app) => {
  if (!app.seatInfo) return true;
  return app.seatInfo.canAdd;
};

const toggleApp = (app) => {
  const appKey = app.appKey;
  
  if (isAppSelected(appKey)) {
    // Deselect app
    delete selectedAppRoles.value[appKey];
  } else {
    // Select app with default role (from API or first role as fallback)
    const defaultRole = app.defaultRole || app.roles[0];
    selectedAppRoles.value[appKey] = defaultRole;
  }
  
  validationErrors.value.appAccess = null;
};

const updateAppRole = (appKey, roleKey) => {
  selectedAppRoles.value[appKey] = roleKey;
};

const getAppDisplayName = (appKey) => {
  return appDisplayNames[appKey] || appKey;
};

const getRoleDisplayName = (appKey, roleKey) => {
  return roleDisplayNames[appKey]?.[roleKey] || roleKey;
};

const validateForm = () => {
  validationErrors.value = {};

  // If using new unified format (userType selected)
  if (form.value.userType) {
    // Validate at least one app is selected
    if (selectedApps.value.length === 0) {
      validationErrors.value.appAccess = 'At least one app must be selected';
      return false;
    }

    // Validate seat limits
    for (const appKey of selectedApps.value) {
      const app = availableApps.value.find(a => a.appKey === appKey);
      if (app && !isAppEnabled(app)) {
        validationErrors.value.appAccess = app.seatInfo?.reason || `Cannot add user to ${getAppDisplayName(appKey)}`;
        return false;
      }
    }

    // Validate userType compatibility with selected apps
    for (const appKey of selectedApps.value) {
      const app = availableApps.value.find(a => a.appKey === appKey);
      if (app && !app.userTypesAllowed.includes(form.value.userType)) {
        validationErrors.value.appAccess = `${getAppDisplayName(appKey)} does not support ${form.value.userType} users`;
        return false;
      }
    }
  } else {
    // Legacy mode: validate roleId is provided
    if (!form.value.roleId) {
      validationErrors.value.roleId = 'Role is required';
      return false;
    }
  }

  return true;
};

const handleSubmit = async () => {
  error.value = '';
  validationErrors.value = {};

  // Validate form
  if (!validateForm()) {
    return;
  }

  saving.value = true;

  try {
    let payload;

    // Use unified format if userType is selected
    if (form.value.userType && selectedApps.value.length > 0) {
      payload = {
        firstName: form.value.firstName,
        lastName: form.value.lastName,
        email: form.value.email,
        userType: form.value.userType,
        appAccess: selectedApps.value.map(appKey => ({
          appKey: appKey,
          roleKey: selectedAppRoles.value[appKey]
        })),
        sendEmail: form.value.sendEmail
      };

      // Add password if manual
      if (passwordOption.value === 'manual' && form.value.password) {
        payload.password = form.value.password;
      }
    } else {
      // Legacy format for backward compatibility
      payload = {
        ...form.value
      };

      // If auto-generate, remove password field
      if (passwordOption.value === 'auto') {
        delete payload.password;
      }
    }

    const response = await apiClient.post('/users', payload);

    if (response.success) {
      // If email not sent and password was auto-generated, show the password
      if (!form.value.sendEmail && response.data.tempPassword) {
        alert(`User created successfully!\n\nTemporary Password: ${response.data.tempPassword}\n\nPlease share this password with the user securely.`);
      }
      emit('user-invited');
      resetForm();
    } else {
      error.value = response.message || 'Failed to invite user';
      if (response.errors && Array.isArray(response.errors)) {
        error.value += ': ' + response.errors.join(', ');
      }
    }
  } catch (err) {
    console.error('Error inviting user:', err);
    error.value = err.message || 'Failed to invite user';
    if (err.response?.data?.errors) {
      error.value += ': ' + err.response.data.errors.join(', ');
    }
  } finally {
    saving.value = false;
  }
};
</script>
