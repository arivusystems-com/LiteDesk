<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 border-t-brand-600 dark:border-t-brand-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-gray-600 dark:text-gray-400 font-medium">Loading event...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center min-h-screen p-4">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <svg class="mx-auto h-12 w-12 text-red-500 dark:text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error Loading Event</h2>
        <p class="text-gray-600 dark:text-gray-400 mb-6">{{ error }}</p>
        <button @click="$router.push('/events')" class="px-6 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 font-medium">
          Back to Events
        </button>
      </div>
    </div>

    <!-- Event Detail Content -->
    <div v-else-if="event" class="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6">
      <!-- Header Actions -->
      <div class="flex items-center justify-between mb-4">
        <button @click="$router.push('/events')" class="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span class="font-medium">Back to Events</span>
        </button>

        <div class="flex items-center gap-2">
          <!-- Approve/Reject buttons for needs_review state -->
          <template v-if="event.auditState === 'needs_review' && isAuditor">
            <button 
              @click="approveAudit" 
              :disabled="processing"
              class="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Approve
            </button>
            <button 
              @click="rejectAudit" 
              :disabled="processing"
              class="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reject
            </button>
          </template>
          
          <!-- Edit button (disabled when locked, approved, or closed) -->
          <button 
            v-if="event.auditState !== 'approved' && event.auditState !== 'closed'"
            @click="editEvent" 
            :disabled="isEventLocked"
            :class="[
              'px-3 py-1.5 text-sm rounded-lg font-medium transition-all',
              isEventLocked 
                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            ]"
            :title="isEventLocked ? 'Event is locked for editing' : 'Edit event'"
          >
            Edit
          </button>
          <button @click="deleteEvent" class="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-all">
            Delete
          </button>
        </div>
      </div>

      <!-- Execution Action Bar -->
      <ExecutionActionBar
        v-if="recordContext && recordContext.executionCapabilities"
        :execution-capabilities="recordContext.executionCapabilities || []"
        app-key="SALES"
        :executing="executing"
        :executing-capability-key="executingCapabilityKey"
        @action="handleExecutionAction"
        class="mb-4"
      />

      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- Left Column - Event Info -->
        <div class="lg:col-span-1 space-y-4">
          <!-- Event Header Card -->
          <div class="bg-gradient-to-r from-brand-50 to-purple-50 dark:from-brand-900/20 dark:to-purple-900/20 border border-brand-200 dark:border-brand-800/50 rounded-xl p-4">
            <div :style="{ backgroundColor: event.color }" class="w-12 h-12 rounded-lg flex items-center justify-center mb-3">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 class="text-xl font-bold text-gray-900 dark:text-white mb-2">{{ event.eventName || event.title }}</h1>
            <div class="flex items-center gap-2 flex-wrap">
              <span :class="getStatusBadgeClass(event.status)">{{ event.status }}</span>
              <span v-if="event.auditState" :class="getAuditStateBadgeClass(event.auditState)" class="capitalize">
                {{ formatAuditState(event.auditState) }}
              </span>
              <!-- Phase 2C: Projection-aware type badge -->
              <span 
                v-if="projectionTypeLabel"
                :class="projectionTypeBadgeClass"
              >
                {{ projectionTypeLabel }}
                <span v-if="projectionAppLabel" class="ml-1 text-xs opacity-75">
                  ({{ projectionAppLabel }})
                </span>
              </span>
              <!-- Fallback to eventType if no projection -->
              <span 
                v-else-if="event.eventType || event.type" 
                class="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded text-xs font-medium"
              >
                {{ event.eventType || event.type }}
              </span>
            </div>
          </div>

          <!-- Quick Info Card -->
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <!-- Audit State (for audit events only) -->
            <div v-if="event.auditState" class="flex items-start gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
              <svg class="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div class="flex-1">
                <div class="text-xs text-gray-500 dark:text-gray-400">Audit State</div>
                <div class="mt-1">
                  <span :class="getAuditStateBadgeClass(event.auditState)" class="capitalize">
                    {{ formatAuditState(event.auditState) }}
                  </span>
                </div>
              </div>
            </div>
            
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div class="flex-1">
                <div class="text-xs text-gray-500 dark:text-gray-400">Time</div>
                <div class="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                  {{ formatDateTime(event.startDateTime || event.startDate) }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  to {{ formatDateTime(event.endDateTime || event.endDate) }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Duration: {{ getDuration() }}
                </div>
              </div>
            </div>

            <div v-if="event.location" class="flex items-start gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <svg class="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <div class="flex-1">
                <div class="text-xs text-gray-500 dark:text-gray-400">Location</div>
                <div class="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{{ event.location }}</div>
              </div>
            </div>

            <div v-if="event.location && event.location.startsWith('http')" class="flex items-start gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <svg class="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <div class="flex-1">
                <div class="text-xs text-gray-500 dark:text-gray-400">Meeting Link</div>
                <a :href="event.location" target="_blank" class="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline mt-0.5 block truncate">
                  {{ event.location }}
                </a>
              </div>
            </div>

            <div v-if="event.tags && event.tags.length > 0" class="flex items-start gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <svg class="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <div class="flex-1">
                <div class="text-xs text-gray-500 dark:text-gray-400">Tags</div>
                <div class="flex flex-wrap gap-1.5 mt-1">
                  <span v-for="tag in event.tags" :key="tag" class="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded text-xs font-medium">
                    {{ tag }}
                  </span>
                </div>
              </div>
            </div>

            <div v-if="primaryOwnerUser" class="flex items-start gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <svg class="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <div class="flex-1">
                <div class="text-xs text-gray-500 dark:text-gray-400">{{ primaryOwnerLabel }}</div>
                <div class="flex items-center gap-2 mt-1">
                  <div class="w-6 h-6 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-medium">
                    {{ getInitials(primaryOwnerUser) }}
                  </div>
                  <div class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ primaryOwnerUser?.firstName }} {{ primaryOwnerUser?.lastName }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Columns - Details -->
        <div class="lg:col-span-2 space-y-4">
          <!-- Event Execution Component -->
          <EventExecution 
            v-if="event.auditState !== 'approved' && event.auditState !== 'closed'"
            :event="event" 
            @updated="handleEventUpdated"
          />
          
          <!-- Read-Only Message for Approved/Closed Events -->
          <div v-if="event.auditState === 'approved' || event.auditState === 'closed'" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div class="flex items-center gap-3 mb-4">
              <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Event is Read-Only</h3>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              This event has been {{ event.auditState === 'approved' ? 'approved' : 'closed' }} and is now read-only. No further actions can be taken.
            </p>
            <div v-if="hasFormResponse" class="mt-4">
              <button
                @click="viewFormResponse"
                class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors flex items-center gap-2"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View Form Response
              </button>
            </div>
          </div>
          
          <!-- Corrective Actions Section (when auditState = pending_corrective) -->
          <div v-if="event.auditState === 'pending_corrective' && hasFormResponse" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Corrective Actions</h3>
              <span class="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-full text-xs font-medium">
                Pending
              </span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This audit requires corrective actions. Review and manage corrective actions for failed audit questions.
            </p>
            <button
              @click="viewFormResponse"
              class="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              View Corrective Actions
            </button>
          </div>

          <!-- Related Records Panel (Phase 0F.1: Show Responses) -->
          <div v-if="event" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Related Records</h3>
            <RelatedRecordsPanel
              app-key="SALES"
              module-key="events"
              :record-id="event._id || event.eventId || route.params.id"
              :read-only="true"
            />
          </div>

          <!-- Notes Card -->
          <div v-if="event.notes" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Notes</h3>
            <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ event.notes }}</p>
          </div>

          <!-- Organization Card -->
          <div v-if="event.relatedToId" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Organization</h3>
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-900 dark:text-white font-medium">
                {{ getOrgName(event.relatedToId) }}
              </span>
            </div>
          </div>

          <!-- Form Card -->
          <div v-if="event.linkedFormId" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Form</h3>
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm text-gray-900 dark:text-white font-medium truncate">
                {{ getFormName(event.linkedFormId) }}
              </span>
              <button
                @click="openForm"
                class="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 font-medium transition-colors"
              >
                Open
              </button>
            </div>
          </div>


          <!-- GEO Tracking Card -->
          <div v-if="event.geoRequired && (event.checkIn || event.checkOut)" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">GEO Tracking</h3>
            <div class="space-y-3">
              <div v-if="event.checkIn" class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Check-In</div>
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ formatDateTime(event.checkIn.timestamp) }}
                </div>
                <div v-if="event.checkIn.location && event.checkIn.location.latitude != null && event.checkIn.location.longitude != null" class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {{ event.checkIn.location.latitude.toFixed(6) }}, {{ event.checkIn.location.longitude.toFixed(6) }}
                </div>
              </div>
              <div v-if="event.checkOut" class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Check-Out</div>
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ formatDateTime(event.checkOut.timestamp) }}
                </div>
                <div v-if="event.checkOut.location && event.checkOut.location.latitude != null && event.checkOut.location.longitude != null" class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {{ event.checkOut.location.latitude.toFixed(6) }}, {{ event.checkOut.location.longitude.toFixed(6) }}
                </div>
              </div>
              <div v-if="event.timeSpent" class="text-xs text-gray-600 dark:text-gray-400">
                Time Spent: {{ formatDuration(event.timeSpent) }}
              </div>
            </div>
          </div>

          <!-- Audit Workflow State -->
          <div v-if="event.auditState" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Audit Workflow</h3>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-700 dark:text-gray-300">Current State:</span>
                <span :class="getAuditStateBadgeClass(event.auditState)">
                  {{ event.auditState }}
                </span>
              </div>
              <!-- Workflow Progress -->
              <div class="mt-4">
                <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                  <span>Progress</span>
                  <span>{{ getAuditProgress() }}%</span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    class="bg-indigo-600 h-2 rounded-full transition-all"
                    :style="{ width: `${getAuditProgress()}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Multi-Org Route Summary -->
          <div v-if="event.isMultiOrg && event.orgList" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Route Summary</h3>
            <div class="space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">Total Organizations:</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ event.orgList.length }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">Completed:</span>
                <span class="font-medium text-green-600 dark:text-green-400">
                  {{ event.orgList.filter(o => o.status === 'COMPLETED').length }}
                </span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">In Progress:</span>
                <span class="font-medium text-blue-600 dark:text-blue-400">
                  {{ event.orgList.filter(o => o.status === 'IN_PROGRESS').length }}
                </span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">Pending:</span>
                <span class="font-medium text-gray-600 dark:text-gray-400">
                  {{ event.orgList.filter(o => o.status === 'PENDING').length }}
                </span>
              </div>
            </div>
          </div>

          <!-- Field Sales KPI -->
          <div v-if="event.eventType === 'Field Sales Beat' && event.kpiActuals" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Sales KPIs</h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-xs text-gray-500 dark:text-gray-400">Orders Created</div>
                <div class="text-lg font-bold text-gray-900 dark:text-white">
                  {{ event.kpiActuals.orderCount || 0 }}
                </div>
              </div>
              <div>
                <div class="text-xs text-gray-500 dark:text-gray-400">Order Value</div>
                <div class="text-lg font-bold text-gray-900 dark:text-white">
                  ${{ (event.kpiActuals.orderValue || 0).toLocaleString() }}
                </div>
              </div>
              <div>
                <div class="text-xs text-gray-500 dark:text-gray-400">Visits Completed</div>
                <div class="text-lg font-bold text-gray-900 dark:text-white">
                  {{ event.kpiActuals.visitsCompleted || 0 }}
                </div>
              </div>
              <div>
                <div class="text-xs text-gray-500 dark:text-gray-400">Conversion Rate</div>
                <div class="text-lg font-bold text-gray-900 dark:text-white">
                  {{ getConversionRate() }}%
                </div>
              </div>
            </div>
          </div>
          
          <!-- Audit History Card -->
          <div v-if="event.auditHistory && event.auditHistory.length > 0" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Audit History</h3>
            <div class="space-y-2">
              <div v-for="(entry, index) in event.auditHistory" :key="index" class="text-xs text-gray-600 dark:text-gray-400 border-l-2 border-gray-200 dark:border-gray-700 pl-3 py-1">
                <div class="font-medium text-gray-900 dark:text-white">{{ entry.action.replace('_', ' ').toUpperCase() }}</div>
                <div v-if="entry.from || entry.to">
                  <span v-if="entry.from">{{ entry.from }}</span>
                  <span v-if="entry.from && entry.to"> → </span>
                  <span v-if="entry.to">{{ entry.to }}</span>
                </div>
                <div class="text-gray-500 dark:text-gray-500 mt-0.5">
                  {{ formatDateTime(entry.timestamp) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Activity & Notes -->
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Notes & Activity</h3>
            
            <!-- Add Note Form -->
            <div v-if="showNoteForm" class="mb-4">
              <textarea
                v-model="newNote"
                rows="3"
                placeholder="Add a note..."
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              ></textarea>
              <div class="flex items-center gap-2 mt-2">
                <button @click="addNote" :disabled="!newNote.trim()" class="px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  Save Note
                </button>
                <button @click="showNoteForm = false; newNote = ''" class="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  Cancel
                </button>
              </div>
            </div>

            <button v-else @click="showNoteForm = true" class="w-full py-2 text-sm text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg border border-dashed border-brand-300 dark:border-brand-700 transition-colors">
              + Add Note
            </button>

            <!-- Notes Display -->
            <div v-if="event.notes" class="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ event.notes }}</p>
            </div>

            <div v-else class="mt-4 text-center py-6 text-sm text-gray-500 dark:text-gray-400">
              No notes yet
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Event Form Drawer -->
    <CreateRecordDrawer
      :isOpen="showEditModal"
      moduleKey="events"
      :record="event"
      @close="showEditModal = false"
      @saved="handleEventUpdated"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import apiClient from '@/utils/apiClient';
import dateUtils from '@/utils/dateUtils';
import { useAuthStore } from '@/stores/auth';
import CreateRecordDrawer from '@/components/common/CreateRecordDrawer.vue';
import EventExecution from '@/components/events/EventExecution.vue';
import RelatedRecordsPanel from '@/components/relationships/RelatedRecordsPanel.vue';
import ExecutionActionBar from '@/components/ExecutionActionBar.vue';
import { useRecordContext } from '@/composables/useRecordContext';
import { useNotifications } from '@/composables/useNotifications';
import { getProjectionTypeLabel, getProjectionTypeBadgeClass, getAppLabel } from '@/utils/projectionLabels';

const route = useRoute();
const router = useRouter();

const event = ref(null);
const loading = ref(true);
const error = ref(null);
const showNoteForm = ref(false);
const newNote = ref('');
const showEditModal = ref(false);

// Phase 1F: Execution state
const executing = ref(false);
const executingCapabilityKey = ref(null);

// Phase 1F: Notifications
const { success: showSuccess, error: showError } = useNotifications();

// Record context for execution capabilities and projection metadata
const { context: recordContext, load: loadRecordContext } = useRecordContext('SALES', 'events', () => route.params.id);

// Phase 2C: Computed projection type label and badge
const projectionTypeLabel = computed(() => {
  if (!recordContext.value?.record?.projection?.currentType) return null;
  const currentType = recordContext.value.record.projection.currentType;
  const appKey = recordContext.value.record.projection.appKey || 'SALES';
  return getProjectionTypeLabel(currentType, appKey);
});

const projectionTypeBadgeClass = computed(() => {
  if (!recordContext.value?.record?.projection?.currentType) return '';
  const currentType = recordContext.value.record.projection.currentType;
  const appKey = recordContext.value.record.projection.appKey || 'SALES';
  return getProjectionTypeBadgeClass(currentType, appKey);
});

const projectionAppLabel = computed(() => {
  if (!recordContext.value?.record?.projection?.appKey) return null;
  return getAppLabel(recordContext.value.record.projection.appKey);
});

// Check if event is locked for editing (checked in for audit events)
const isEventLocked = computed(() => {
  if (!event.value) return false;
  // Lock editing when audit event is checked in, approved, or closed
  return event.value.auditState === 'checked_in' || 
         event.value.auditState === 'submitted' ||
         event.value.auditState === 'approved' ||
         event.value.auditState === 'closed' ||
         (['Internal Audit', 'External Audit — Single Org', 'External Audit Beat'].includes(event.value.eventType) && 
          event.value.auditState && 
          event.value.auditState !== 'Ready to start');
});

// Check if current user is the auditor (explicit audit role)
const isAuditor = computed(() => {
  if (!event.value) return false;
  // Get current user from auth store
  const authStore = useAuthStore();
  const currentUser = authStore.user;
  if (!currentUser) return false;
  
  // Prefer explicit auditorId; fall back to eventOwnerId for legacy records
  const auditorId = event.value.auditorId?._id || event.value.auditorId || event.value.eventOwnerId?._id || event.value.eventOwnerId;
  return auditorId && auditorId.toString() === currentUser._id.toString();
});

const isAuditEventType = computed(() => {
  if (!event.value) return false;
  return ['Internal Audit', 'External Audit — Single Org', 'External Audit Beat'].includes(event.value.eventType);
});

const primaryOwnerUser = computed(() => {
  if (!event.value) return null;
  // For audits: show auditorId (fallback to eventOwnerId for legacy)
  if (isAuditEventType.value) return event.value.auditorId || event.value.eventOwnerId || event.value.organizer || null;
  // For non-audits: show eventOwnerId
  return event.value.eventOwnerId || event.value.organizer || null;
});

const primaryOwnerLabel = computed(() => (isAuditEventType.value ? 'Auditor' : 'Event Owner'));

const processing = ref(false);

const fetchEvent = async () => {
  try {
    loading.value = true;
    const response = await apiClient.get(`/events/${route.params.id}`);
    if (response.success) {
      event.value = response.data;
    } else {
      error.value = 'Event not found';
    }
  } catch (err) {
    console.error('Error fetching event:', err);
    error.value = err.message || 'Failed to load event';
  } finally {
    loading.value = false;
  }
};

const editEvent = () => {
  showEditModal.value = true;
};

// Guard to prevent infinite loops
let isHandlingUpdate = false;
let lastUpdateTimestamp = 0;
const UPDATE_DEBOUNCE = 1000; // Only update once per second

const handleEventUpdated = async () => {
  // Prevent infinite loops - don't handle if already handling or too soon
  const now = Date.now();
  if (isHandlingUpdate || (now - lastUpdateTimestamp < UPDATE_DEBOUNCE)) {
    console.log('[EventDetail] Skipping handleEventUpdated - already handling or too soon');
    return;
  }
  
  isHandlingUpdate = true;
  lastUpdateTimestamp = now;
  
  try {
    await fetchEvent();
    showEditModal.value = false;
  } catch (err) {
    console.error('[EventDetail] Error in handleEventUpdated:', err);
  } finally {
    isHandlingUpdate = false;
  }
};

const approveAudit = async () => {
  if (!confirm('Are you sure you want to approve this audit? This will immediately close the event and make all responses read-only.')) {
    return;
  }
  
  try {
    processing.value = true;
    const eventId = event.value.eventId || event.value._id;
    const response = await apiClient.post(`/events/${eventId}/approve-audit`);
    
    if (response.success) {
      event.value = response.data;
      alert('Audit approved and closed successfully.');
      await fetchEvent(); // Refresh event data
    } else {
      alert(response.message || 'Failed to approve audit.');
    }
  } catch (error) {
    console.error('Error approving audit:', error);
    alert('Failed to approve audit: ' + (error.message || 'Unknown error'));
  } finally {
    processing.value = false;
  }
};

const rejectAudit = async () => {
  const reason = prompt('Please provide a reason for rejection (optional):');
  if (reason === null) {
    return; // User cancelled
  }
  
  if (!confirm('Are you sure you want to reject this audit? All corrective actions will be reopened.')) {
    return;
  }
  
  try {
    processing.value = true;
    const eventId = event.value.eventId || event.value._id;
    const response = await apiClient.post(`/events/${eventId}/reject-audit`, {
      reason: reason || undefined
    });
    
    if (response.success) {
      event.value = response.data;
      alert(`Audit rejected. ${response.reopenedCount || 0} corrective action(s) reopened.`);
      await fetchEvent(); // Refresh event data
    } else {
      alert(response.message || 'Failed to reject audit.');
    }
  } catch (error) {
    console.error('Error rejecting audit:', error);
    alert('Failed to reject audit: ' + (error.message || 'Unknown error'));
  } finally {
    processing.value = false;
  }
};

const deleteEvent = async () => {
  if (!confirm('Are you sure you want to delete this event?')) return;
  
  try {
    await apiClient.delete(`/events/${route.params.id}`);
    router.push('/events');
  } catch (err) {
    console.error('Error deleting event:', err);
    alert('Failed to delete event');
  }
};

const addNote = async () => {
  if (!newNote.value.trim()) return;
  
  try {
    const response = await apiClient.post(`/events/${route.params.id}/notes`, {
      text: newNote.value.trim()
    });
    
    if (response.success) {
      event.value = response.data;
      newNote.value = '';
      showNoteForm.value = false;
    }
  } catch (err) {
    console.error('Error adding note:', err);
    alert('Failed to add note');
  }
};

const formatDateTime = (date) => {
  return dateUtils.format(date, 'MMM D, YYYY h:mm A');
};

const formatTimeAgo = (date) => {
  return dateUtils.fromNow(date);
};

const getDuration = () => {
  if (!event.value) return '';
  const start = new Date(event.value.startDateTime || event.value.startDate);
  const end = new Date(event.value.endDateTime || event.value.endDate);
  const duration = dateUtils.duration(end, start);
  
  if (duration.asHours() < 1) {
    return `${Math.round(duration.asMinutes())} minutes`;
  } else if (duration.asDays() < 1) {
    return `${Math.round(duration.asHours())} hours`;
  } else {
    return `${Math.round(duration.asDays())} days`;
  }
};

const viewFormResponse = () => {
  if (!hasFormResponse.value || !event.value.metadata.formResponses) return;
  
  // Get the first form response ID
  const responseId = event.value.metadata.formResponses[0];
  const formId = event.value.linkedFormId?._id || event.value.linkedFormId;
  
  if (formId && responseId) {
    router.push(`/forms/${formId}/responses/${responseId}`);
  }
};

const getInitials = (user) => {
  if (!user) return '';
  return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`;
};

const getOrgName = (org) => {
  if (!org) return 'N/A';
  if (typeof org === 'object' && org.name) {
    return org.name;
  }
  return 'Organization';
};

const getFormName = (form) => {
  if (!form) return 'N/A';
  if (typeof form === 'object' && form.name) {
    return form.name;
  }
  return 'Form';
};

const openForm = () => {
  if (event.value?.linkedFormId) {
    const eventIdValue = event.value.eventId || event.value._id;
    const formId = event.value.linkedFormId;
    
    // Get responseId from event metadata if available
    let responseId = null;
    if (event.value.metadata?.formResponses && event.value.metadata.formResponses.length > 0) {
      // Use the most recent form response
      responseId = event.value.metadata.formResponses[event.value.metadata.formResponses.length - 1];
    }
    
    // Try sessionStorage as fallback
    if (!responseId) {
      try {
        const storedResponseId = sessionStorage.getItem(`formResponse_${formId}_${eventIdValue}`);
        if (storedResponseId) {
          responseId = storedResponseId;
        }
      } catch (e) {
        console.warn('[EventDetail] Failed to read responseId from sessionStorage:', e);
      }
    }
    
    const query = {
      eventId: eventIdValue
    };
    
    if (responseId) {
      query.responseId = responseId;
    }
    
    router.push({
      path: `/forms/${formId}/fill`,
      query: query
    });
  }
};

// Audit state badge classes (for audit events only)
const getAuditStateBadgeClass = (state) => {
  if (!state) return '';
  
  const normalizedState = String(state).trim();
  
  const classes = {
    // Current audit state values
    'Ready to start': 'px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full text-xs font-medium',
    'checked_in': 'px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium',
    'submitted': 'px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-xs font-medium',
    'pending_corrective': 'px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-full text-xs font-medium',
    'needs_review': 'px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-full text-xs font-medium',
    'approved': 'px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-medium',
    'rejected': 'px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full text-xs font-medium',
    'closed': 'px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full text-xs font-medium',
    // Legacy values (for backward compatibility)
    'DRAFT': 'px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full text-xs font-medium',
    'IN_PROGRESS': 'px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium',
    'PAUSED': 'px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full text-xs font-medium',
    'SUBMITTED': 'px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-xs font-medium',
    'PENDING_CORRECTIVE': 'px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-full text-xs font-medium',
    'NEEDS_REVIEW': 'px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-full text-xs font-medium',
    'APPROVED': 'px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-medium',
    'REJECTED': 'px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full text-xs font-medium',
    'CLOSED': 'px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full text-xs font-medium'
  };
  
  return classes[normalizedState] || classes['Ready to start'];
};

// Format audit state for display (capitalize and add spaces)
const formatAuditState = (state) => {
  if (!state) return '';
  
  // Handle camelCase/snake_case states
  const formatted = String(state)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return formatted;
};

const getAuditProgress = () => {
  const rawState = event.value?.auditState;
  if (!rawState) return 0;

  // Canonical (current) audit state flow
  const steps = [
    'ready to start',
    'checked_in',
    'submitted',
    'pending_corrective',
    'needs_review',
    'approved',
    'closed'
  ];

  // Backward-compatible aliases + minor normalization
  const aliases = {
    // Current states (case/spacing variants)
    'ready to start': 'ready to start',
    'checked_in': 'checked_in',
    'submitted': 'submitted',
    'pending_corrective': 'pending_corrective',
    'needs_review': 'needs_review',
    'approved': 'approved',
    'closed': 'closed',
    'rejected': 'rejected',

    // Legacy states
    'draft': 'ready to start',
    'in_progress': 'checked_in',
    'pending corrective': 'pending_corrective',
    'needs review': 'needs_review'
  };

  const normalized = String(rawState).trim().toLowerCase();
  const canonical = aliases[normalized] || normalized;

  // Rejection re-opens corrective actions; treat it as a mid-workflow regression.
  if (canonical === 'rejected') {
    const pendingIdx = steps.indexOf('pending_corrective');
    return pendingIdx >= 0 ? Math.round((pendingIdx / (steps.length - 1)) * 100) : 50;
  }

  const idx = steps.indexOf(canonical);
  if (idx < 0) return 0;

  // 0% at "ready to start", 100% at "closed"
  return Math.round((idx / (steps.length - 1)) * 100);
};

const formatDuration = (seconds) => {
  if (!seconds) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const getConversionRate = () => {
  if (!event.value?.kpiActuals) return 0;
  const visits = event.value.kpiActuals.visitsCompleted || 0;
  const orders = event.value.kpiActuals.ordersCreated || 0;
  if (visits === 0) return 0;
  return Math.round((orders / visits) * 100);
};

const hasFormResponse = computed(() => {
  return event.value?.metadata?.formResponses && event.value.metadata.formResponses.length > 0;
});

const formResponseCount = computed(() => {
  return event.value?.metadata?.formResponses?.length || 0;
});

// Status badge classes for system-controlled status (Planned, Completed, Cancelled)
// Status badge classes for system-controlled status (Planned, Completed, Cancelled)
const getStatusBadgeClass = (status) => {
  // Normalize status to handle both old and new values during migration
  const normalizedStatus = status ? String(status).trim() : 'Planned';
  
  const classes = {
    // New system-controlled statuses
    'Planned': 'px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full text-xs font-medium',
    'Completed': 'px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-medium',
    'Cancelled': 'px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full text-xs font-medium',
    // Legacy statuses (for backward compatibility during migration)
    'PLANNED': 'px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full text-xs font-medium',
    'STARTED': 'px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium',
    'CHECKED_IN': 'px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-medium',
    'IN_PROGRESS': 'px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-full text-xs font-medium',
    'PAUSED': 'px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full text-xs font-medium',
    'CHECKED_OUT': 'px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full text-xs font-medium',
    'SUBMITTED': 'px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-xs font-medium',
    'PENDING_CORRECTIVE': 'px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-full text-xs font-medium',
    'NEEDS_REVIEW': 'px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-full text-xs font-medium',
    'APPROVED': 'px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-medium',
    'REJECTED': 'px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full text-xs font-medium',
    'CLOSED': 'px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full text-xs font-medium'
  };
  return classes[normalizedStatus] || classes['Planned'];
};


// Phase 1F: Handle execution action with UX polish
const handleExecutionAction = async (actionData) => {
  try {
    const { capabilityKey, capability } = actionData;
    
    // Phase 1F: Set executing state
    executing.value = true;
    executingCapabilityKey.value = capabilityKey;
    
    // Show confirmation if required
    if (capability?.uiHints?.confirmationRequired) {
      const confirmed = confirm(`Are you sure you want to ${capability.uiHints.label.toLowerCase()}?`);
      if (!confirmed) {
        executing.value = false;
        executingCapabilityKey.value = null;
        return;
      }
    }

    // Phase 1F: Optimistic UI lock - disable interactions
    // (No optimistic state mutation, just visual lock)

    // Prepare params based on action type
    const params = {};
    if (capabilityKey === 'AUDIT_CHECK_IN' && actionData.location) {
      params.location = actionData.location;
    }
    if (capabilityKey === 'AUDIT_SUBMIT') {
      params.formResponseId = actionData.formResponseId;
      params.orgIndex = actionData.orgIndex;
    }
    if (capabilityKey === 'AUDIT_REJECT') {
      params.reason = actionData.reason;
    }

    // Execute action via execution API
    const response = await apiClient.post('/execution/execute', {
      capabilityKey,
      recordId: route.params.id,
      params
    });

    if (response.success) {
      // Phase 1F: Refresh record context after success (backend is source of truth)
      await fetchEvent();
      await loadRecordContext();
      
      // Phase 1F: Show success toast
      if (!response.duplicate) {
        showSuccess(response.message || 'Action completed successfully');
      }
    } else {
      // Phase 1F: Show mapped error feedback
      const errorMessage = response.error?.message || response.message || 'Action failed';
      showError(errorMessage);
    }
  } catch (err) {
    console.error('[EventDetail] Execution error:', err);
    
    // Phase 1F: Show mapped error feedback
    const errorMessage = err.error?.message || err.message || 'Failed to execute action';
    showError(errorMessage);
  } finally {
    // Phase 1F: Clear executing state
    executing.value = false;
    executingCapabilityKey.value = null;
  }
};

onMounted(async () => {
  await fetchEvent();
  // Load record context for execution capabilities (uses route.params.id from composable)
  if (route.params.id) {
    await loadRecordContext();
  }
});
</script>

