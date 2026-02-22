<template>
  <div class="p-6">
    <!-- Header with Tabs -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Roles & Permissions</h2>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Manage custom roles, permissions, and organizational hierarchy
      </p>
      
      <!-- Sub-tabs -->
      <div class="mt-4 border-b border-gray-200 dark:border-gray-700">
        <nav class="-mb-px flex space-x-8">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors'
            ]"
          >
            {{ tab.name }}
          </button>
        </nav>
      </div>
    </div>

    <!-- Tab Content -->
    <div>
      <!-- Roles List Tab -->
      <div v-if="activeTab === 'roles'">
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm text-gray-600 dark:text-gray-400">{{ roles.length }} custom roles</p>
          <div class="flex gap-2">
            <button
              @click="initializeDefaultRoles"
              v-if="roles.length === 0"
              class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-all"
            >
              Initialize Default Roles
            </button>
            <button
              @click="openCreateRoleModal"
              class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-all"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Role</span>
            </button>
          </div>
        </div>

        <!-- Roles Grid -->
        <div v-if="loading" class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>

        <div v-else-if="roles.length === 0" class="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
          <svg class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">No roles yet</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Get started by initializing default roles or creating a custom role</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="role in roles"
            :key="role._id"
            class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow cursor-pointer"
            @click="openEditRoleModal(role)"
          >
            <!-- Header -->
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-3">
                <div
                  :style="{ backgroundColor: role.color || '#6366f1' }"
                  class="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                >
                  <svg v-if="role.icon === 'crown'" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <svg v-else-if="role.icon === 'shield'" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  <svg v-else-if="role.icon === 'users'" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  <svg v-else-if="role.icon === 'eye'" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                  </svg>
                  <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    {{ role.name }}
                    <span v-if="role.isSystemRole" class="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-xs font-medium">
                      System
                    </span>
                  </h3>
                  <p class="text-xs text-gray-600 dark:text-gray-400">Level {{ role.level }}</p>
                </div>
              </div>
            </div>

            <!-- Description -->
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{{ role.description || 'No description' }}</p>

            <!-- Actions -->
            <div class="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                @click.stop="viewRoleUsers(role)"
                class="flex-1 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg font-medium text-xs transition-colors inline-flex items-center justify-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>{{ role.userCount || 0 }} Users</span>
              </button>
              <button
                @click.stop="viewRolePermissions(role)"
                class="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-xs transition-colors inline-flex items-center justify-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Permissions</span>
              </button>
              <button
                v-if="!role.isSystemRole"
                @click.stop="deleteRole(role)"
                class="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg font-medium text-xs transition-colors"
                title="Delete Role"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Permission breakdown -->
        <div v-if="selectedRoleForView" class="mt-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <div class="flex items-center justify-between mb-4">
            <div>
              <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Permissions for</p>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                {{ selectedRoleForView.name }}
                <span v-if="selectedRoleForView.isSystemRole" class="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-xs font-medium">
                  System
                </span>
              </h3>
            </div>
            <button
              class="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              @click="selectedRoleForView = null"
            >
              Clear
            </button>
          </div>

          <!-- Platform permissions -->
          <div class="mb-6">
            <div class="flex items-center gap-2 mb-2">
              <h4 class="text-sm font-semibold text-gray-900 dark:text-white">Platform Permissions</h4>
              <span class="text-xs text-gray-500">Organization-wide controls</span>
            </div>
            <div v-if="selectedRolePermissions.platform.length" class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                v-for="perm in selectedRolePermissions.platform"
                :key="`platform-${perm.name}`"
                class="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60"
              >
                <p class="font-medium text-gray-900 dark:text-white">{{ perm.name }}</p>
                <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">{{ perm.actions.join(', ') || 'Read-only' }}</p>
              </div>
            </div>
            <p v-else class="text-sm text-gray-500 dark:text-gray-400">No platform permissions assigned.</p>
          </div>

          <!-- Application permissions -->
          <div class="mb-6">
            <div class="flex items-center gap-2 mb-2">
              <h4 class="text-sm font-semibold text-gray-900 dark:text-white">Application Permissions</h4>
              <span class="text-xs text-gray-500">Scoped per application</span>
            </div>
            <div v-if="Object.keys(selectedRolePermissions.apps).length" class="space-y-3">
              <div
                v-for="(perms, appKey) in selectedRolePermissions.apps"
                :key="`app-${appKey}`"
                class="border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div class="px-4 py-2 bg-gray-50 dark:bg-gray-800/60 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-gray-900 dark:text-white">{{ appKey }}</span>
                    <span class="text-xs text-gray-500">App-scoped</span>
                  </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
                  <div
                    v-for="perm in perms"
                    :key="`perm-${appKey}-${perm.name}`"
                    class="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40"
                  >
                    <p class="font-medium text-gray-900 dark:text-white">{{ perm.name }}</p>
                    <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">{{ perm.actions.join(', ') || 'Read-only' }}</p>
                  </div>
                </div>
              </div>
            </div>
            <p v-else class="text-sm text-gray-500 dark:text-gray-400">No application permissions assigned.</p>
          </div>

          <!-- Legacy / deprecated -->
          <div>
            <div class="flex items-center gap-2 mb-2">
              <h4 class="text-sm font-semibold text-gray-900 dark:text-white">Legacy Permissions</h4>
              <span class="text-xs text-amber-600 dark:text-amber-400">Deprecated - avoid using</span>
            </div>
            <div v-if="selectedRolePermissions.legacy.length" class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                v-for="perm in selectedRolePermissions.legacy"
                :key="`legacy-${perm.name}`"
                class="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20"
              >
                <p class="font-medium text-amber-800 dark:text-amber-200">{{ perm.name }}</p>
                <p class="text-xs text-amber-700 dark:text-amber-300 mt-1">{{ perm.actions.join(', ') || 'Legacy scope' }}</p>
                <p class="text-xs text-amber-600 dark:text-amber-400 mt-2">Deprecated: migrate to app-scoped permissions.</p>
              </div>
            </div>
            <p v-else class="text-sm text-gray-500 dark:text-gray-400">No legacy permissions present.</p>
          </div>
        </div>
      </div>

      <!-- Organization Hierarchy Tab -->
      <div v-if="activeTab === 'hierarchy'">
        <OrganizationHierarchy :roles="roles" @refresh="fetchRoles" />
      </div>
    </div>

    <!-- Create/Edit Role Modal -->
    <RoleFormModal
      :is-open="showRoleModal"
      :role="selectedRole"
      @close="showRoleModal = false"
      @saved="handleRoleSaved"
    />

    <!-- Role Users Modal -->
    <RoleUsersModal
      :is-open="showUsersModal"
      :role="selectedRoleForUsers"
      @close="showUsersModal = false"
      @edit-user="handleEditUser"
      @change-role="handleChangeRole"
      @refresh="fetchRoles"
    />

    <!-- Edit User Modal -->
    <EditUserModal
      v-if="showEditUserModal"
      :is-open="showEditUserModal"
      :user="selectedUserToEdit"
      @close="showEditUserModal = false"
      @user-updated="handleUserUpdated"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import apiClient from '@/utils/apiClient';
