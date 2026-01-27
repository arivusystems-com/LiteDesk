<template>
  <div class="mx-auto">
    <!-- Entity Description -->
    <div class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
      <p class="text-sm text-gray-700 dark:text-gray-300">
        <strong>People</strong> are shared across Sales, Helpdesk, and Automations. They represent contacts, leads, and customers that can be linked to deals, tickets, and other records throughout the platform.
      </p>
    </div>

    <!-- Registry-Driven ModuleList -->
    <ModuleList
      ref="moduleListRef"
      module-key="people"
      app-key="PLATFORM"
      @create="openCreateModal"
      @import="showImportModal = true"
      @export="exportContacts"
      @row-click="handleRowClick"
      @bulk-action="handleBulkAction"
    >
      <!-- Custom Name Cell -->
      <template #cell-name="{ row }">
        <div class="flex items-center gap-3">
          <Avatar
            :user="{
              firstName: row.first_name,
              lastName: row.last_name,
              avatar: row.avatar || row.image
            }"
            size="md"
          />
          <div class="min-w-0">
            <div class="font-semibold text-gray-900 dark:text-white truncate">
              {{ row.first_name }} {{ row.last_name }}
            </div>
            <div v-if="row.email" class="text-sm text-gray-500 dark:text-gray-400 truncate">
              {{ row.email }}
            </div>
          </div>
        </div>
      </template>

      <!-- Custom Organization Cell -->
      <template #cell-organization="{ row }">
        <span class="font-medium text-gray-900 dark:text-white">
          <template v-if="row.organization && typeof row.organization === 'object' && row.organization.name">
            {{ row.organization.name }}
          </template>
          <template v-else-if="row.organization && typeof row.organization === 'string'">
            {{ row.organization }}
          </template>
          <template v-else>
            <span class="text-gray-400 dark:text-gray-500">-</span>
          </template>
        </span>
      </template>

      <!-- Custom Email Cell -->
      <template #cell-email="{ value }">
        <a :href="`mailto:${value}`" class="text-brand-600 dark:text-brand-400 hover:underline" @click.stop>
          {{ value }}
        </a>
      </template>

      <!-- Custom Phone Cell -->
      <template #cell-phone="{ row }">
        <span class="text-gray-700 dark:text-gray-300">{{ row.phone || row.mobile || '-' }}</span>
      </template>

      <!-- Custom Owner Cell -->
      <template #cell-owner_id="{ row }">
        <div v-if="row.owner_id" class="flex items-center gap-2">
          <Avatar
            :user="{
              firstName: row.owner_id.firstName || row.owner_id.first_name,
              lastName: row.owner_id.lastName || row.owner_id.last_name,
              email: row.owner_id.email,
              avatar: row.owner_id.avatar
            }"
            size="sm"
          />
          <span class="text-sm text-gray-700 dark:text-gray-300">
            {{ getUserDisplayName(row.owner_id) }}
          </span>
        </div>
        <span v-else class="text-sm text-gray-500 dark:text-gray-400">Unassigned</span>
      </template>

      <!-- Custom Assigned To Cell -->
      <template #cell-assignedTo="{ row }">
        <div v-if="row.assignedTo" class="flex items-center gap-2">
          <Avatar
            :user="{
              firstName: row.assignedTo.firstName || row.assignedTo.first_name,
              lastName: row.assignedTo.lastName || row.assignedTo.last_name,
              email: row.assignedTo.email,
              avatar: row.assignedTo.avatar
            }"
            size="sm"
          />
          <span class="text-sm text-gray-700 dark:text-gray-300">{{ getUserDisplayName(row.assignedTo) }}</span>
        </div>
        <span v-else class="text-sm text-gray-500 dark:text-gray-400">Unassigned</span>
      </template>

      <!-- Custom Lifecycle Stage Cell with Badge -->
      <template #cell-lifecycle_stage="{ value }">
        <BadgeCell 
          :value="value || 'Lead'" 
          :variant-map="{
            'Lead': 'warning',
            'Qualified': 'info',
            'Opportunity': 'primary',
            'Customer': 'success',
            'Lost': 'danger'
          }"
        />
      </template>

      <!-- Custom Last Contact Cell -->
      <template #cell-last_contacted_at="{ value }">
        <DateCell :value="value" format="short" />
      </template>

      <!-- Participation Visibility Column (Read-Only) - Uses type column slot if available -->
      <template #cell-type="{ row }">
        <div class="flex flex-wrap gap-1.5">
          <template v-if="getParticipatingApps(row).length > 0">
            <span
              v-for="app in getParticipatingApps(row)"
              :key="app"
              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
              :class="getAppBadgeClass(app)"
            >
              {{ app }}{{ row.type && app === 'Sales' ? `: ${row.type}` : '' }}
            </span>
          </template>
          <span v-else class="text-xs text-gray-400 dark:text-gray-500">-</span>
        </div>
      </template>

      <!-- Participation-aware rendering for SALES participation fields -->
      <!-- Lead Status (SALES participation field) -->
      <template #cell-lead_status="{ row, value }">
        <span v-if="getParticipationAwareCellValue('lead_status', row, value) === '-'" class="text-gray-400 dark:text-gray-500">-</span>
        <span v-else class="text-gray-900 dark:text-white">{{ value || '-' }}</span>
      </template>

      <!-- Contact Status (SALES participation field) -->
      <template #cell-contact_status="{ row, value }">
        <span v-if="getParticipationAwareCellValue('contact_status', row, value) === '-'" class="text-gray-400 dark:text-gray-500">-</span>
        <span v-else class="text-gray-900 dark:text-white">{{ value || '-' }}</span>
      </template>

      <!-- Lead Owner (SALES participation field) -->
      <template #cell-lead_owner="{ row, value }">
        <span v-if="getParticipationAwareCellValue('lead_owner', row, value) === '-'" class="text-gray-400 dark:text-gray-500">-</span>
        <span v-else class="text-gray-900 dark:text-white">{{ value || '-' }}</span>
      </template>

      <!-- Lead Score (SALES participation field) -->
      <template #cell-lead_score="{ row, value }">
        <span v-if="getParticipationAwareCellValue('lead_score', row, value) === '-'" class="text-gray-400 dark:text-gray-500">-</span>
        <span v-else class="text-gray-900 dark:text-white">{{ value || '-' }}</span>
      </template>

      <!-- Interest Products (SALES participation field) -->
      <template #cell-interest_products="{ row, value }">
        <span v-if="getParticipationAwareCellValue('interest_products', row, value) === '-'" class="text-gray-400 dark:text-gray-500">-</span>
        <span v-else class="text-gray-900 dark:text-white">{{ value || '-' }}</span>
      </template>

      <!-- Qualification Date (SALES participation field) -->
      <template #cell-qualification_date="{ row, value }">
        <template v-if="getParticipationAwareCellValue('qualification_date', row, value) === '-'">
          <span class="text-gray-400 dark:text-gray-500">-</span>
        </template>
        <DateCell v-else :value="value" format="short" />
      </template>

      <!-- Qualification Notes (SALES participation field) -->
      <template #cell-qualification_notes="{ row, value }">
        <span v-if="getParticipationAwareCellValue('qualification_notes', row, value) === '-'" class="text-gray-400 dark:text-gray-500">-</span>
        <span v-else class="text-gray-900 dark:text-white">{{ value || '-' }}</span>
      </template>

      <!-- Estimated Value (SALES participation field) -->
      <template #cell-estimated_value="{ row, value }">
        <span v-if="getParticipationAwareCellValue('estimated_value', row, value) === '-'" class="text-gray-400 dark:text-gray-500">-</span>
        <span v-else class="text-gray-900 dark:text-white">{{ value ? `$${value}` : '-' }}</span>
      </template>

      <!-- Role (SALES participation field) -->
      <template #cell-role="{ row, value }">
        <span v-if="getParticipationAwareCellValue('role', row, value) === '-'" class="text-gray-400 dark:text-gray-500">-</span>
        <span v-else class="text-gray-900 dark:text-white">{{ value || '-' }}</span>
      </template>

      <!-- Birthday (SALES participation field) -->
      <template #cell-birthday="{ row, value }">
        <template v-if="getParticipationAwareCellValue('birthday', row, value) === '-'">
          <span class="text-gray-400 dark:text-gray-500">-</span>
        </template>
        <DateCell v-else :value="value" format="short" />
      </template>

      <!-- Preferred Contact Method (SALES participation field) -->
      <template #cell-preferred_contact_method="{ row, value }">
        <span v-if="getParticipationAwareCellValue('preferred_contact_method', row, value) === '-'" class="text-gray-400 dark:text-gray-500">-</span>
        <span v-else class="text-gray-900 dark:text-white">{{ value || '-' }}</span>
      </template>
    </ModuleList>

    <!-- Quick Create Drawer -->
    <!-- ARCHITECTURAL INTENT: Drawer requires intent context -->
    <!-- People.vue redirects to /people/create for intent selection -->
    <!-- Intent must be selected before drawer can open -->

    <!-- CSV Import Modal -->
    <CSVImportModal 
      v-if="showImportModal"
      entity-type="Contacts"
      @close="showImportModal = false"
      @import-complete="handleImportComplete"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useTabs } from '@/composables/useTabs';
