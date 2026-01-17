<template>
  <div class="space-y-6">
    <!-- Back Button -->
    <button
      @click="goBack"
      class="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Core Modules
    </button>

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
          {{ error.message || 'Failed to load core module' }}
        </p>
      </div>
    </div>

    <!-- Module Detail -->
    <div v-else-if="module" class="space-y-6">
      <!-- People Tabbed Interface (always show for People module) -->
      <div v-if="isPeopleModule" class="space-y-6">
        <!-- Header with Badges and Description -->
        <div>
          <div class="flex items-center gap-3 mb-2">
            <!-- Module Icon -->
            <div class="flex items-center justify-center w-12 h-12 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>

            <!-- Module Name and Badges -->
            <div class="flex-1">
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ module.name }}
              </h2>
              <div class="flex items-center gap-2 mt-2">
                <!-- Ownership Badge -->
                <span
                  v-if="module.platformOwned"
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Platform-Owned
                </span>

                <!-- Shared Badge -->
                <span
                  v-if="module.applications && module.applications.length > 1"
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Shared by {{ module.applications.length }} {{ module.applications.length === 1 ? 'application' : 'applications' }}
                </span>
              </div>
            </div>
          </div>
          <!-- One-line Description -->
          <!-- <p class="text-sm text-gray-600 dark:text-gray-400 ml-16">
            Platform identity module shared across applications
          </p> -->
        </div>

        <!-- ModulesAndFields with its own tabs (Module details, Field Configurations, Relationships, Quick Create) -->
        <ModulesAndFields 
          :module-filter="peopleModuleFilter" 
          :title="'People'"
          :hide-field-creation="false"
          :hide-header="true"
        >
          <template #details-extra>
            <!-- Apps Using This Module Section -->
            <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Apps Using This Module
              </h3>

              <!-- Required Applications -->
              <div v-if="requiredApplications.length > 0" class="mb-6">
                <div class="flex items-center gap-2 mb-3">
                  <h4 class="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Required
                  </h4>
                  <span class="text-xs text-gray-500 dark:text-gray-500">
                    ({{ requiredApplications.length }} {{ requiredApplications.length === 1 ? 'application' : 'applications' }})
                  </span>
                </div>
                <div class="space-y-3">
                  <div
                    v-for="app in requiredApplications"
                    :key="app.appKey"
                    class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <div class="flex items-center gap-3 mb-2">
                          <h4 class="text-base font-semibold text-gray-900 dark:text-white">
                            {{ app.appName }}
                          </h4>
                          <!-- Required Badge -->
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
                            Required
                          </span>
                          <!-- Lock Icon -->
                          <svg
                            class="w-4 h-4 text-amber-600 dark:text-amber-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            title="This application requires this module and cannot be disabled"
                          >
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <p v-if="app.usage" class="text-sm text-gray-600 dark:text-gray-400">
                          {{ app.usage }}
                        </p>
                        <p v-if="app.reason" class="text-xs text-amber-700 dark:text-amber-400 mt-2 italic">
                          {{ app.reason }}
                        </p>
                      </div>
                      <!-- Enabled Status -->
                      <span
                        v-if="app.enabled !== undefined"
                        class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                      >
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Enabled
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Optional Applications -->
              <div v-if="optionalApplications.length > 0">
                <div class="flex items-center gap-2 mb-3">
                  <h4 class="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Optional
                  </h4>
                  <span class="text-xs text-gray-500 dark:text-gray-500">
                    ({{ optionalApplications.length }} {{ optionalApplications.length === 1 ? 'application' : 'applications' }})
                  </span>
                </div>
                <div class="space-y-3">
                  <div
                    v-for="app in optionalApplications"
                    :key="app.appKey"
                    class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <div class="flex items-center gap-3 mb-2">
                          <h4 class="text-base font-semibold text-gray-900 dark:text-white">
                            {{ app.appName }}
                          </h4>
                        </div>
                        <p v-if="app.usage" class="text-sm text-gray-600 dark:text-gray-400">
                          {{ app.usage }}
                        </p>
                      </div>
                      <!-- Toggle Switch (only for optional apps) -->
                      <div v-if="app.canToggle" class="flex items-center gap-3">
                        <Switch
                          v-model="app.enabled"
                          @update:model-value="() => handleToggleApp(app)"
                          :disabled="updatingApps.includes(app.appKey)"
                          :class="[
                            app.enabled ? 'bg-brand-600 dark:bg-brand-500' : 'bg-gray-200 dark:bg-gray-700',
                            'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
                            updatingApps.includes(app.appKey) ? 'opacity-50 cursor-not-allowed' : ''
                          ]"
                        >
                          <span class="sr-only">{{ app.enabled ? 'Disable' : 'Enable' }} {{ app.appName }}</span>
                          <span
                            aria-hidden="true"
                            :class="[
                              app.enabled ? 'translate-x-5' : 'translate-x-0',
                              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
                            ]"
                          />
                        </Switch>
                        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {{ app.enabled ? 'Enabled' : 'Disabled' }}
                        </span>
                        <div v-if="updatingApps.includes(app.appKey)" class="ml-2">
                          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-600"></div>
                        </div>
                      </div>
                      <!-- Read-only Status (for required apps or when can't toggle) -->
                      <span
                        v-else-if="app.enabled !== undefined"
                        :class="[
                          'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium',
                          app.enabled
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        ]"
                      >
                        <svg
                          v-if="app.enabled"
                          class="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        {{ app.enabled ? 'Enabled' : 'Disabled' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- No Applications Message -->
              <div v-if="requiredApplications.length === 0 && optionalApplications.length === 0" class="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  This module is not currently used by any applications.
                </p>
              </div>
            </div>
          </template>
        </ModulesAndFields>
      </div>

      <!-- Standard Module Detail View (for non-People modules) -->
      <div v-else class="space-y-6">
      <!-- Header -->
      <div>
        <div class="flex items-center gap-3 mb-4">
          <!-- Module Icon -->
          <div class="flex items-center justify-center w-12 h-12 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          </div>

          <!-- Module Name and Badges -->
          <div class="flex-1">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ module.name }}
            </h2>
            <div class="flex items-center gap-2 mt-2">
              <!-- Ownership Badge -->
              <span
                v-if="module.platformOwned"
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Platform-Owned
              </span>

              <!-- Shared Badge -->
              <span
                v-if="module.applications && module.applications.length > 1"
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Shared by {{ module.applications.length }} {{ module.applications.length === 1 ? 'application' : 'applications' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Platform Ownership Info Box -->
      <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 class="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">
              Platform-Owned Capability
            </h3>
            <p class="text-sm text-blue-800 dark:text-blue-400">
              This is a shared platform capability owned by the platform. It cannot be deleted, renamed, or modified. Applications can use this capability, but they cannot change its core definition.
            </p>
          </div>
        </div>
      </div>

      <!-- Description -->
      <div>
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ module.description }}
        </p>
      </div>

      <!-- Standard Module Content (for non-People modules) -->
      <!-- Platform Ownership Info Box -->
      <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 class="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">
              Platform-Owned Capability
            </h3>
            <p class="text-sm text-blue-800 dark:text-blue-400">
              This is a shared platform capability owned by the platform. It cannot be deleted, renamed, or modified. Applications can use this capability, but they cannot change its core definition.
            </p>
          </div>
        </div>
      </div>

      <!-- Description -->
      <div>
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ module.description }}
        </p>
      </div>

      <!-- Shared Usage Explanation -->
      <div class="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          About Shared Capabilities
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Core modules are shared platform capabilities that can be used by multiple applications. When an application uses a core module, it gains access to the module's functionality without needing to implement it separately.
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Some applications require certain core modules to function properly. These required modules cannot be disabled. Other applications may use core modules optionally, allowing you to control which applications have access to each capability.
        </p>
      </div>

      <!-- Applications Using This Module -->
      <div>
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Applications Using This Module
        </h3>

        <!-- Required Applications -->
        <div v-if="requiredApplications.length > 0" class="mb-6">
          <div class="flex items-center gap-2 mb-3">
            <h4 class="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Required
            </h4>
            <span class="text-xs text-gray-500 dark:text-gray-500">
              ({{ requiredApplications.length }} {{ requiredApplications.length === 1 ? 'application' : 'applications' }})
            </span>
          </div>
          <div class="space-y-3">
            <div
              v-for="app in requiredApplications"
              :key="app.appKey"
              class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-2">
                    <h4 class="text-base font-semibold text-gray-900 dark:text-white">
                      {{ app.appName }}
                    </h4>
                    <!-- Required Badge -->
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
                      Required
                    </span>
                    <!-- Lock Icon -->
                    <svg
                      class="w-4 h-4 text-amber-600 dark:text-amber-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      title="This application requires this module and cannot be disabled"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <p v-if="app.usage" class="text-sm text-gray-600 dark:text-gray-400">
                    {{ app.usage }}
                  </p>
                  <p v-if="app.reason" class="text-xs text-amber-700 dark:text-amber-400 mt-2 italic">
                    {{ app.reason }}
                  </p>
                </div>
                <!-- Enabled Status -->
                <span
                  v-if="app.enabled !== undefined"
                  class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Enabled
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Optional Applications -->
        <div v-if="optionalApplications.length > 0">
          <div class="flex items-center gap-2 mb-3">
            <h4 class="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Optional
            </h4>
            <span class="text-xs text-gray-500 dark:text-gray-500">
              ({{ optionalApplications.length }} {{ optionalApplications.length === 1 ? 'application' : 'applications' }})
            </span>
          </div>
          <div class="space-y-3">
            <div
              v-for="app in optionalApplications"
              :key="app.appKey"
              class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-2">
                    <h4 class="text-base font-semibold text-gray-900 dark:text-white">
                      {{ app.appName }}
                    </h4>
                  </div>
                  <p v-if="app.usage" class="text-sm text-gray-600 dark:text-gray-400">
                    {{ app.usage }}
                  </p>
                </div>
                <!-- Toggle Switch (only for optional apps) -->
                <div v-if="app.canToggle" class="flex items-center gap-3">
                  <Switch
                    v-model="app.enabled"
                    @update:model-value="() => handleToggleApp(app)"
                    :disabled="updatingApps.includes(app.appKey)"
                    :class="[
                      app.enabled ? 'bg-brand-600 dark:bg-brand-500' : 'bg-gray-200 dark:bg-gray-700',
                      'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
                      updatingApps.includes(app.appKey) ? 'opacity-50 cursor-not-allowed' : ''
                    ]"
                  >
                    <span class="sr-only">{{ app.enabled ? 'Disable' : 'Enable' }} {{ app.appName }}</span>
                    <span
                      aria-hidden="true"
                      :class="[
                        app.enabled ? 'translate-x-5' : 'translate-x-0',
                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
                      ]"
                    />
                  </Switch>
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ app.enabled ? 'Enabled' : 'Disabled' }}
                  </span>
                  <div v-if="updatingApps.includes(app.appKey)" class="ml-2">
                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-600"></div>
                  </div>
                </div>
                <!-- Read-only Status (for required apps or when can't toggle) -->
                <span
                  v-else-if="app.enabled !== undefined"
                  :class="[
                    'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium',
                    app.enabled
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  ]"
                >
                  <svg
                    v-if="app.enabled"
                    class="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {{ app.enabled ? 'Enabled' : 'Disabled' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- No Applications Message -->
        <div v-if="requiredApplications.length === 0 && optionalApplications.length === 0" class="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            This module is not currently used by any applications.
          </p>
        </div>
      </div>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <Teleport to="body">
      <div
        v-if="showConfirmModal && pendingAction"
        class="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-[1000] p-4"
        @click="cancelToggle"
        aria-labelledby="modal-title"
        role="dialog"
        aria-modal="true"
      >
        <!-- Modal panel -->
        <div 
          class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg"
          @click.stop
        >
          <div class="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 sm:mx-0 sm:h-10 sm:w-10">
                <svg class="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                  {{ pendingAction.newState ? 'Enable' : 'Disable' }} {{ pendingAction.app.appName }}?
                </h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    You're about to {{ pendingAction.newState ? 'enable' : 'disable' }} {{ pendingAction.app.appName }}'s use of this module.
                  </p>
                  <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <p class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Impact:</p>
                    <ul class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <li v-for="(impact, index) in getImpactExplanation()" :key="index" class="flex items-start gap-2">
                        <svg class="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{{ impact }}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
            <button
              @click="confirmToggle"
              :disabled="updatingApps.includes(pendingAction?.app?.appKey)"
              class="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-brand-600 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ pendingAction.newState ? 'Enable' : 'Disable' }}
            </button>
            <button
              @click="cancelToggle"
              :disabled="updatingApps.includes(pendingAction?.app?.appKey)"
              class="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, Teleport, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Switch } from '@headlessui/vue';
