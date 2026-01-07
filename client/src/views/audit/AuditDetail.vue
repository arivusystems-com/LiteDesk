<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 lg:pb-6">
    <!-- Offline Banner -->
    <div v-if="isOfflineMode" class="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
      <div class="flex items-center justify-between">
        <div class="flex items-center flex-1">
          <svg class="w-5 h-5 text-red-600 dark:text-red-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 10m9.9 2.9a3 3 0 11-5.196-5.196" />
          </svg>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-red-800 dark:text-red-200">You're offline — changes will sync later</p>
            <p v-if="lastSyncTime" class="text-xs text-red-700 dark:text-red-300 mt-0.5">Last synced: {{ lastSyncTime }}</p>
          </div>
        </div>
        <span v-if="hasQueuedActions" class="text-xs bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 px-2 py-1 rounded-full ml-2 flex-shrink-0">
          {{ queuedActions.length }} saved
        </span>
      </div>
    </div>

    <!-- Online Recovery Banner (Animated) -->
    <transition name="slide-down">
      <div v-if="!isOfflineMode && wasOffline" class="p-4 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
        <div class="flex items-center">
          <svg class="w-5 h-5 text-green-600 dark:text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <p class="text-sm font-medium text-green-800 dark:text-green-200">Back online — ready to sync</p>
        </div>
      </div>
    </transition>

    <!-- Execution State Banner -->
    <div v-if="executionStateBanner && !loading" :class="executionStateBanner.class" class="p-4 border-b">
      <div class="flex items-center">
        <svg class="w-5 h-5 mr-2" :class="executionStateBanner.iconClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-sm font-medium" :class="executionStateBanner.textClass">{{ executionStateBanner.message }}</p>
      </div>
    </div>

    <!-- Error Banner -->
    <div v-if="error" class="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
      <div class="flex items-center">
        <svg class="w-5 h-5 text-red-600 dark:text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-sm text-red-800 dark:text-red-200">{{ error }}</p>
      </div>
    </div>

    <!-- Loading State (Skeleton) -->
    <div v-if="loading" class="max-w-4xl mx-auto p-4 lg:p-6 space-y-6">
      <!-- Header Skeleton -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
        <div class="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4 animate-pulse"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
      </div>
      <!-- Execution Context Skeleton -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
        <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4 animate-pulse"></div>
        <div class="space-y-3">
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse"></div>
        </div>
      </div>
      <!-- Timeline Skeleton -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
        <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4 animate-pulse"></div>
        <div class="space-y-4">
          <div class="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div class="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      </div>
    </div>

    <!-- Audit Detail Content -->
    <div v-else-if="assignment && event" class="max-w-4xl mx-auto p-4 lg:p-6 space-y-6">
      <!-- Header Card (Sticky on Mobile) -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 lg:p-6 sticky top-14 lg:static z-10">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ assignment.auditType || 'Audit' }}</h1>
              <span v-if="hasQueuedActions" class="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-full">
                Saved locally
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
              <span :class="getStatusBadgeClass(assignment.auditState)" class="px-3 py-1 text-sm font-medium rounded-full">
                {{ assignment.auditState || 'Unknown' }}
              </span>
              <span class="flex items-center">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Due: {{ formatDate(assignment.dueAt) }}
              </span>
              <span v-if="event.relatedOrganization" class="flex items-center">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {{ event.relatedOrganization.name }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Execution Context Card -->
      <div v-if="executionContext" class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Execution Context</h2>
        <div class="space-y-3">
          <div v-if="executionContext.checkedInAt" class="flex items-center text-sm">
            <svg class="w-5 h-5 text-green-600 dark:text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-gray-600 dark:text-gray-400">Checked in: </span>
            <span class="text-gray-900 dark:text-white font-medium ml-1">{{ formatDateTime(executionContext.checkedInAt) }}</span>
          </div>
          <div v-if="executionContext.checkedOutAt" class="flex items-center text-sm">
            <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span class="text-gray-600 dark:text-gray-400">Checked out: </span>
            <span class="text-gray-900 dark:text-white font-medium ml-1">{{ formatDateTime(executionContext.checkedOutAt) }}</span>
          </div>
          <div v-if="executionContext.geo" class="flex items-start text-sm">
            <svg class="w-5 h-5 text-purple-600 dark:text-purple-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div>
              <span class="text-gray-600 dark:text-gray-400">Location: </span>
              <span class="text-gray-900 dark:text-white font-medium">{{ executionContext.geo.address || 'Recorded' }}</span>
              <a
                v-if="executionContext.geo.latitude && executionContext.geo.longitude"
                :href="`https://maps.google.com/?q=${executionContext.geo.latitude},${executionContext.geo.longitude}`"
                target="_blank"
                class="ml-2 text-blue-600 dark:text-blue-400 hover:underline text-xs"
              >
                View on map
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Timeline Card -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Timeline</h2>
        <div v-if="timeline.length === 0" class="text-center py-12">
          <svg class="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-gray-500 dark:text-gray-400 font-medium">No timeline events yet</p>
          <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">Timeline will appear as actions are taken</p>
        </div>
        <div v-else class="space-y-6">
          <template v-for="(group, groupIndex) in groupedTimeline" :key="groupIndex">
            <!-- Date Header -->
            <div class="flex items-center gap-3">
              <div class="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
              <span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{{ group.date }}</span>
              <div class="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
            </div>
            
            <!-- Timeline Items for this date -->
            <div class="space-y-4">
              <div
                v-for="(item, index) in group.items"
                :key="index"
                class="flex gap-4"
              >
                <div class="flex flex-col items-center">
                  <div :class="getTimelineIconClass(item.action)" class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" :aria-label="getTimelineActionLabel(item.action)">
                    <!-- CHECK_IN icon (location pin) -->
                    <svg v-if="item.action === 'CHECK_IN'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <!-- SUBMIT icon (document) -->
                    <svg v-else-if="item.action === 'SUBMIT'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <!-- APPROVE icon (check-circle) -->
                    <svg v-else-if="item.action === 'APPROVE'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <!-- REJECT icon (x-circle) -->
                    <svg v-else-if="item.action === 'REJECT'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <!-- CORRECTIVE_ACTION icon (wrench) -->
                    <svg v-else-if="item.action === 'CORRECTIVE_ACTION_CREATED' || item.action === 'CORRECTIVE_ACTION_COMPLETED'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <!-- CREATED icon -->
                    <svg v-else-if="item.action === 'CREATED'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <!-- Default icon (clock) -->
                    <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div v-if="index < group.items.length - 1" class="w-0.5 h-full bg-gray-200 dark:bg-gray-700 mt-2 min-h-[2rem]"></div>
                </div>
                <div class="flex-1 pb-4 min-h-[44px] flex items-start">
                  <div class="flex-1">
                    <p class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ getTimelineActionLabel(item.action) }}
                    </p>
                    <p v-if="item.fromState || item.toState" class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      <span v-if="item.fromState">{{ item.fromState }}</span>
                      <span v-if="item.fromState && item.toState"> → </span>
                      <span v-if="item.toState">{{ item.toState }}</span>
                    </p>
                    <div class="flex items-center gap-2 mt-1">
                      <p v-if="item.actor" class="text-xs text-gray-500 dark:text-gray-500">
                        by {{ item.actor.firstName }} {{ item.actor.lastName }}
                      </p>
                      <span v-if="item.actor" class="text-xs text-gray-400 dark:text-gray-600">•</span>
                      <p class="text-xs text-gray-500 dark:text-gray-500">
                        {{ getRelativeTime(item.createdAt || item.timestamp) }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Sticky Bottom Action Bar (Mobile) -->
    <div
      v-if="executionStatus && !loading"
      class="fixed bottom-0 left-0 right-0 lg:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 z-50 shadow-lg"
    >
      <div class="max-w-4xl mx-auto space-y-2">
        <button
          v-if="executionStatus.canCheckIn"
          @click="handleCheckIn"
          :disabled="actionLoading"
          :aria-label="isOfflineMode ? 'Check in (will be saved locally)' : 'Check in to start audit'"
          class="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-h-[44px]"
        >
          <svg v-if="actionLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{{ actionLoading ? 'Checking in...' : 'Check In' }}</span>
        </button>
        <button
          v-if="executionStatus.canSubmit"
          @click="handleSubmit"
          :disabled="actionLoading"
          :aria-label="isOfflineMode ? 'Submit audit (will be saved locally)' : 'Submit audit for review'"
          class="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 active:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-h-[44px]"
        >
          <svg v-if="actionLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{{ actionLoading ? 'Submitting...' : 'Submit Audit' }}</span>
        </button>
        <div v-if="executionStatus.canApprove || executionStatus.canReject" class="grid grid-cols-2 gap-2">
          <button
            v-if="executionStatus.canApprove"
            @click="handleApprove"
            :disabled="actionLoading || isOfflineMode"
            :aria-label="isOfflineMode ? 'Approve requires online connection' : 'Approve this audit'"
            :title="isOfflineMode ? 'Approve/Reject requires online connection' : 'Approve this audit. This action cannot be undone.'"
            class="px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 active:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-h-[44px]"
          >
            <svg v-if="actionLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ actionLoading ? 'Approving...' : 'Approve' }}</span>
          </button>
          <button
            v-if="executionStatus.canReject"
            @click="handleReject"
            :disabled="actionLoading || isOfflineMode"
            :aria-label="isOfflineMode ? 'Reject requires online connection' : 'Reject this audit'"
            :title="isOfflineMode ? 'Approve/Reject requires online connection' : 'Reject this audit. This action cannot be undone.'"
            class="px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-h-[44px]"
          >
            <svg v-if="actionLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ actionLoading ? 'Rejecting...' : 'Reject' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Desktop Action Buttons -->
    <div
      v-if="executionStatus && !loading"
      class="hidden lg:block max-w-4xl mx-auto px-6 pb-6"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div class="flex gap-3 justify-end">
          <button
            v-if="executionStatus.canCheckIn"
            @click="handleCheckIn"
            :disabled="actionLoading"
            :aria-label="isOfflineMode ? 'Check in (will be saved locally)' : 'Check in to start audit'"
            class="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
          >
            {{ actionLoading ? 'Checking in...' : 'Check In' }}
          </button>
          <button
            v-if="executionStatus.canSubmit"
            @click="handleSubmit"
            :disabled="actionLoading"
            :aria-label="isOfflineMode ? 'Submit audit (will be saved locally)' : 'Submit audit for review'"
            class="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 active:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
          >
            {{ actionLoading ? 'Submitting...' : 'Submit Audit' }}
          </button>
          <button
            v-if="executionStatus.canApprove"
            @click="handleApprove"
            :disabled="actionLoading || isOfflineMode"
            :aria-label="isOfflineMode ? 'Approve requires online connection' : 'Approve this audit'"
            :title="isOfflineMode ? 'Approve/Reject requires online connection' : 'Approve this audit. This action cannot be undone.'"
            class="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 active:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
          >
            {{ actionLoading ? 'Approving...' : 'Approve' }}
          </button>
          <button
            v-if="executionStatus.canReject"
            @click="handleReject"
            :disabled="actionLoading || isOfflineMode"
            :aria-label="isOfflineMode ? 'Reject requires online connection' : 'Reject this audit'"
            :title="isOfflineMode ? 'Approve/Reject requires online connection' : 'Reject this audit. This action cannot be undone.'"
            class="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
          >
            {{ actionLoading ? 'Rejecting...' : 'Reject' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import apiClient from '@/utils/apiClient';
import { useOffline } from '@/composables/useOffline';
import { initDB, getAuditDetail, saveAuditDetail, getTimeline, saveTimeline } from '@/services/offlineDb.js';
import { enqueueAction, listPendingActions } from '@/services/offlineQueue.js';

const route = useRoute();
const router = useRouter();
const { isOnline, onOnlineChange } = useOffline();

// Track online/offline transitions
onOnlineChange((online) => {
  if (online && wasOffline.value) {
    // Just came back online
    setTimeout(() => {
      wasOffline.value = false;
    }, 3000); // Show recovery banner for 3 seconds
  } else if (!online) {
    wasOffline.value = true;
  }
});

const loading = ref(true);
const actionLoading = ref(false);
const error = ref(null);
const assignment = ref(null);
const event = ref(null);
const executionContext = ref(null);
const executionStatus = ref(null);
const timeline = ref([]);
const queuedActions = ref([]);
const wasOffline = ref(false);
const lastSyncTime = ref(null);

const isOfflineMode = computed(() => !isOnline.value);
const hasQueuedActions = computed(() => queuedActions.value.length > 0);

// Execution State Banner
const executionStateBanner = computed(() => {
  if (!assignment.value) return null;
  
  const state = (assignment.value.auditState || '').toLowerCase();
  
  if (state.includes('ready') || state.includes('start')) {
    return {
      class: 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700',
      icon: 'svg',
      iconClass: 'text-gray-600 dark:text-gray-400',
      textClass: 'text-gray-700 dark:text-gray-300',
      message: 'Ready to start audit'
    };
  } else if (state.includes('checked_in') || state.includes('in_progress')) {
    return {
      class: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      icon: 'svg',
      iconClass: 'text-blue-600 dark:text-blue-400',
      textClass: 'text-blue-800 dark:text-blue-200',
      message: 'Audit in progress'
    };
  } else if (state.includes('pending_corrective') || state.includes('corrective')) {
    return {
      class: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      icon: 'svg',
      iconClass: 'text-yellow-600 dark:text-yellow-400',
      textClass: 'text-yellow-800 dark:text-yellow-200',
      message: 'Waiting for corrective actions'
    };
  } else if (state.includes('needs_review') || state.includes('submitted')) {
    return {
      class: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
      icon: 'svg',
      iconClass: 'text-purple-600 dark:text-purple-400',
      textClass: 'text-purple-800 dark:text-purple-200',
      message: 'Needs auditor review'
    };
  } else if (state.includes('closed') || state.includes('approved')) {
    return {
      class: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      icon: 'svg',
      iconClass: 'text-green-600 dark:text-green-400',
      textClass: 'text-green-800 dark:text-green-200',
      message: 'Audit completed'
    };
  } else if (state.includes('rejected')) {
    return {
      class: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      icon: 'svg',
      iconClass: 'text-red-600 dark:text-red-400',
      textClass: 'text-red-800 dark:text-red-200',
      message: 'Audit rejected — corrective actions reopened'
    };
  }
  
  return null;
});

// Initialize IndexedDB
const initOfflineDb = async () => {
  try {
    await initDB();
  } catch (err) {
    console.error('[AuditDetail] Failed to initialize IndexedDB:', err);
  }
};

const updateQueuedActions = async () => {
  try {
    const eventId = route.params.eventId;
    const pending = await listPendingActions();
    queuedActions.value = pending.filter(a => a.eventId === eventId);
  } catch (err) {
    console.error('[AuditDetail] Error getting queued actions:', err);
  }
};

const fetchAuditDetail = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const eventId = route.params.eventId;
    await initOfflineDb();
    
    // If offline, load from IndexedDB
    if (isOfflineMode.value) {
      console.log('[AuditDetail] Offline mode - loading from IndexedDB');
      const cachedDetail = await getAuditDetail(eventId);
      if (cachedDetail) {
        assignment.value = cachedDetail.assignment;
        event.value = cachedDetail.event;
        executionContext.value = cachedDetail.executionContext;
      }
      
      const cachedTimeline = await getTimeline(eventId);
      timeline.value = cachedTimeline;
      
      // Execution status not cached (requires online)
      executionStatus.value = null;
      
      loading.value = false;
      await updateQueuedActions();
      return;
    }
    
    // Online: Fetch from API
    // Fetch assignment detail
    const detailResponse = await apiClient.get(`/audit/assignments/${eventId}`);
    if (detailResponse.success) {
      assignment.value = detailResponse.data.assignment;
      event.value = detailResponse.data.event;
      executionContext.value = detailResponse.data.executionContext;
      
      // Save to IndexedDB
      await saveAuditDetail(eventId, detailResponse.data);
    }
    
    // Fetch execution status
    const statusResponse = await apiClient.get(`/audit/assignments/${eventId}/execution-status`);
    if (statusResponse.success) {
      executionStatus.value = statusResponse.data;
    }
    
    // Fetch timeline
    const timelineResponse = await apiClient.get(`/audit/assignments/${eventId}/timeline`);
    if (timelineResponse.success) {
      timeline.value = timelineResponse.data.timeline || [];
      
      // Save to IndexedDB
      await saveTimeline(eventId, timeline.value);
    }
  } catch (err) {
    console.error('Error fetching audit detail:', err);
    
    // If network error and offline, try IndexedDB
    if (isOfflineMode.value || err.status === 0) {
      try {
        const eventId = route.params.eventId;
        const cachedDetail = await getAuditDetail(eventId);
        if (cachedDetail) {
          assignment.value = cachedDetail.assignment;
          event.value = cachedDetail.event;
          executionContext.value = cachedDetail.executionContext;
        }
        
        const cachedTimeline = await getTimeline(eventId);
        timeline.value = cachedTimeline;
        
        loading.value = false;
        await updateQueuedActions();
        return;
      } catch (dbError) {
        console.error('[AuditDetail] IndexedDB error:', dbError);
      }
    }
    
    if (err.status === 403) {
      error.value = 'You are not assigned to this audit.';
    } else if (err.status === 404) {
      error.value = 'Audit not found or removed.';
    } else if (err.status === 402) {
      error.value = 'Subscription required. Please contact your administrator.';
    } else if (err.status === 0 || !navigator.onLine) {
      error.value = 'Offline — data may be outdated.';
    } else {
      error.value = err.message || 'Failed to load audit details. Please try again.';
    }
  } finally {
    loading.value = false;
    await updateQueuedActions();
  }
};

const handleCheckIn = async () => {
  if (!confirm('Check in to this audit? This will start the audit execution.')) {
    return;
  }
  
  actionLoading.value = true;
  try {
    const eventId = route.params.eventId;
    
    // Request location permission for check-in
    let locationData = {};
    if (navigator.geolocation) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
      } catch (geoError) {
        console.warn('Geolocation error:', geoError);
        // Continue without location if permission denied
      }
    }
    
    // If offline, queue the action
    if (isOfflineMode.value) {
      await enqueueAction('CHECK_IN', eventId, locationData);
      alert('Check-in saved locally. It will sync when you\'re back online.');
      await updateQueuedActions();
      actionLoading.value = false;
      return;
    }
    
    // Online: Execute immediately
    const response = await apiClient.post(`/audit/execute/${eventId}/check-in`, locationData);
    if (response.success) {
      await fetchAuditDetail();
      alert('Successfully checked in!');
    }
  } catch (err) {
    console.error('Error checking in:', err);
    
    // If network error, try to queue
    if (err.status === 0 || !navigator.onLine) {
      try {
        const eventId = route.params.eventId;
        await enqueueAction('CHECK_IN', eventId, {});
        alert('Check-in saved locally. It will sync when you\'re back online.');
        await updateQueuedActions();
        actionLoading.value = false;
        return;
      } catch (queueError) {
        console.error('Error queuing check-in:', queueError);
      }
    }
    
    alert(err.message || 'Failed to check in. Please try again.');
  } finally {
    actionLoading.value = false;
  }
};