import apiClient from '@/utils/apiClient';
import ModuleList from '@/components/module-list/ModuleList.vue';
import BadgeCell from '@/components/common/table/BadgeCell.vue';
import DateCell from '@/components/common/table/DateCell.vue';
import CSVImportModal from '@/components/import/CSVImportModal.vue';
import PeopleQuickCreateDrawer from '@/components/people/PeopleQuickCreateDrawer.vue';
import Avatar from '@/components/common/Avatar.vue';
import { getFieldMetadata } from '@/platform/fields/peopleFieldModel';

const router = useRouter();
const authStore = useAuthStore();
const { openTab } = useTabs();

// State
const moduleListRef = ref(null);
const showQuickCreate = ref(false);
const showImportModal = ref(false);
const editingContact = ref(null);
const deleting = ref(false);

// User management (for display names)
const usersById = ref({});
const usersLoaded = ref(false);

const upsertUsers = (users) => {
  if (!Array.isArray(users)) return;
  const map = { ...usersById.value };
  for (const user of users) {
    if (!user || typeof user !== 'object') continue;
    const id = user._id || user.id;
    if (!id) continue;
    map[id] = { ...user, _id: id };
  }
  usersById.value = map;
};

const loadUsers = async () => {
  if (usersLoaded.value && Object.keys(usersById.value).length > 0) {
    return;
  }

  try {
    const response = await apiClient.get('/users/list');
    let users = [];
    if (Array.isArray(response)) {
      users = response;
    } else if (Array.isArray(response?.data)) {
      users = response.data;
    } else if (response?.success && Array.isArray(response?.data)) {
      users = response.data;
    } else if (response?.data && Array.isArray(response.data.users)) {
      users = response.data.users;
    } else if (response?.data && Array.isArray(response.data.data)) {
      users = response.data.data;
    }

    if (users.length > 0) {
      upsertUsers(users);
    }
  } catch (error) {
    console.error('Error loading users for People list:', error);
  } finally {
    usersLoaded.value = true;
  }
};