import apiClient from '@/utils/apiClient';
import ModulesAndFields from './ModulesAndFields.vue';

const route = useRoute();
const router = useRouter();

const module = ref(null);
const loading = ref(true);
const error = ref(null);
const updatingApps = ref([]); // Track which apps are being updated
const showConfirmModal = ref(false);
const pendingAction = ref(null); // { app, newState }

const moduleKey = computed(() => {
  // Try query param first (from Settings navigation), then route param
  return route.query.moduleKey || route.params.moduleKey;
});

// Check if this is the People module (case-insensitive)
const isPeopleModule = computed(() => {
  // Check route query/param first
  if (moduleKey.value) {
    const key = String(moduleKey.value).toUpperCase();
    if (key === 'PEOPLE') return true;
  }
  // Fall back to module data if available
  if (module.value) {
    const key = (module.value.moduleKey || module.value.key || '').toUpperCase();
    if (key === 'PEOPLE') return true;
  }
  return false;
});


const requiredApplications = computed(() => {
  if (!module.value || !module.value.applications) return [];
  return module.value.applications.filter(app => app.required === true);
});

const optionalApplications = computed(() => {
  if (!module.value || !module.value.applications) return [];
  return module.value.applications.filter(app => app.required !== true);
});

const fetchCoreModule = async () => {
  if (!moduleKey.value) {
    error.value = new Error('Module key is required');
    loading.value = false;
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const data = await apiClient(`/settings/core-modules/${moduleKey.value}`, {
      method: 'GET'
    });

    if (data && data.success && data.moduleKey) {
      module.value = data;
    } else {
      error.value = new Error('Invalid response from server');
      module.value = null;
    }
  } catch (err) {
    console.error('Failed to fetch core module:', err);
    error.value = err;
    module.value = null;
  } finally {
    loading.value = false;
  }
};