const handleSubmit = async () => {
  if (!confirm('Submit this audit? This will finalize the audit and check you out.')) {
    return;
  }
  
  actionLoading.value = true;
  try {
    const eventId = route.params.eventId;
    
    // If offline, queue the action
    if (isOfflineMode.value) {
      await enqueueAction('SUBMIT', eventId, {});
      alert('Submission saved locally. It will sync when you\'re back online.');
      await updateQueuedActions();
      actionLoading.value = false;
      return;
    }
    
    // Online: Execute immediately
    const response = await apiClient.post(`/audit/execute/${eventId}/submit`, {});
    if (response.success) {
      await fetchAuditDetail();
      alert('Audit submitted successfully!');
    }
  } catch (err) {
    console.error('Error submitting audit:', err);
    
    // If network error, try to queue
    if (err.status === 0 || !navigator.onLine) {
      try {
        const eventId = route.params.eventId;
        await enqueueAction('SUBMIT', eventId, {});
        alert('Submission saved locally. It will sync when you\'re back online.');
        await updateQueuedActions();
        actionLoading.value = false;
        return;
      } catch (queueError) {
        console.error('Error queuing submit:', queueError);
      }
    }
    
    alert(err.message || 'Failed to submit audit. Please try again.');
  } finally {
    actionLoading.value = false;
  }
};

