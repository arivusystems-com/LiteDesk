<template>
  <div class="space-y-6">
    <!-- Redirect Notice -->
    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
      <div class="flex items-start gap-4">
        <div class="flex-shrink-0">
          <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">
            People Configuration Moved
          </h3>
          <p class="text-sm text-blue-800 dark:text-blue-400 mb-4">
            People is a Core module shared across all applications. Configuration for People (fields, layouts, relationships, quick create) is now managed in <strong>Settings → Core Modules → People</strong>.
          </p>
          <p class="text-sm text-blue-800 dark:text-blue-400 mb-4">
            Sales participation fields are shown in Core → People settings and remain governed by the field model (owner + intent + fieldScope).
          </p>
          <button
            @click="goToCorePeople"
            class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <span>Open People Settings</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Back Button -->
    <button
      @click="goBack"
      class="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Sales Settings
    </button>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const goToCorePeople = () => {
  router.push({ 
    path: '/settings', 
    query: { 
      tab: 'core-modules', 
      moduleKey: 'PEOPLE' 
    } 
  });
};

const goBack = () => {
  router.push({ 
    path: '/settings', 
    query: { 
      tab: 'applications', 
      app: 'sales' 
    } 
  });
};
</script>