const goBack = () => {
  router.push('/settings?tab=core-modules');
};

// Filter for People module
const peopleModuleFilter = (module) => {
  return module.key?.toLowerCase() === 'people';
};

// Ensure module query param is set for ModulesAndFields to auto-select People
watch(() => moduleKey.value, (newKey) => {
  if (newKey?.toUpperCase() === 'PEOPLE' && !route.query.module) {
    // Set module query param so ModulesAndFields auto-selects People
    router.replace({ 
      query: { 
        ...route.query,
        module: 'people'
      } 
    });
  }
}, { immediate: true });

const handleToggleApp = (app) => {
  if (updatingApps.value.includes(app.appKey)) {
    // Revert the toggle if we're already updating
    app.enabled = !app.enabled;
    return;
  }
  // The Switch has already toggled app.enabled via v-model, so capture the new state
  const newState = app.enabled;
  // Store the previous state for potential rollback
  const previousState = !newState;
  pendingAction.value = { app, newState, previousState };
  showConfirmModal.value = true;
};

const confirmToggle = async () => {
  if (!pendingAction.value) return;

  const { app, newState, previousState } = pendingAction.value;
  const appKey = app.appKey;

  // Close modal first
  showConfirmModal.value = false;

  // The app.enabled is already set to newState by v-model, so we just need to persist it
  updatingApps.value.push(appKey);

  try {
    const response = await apiClient.patch(`/settings/core-modules/${moduleKey.value}/applications/${appKey}`, {
      enabled: newState
    });

    if (response && response.success) {
      // Update successful - refresh module data to get latest state
      await fetchCoreModule();
    } else {
      // Rollback on error
      app.enabled = previousState;
      throw new Error(response?.message || 'Failed to update application participation');
    }
  } catch (err) {
    console.error('Failed to toggle app participation:', err);
    // Rollback on error
    app.enabled = previousState;
    error.value = new Error(err.message || err.response?.data?.message || 'Failed to update application participation. Please try again.');
  } finally {
    updatingApps.value = updatingApps.value.filter(key => key !== appKey);
    pendingAction.value = null;
  }
};

const cancelToggle = () => {
  if (pendingAction.value) {
    // Revert the toggle since user cancelled
    const { app, previousState } = pendingAction.value;
    app.enabled = previousState;
  }
  showConfirmModal.value = false;
  pendingAction.value = null;
};

const getImpactExplanation = () => {
  if (!pendingAction.value) return [];
  
  const { app, newState } = pendingAction.value;
  const impacts = [];
  
  if (newState) {
    impacts.push(`${app.appName} will be able to use this module`);
    impacts.push(`Users with ${app.appName} access will see this module's functionality`);
  } else {
    impacts.push(`${app.appName} will no longer be able to use this module`);
    impacts.push(`Users with ${app.appName} access will lose access to this module's functionality`);
    impacts.push(`No data will be deleted - existing data remains but cannot be accessed`);
  }
  
  return impacts;
};

onMounted(() => {
  fetchCoreModule();
});
</script>

