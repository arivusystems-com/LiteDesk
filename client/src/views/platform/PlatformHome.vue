<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useAppShellStore } from '@/stores/appShell';
import { useTabs } from '@/composables/useTabs';
import apiClient from '@/utils/apiClient';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  ArrowRightIcon,
  SparklesIcon,
  BellIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/vue/24/outline';

const router = useRouter();
const authStore = useAuthStore();
const appShellStore = useAppShellStore();
const { openTab } = useTabs();

// State
const loading = ref(true);
const tasks = ref({
  overdue: [],
  dueToday: [],
  upcoming: []
});
const recentActivity = ref([]);
const quickAccessApps = ref([]);
const alerts = ref([]);

// Computed
const hasAnyData = computed(() => {
  return tasks.value.overdue.length > 0 ||
    tasks.value.dueToday.length > 0 ||
    tasks.value.upcoming.length > 0 ||
    recentActivity.value.length > 0 ||
    quickAccessApps.value.length > 0 ||
    alerts.value.length > 0;
});

// Format date/time helpers
const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  } catch {
    return '';
  }
};

const formatTime = (dateString) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
};

const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  } catch {
    return '';
  }
};

// Fetch My Tasks
const fetchTasks = async () => {
  try {
    const userId = authStore.user?._id;
    if (!userId) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    // Fetch all tasks assigned to me (not completed/cancelled)
    // We'll filter client-side to avoid multiple API calls
    const allTasksResponse = await apiClient.get('/tasks', {
      params: {
        assignedTo: 'me',
        limit: 50,
        sortBy: 'dueDate',
        sortOrder: 'asc'
      }
    });
    
    if (allTasksResponse.success) {
      const allTasks = (allTasksResponse.data || []).filter(
        task => task.status !== 'completed' && task.status !== 'cancelled'
      );
      
      // Separate into overdue, due today, and upcoming
      tasks.value.overdue = allTasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate < today;
      }).slice(0, 10);
      
      tasks.value.dueToday = allTasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate >= today && dueDate < tomorrow;
      }).slice(0, 10);
      
      tasks.value.upcoming = allTasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate >= tomorrow && dueDate <= nextWeek;
      }).slice(0, 10);
    }
  } catch (error) {
    console.error('[PlatformHome] Error fetching tasks:', error);
    // Silently fail - tasks section will just be empty
  }
};

// Fetch Recent Activity (Events)
const fetchRecentActivity = async () => {
  try {
    // Fetch recent events (last 30 days, cross-app)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const response = await apiClient.get('/events', {
      params: {
        startDateTime: thirtyDaysAgo.toISOString(),
        limit: 15,
        sortBy: 'startDateTime',
        sortOrder: 'desc'
      }
    });
    
    if (response.success) {
      recentActivity.value = (response.data || []).slice(0, 15);
    }
  } catch (error) {
    console.error('[PlatformHome] Error fetching recent activity:', error);
    // Silently fail - activity section will just be empty
  }
};

// Load Quick Access Apps
const loadQuickAccessApps = async () => {
  try {
    if (!appShellStore.isLoaded) {
      await appShellStore.loadUIMetadata();
    }
    
    const availableApps = appShellStore.availableApps || [];
    const appsWithAccess = availableApps
      .filter(app => {
        const appKeyUpper = app.appKey?.toUpperCase();
        return appKeyUpper !== 'CONTROL_PLANE' && authStore.hasAppAccess(app.appKey);
      })
      .slice(0, 6) // Limit to 6 apps
      .map(app => ({
        ...app,
        route: app.defaultRoute || getDefaultRouteForApp(app.appKey)
      }));
    
    quickAccessApps.value = appsWithAccess;
  } catch (error) {
    console.error('[PlatformHome] Error loading quick access apps:', error);
  }
};

// Get default route for app
const getDefaultRouteForApp = (appKey) => {
  const upperKey = appKey?.toUpperCase();
  switch (upperKey) {
    case 'SALES':
      return '/dashboard';
    case 'HELPDESK':
      return '/helpdesk/cases';
    case 'PROJECTS':
      return '/projects/projects';
    case 'AUDIT':
      return '/audit/dashboard';
    case 'PORTAL':
      return '/portal/dashboard';
    default:
      return '/dashboard';
  }
};

