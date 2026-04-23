<template>
  <div class="mx-auto w-full" :data-view="currentView">
    <!-- Registry-Driven ModuleList with Calendar/List View Switcher -->
    <ModuleList
      ref="moduleListRef"
      module-key="events"
      app-key="PLATFORM"
      @create="openEventModal"
      @import="showImportModal = true"
      @export="exportEvents"
      @row-click="handleRowClick"
      @delete="handleInlineDelete"
      @bulk-action="handleBulkAction"
      @filters-changed="handleFiltersChanged"
      @search-changed="handleSearchChanged"
    >
      <!-- Custom Header Slot - View Switcher (segmented control with sliding pill) -->
      <template #header-actions>
        <div class="flex gap-3 items-center">
          <!-- View Toggle - Segmented control with sliding pill (h-10 to match header buttons) -->
          <div class="relative flex h-10 items-stretch rounded-xl bg-gray-100 dark:bg-gray-700/90 p-[0.1rem] border border-gray-200/80 dark:border-gray-600 shadow-inner min-w-[200px]">
            <!-- <div
              class="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-600 transition-all duration-200 ease-out pointer-events-none"
              :style="{ left: currentView === 'calendar' ? '4px' : 'calc(50% + 2px)' }"
            /> -->
            <button
              type="button"
              @click="switchView('calendar')"
              class="relative z-10 flex-1 flex items-center justify-center gap-2 pl-3 pr-3 py-0 rounded-lg text-sm font-semibold transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 dark:ring-offset-gray-800 overflow-visible"
              :class="currentView === 'calendar' ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-600/50'"
            >
              <CalendarIcon class="w-5 h-5 shrink-0" />
              Calendar
            </button>
            <button
              type="button"
              @click="switchView('list')"
              class="relative z-10 flex-1 flex items-center justify-center gap-2 pl-3 pr-3 py-0 rounded-lg text-sm font-semibold transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 dark:ring-offset-gray-800 overflow-visible"
              :class="currentView === 'list' ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-600/50'"
            >
              <ListBulletIcon class="w-5 h-5 shrink-0" />
              List
            </button>
          </div>
          <ModuleActions
            module="events"
            create-label="New Event"
            @create="openEventModal"
            @import="showImportModal = true"
            @export="exportEvents"
          />
        </div>
      </template>

      <!-- Custom Event Name Cell -->
      <template #cell-eventName="{ row }">
        <span class="font-semibold text-gray-900 dark:text-white">
          {{ row.eventName }}
        </span>
      </template>

      <!-- Custom Event Type Cell -->
      <template #cell-eventType="{ value }">
        <BadgeCell 
          v-if="value"
          :value="value" 
          variant="info"
        />
        <span v-else class="text-gray-500 dark:text-gray-400">-</span>
      </template>

      <!-- Custom Start Date Time Cell -->
      <template #cell-startDateTime="{ value }">
        <DateCell v-if="value" :value="value" format="short" />
        <span v-else class="text-gray-500 dark:text-gray-400">-</span>
      </template>

      <!-- Custom End Date Time Cell -->
      <template #cell-endDateTime="{ value }">
        <DateCell v-if="value" :value="value" format="short" />
        <span v-else class="text-gray-500 dark:text-gray-400">-</span>
      </template>

      <!-- Custom Status Cell -->
      <template #cell-status="{ value }">
        <BadgeCell 
          v-if="value"
          :value="value" 
          :variant-map="{
            'scheduled': 'info',
            'completed': 'success',
            'cancelled': 'danger',
            'in-progress': 'warning'
          }"
        />
        <span v-else class="text-gray-500 dark:text-gray-400">-</span>
      </template>

      <!-- Custom Owner Cell -->
      <template #cell-eventOwnerId="{ row }">
        <div v-if="row.eventOwnerId" class="flex items-center gap-2">
          <Avatar
            v-if="typeof row.eventOwnerId === 'object'"
            :user="{
              firstName: row.eventOwnerId.firstName || row.eventOwnerId.first_name,
              lastName: row.eventOwnerId.lastName || row.eventOwnerId.last_name,
              email: row.eventOwnerId.email,
              avatar: row.eventOwnerId.avatar
            }"
            size="sm"
          />
          <span class="text-sm text-gray-700 dark:text-gray-300">
            {{ getUserDisplayName(row.eventOwnerId) }}
          </span>
        </div>
        <span v-else class="text-sm text-gray-500 dark:text-gray-400">Unassigned</span>
      </template>
    </ModuleList>

    <!-- Calendar View (shown when Calendar tab is selected, replaces table) -->
    <div 
      v-if="currentView === 'calendar'" 
      class="calendar-view-container mt-4"
      style="min-height: 400px;"
    >
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="p-6">
          <div v-if="calendarLoading" class="flex items-center justify-center h-64">
            <div class="text-gray-500 dark:text-gray-400">Loading calendar...</div>
          </div>
          <FullCalendar 
            v-else
            ref="calendarRef"
            :options="calendarOptions"
          />
        </div>
      </div>
    </div>

    <EventQuickCreateDrawer
      :isOpen="showEventQuickCreate"
      :initialData="eventQuickCreateInitialData"
      @close="closeEventQuickCreate"
      @saved="handleEventQuickCreateSaved"
    />

    <!-- CSV Import Modal -->
    <CSVImportModal 
      v-if="showImportModal"
      entity-type="Events"
      @close="showImportModal = false"
      @import-complete="handleImportComplete"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated, onUnmounted, watch, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import apiClient from '@/utils/apiClient';