const getUserDisplayName = (user) => {
  if (!user) return 'Unassigned';
  if (typeof user === 'string') {
    const cached = usersById.value[user];
    if (cached) {
      return getUserDisplayName(cached);
    }
    return user;
  }
  const firstName = user.firstName || user.first_name || user.name || '';
  const lastName = user.lastName || user.last_name || '';
  const combined = `${firstName} ${lastName}`.trim();
  if (combined) return combined;
  if (user.email) return user.email;
  if (user.username) return user.username;
  if (user._id && usersById.value[user._id]) {
    return getUserDisplayName(usersById.value[user._id]);
  }
  return 'Unassigned';
};

// Event handlers
const handleRowClick = (row, event = null) => {
  // Navigate to PeopleSurface only (no edit/delete from list)
  viewContact(row._id, event);
};

// Participation visibility helpers
const getParticipatingApps = (row) => {
  const apps = [];
  
  // Check for SALES participation (type field indicates SALES participation)
  if (row.type) {
    apps.push('Sales');
  }
  
  // Check for HELPDESK participation (presence of helpdesk-specific fields)
  // Note: Add more checks as other apps are integrated
  if (row.helpdesk_ticket_count || row.helpdesk_status) {
    apps.push('Helpdesk');
  }
  
  // Check for AUDIT participation
  if (row.audit_member_id || row.audit_role) {
    apps.push('Audit');
  }
  
  // Check for PORTAL participation
  if (row.portal_user_id || row.portal_access) {
    apps.push('Portal');
  }
  
  // Check for PROJECTS participation
  if (row.project_member_id || row.project_role) {
    apps.push('Projects');
  }
  
  return apps;
};