// Load Alerts/Warnings
const loadAlerts = async () => {
  try {
    const org = authStore.organization;
    if (!org) return;
    
    const subscription = org.subscription || {};
    const status = subscription.status || 'trial';
    
    // Check for instance suspension
    if (status === 'suspended' || status === 'expired') {
      alerts.value.push({
        type: 'error',
        title: 'Instance Suspended',
        message: 'This instance is currently suspended. Please contact support to restore access.',
        icon: XCircleIcon
      });
    }
    
    // Check for trial expiration
    if (status === 'trial' && subscription.trialEndDate) {
      const trialEnd = new Date(subscription.trialEndDate);
      const now = new Date();
      const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
      
      if (daysRemaining < 0) {
        alerts.value.push({
          type: 'warning',
          title: 'Trial Ended',
          message: 'Your trial has ended. Please subscribe to continue.',
          icon: ExclamationTriangleIcon
        });
      } else if (daysRemaining <= 3) {
        alerts.value.push({
          type: 'warning',
          title: 'Trial Ending Soon',
          message: `Your trial ends in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}.`,
          icon: ExclamationTriangleIcon
        });
      }
    }
    
    // TODO: Add SLA breaches and automation failures when backend APIs are available
  } catch (error) {
    console.error('[PlatformHome] Error loading alerts:', error);
  }
};

// Navigation handlers
const navigateToTask = (task) => {
  openTab(`/tasks/${task._id}`, {
    title: task.title || 'Task',
    icon: '📋'
  });
};

const navigateToEvent = (event) => {
  openTab(`/events/${event._id}`, {
    title: event.eventName || 'Event',
    icon: '📅'
  });
};

const navigateToApp = (app) => {
  router.push(app.route);
};