import { useTabs } from '@/composables/useTabs';
import { useAuthStore } from '@/stores/auth';
import ModuleList from '@/components/module-list/ModuleList.vue';
import BadgeCell from '@/components/common/table/BadgeCell.vue';
import DateCell from '@/components/common/table/DateCell.vue';
import Avatar from '@/components/common/Avatar.vue';
import CSVImportModal from '@/components/import/CSVImportModal.vue';
import ModuleActions from '@/components/common/ModuleActions.vue';
import EventQuickCreateDrawer from '@/components/events/EventQuickCreateDrawer.vue';
import { getModuleListConfig } from '@/platform/modules/moduleListRegistry';
import { CalendarIcon, ListBulletIcon } from '@heroicons/vue/24/outline';

const router = useRouter();
const route = useRoute();
const calendarRef = ref(null);
const moduleListRef = ref(null);

// Initialize tabs composable
const { openTab } = useTabs();
const authStore = useAuthStore();

// View state - initialize from localStorage immediately for CSS to work
const viewStorageKey = 'litedesk-events-view';
const getInitialView = () => {
  try {
    const savedView = localStorage.getItem(viewStorageKey);
    return savedView === 'list' ? 'list' : 'calendar';
  } catch {
    return 'calendar';
  }
};
const currentView = ref(getInitialView());

// Calendar data state
const calendarEvents = ref([]);
const calendarLoading = ref(false);

// Event creation modal state
const showEventQuickCreate = ref(false);
const eventQuickCreateInitialData = ref({});
const showImportModal = ref(false);
const isDarkMode = ref(false);

// Initialize view from route query or localStorage (persist so returning to page keeps list/calendar)
const initializeView = () => {
  const viewParam = route.query.view;
  if (viewParam === 'list') {
    currentView.value = 'list';
    try { localStorage.setItem(viewStorageKey, 'list'); } catch (_) {}
  } else if (viewParam === undefined) {
    const savedView = localStorage.getItem(viewStorageKey);
    if (savedView === 'list') {
      currentView.value = 'list';
      try { localStorage.setItem(viewStorageKey, 'list'); } catch (_) {}
      router.replace({ query: { ...route.query, view: 'list' } });
    } else {
      currentView.value = 'calendar';
      try { localStorage.setItem(viewStorageKey, 'calendar'); } catch (_) {}
    }
  } else {
    currentView.value = 'calendar';
    try { localStorage.setItem(viewStorageKey, 'calendar'); } catch (_) {}
    const newQuery = { ...route.query };
    delete newQuery.view;
    router.replace({ query: newQuery });
  }
  
  nextTick(() => {
    toggleTableView(currentView.value === 'list');
  });
};