const handleApprove = async () => {
  // Guard: Approve/Reject never works offline
  if (isOfflineMode.value) {
    alert('Approve/Reject requires an online connection. Please check your connection and try again.');
    return;
  }
  
  if (!confirm('Approve this audit? This action cannot be undone.')) {
    return;
  }
  
  actionLoading.value = true;
  try {
    const response = await apiClient.post(`/audit/execute/${route.params.eventId}/approve`, {});
    if (response.success) {
      await fetchAuditDetail();
      alert('Audit approved successfully!');
    }
  } catch (err) {
    console.error('Error approving audit:', err);
    alert(err.message || 'Failed to approve audit. Please try again.');
  } finally {
    actionLoading.value = false;
  }
};

const handleReject = async () => {
  // Guard: Approve/Reject never works offline
  if (isOfflineMode.value) {
    alert('Approve/Reject requires an online connection. Please check your connection and try again.');
    return;
  }
  
  if (!confirm('Reject this audit? This action cannot be undone.')) {
    return;
  }
  
  actionLoading.value = true;
  try {
    const response = await apiClient.post(`/audit/execute/${route.params.eventId}/reject`, {});
    if (response.success) {
      await fetchAuditDetail();
      alert('Audit rejected.');
    }
  } catch (err) {
    console.error('Error rejecting audit:', err);
    alert(err.message || 'Failed to reject audit. Please try again.');
  } finally {
    actionLoading.value = false;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const getStatusBadgeClass = (state) => {
  const stateLower = (state || '').toLowerCase();
  if (stateLower.includes('ready') || stateLower.includes('start')) {
    return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200';
  } else if (stateLower.includes('checked_in') || stateLower.includes('in_progress')) {
    return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200';
  } else if (stateLower.includes('submitted') || stateLower.includes('needs_review')) {
    return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200';
  } else if (stateLower.includes('closed') || stateLower.includes('approved')) {
    return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
  } else if (stateLower.includes('rejected')) {
    return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200';
  }
  return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
};

const getTimelineActionLabel = (action) => {
  const labels = {
    CREATED: 'Audit Created',
    CHECK_IN: 'Checked In',
    CHECK_OUT: 'Checked Out',
    SUBMIT: 'Submitted',
    CORRECTIVE_ACTION_CREATED: 'Corrective Action Created',
    CORRECTIVE_ACTION_COMPLETED: 'Corrective Action Completed',
    APPROVE: 'Approved',
    REJECT: 'Rejected',
    STATUS_CHANGED: 'Status Changed',
    RESCHEDULED: 'Rescheduled',
    CANCELLED: 'Cancelled'
  };
  return labels[action] || action;
};

// Group timeline by date
const groupedTimeline = computed(() => {
  if (!timeline.value || timeline.value.length === 0) return [];
  
  const groups = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  timeline.value.forEach(item => {
    const timestamp = item.createdAt || item.timestamp;
    if (!timestamp) return;
    
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    
    let dateLabel;
    if (date.getTime() === today.getTime()) {
      dateLabel = 'Today';
    } else if (date.getTime() === yesterday.getTime()) {
      dateLabel = 'Yesterday';
    } else {
      dateLabel = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
    }
    
    if (!groups[dateLabel]) {
      groups[dateLabel] = [];
    }
    groups[dateLabel].push(item);
  });
  
  // Convert to array and sort by date (newest first)
  return Object.keys(groups)
    .sort((a, b) => {
      if (a === 'Today') return -1;
      if (b === 'Today') return 1;
      if (a === 'Yesterday') return -1;
      if (b === 'Yesterday') return 1;
      return new Date(b) - new Date(a);
    })
    .map(date => ({
      date,
      items: groups[date]
    }));
});

// Get relative time string
const getRelativeTime = (dateString) => {
  if (!dateString) return 'Unknown time';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}w ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months}mo ago`;
  }
  
  return formatDate(dateString);
};


const getTimelineIconClass = (action) => {
  if (action === 'APPROVE' || action === 'CHECK_IN') {
    return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
  } else if (action === 'REJECT') {
    return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
  } else if (action === 'SUBMIT') {
    return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
  }
  return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
};

onMounted(async () => {
  await initOfflineDb();
  await fetchAuditDetail();
  await updateQueuedActions();
  
  // Initialize offline state tracking
  wasOffline.value = !isOnline.value;
});
</script>

<style scoped>
.slide-down-enter-active {
  transition: all 0.3s ease-out;
}

.slide-down-leave-active {
  transition: all 0.3s ease-in;
}

.slide-down-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>