// Load all data
const loadData = async () => {
  loading.value = true;
  try {
    await Promise.all([
      fetchTasks(),
      fetchRecentActivity(),
      loadQuickAccessApps(),
      loadAlerts()
    ]);
  } catch (error) {
    console.error('[PlatformHome] Error loading data:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Home
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          What needs your attention right now
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="space-y-6">
        <div
          v-for="i in 4"
          :key="i"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse"
        >
          <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div class="space-y-3">
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!hasAnyData" class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
        <SparklesIcon class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Welcome to your Home
        </h3>
        <p class="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          This is your personal attention center. Tasks, recent activity, and alerts will appear here as you start using Sales, Helpdesk, and other apps.
        </p>
      </div>

      <!-- Content Sections -->
      <div v-else class="space-y-6">
        <!-- 1️⃣ My Tasks (Primary Section) -->
        <div
          v-if="tasks.overdue.length > 0 || tasks.dueToday.length > 0 || tasks.upcoming.length > 0"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div class="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CheckCircleIcon class="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              My Tasks
            </h2>
          </div>
          
          <div class="p-6 space-y-6">
            <!-- Overdue Tasks -->
            <div v-if="tasks.overdue.length > 0">
              <h3 class="text-sm font-medium text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                <XCircleIcon class="w-4 h-4" />
                Overdue
              </h3>
              <div class="space-y-2">
                <button
                  v-for="task in tasks.overdue"
                  :key="task._id"
                  @click="navigateToTask(task)"
                  class="w-full text-left p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors group"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {{ task.title }}
                      </p>
                      <p v-if="task.dueDate" class="text-xs text-red-600 dark:text-red-400 mt-1">
                        Due {{ formatDate(task.dueDate) }}
                      </p>
                    </div>
                    <ArrowRightIcon class="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 ml-2 flex-shrink-0" />
                  </div>
                </button>
              </div>
            </div>

            <!-- Due Today -->
            <div v-if="tasks.dueToday.length > 0">
              <h3 class="text-sm font-medium text-orange-600 dark:text-orange-400 mb-3 flex items-center gap-2">
                <ClockIcon class="w-4 h-4" />
                Due Today
              </h3>
              <div class="space-y-2">
                <button
                  v-for="task in tasks.dueToday"
                  :key="task._id"
                  @click="navigateToTask(task)"
                  class="w-full text-left p-3 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors group"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {{ task.title }}
                      </p>
                      <p v-if="task.dueDate" class="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        Due {{ formatDate(task.dueDate) }}
                      </p>
                    </div>
                    <ArrowRightIcon class="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 ml-2 flex-shrink-0" />
                  </div>
                </button>
              </div>
            </div>

            <!-- Upcoming -->
            <div v-if="tasks.upcoming.length > 0">
              <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
                <CalendarIcon class="w-4 h-4" />
                Upcoming
              </h3>
              <div class="space-y-2">
                <button
                  v-for="task in tasks.upcoming"
                  :key="task._id"
                  @click="navigateToTask(task)"
                  class="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {{ task.title }}
                      </p>
                      <p v-if="task.dueDate" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Due {{ formatDate(task.dueDate) }}
                      </p>
                    </div>
                    <ArrowRightIcon class="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 ml-2 flex-shrink-0" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 2️⃣ Recent Activity -->
        <div
          v-if="recentActivity.length > 0"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div class="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BellIcon class="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Recent Activity
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              What just happened while you were away
            </p>
          </div>
          
          <div class="p-6">
            <div class="space-y-3">
              <button
                v-for="event in recentActivity"
                :key="event._id"
                @click="navigateToEvent(event)"
                class="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {{ event.eventName || 'Event' }}
                    </p>
                    <p v-if="event.startDateTime" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {{ formatDate(event.startDateTime) }} • {{ formatRelativeTime(event.startDateTime) }}
                    </p>
                  </div>
                  <ArrowRightIcon class="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 ml-2 flex-shrink-0" />
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- 3️⃣ Quick Access -->
        <div
          v-if="quickAccessApps.length > 0"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div class="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <SparklesIcon class="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Quick Access
            </h2>
          </div>
          
          <div class="p-6">
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
              <button
                v-for="app in quickAccessApps"
                :key="app.appKey"
                @click="navigateToApp(app)"
                class="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/50 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors text-left group"
              >
                <div class="flex items-center gap-3">
                  <span v-if="app.icon && typeof app.icon === 'string' && !app.icon.startsWith('<')" class="text-2xl">
                    {{ app.icon }}
                  </span>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {{ app.name || app.appKey }}
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- 4️⃣ Alerts / Warnings -->
        <div
          v-if="alerts.length > 0"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div class="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ExclamationTriangleIcon class="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Alerts
            </h2>
          </div>
          
          <div class="p-6">
            <div class="space-y-3">
              <div
                v-for="(alert, index) in alerts"
                :key="index"
                :class="[
                  'p-4 rounded-lg border',
                  alert.type === 'error'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : alert.type === 'warning'
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                ]"
              >
                <div class="flex items-start gap-3">
                  <component
                    :is="alert.icon || InformationCircleIcon"
                    :class="[
                      'w-5 h-5 mt-0.5 flex-shrink-0',
                      alert.type === 'error'
                        ? 'text-red-600 dark:text-red-400'
                        : alert.type === 'warning'
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-blue-600 dark:text-blue-400'
                    ]"
                  />
                  <div class="flex-1">
                    <h3 class="font-medium mb-1" :class="[
                      alert.type === 'error'
                        ? 'text-red-800 dark:text-red-200'
                        : alert.type === 'warning'
                        ? 'text-yellow-800 dark:text-yellow-200'
                        : 'text-blue-800 dark:text-blue-200'
                    ]">
                      {{ alert.title }}
                    </h3>
                    <p class="text-sm" :class="[
                      alert.type === 'error'
                        ? 'text-red-700 dark:text-red-300'
                        : alert.type === 'warning'
                        ? 'text-yellow-700 dark:text-yellow-300'
                        : 'text-blue-700 dark:text-blue-300'
                    ]">
                      {{ alert.message }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