// Switch view
const switchView = async (view) => {
  currentView.value = view;
  localStorage.setItem(viewStorageKey, view);
  
  // Update route query
  if (view === 'list') {
    router.replace({ query: { ...route.query, view: 'list' } });
  } else {
    const newQuery = { ...route.query };
    delete newQuery.view;
    router.replace({ query: newQuery });
    // Fetch calendar data when switching to calendar
    await fetchCalendarEvents();
  }
  
  // Hide/show table after DOM updates
  await nextTick();
  toggleTableView(view === 'list');
};

// Watch route query changes (when URL has no view param, sync from localStorage — do not force calendar)
watch(() => route.query.view, (newView) => {
  if (newView === 'list' && currentView.value !== 'list') {
    switchView('list');
  } else if (newView === undefined) {
    // Returning to /events without ?view= — restore from localStorage so list view persists
    initializeView();
  } else if (newView !== 'list' && currentView.value !== 'calendar') {
    switchView('calendar');
  }
});

// Helper function to toggle table visibility
const toggleTableView = (showTable) => {
  // Find the table container inside ModuleList > ListView
  // Use a more specific selector to avoid affecting other elements
  const tableContainer = document.querySelector('.mt-4.px-4.sm\\:px-6.lg\\:px-8:not(.calendar-view-container)');
  
  if (tableContainer) {
    // Check if it contains a table element
    const hasTable = tableContainer.querySelector('table') !== null || 
                     tableContainer.querySelector('[role="table"]') !== null ||
                     tableContainer.querySelector('div[class*="table-scroll"]') !== null ||
                     tableContainer.querySelector('div[class*="table-view"]') !== null;
    
    if (hasTable) {
      // Use inline style to override any CSS
      if (showTable) {
        tableContainer.style.display = '';
        tableContainer.style.visibility = '';
        tableContainer.style.pointerEvents = '';
      } else {
        tableContainer.style.display = 'none';
      }
    }
  }
};

// Fetch calendar events (same data as ModuleList)
const fetchCalendarEvents = async () => {
  if (currentView.value !== 'calendar') return;
  
  calendarLoading.value = true;
  try {
    // Get filters and search from ModuleList
    // Use stored search query if available, otherwise get from ModuleList
    const moduleListFilters = moduleListRef.value?.getFilters?.() || {};
    const moduleListSearch = currentSearchQuery.value || moduleListRef.value?.getSearchQuery?.() || '';
    
    // Build query params with filters and search
    const params = {};
    
    // Add filters
    const moduleConfig = getModuleListConfig('events');
    let normalizedFilters = { ...moduleListFilters };
    
    if (moduleConfig?.normalizeFilters) {
      normalizedFilters = moduleConfig.normalizeFilters(normalizedFilters, authStore.user?._id);
    }
    
    // Copy normalized filters to params
    Object.keys(normalizedFilters).forEach(key => {
      const value = normalizedFilters[key];
      if (value !== undefined && value !== '') {
        params[key] = value;
      } else if (value === null) {
        params[key] = null;
      }
    });
    
    // Add search query
    if (moduleListSearch && moduleListSearch.trim()) {
      params.search = moduleListSearch.trim();
    }
    
    // Fetch events from the same endpoint ModuleList uses, with filters
    const response = await apiClient.get('/events', { params });
    
    if (response && response.success) {
      const items = Array.isArray(response.data) ? response.data : [];
      calendarEvents.value = items.map(item => ({
        ...item,
        startDateTime: item.startDateTime,
        startDate: item.startDateTime,
        endDateTime: item.endDateTime,
        endDate: item.endDateTime,
        title: item.eventName,
        eventName: item.eventName,
        owner: item.eventOwnerId,
        ownerPersonId: item.eventOwnerId,
        appContext: item.appContext || (item.eventType && ['Internal Audit', 'External Audit — Single Org', 'External Audit Beat'].includes(item.eventType) ? 'AUDIT' : 'SALES')
      }));
    } else {
      calendarEvents.value = [];
    }
  } catch (error) {
    console.error('[Events] Error fetching calendar events:', error);
    calendarEvents.value = [];
  } finally {
    calendarLoading.value = false;
  }
};

