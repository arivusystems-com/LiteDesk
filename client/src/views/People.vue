<template>
  <div class="mx-auto">
    <!-- Loading State (only for initial load) -->
    <div v-if="initialLoading" class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 dark:border-brand-400"></div>
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading people...</p>
      </div>
    </div>

    <!-- People List (Always visible - non-blocking) -->
    <div v-else>
      <!-- Header -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">People</h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            All people in your organization
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="handleQuickCreate"
            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Quick Create
          </button>
        </div>
      </div>


      <!-- Data Table -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div v-if="people.length === 0" class="p-12 text-center">
          <p class="text-gray-500 dark:text-gray-400">No people found.</p>
        </div>

        <table v-else class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Name
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                App Participation
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Email
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Phone
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Organization
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr
              v-for="person in filteredPeople"
              :key="person._id"
              @click="viewPerson(person._id)"
              class="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {{ (person.first_name?.[0] || '') + (person.last_name?.[0] || '') || 'P' }}
                  </div>
                  <div class="min-w-0">
                    <div class="font-semibold text-gray-900 dark:text-white truncate">
                      {{ person.first_name }} {{ person.last_name }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-wrap gap-1.5">
                  <template v-if="person.type">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                      :class="getAppParticipationBadgeClass('SALES', person.type)"
                    >
                      Sales: {{ person.type }}
                    </span>
                  </template>
                  <span v-if="!person.type" class="text-gray-400 dark:text-gray-500 text-xs">-</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <a
                  v-if="person.email"
                  :href="`mailto:${person.email}`"
                  @click.stop
                  class="text-brand-600 dark:text-brand-400 hover:underline text-sm"
                >
                  {{ person.email }}
                </a>
                <span v-else class="text-gray-400 dark:text-gray-500 text-sm">-</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                {{ person.phone || person.mobile || '-' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                <template v-if="person.organization && typeof person.organization === 'object'">
                  {{ person.organization.name || '-' }}
      </template>
                <template v-else>
                  {{ person.organization || '-' }}
      </template>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div class="text-sm text-gray-700 dark:text-gray-300">
            Showing {{ (currentPage - 1) * pageSize + 1 }} to {{ Math.min(currentPage * pageSize, total) }} of {{ total }} results
          </div>
          <div class="flex gap-2">
            <button
              @click="currentPage = Math.max(1, currentPage - 1)"
              :disabled="currentPage === 1"
              class="px-3 py-1.5 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              @click="currentPage = Math.min(totalPages, currentPage + 1)"
              :disabled="currentPage === totalPages"
              class="px-3 py-1.5 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Create Drawer -->
    <PeopleQuickCreateDrawer
      :isOpen="showQuickCreate"
      @close="showQuickCreate = false"
      @saved="handlePersonCreated"
    />

    <!-- Error Display -->
    <div v-if="error && !initialLoading" class="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
        <div class="flex-1">
          <h3 class="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
            Error
          </h3>
          <p class="text-sm text-red-700 dark:text-red-300">{{ error }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useTabs } from '@/composables/useTabs';
import apiClient from '@/utils/apiClient';
import PeopleQuickCreateDrawer from '@/components/people/PeopleQuickCreateDrawer.vue';

const router = useRouter();
const authStore = useAuthStore();
const { openTab } = useTabs();

// State
const initialLoading = ref(true);
const loading = ref(false);
const error = ref(null);
const people = ref([]);
const currentPage = ref(1);
const pageSize = ref(20);
const total = ref(0);
const showQuickCreate = ref(false);

// Computed


const filteredPeople = computed(() => {
  // Apply pagination only (no type filtering in list view)
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return people.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.ceil(people.value.length / pageSize.value);
});

// Methods
// Load people without requiring app context (non-blocking list view)
const loadPeople = async () => {
  try {
    loading.value = true;
    
    const response = await apiClient.get('/people', {
      params: {
        page: currentPage.value,
        limit: pageSize.value
      }
    });
    
    if (response.success && response.data) {
      people.value = Array.isArray(response.data) ? response.data : (response.data.data || []);
      total.value = response.meta?.total || people.value.length;
    } else {
      people.value = [];
      total.value = 0;
    }
  } catch (err) {
    console.error('Error loading people:', err);
    error.value = err.message || 'Failed to load people';
    people.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
    initialLoading.value = false;
  }
};

const viewPerson = (personId) => {
  const person = people.value.find(p => p._id === personId);
  const title = person 
    ? `${person.first_name} ${person.last_name}` 
    : 'Person Detail';
  
  // Navigate to person detail (detail view will handle app context resolution)
  openTab(`/people/${personId}`, {
    title,
    icon: 'users',
    params: { name: title }
  });
};

const getAppParticipationBadgeClass = (appKey, type) => {
  const typeUpper = type?.toUpperCase() || '';
  
  // Map app participation to badge variants
  if (appKey === 'SALES') {
    if (typeUpper === 'LEAD') {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200';
    } else if (typeUpper === 'CONTACT') {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
    }
  }
  
  return 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-200';
};

const handlePersonCreated = () => {
  // Reload people list after creation
  loadPeople();
  showQuickCreate.value = false;
};

const handleQuickCreate = () => {
  // Open quick create modal directly - intent selection happens in the modal
  showQuickCreate.value = true;
};

// Lifecycle
onMounted(async () => {
  await loadPeople();
});
</script>