/**
 * Check if a person participates in a specific app
 * @param {Object} row - Person record
 * @param {String} appKey - App key (e.g., 'SALES', 'HELPDESK')
 * @returns {Boolean} - True if person participates in the app
 */
const participatesInApp = (row, appKey) => {
  const appKeyUpper = appKey?.toUpperCase();
  
  switch (appKeyUpper) {
    case 'SALES':
      // SALES participation is indicated by presence of 'type' field
      return !!row.type;
    case 'HELPDESK':
      return !!(row.helpdesk_ticket_count || row.helpdesk_status);
    case 'AUDIT':
      return !!(row.audit_member_id || row.audit_role);
    case 'PORTAL':
      return !!(row.portal_user_id || row.portal_access);
    case 'PROJECTS':
      return !!(row.project_member_id || row.project_role);
    default:
      return false;
  }
};

/**
 * Get participation-aware cell value for a field
 * For participation fields, returns "-" if person doesn't participate in that app
 * Otherwise returns the actual value
 * @param {String} fieldKey - Field key (e.g., 'type', 'lead_status')
 * @param {Object} row - Person record
 * @param {*} rawValue - Raw field value from row
 * @returns {*} - Value to display ("-" if not participating, otherwise rawValue)
 */
const getParticipationAwareCellValue = (fieldKey, row, rawValue) => {
  // Get field metadata to check if it's a participation field
  try {
    const metadata = getFieldMetadata(fieldKey);
    
    // Only apply participation check for participation fields
    if (metadata.owner === 'participation') {
      const fieldScope = metadata.fieldScope; // e.g., 'SALES', 'HELPDESK'
      
      // Check if person participates in the app that owns this field
      if (!participatesInApp(row, fieldScope)) {
        // Person doesn't participate - return "-" (don't show value)
        return '-';
      }
    }
    
    // For core/system fields, or if person participates, return raw value
    return rawValue;
  } catch (error) {
    // Field not in metadata - treat as non-participation field, return raw value
    return rawValue;
  }
};

const getAppBadgeClass = (app) => {
  const classMap = {
    'Sales': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    'Helpdesk': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    'Audit': 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
    'Portal': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
    'Projects': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200'
  };
  return classMap[app] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-200';
};

const viewContact = (contactId, event = null) => {
  const title = 'Person Detail';
  
  const openInBackground = event && (
    event.button === 1 ||
    event.metaKey ||
    event.ctrlKey
  );
  
  openTab(`/people/${contactId}`, {
    title,
    icon: 'users',
    params: { name: title },
    background: openInBackground
  });
};

const openCreateModal = () => {
  // ARCHITECTURAL INTENT: All entry points open drawer in Quick Create mode
  // Open drawer in same tab, not navigating to new route
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('litedesk:open-people-quick-create'));
  }
};

const handlePersonCreated = () => {
  showQuickCreate.value = false;
  // Refresh ModuleList
  if (moduleListRef.value && moduleListRef.value.refresh) {
    moduleListRef.value.refresh();
  }
};

const handleImportComplete = () => {
  showImportModal.value = false;
  // Refresh ModuleList
  if (moduleListRef.value && moduleListRef.value.refresh) {
    moduleListRef.value.refresh();
  }
};

// Handle record creation events to refresh list view
const handleRecordCreated = (event) => {
  const { moduleKey, record } = event.detail || {};
  
  // Only refresh if it's a people record
  if (moduleKey === 'people') {
    if (moduleListRef.value && moduleListRef.value.refresh) {
      moduleListRef.value.refresh();
    }
  }
};