// Store current search query from ModuleList
const currentSearchQuery = ref('');

// Handle filter/search changes from ModuleList
const handleFiltersChanged = () => {
  if (currentView.value === 'calendar') {
    fetchCalendarEvents();
  }
};

const handleSearchChanged = (searchQuery) => {
  currentSearchQuery.value = searchQuery || '';
  if (currentView.value === 'calendar') {
    fetchCalendarEvents();
  }
};

// Watch currentView to fetch calendar data and toggle table visibility
watch(currentView, (newView) => {
  if (newView === 'calendar') {
    // Sync search query from ModuleList when switching to calendar
    currentSearchQuery.value = moduleListRef.value?.getSearchQuery?.() || '';
    fetchCalendarEvents();
  }
  
  // Toggle table visibility using DOM manipulation
  nextTick(() => {
    toggleTableView(newView === 'list');
  });
}, { immediate: true });

// Check dark mode
const checkDarkMode = () => {
  isDarkMode.value = document.documentElement.classList.contains('dark');
};

// Convert events to FullCalendar format
const convertEventsToCalendarFormat = (events) => {
  const formatAppContext = (appContext) => {
    const appContextMap = {
      'SALES': 'Sales',
      'PORTAL': 'Portal',
      'AUDIT': 'Audit',
      'LMS': 'LMS',
      'CONTROL_PLANE': 'Control Plane'
    };
    return appContextMap[appContext] || appContext || '';
  };

  return events.map(event => {
    const appLabel = event.appContext ? `[${formatAppContext(event.appContext)}] ` : '';
    return {
      id: event.eventId || event._id,
      title: `${appLabel}${event.eventName || event.title}`,
      start: event.startDateTime || event.startDate,
      end: event.endDateTime || event.endDate,
      backgroundColor: '#3b82f6',
      borderColor: '#3b82f6',
      textColor: '#ffffff',
      extendedProps: {
        eventId: event.eventId || event._id,
        appContext: event.appContext,
        notes: event.notes || event.description,
        location: event.location,
        eventType: event.eventType || event.type,
        status: event.status,
        originalEvent: event
      }
    };
  });
};

// FullCalendar Options
const calendarOptions = computed(() => {
  const events = convertEventsToCalendarFormat(calendarEvents.value);
  console.log('[Events] Calendar options - events count:', events.length);
  
  return {
    plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
    },
    buttonText: {
      today: 'Today',
      month: 'Month',
      week: 'Week',
      day: 'Day',
      list: 'List'
    },
    height: 'auto',
    aspectRatio: 1.8,
    editable: true,
    selectable: true,
    selectMirror: true,
    dayMaxEvents: true,
    weekends: true,
    nowIndicator: true,
    eventMaxStack: 3,
    
    // Events from calendar data
    events: events,
    
    // Event handlers
    eventClick: handleEventClick,
    select: handleDateSelect,
    eventDrop: handleEventDrop,
    eventResize: handleEventResize,
    
    // Styling
    themeSystem: 'standard',
  };
});

// Calendar event handlers
const handleEventClick = (info) => {
  const eventId = info.event.extendedProps.eventId || info.event.id;
  if (eventId) {
    openTab(`/events/${eventId}`, {
      title: info.event.title || 'Event Detail',
      icon: '📅',
      insertAdjacent: true
    });
  }
};

