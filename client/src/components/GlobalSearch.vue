<template>
  <Transition
    enter-active-class="transition ease-out duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition ease-in duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 overflow-y-auto"
      @click.self="close"
    >
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/50" @click="close"></div>

      <!-- Search Modal -->
      <div class="flex min-h-full items-center justify-center p-4">
        <div
          class="relative w-full max-w-2xl transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-2xl transition-all"
          @click.stop
        >
          <!-- Search Input -->
          <div class="relative border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center px-4 py-3">
              <MagnifyingGlassIcon class="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3 flex-shrink-0" />
              <input
                ref="searchInputRef"
                v-model="searchQuery"
                type="text"
                placeholder="Search people, deals, tasks, events..."
                class="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none text-lg"
                @keydown.esc="close"
                @keydown.down.prevent="navigateResults(1)"
                @keydown.up.prevent="navigateResults(-1)"
                @keydown.enter.prevent="selectResult"
              />
              <kbd
                v-if="!searchQuery"
                class="hidden sm:inline-flex items-center px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded"
              >
                ESC
              </kbd>
            </div>
          </div>

          <!-- Results -->
          <div class="max-h-96 overflow-y-auto">
            <!-- Loading -->
            <div v-if="loading" class="px-4 py-8 text-center">
              <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Searching...</p>
            </div>

            <!-- No Results -->
            <div
              v-else-if="!loading && searchQuery && searchQuery.length >= 2 && totalResults === 0"
              class="px-4 py-8 text-center"
            >
              <p class="text-sm text-gray-500 dark:text-gray-400">No results found for "{{ searchQuery }}". Try different keywords or check your spelling.</p>
            </div>

            <!-- Results List -->
            <div v-else-if="!loading && totalResults > 0" class="py-2">
              <div
                v-for="(group, groupKey) in groupedResults"
                :key="groupKey"
                v-show="group.length > 0"
                class="mb-2"
              >
                <!-- Group Header -->
                <div class="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-900/50">
                  {{ getGroupLabel(groupKey) }}
                </div>

                <!-- Group Results -->
                <button
                  v-for="(result, index) in group"
                  :key="`${result.type}-${result.id}`"
                  :ref="el => setResultRef(el, groupKey, index)"
                  :class="[
                    'w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                    isSelected(groupKey, index) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  ]"
                  @click="navigateToResult(result)"
                >
                  <div class="flex items-center gap-3">
                    <span class="text-xl flex-shrink-0">{{ result.icon }}</span>
                    <div class="flex-1 min-w-0">
                      <div class="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {{ result.title }}
                      </div>
                      <div v-if="result.subtitle" class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {{ result.subtitle }}
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <!-- Empty State -->
            <div
              v-else-if="!loading && (!searchQuery || searchQuery.length < 2)"
              class="px-4 py-8 text-center"
            >
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Type at least 2 characters to search
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline';
import { useTabs } from '@/composables/useTabs';
import apiClient from '@/utils/apiClient';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);

const router = useRouter();
const { openTab } = useTabs();

const searchInputRef = ref(null);
const searchQuery = ref('');
const loading = ref(false);
const searchResults = ref(null);
const selectedGroup = ref(null);
const selectedIndex = ref(-1);
const resultRefs = ref({});

// Debounce search
let searchTimeout = null;

const totalResults = computed(() => {
  if (!searchResults.value) return 0;
  return searchResults.value.total || 0;
});

const groupedResults = computed(() => {
  if (!searchResults.value || !searchResults.value.results) {
    return {
      people: [],
      organizations: [],
      deals: [],
      tasks: [],
      events: [],
      forms: [],
      items: []
    };
  }

  return searchResults.value.results;
});

// Watch search query and perform search
watch(searchQuery, (newQuery) => {
  console.log('[GlobalSearch] Search query changed:', newQuery);
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  if (!newQuery || newQuery.trim().length < 2) {
    console.log('[GlobalSearch] Query too short, clearing results');
    searchResults.value = null;
    selectedGroup.value = null;
    selectedIndex.value = -1;
    return;
  }

  console.log('[GlobalSearch] Scheduling search in 300ms');
  searchTimeout = setTimeout(() => {
    performSearch(newQuery.trim());
  }, 300);
});

// Watch isOpen to focus input
watch(() => props.isOpen, (isOpen) => {
  console.log('[GlobalSearch] isOpen changed:', isOpen);
  if (isOpen) {
    nextTick(() => {
      console.log('[GlobalSearch] Modal opened, focusing input');
      searchInputRef.value?.focus();
      searchQuery.value = '';
      searchResults.value = null;
      selectedGroup.value = null;
      selectedIndex.value = -1;
    });
  } else {
    console.log('[GlobalSearch] Modal closed');
  }
});