// Bulk action handler
const handleBulkAction = async (actionId, selectedRows) => {
  if (actionId === 'delete' || actionId === 'bulk-delete') {
    await bulkDeletePeople(selectedRows);
  } else if (actionId === 'export' || actionId === 'bulk-export') {
    await bulkExportPeople(selectedRows);
  }
};

// Bulk delete - identity-level only
const bulkDeletePeople = async (selectedRows) => {
  if (!selectedRows || selectedRows.length === 0) return;
  
  const idsToDelete = selectedRows.map(row => row._id || row).filter(Boolean);
  if (idsToDelete.length === 0) return;
  
  try {
    deleting.value = true;
    
    // Delete all in parallel, fail fast on permission errors
    const deletePromises = idsToDelete.map(id => 
      apiClient.delete(`/people/${id}`)
    );
    
    const results = await Promise.allSettled(deletePromises);
    
    // Check for failures
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      const firstFailure = failures[0].reason;
      const errorMessage = firstFailure?.response?.data?.message || 
                          firstFailure?.message || 
                          'Failed to delete some people';
      
      // If permission error, show specific message
      if (firstFailure?.response?.status === 403) {
        alert(`Permission denied: ${errorMessage}`);
      } else {
        alert(`Failed to delete ${failures.length} of ${idsToDelete.length} people. ${errorMessage}`);
      }
      
      // Don't reload if some failed - let user see what succeeded
      return;
    }
    
    // All succeeded - reload list
    window.location.reload(); // Temporary - ModuleList should emit refresh event
  } catch (error) {
    console.error('Error bulk deleting people:', error);
    alert(`Error deleting people: ${error.message || 'Unknown error'}`);
  } finally {
    deleting.value = false;
  }
};

// Bulk export - identity fields only
const bulkExportPeople = async (selectedRows) => {
  if (!selectedRows || selectedRows.length === 0) return;
  
  try {
    // Extract identity fields only (core + system fields, no participation)
    const identityFields = [
      'first_name', 'last_name', 'email', 'phone', 'mobile',
      'organization', 'assignedTo', 'tags', 'createdAt', 'updatedAt'
    ];
    
    const csvRows = [];
    
    // Header row
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Mobile', 'Organization', 'Tags', 'Created At', 'Updated At'];
    csvRows.push(headers.join(','));
    
    // Data rows
    selectedRows.forEach(row => {
      const orgName = row.organization && typeof row.organization === 'object' 
        ? row.organization.name || ''
        : row.organization || '';
      
      const tags = Array.isArray(row.tags) ? row.tags.join('; ') : '';
      const createdAt = row.createdAt ? new Date(row.createdAt).toISOString() : '';
      const updatedAt = row.updatedAt ? new Date(row.updatedAt).toISOString() : '';
      
      const rowData = [
        escapeCsv(row.first_name || ''),
        escapeCsv(row.last_name || ''),
        escapeCsv(row.email || ''),
        escapeCsv(row.phone || ''),
        escapeCsv(row.mobile || ''),
        escapeCsv(orgName),
        escapeCsv(tags),
        createdAt,
        updatedAt
      ];
      
      csvRows.push(rowData.join(','));
    });
    
    // Create and download CSV
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `people_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error bulk exporting people:', error);
    alert('Error exporting people. Please try again.');
  }
};

// Helper to escape CSV values
const escapeCsv = (value) => {
  if (value == null || value === '') return '';
  const stringValue = String(value);
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const exportContacts = async () => {
  try {
    const response = await fetch('/api/csv/export/contacts', {
      headers: {
        'Authorization': `Bearer ${authStore.user?.token}`
      }
    });
    
    if (!response.ok) throw new Error('Export failed');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contacts_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting contacts:', error);
    alert('Error exporting contacts. Please try again.');
  }
};

// Lifecycle
onMounted(async () => {
  await loadUsers();
  
  // Listen for record creation events
  if (typeof window !== 'undefined') {
    window.addEventListener('litedesk:record-created', handleRecordCreated);
  }
});

onUnmounted(() => {
  // Clean up event listeners
  if (typeof window !== 'undefined') {
    window.removeEventListener('litedesk:record-created', handleRecordCreated);
  }
});
</script>