import RoleFormModal from './RoleFormModal.vue';
import OrganizationHierarchy from './OrganizationHierarchy.vue';
import RoleUsersModal from './RoleUsersModal.vue';
import EditUserModal from './EditUserModal.vue';

const ROLES_PERMS_TAB_KEY = 'litedesk-settings-rolesperms-tab';
const activeTab = ref(localStorage.getItem(ROLES_PERMS_TAB_KEY) || 'roles');
const roles = ref([]);
const loading = ref(false);
const showRoleModal = ref(false);
const selectedRole = ref(null);
const showUsersModal = ref(false);
const selectedRoleForUsers = ref(null);
const showEditUserModal = ref(false);
const selectedUserToEdit = ref(null);
const selectedRoleForView = ref(null); // role currently being inspected for permissions

const tabs = [
  { id: 'roles', name: 'Roles Management' },
  { id: 'hierarchy', name: 'Organization Hierarchy' }
];

// Helpers
const toTitleCase = (str = '') => {
  return str
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const normalizeActions = (actionsObj = {}) => {
  return Object.entries(actionsObj)
    .filter(([, allowed]) => allowed === true)
    .map(([action]) => action);
};

const groupPermissions = (role) => {
  const result = {
    platform: [],
    apps: {},
    legacy: []
  };

  if (!role?.permissions || typeof role.permissions !== 'object') return result;

  for (const [key, value] of Object.entries(role.permissions)) {
    const actions = Array.isArray(value) ? value : normalizeActions(value || {});
    const lowerKey = key.toLowerCase();
    const isLegacy = lowerKey.includes('legacy') || lowerKey.startsWith('crm');

    if (isLegacy) {
      result.legacy.push({
        name: toTitleCase(key.replace(/legacy[:.]?/i, '').replace(/^crm[:.]?/i, '')),
        actions
      });
      continue;
    }

    if (key.startsWith('platform:') || key.startsWith('platform.')) {
      result.platform.push({
        name: toTitleCase(key.replace(/^platform[:.]?/, '')),
        actions
      });
      continue;
    }

    // Expect app-scoped keys like "SALES:people" or "HELPDESK.tickets"
    const separator = key.includes(':') ? ':' : key.includes('.') ? '.' : null;
    const [appKeyRaw, moduleRaw] = separator ? key.split(separator) : [null, key];
    const appKey = appKeyRaw ? appKeyRaw.toUpperCase() : 'APP';
    const moduleName = toTitleCase(moduleRaw || key);

    if (!result.apps[appKey]) result.apps[appKey] = [];
    result.apps[appKey].push({
      name: moduleName,
      actions
    });
  }

  // Sort for stable display
  result.platform.sort((a, b) => a.name.localeCompare(b.name));
  Object.keys(result.apps).forEach((app) => {
    result.apps[app].sort((a, b) => a.name.localeCompare(b.name));
  });
  result.legacy.sort((a, b) => a.name.localeCompare(b.name));

  return result;
};

const selectedRolePermissions = computed(() => groupPermissions(selectedRoleForView.value));

// Fetch roles
const fetchRoles = async () => {
  loading.value = true;
  try {
    const response = await apiClient.get('/roles');
    
    if (response.success) {
      roles.value = response.data;
    }
  } catch (error) {
    console.error('Error fetching roles:', error);
  } finally {
    loading.value = false;
  }
};

// Initialize default roles
const initializeDefaultRoles = async () => {
  if (!confirm('This will create 5 default roles (Owner, Admin, Manager, User, Viewer). Continue?')) return;
  
  try {
    const response = await apiClient.post('/roles/initialize');
    
    if (response.success) {
      alert('Default roles created successfully!');
      fetchRoles();
    }
  } catch (error) {
    console.error('Error initializing roles:', error);
    alert('Failed to initialize roles');
  }
};

// Open create role modal
const openCreateRoleModal = () => {
  selectedRole.value = null;
  showRoleModal.value = true;
};

// Open edit role modal
const openEditRoleModal = (role) => {
  selectedRole.value = role;
  showRoleModal.value = true;
};

// Handle role saved
const handleRoleSaved = () => {
  showRoleModal.value = false;
  selectedRole.value = null;
  fetchRoles();
  
  // Notify admin that changes will be reflected automatically
  console.log('Role updated successfully. Users will see changes on their next page refresh or within 2 minutes.');
};

// Delete role
const deleteRole = async (role) => {
  if (!confirm(`Delete role "${role.name}"? This action cannot be undone.`)) return;
  
  try {
    const response = await apiClient.delete(`/roles/${role._id}`);
    
    if (response.success) {
      fetchRoles();
    } else {
      alert(response.message || 'Failed to delete role');
    }
  } catch (error) {
    console.error('Error deleting role:', error);
    const errorMessage = error.response?.message || 'Failed to delete role';
    alert(errorMessage);
  }
};

// View users for a role
const viewRoleUsers = (role) => {
  console.log('Opening users modal for role:', role.name);
  selectedRoleForUsers.value = role;
  showUsersModal.value = true;
};

const viewRolePermissions = (role) => {
  selectedRoleForView.value = role;
};

// Handle edit user from role users modal
const handleEditUser = (user) => {
  console.log('Opening edit modal for user:', user);
  selectedUserToEdit.value = user;
  showEditUserModal.value = true;
};

// Handle change role from role users modal
const handleChangeRole = (user) => {
  console.log('Opening edit modal to change role for user:', user);
  selectedUserToEdit.value = user;
  showEditUserModal.value = true;
};

// Handle user updated
const handleUserUpdated = () => {
  showEditUserModal.value = false;
  selectedUserToEdit.value = null;
  fetchRoles(); // Refresh to update user counts
};

onMounted(() => {
  fetchRoles();
});

// Persist sub-tab selection and validate against available tabs
watch(activeTab, (v) => {
  localStorage.setItem(ROLES_PERMS_TAB_KEY, v);
});
</script>