// Perform search
const performSearch = async (query) => {
  if (!query || query.length < 2) {
    console.log('[GlobalSearch] Query too short:', query);
    return;
  }

  console.log('[GlobalSearch] Performing search for:', query);
  loading.value = true;
  try {
    const url = `/search?q=${encodeURIComponent(query)}`;
    console.log('[GlobalSearch] Calling API:', url);
    const response = await apiClient(url);
    console.log('[GlobalSearch] Search response:', response);
    
    if (response && response.success) {
      searchResults.value = response.data;
      selectedGroup.value = null;
      selectedIndex.value = -1;
      console.log('[GlobalSearch] Search results set:', {
        total: searchResults.value?.total,
        people: searchResults.value?.results?.people?.length || 0,
        organizations: searchResults.value?.results?.organizations?.length || 0,
        deals: searchResults.value?.results?.deals?.length || 0,
        tasks: searchResults.value?.results?.tasks?.length || 0,
        events: searchResults.value?.results?.events?.length || 0
      });
    } else {
      console.warn('[GlobalSearch] Search failed - response:', response);
      searchResults.value = null;
    }
  } catch (error) {
    console.error('[GlobalSearch] Error searching:', error);
    console.error('[GlobalSearch] Error details:', {
      message: error.message,
      status: error.status,
      stack: error.stack
    });
    searchResults.value = null;
  } finally {
    loading.value = false;
  }
};

// Get group label
const getGroupLabel = (groupKey) => {
  const labels = {
    people: 'People',
    organizations: 'Organizations',
    deals: 'Deals',
    tasks: 'Tasks',
    events: 'Events',
    forms: 'Forms',
    items: 'Items'
  };
  return labels[groupKey] || groupKey;
};

// Check if result is selected
const isSelected = (groupKey, index) => {
  return selectedGroup.value === groupKey && selectedIndex.value === index;
};

// Set result ref
const setResultRef = (el, groupKey, index) => {
  if (el) {
    const key = `${groupKey}-${index}`;
    if (!resultRefs.value[groupKey]) {
      resultRefs.value[groupKey] = {};
    }
    resultRefs.value[groupKey][index] = el;
  }
};

// Navigate results with arrow keys
const navigateResults = (direction) => {
  if (!searchResults.value || totalResults.value === 0) return;

  const groups = Object.keys(groupedResults.value).filter(
    key => groupedResults.value[key].length > 0
  );

  if (groups.length === 0) return;

  // Initialize selection
  if (selectedGroup.value === null) {
    selectedGroup.value = groups[0];
    selectedIndex.value = 0;
    scrollToSelected();
    return;
  }

  const currentGroupIndex = groups.indexOf(selectedGroup.value);
  const currentGroup = groupedResults.value[selectedGroup.value];
  const currentGroupLength = currentGroup.length;

  // Move within current group
  if (direction > 0) {
    if (selectedIndex.value < currentGroupLength - 1) {
      selectedIndex.value++;
    } else if (currentGroupIndex < groups.length - 1) {
      // Move to next group
      selectedGroup.value = groups[currentGroupIndex + 1];
      selectedIndex.value = 0;
    }
  } else {
    if (selectedIndex.value > 0) {
      selectedIndex.value--;
    } else if (currentGroupIndex > 0) {
      // Move to previous group
      selectedGroup.value = groups[currentGroupIndex - 1];
      selectedIndex.value = groupedResults.value[selectedGroup.value].length - 1;
    }
  }

  scrollToSelected();
};

// Scroll to selected result
const scrollToSelected = () => {
  nextTick(() => {
    const ref = resultRefs.value[selectedGroup.value]?.[selectedIndex.value];
    if (ref) {
      ref.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });
};

// Select result (Enter key)
const selectResult = () => {
  if (selectedGroup.value !== null && selectedIndex.value >= 0) {
    const result = groupedResults.value[selectedGroup.value][selectedIndex.value];
    if (result) {
      navigateToResult(result);
    }
  }
};

// Navigate to result
const navigateToResult = (result) => {
  if (!result || !result.route) return;

  openTab(result.route, {
    title: result.title,
    background: false
  });

  close();
};

// Close search
const close = () => {
  emit('close');
  searchQuery.value = '';
  searchResults.value = null;
  selectedGroup.value = null;
  selectedIndex.value = -1;
};

// Note: Keyboard shortcut is handled in Nav.vue to avoid conflicts

onUnmounted(() => {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
});
</script>