const handleDateSelect = (selectInfo) => {
  const toDateTimeLocalValue = (dateValue) => {
    if (!dateValue) return '';
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  openEventModal({
    startDateTime: toDateTimeLocalValue(selectInfo.start),
    endDateTime: toDateTimeLocalValue(selectInfo.end)
  });
  
  if (calendarRef.value) {
    const calendarApi = calendarRef.value.getApi();
    if (calendarApi) {
      calendarApi.unselect();
    }
  }
};

const handleEventDrop = async (info) => {
  try {
    const event = info.event;
    const eventId = event.id;
    
    await apiClient.patch(`/scheduling/${eventId}/reschedule`, {
      startDate: event.start.toISOString()
    });
    
    // Refresh calendar and ModuleList data
    await fetchCalendarEvents();
    if (moduleListRef.value && moduleListRef.value.refresh) {
      moduleListRef.value.refresh();
    }
  } catch (error) {
    console.error('Error rescheduling event:', error);
    info.revert();
  }
};

const handleEventResize = async (info) => {
  try {
    const event = info.event;
    const eventId = event.id;
    
    await apiClient.patch(`/scheduling/${eventId}/reschedule`, {
      startDate: event.start.toISOString()
    });
    
    // Refresh calendar and ModuleList data
    await fetchCalendarEvents();
    if (moduleListRef.value && moduleListRef.value.refresh) {
      moduleListRef.value.refresh();
    }
  } catch (error) {
    console.error('Error rescheduling event:', error);
    info.revert();
  }
};

// List view handlers
const handleRowClick = (row) => {
  openTab(`/events/${row._id || row.eventId}`, {
    title: row.eventName || 'Event Detail',
    background: false,
    insertAdjacent: true
  });
};

const handleBulkAction = async (action, rows) => {
  const eventIds = rows.map(event => event._id || event.eventId);
  
  try {
    if (action === 'delete' || action === 'bulk-delete') {
      await Promise.all(eventIds.map(id => apiClient.delete(`/events/${id}`)));
      // Refresh both calendar and list views
      await fetchCalendarEvents();
      if (moduleListRef.value?.refresh) {
        moduleListRef.value.refresh();
      }
    } else if (action === 'export') {
      // Export functionality handled by ModuleList
    }
  } catch (error) {
    console.error('Error performing bulk action:', error);
    alert('Error performing bulk action. Please try again.');
  }
};

const handleInlineDelete = async (row) => {
  if (!row) return;
  await handleBulkAction('delete', [row]);
};

const exportEvents = async () => {
  try {
    const response = await fetch('/api/csv/export/events', {
      headers: {
        'Authorization': `Bearer ${authStore.user?.token}`
      }
    });
    
    if (!response.ok) throw new Error('Export failed');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `events_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting events:', error);
    alert('Error exporting events. Please try again.');
  }
};

// Helper function to get user display name
const getUserDisplayName = (user) => {
  if (!user) return '';
  if (typeof user === 'string') return user;
  const firstName = user.firstName || user.first_name || '';
  const lastName = user.lastName || user.last_name || '';
  return `${firstName} ${lastName}`.trim() || user.email || '';
};

// Event modal handlers
const openEventModal = (initialData = {}) => {
  eventQuickCreateInitialData.value = { ...initialData };
  showEventQuickCreate.value = true;
};

const closeEventQuickCreate = () => {
  showEventQuickCreate.value = false;
  eventQuickCreateInitialData.value = {};
};

const handleEventQuickCreateSaved = async () => {
  closeEventQuickCreate();
  await fetchCalendarEvents();
  if (moduleListRef.value && moduleListRef.value.refresh) {
    moduleListRef.value.refresh();
  }
};

const handleImportComplete = () => {
  showImportModal.value = false;
  // Refresh both views
  fetchCalendarEvents();
  if (moduleListRef.value && moduleListRef.value.refresh) {
    moduleListRef.value.refresh();
  }
};

// Watch for dark mode changes
watch(() => document.documentElement.classList.contains('dark'), (newVal) => {
  isDarkMode.value = newVal;
}, { immediate: true });

// Handle record creation events to refresh views
const handleRecordCreated = (event) => {
  const { moduleKey, record } = event.detail || {};
  
  // Only refresh if it's an events record
  if (moduleKey === 'events') {
    // Refresh calendar view if active
    if (currentView.value === 'calendar') {
      fetchCalendarEvents();
    }
    // Refresh list view
    if (moduleListRef.value && moduleListRef.value.refresh) {
      moduleListRef.value.refresh();
    }
  }
};

// Handle legacy event-created event
const handleEventCreated = () => {
  // Refresh calendar view if active
  if (currentView.value === 'calendar') {
    fetchCalendarEvents();
  }
  // Refresh list view
  if (moduleListRef.value && moduleListRef.value.refresh) {
    moduleListRef.value.refresh();
  }
};

onMounted(() => {
  checkDarkMode();
  initializeView();
  
  // Initial view setup - fetch calendar data if calendar view is active
  if (currentView.value === 'calendar') {
    fetchCalendarEvents();
  }
  
  // Apply view state after ModuleList renders
  nextTick(() => {
    // Small delay to ensure ModuleList has fully rendered its table
    setTimeout(() => {
      toggleTableView(currentView.value === 'list');
    }, 100);
  });
  
  // Watch for dark mode changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'class') {
        checkDarkMode();
      }
    });
  });
  
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  });
  
  // Listen for record creation events
  if (typeof window !== 'undefined') {
    window.addEventListener('litedesk:record-created', handleRecordCreated);
    window.addEventListener('litedesk:event-created', handleEventCreated);
  }
});

// When returning to Events tab (keep-alive), re-sync view and refetch so UI loads correctly
onActivated(() => {
  initializeView();
  if (currentView.value === 'calendar') {
    fetchCalendarEvents();
  } else if (moduleListRef.value?.refresh) {
    moduleListRef.value.refresh();
  }
  nextTick(() => {
    setTimeout(() => toggleTableView(currentView.value === 'list'), 80);
  });
});

onUnmounted(() => {
  // Clean up event listeners
  if (typeof window !== 'undefined') {
    window.removeEventListener('litedesk:record-created', handleRecordCreated);
    window.removeEventListener('litedesk:event-created', handleEventCreated);
  }
});
</script>

<style>
/* Hide table container when in calendar view - use JavaScript for more reliable control */
/* CSS is a fallback, JavaScript toggleTableView handles the actual hiding */
[data-view="calendar"] .mt-4.px-4.sm\:px-6.lg\:px-8:not(.calendar-view-container) {
  display: none;
}

/* Show table container when in list view */
[data-view="list"] .mt-4.px-4.sm\:px-6.lg\:px-8:not(.calendar-view-container) {
  display: block;
}

/* Calendar view container should always be visible when rendered */
.calendar-view-container {
  display: block;
}

/* FullCalendar Custom Styling */
.fc {
  font-family: inherit;
}

.fc .fc-button {
  background-color: #4f46e5;
  border-color: #4f46e5;
  color: white;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  transition: all 0.2s;
}

.fc .fc-button:hover {
  background-color: #4338ca;
  border-color: #4338ca;
}

.fc .fc-button:disabled {
  background-color: #9ca3af;
  border-color: #9ca3af;
  opacity: 0.5;
}

.fc .fc-button-primary:not(:disabled):active,
.fc .fc-button-primary:not(:disabled).fc-button-active {
  background-color: #4338ca;
  border-color: #4338ca;
}

.fc .fc-toolbar-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
}

.fc-theme-standard .fc-scrollgrid {
  border-color: #e5e7eb;
}

.fc-theme-standard td,
.fc-theme-standard th {
  border-color: #e5e7eb;
}

.fc .fc-daygrid-day-number {
  color: #374151;
  font-weight: 500;
  padding: 0.5rem;
}

.fc .fc-col-header-cell-cushion {
  color: #6b7280;
  font-weight: 600;
  padding: 0.75rem 0;
}

.fc .fc-daygrid-day.fc-day-today {
  background-color: #eff6ff !important;
}

.fc .fc-event {
  border-radius: 0.375rem;
  padding: 2px 4px;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
}

.fc .fc-event:hover {
  opacity: 0.85;
}

.fc .fc-daygrid-event-dot {
  display: none;
}

/* Dark Mode Styles */
.dark .fc .fc-button {
  background-color: #4f46e5;
  border-color: #4f46e5;
  color: white;
}

.dark .fc .fc-button:hover {
  background-color: #4338ca;
  border-color: #4338ca;
}

.dark .fc .fc-button:disabled {
  background-color: #4b5563;
  border-color: #4b5563;
  opacity: 0.5;
}

.dark .fc .fc-button-primary:not(:disabled):active,
.dark .fc .fc-button-primary:not(:disabled).fc-button-active {
  background-color: #3730a3;
  border-color: #3730a3;
}

.dark .fc .fc-toolbar-title {
  color: #f9fafb;
}

.dark .fc .fc-toolbar-chunk {
  color: #f9fafb;
}

.dark .fc .fc-col-header {
  background-color: #111827;
}

.dark .fc .fc-col-header-cell {
  background-color: #111827;
  border-color: #374151;
}

.dark .fc-theme-standard .fc-scrollgrid {
  border-color: #374151;
  background-color: #1f2937;
}

.dark .fc-theme-standard td,
.dark .fc-theme-standard th {
  border-color: #374151;
}

.dark .fc .fc-daygrid-day-number {
  color: #d1d5db;
}

.dark .fc .fc-col-header-cell-cushion {
  color: #9ca3af;
}

.dark .fc .fc-daygrid-day.fc-day-today {
  background-color: #1e3a8a !important;
}

.dark .fc .fc-daygrid-day {
  background-color: #1f2937;
}

.dark .fc .fc-daygrid-day.fc-day-other {
  background-color: #111827;
}

.dark .fc .fc-timegrid-col {
  background-color: #1f2937;
}

.dark .fc .fc-timegrid-axis {
  background-color: #111827;
}

.dark .fc-theme-standard .fc-list {
  border-color: #374151;
  background-color: #1f2937;
}

.dark .fc .fc-list-day-cushion {
  background-color: #1f2937;
  color: #f9fafb;
}

.dark .fc .fc-list-event:hover td {
  background-color: #374151;
}

.dark .fc .fc-list-event-dot {
  border-color: inherit;
}

.dark .fc .fc-list-event-time,
.dark .fc .fc-list-event-title {
  color: #d1d5db;
}

/* Time Grid Styles */
.fc .fc-timegrid-slot {
  height: 3rem;
}

.fc .fc-timegrid-slot-label {
  color: #6b7280;
  font-size: 0.75rem;
}

.dark .fc .fc-timegrid-slot-label {
  color: #9ca3af;
}

.fc .fc-timegrid-event {
  border-radius: 0.375rem;
  border: none;
}

.fc .fc-timegrid-now-indicator-line {
  border-color: #ef4444;
  border-width: 2px;
}

/* List View Styles */
.fc .fc-list-day-cushion {
  background-color: #f3f4f6;
  font-weight: 600;
}

.fc .fc-list-event:hover td {
  background-color: #f9fafb;
}

/* Responsive */
@media (max-width: 768px) {
  .fc .fc-toolbar {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .fc .fc-toolbar-title {
    font-size: 1.25rem;
  }
  
  .fc .fc-button {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
  }
}
</style>
