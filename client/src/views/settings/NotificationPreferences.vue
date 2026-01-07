<template>
  <div class="w-full">
    <div class="w-full">
      <!-- Header -->
      <header class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Notification preferences
          </h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Control in-app and email notifications for this workspace.
          </p>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <!-- Link to notification rules (Phase 17) -->
          <router-link
            to="/settings/notifications/rules"
            class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Notification Rules
          </router-link>
          <!-- Admin link to health dashboard (Phase 15) -->
          <router-link
            v-if="authStore.isAdminLike"
            to="/settings/notifications/health"
            class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="none">
              <path d="M10 2a6 6 0 0 0-6 6v3.586l-.707.707A1 1 0 0 0 4 14h12a1 1 0 0 0 .707-1.707L16 11.586V8a6 6 0 0 0-6-6ZM10 18a3 3 0 0 1-3-3h6a3 3 0 0 1-3 3Z" fill="currentColor" />
            </svg>
            Health Dashboard
          </router-link>
        </div>
        <div class="flex items-center gap-3 text-xs sm:text-sm">
          <span
            v-if="saving"
            class="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400"
          >
            <span class="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" aria-hidden="true"></span>
            Saving…
          </span>
          <span
            v-else-if="lastSavedAt && !error"
            class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"
          >
            <svg
              class="w-4 h-4"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M16.704 5.29a1 1 0 0 0-1.408-1.42L8 11.293 4.707 8a1 1 0 0 0-1.414 1.414l4 4a1 1 0 0 0 1.414 0l8-8.125Z"
                fill="currentColor"
              />
            </svg>
            Saved
          </span>
          <span
            v-if="error"
            class="inline-flex items-center gap-1 text-red-600 dark:text-red-400"
          >
            <svg
              class="w-4 h-4"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M10 3a7 7 0 1 0 0 14A7 7 0 0 0 10 3Zm0 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 7Zm0 7a.875.875 0 1 1 0-1.75A.875.875 0 0 1 10 14Z"
                fill="currentColor"
              />
            </svg>
            <span>Couldn’t save changes. Please try again.</span>
          </span>
        </div>
      </header>

      <!-- Error state for initial load -->
      <div
        v-if="!loading && !hasLoaded && error"
        class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300"
      >
        We couldn’t load your notification preferences right now. Notifications will
        continue using their defaults. You can keep using the app safely.
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="space-y-3">
        <div class="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div
            v-for="i in 4"
            :key="i"
            class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-2"
          >
            <div class="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div class="h-3 w-48 bg-gray-100 dark:bg-gray-700/80 rounded animate-pulse"></div>
            <div class="mt-3 flex justify-end gap-3">
              <div class="h-5 w-16 bg-gray-100 dark:bg-gray-700/80 rounded-full animate-pulse"></div>
              <div class="h-5 w-16 bg-gray-100 dark:bg-gray-700/80 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Preferences content (including channel overview) -->
      <div
        v-else-if="!loading"
        class="space-y-6 mt-4"
      >
        <!-- Channel Overview (Phase 14) -->
        <div
          class="mb-6 p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        >
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">
              Notification delivery
            </h2>
          </div>
          <div class="flex flex-wrap items-center gap-2 sm:gap-3">
            <ChannelBadge
              channel="inApp"
              :enabled="channelSummary.inApp.enabled"
              :available="true"
              :clickable="true"
              @click="scrollToChannel('inApp')"
            />
            <ChannelBadge
              channel="email"
              :enabled="channelSummary.email.enabled"
              :available="true"
              :clickable="true"
              @click="scrollToChannel('email')"
            />
            <ChannelBadge
              v-if="currentAppKey === 'CRM' || currentAppKey === 'AUDIT'"
              channel="push"
              :enabled="channelSummary.push.enabled"
              :available="true"
              :clickable="true"
              @click="scrollToChannel('push')"
            />
            <ChannelBadge
              v-if="currentAppKey === 'AUDIT' || currentAppKey === 'PORTAL'"
              channel="whatsapp"
              :enabled="channelSummary.whatsapp.enabled"
              :available="true"
              :clickable="true"
              @click="scrollToChannel('whatsapp')"
            />
            <ChannelBadge
              v-if="currentAppKey === 'PORTAL'"
              channel="sms"
              :enabled="channelSummary.sms.enabled"
              :available="true"
              :clickable="true"
              @click="scrollToChannel('sms')"
            />
          </div>
          <p class="mt-3 text-xs text-gray-600 dark:text-gray-400">
            Click a channel to jump to its settings. Disabled channels are not available for this app.
          </p>
        </div>
        <div
          v-for="group in groupedEvents"
          :key="`${group.id}-${renderKey}`"
          class="border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800"
        >
          <!-- Group header -->
          <button
            type="button"
            class="w-full flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4"
            @click="toggleGroup(group.id)"
            :aria-expanded="isGroupOpen(group.id)"
          >
            <div class="text-left">
              <h2 class="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                {{ group.label }}
              </h2>
              <p class="mt-0.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {{ group.description }}
              </p>
            </div>
            <svg
              class="w-5 h-5 text-gray-400"
              :class="{
                'rotate-180': isGroupOpen(group.id)
              }"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.188l3.71-3.957a.75.75 0 1 1 1.1 1.02l-4.25 4.53a.75.75 0 0 1-1.1 0l-4.25-4.53a.75.75 0 0 1 .02-1.06Z"
                fill="currentColor"
              />
            </svg>
          </button>

          <!-- Group rows -->
          <transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="transform scale-y-95 opacity-0"
            enter-to-class="transform scale-y-100 opacity-100"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="transform scale-y-100 opacity-100"
            leave-to-class="transform scale-y-95 opacity-0"
          >
            <div
              v-if="isGroupOpen(group.id)"
              class="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700"
            >
              <div
                v-for="event in group.events"
                :key="`${event.eventType}-${event.inAppEnabled}-${event.emailEnabled}-${renderKey}`"
                class="px-4 py-3 sm:px-5 sm:py-4"
              >
                <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <!-- Label & description -->
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ event.label }}
                    </p>
                    <p class="mt-0.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      {{ event.description }}
                    </p>
                    <p
                      v-if="event.isUnknown"
                      class="mt-1 text-[11px] uppercase tracking-wide text-amber-600 dark:text-amber-400 font-semibold"
                    >
                      System event (managed by LiteDesk)
                    </p>
                  </div>

                  <!-- Channel badges and toggles (Phase 14) -->
                  <div class="flex flex-col gap-3 sm:gap-2 justify-end sm:items-end">
                    <!-- Channel badges (inline) -->
                    <div class="flex flex-wrap items-center gap-2 justify-end">
                      <ChannelBadge
                        channel="inApp"
                        :enabled="event.inAppEnabled"
                        :available="event.inAppAvailable"
                      />
                      <ChannelBadge
                        channel="email"
                        :enabled="event.emailEnabled"
                        :available="event.emailAvailable"
                      />
                      <ChannelBadge
                        v-if="event.pushAvailable"
                        channel="push"
                        :enabled="event.pushEnabled"
                        :available="event.pushAvailable"
                      />
                      <ChannelBadge
                        v-if="event.whatsappAvailable"
                        channel="whatsapp"
                        :enabled="event.whatsappEnabled"
                        :available="event.whatsappAvailable"
                      />
                      <ChannelBadge
                        v-if="event.smsAvailable"
                        channel="sms"
                        :enabled="event.smsEnabled"
                        :available="event.smsAvailable"
                      />
                    </div>
                    
                    <!-- Toggles (compact) -->
                    <div class="flex gap-3 sm:gap-2 justify-end">
                      <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-600 dark:text-gray-400">
                          In app
                        </span>
                        <button
                          :key="`inApp-${event.eventType}-${event.inAppEnabled}-${renderKey}`"
                          type="button"
                          class="relative inline-flex h-11 w-11 sm:h-6 sm:w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:cursor-not-allowed"
                          :class="event.inAppAvailable ? (event.inAppEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700') : 'bg-gray-100 dark:bg-gray-800 opacity-60'"
                          role="switch"
                          :aria-checked="event.inAppEnabled"
                          :aria-label="`Toggle in-app notifications for ${event.label}`"
                          :disabled="!event.inAppAvailable"
                          @click="handleToggle(event.eventType, 'inApp', !event.inAppEnabled)"
                        >
                          <span
                            aria-hidden="true"
                            class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200"
                            :class="event.inAppEnabled ? 'translate-x-5' : 'translate-x-0'"
                          ></span>
                        </button>
                      </div>

                      <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-600 dark:text-gray-400">
                          Email
                        </span>
                        <button
                          :key="`email-${event.eventType}-${event.emailEnabled}-${renderKey}`"
                          type="button"
                          class="relative inline-flex h-11 w-11 sm:h-6 sm:w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:cursor-not-allowed"
                          :class="event.emailAvailable ? (event.emailEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700') : 'bg-gray-100 dark:bg-gray-800 opacity-60'"
                          role="switch"
                          :aria-checked="event.emailEnabled"
                          :aria-label="`Toggle email notifications for ${event.label}`"
                          :disabled="!event.emailAvailable"
                          @click="handleToggle(event.eventType, 'email', !event.emailEnabled)"
                        >
                          <span
                            aria-hidden="true"
                            class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200"
                            :class="event.emailEnabled ? 'translate-x-5' : 'translate-x-0'"
                          ></span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </div>

        <!-- Empty state (no events for this app) -->
        <div
          v-if="groupedEvents.length === 0 && hasLoaded"
          class="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 px-4 py-8 text-center text-sm text-gray-600 dark:text-gray-400"
        >
          There are no configurable notification events for this app yet.
          Notifications will continue using their safe defaults.
        </div>

        <!-- Channel-Specific Sections (Phase 14) -->
        <div class="space-y-4 mt-8">
          <!-- Push Notifications Section -->
          <!-- Show for CRM and AUDIT apps -->
          <div
            v-if="currentAppKey === 'CRM' || currentAppKey === 'AUDIT'"
            id="channel-section-push"
          >
            <NotificationChannelSection
              channel="push"
              title="Push Notifications"
              description="Receive notifications even when the app is closed"
              helper-text="Used for critical alerts only. Requires browser permission."
              :available="true"
              :enabled="channelSummary.push.enabled"
              :status-text="pushStatusText"
              :default-open="false"
              @toggle="handleChannelGlobalToggle('push', $event)"
            >
              <div class="space-y-3">
                <button
                  v-if="pushPermissionStatus === 'default'"
                  type="button"
                  @click="requestPushPermission"
                  class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Enable Push Notifications
                </button>
                <button
                  v-if="pushPermissionStatus === 'granted'"
                  type="button"
                  @click="testPushNotification"
                  class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Test Notification
                </button>
                <p
                  v-if="pushPermissionStatus === 'denied'"
                  class="text-xs text-amber-600 dark:text-amber-400"
                >
                  Push notifications are blocked. Enable them in your browser settings.
                </p>
              </div>
            </NotificationChannelSection>
          </div>

          <!-- WhatsApp Section -->
          <div
            v-if="currentAppKey === 'AUDIT' || currentAppKey === 'PORTAL'"
            id="channel-section-whatsapp"
          >
            <NotificationChannelSection
              channel="whatsapp"
              title="WhatsApp Notifications"
              description="Receive critical alerts via WhatsApp"
              helper-text="Used for critical lifecycle events only. One message per event. No marketing content."
              :available="true"
              :enabled="channelSummary.whatsapp.enabled"
              :default-open="false"
              @toggle="handleChannelGlobalToggle('whatsapp', $event)"
            >
              <p class="text-xs text-gray-600 dark:text-gray-400">
                WhatsApp notifications are only sent for high-priority events in Audit and Portal apps.
              </p>
            </NotificationChannelSection>
          </div>

          <!-- SMS Section -->
          <div
            v-if="currentAppKey === 'PORTAL'"
            id="channel-section-sms"
          >
            <NotificationChannelSection
              channel="sms"
              title="SMS Notifications"
              description="Emergency fallback for critical alerts"
              helper-text="Used only when push and email are both unavailable. Short messages under 160 characters."
              :available="true"
              :enabled="channelSummary.sms.enabled"
              status-text="Emergency use only"
              :default-open="false"
              @toggle="handleChannelGlobalToggle('sms', $event)"
            >
              <div class="space-y-2">
                <p class="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  ⚠️ Use sparingly
                </p>
                <p class="text-xs text-gray-600 dark:text-gray-400">
                  SMS is only used as a last resort when other channels are unavailable. Messages are kept short and include deep links when possible.
                </p>
              </div>
            </NotificationChannelSection>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useNotificationStore } from '@/stores/notifications';
import { useNotificationPreferencesStore } from '@/stores/notificationPreferences';
import { useAuthStore } from '@/stores/auth';
import ChannelBadge from '@/components/notifications/ChannelBadge.vue';
import NotificationChannelSection from '@/components/notifications/NotificationChannelSection.vue';

const route = useRoute();
const notificationStore = useNotificationStore();
const prefsStore = useNotificationPreferencesStore();
const authStore = useAuthStore();

const { loading, saving, error, hasLoaded, lastSavedAt, appPreferences, rawPreferences, fetchPreferences, updatePreference, applyOptimisticUpdate } =
  prefsStore;

// Force re-render key to ensure template updates when preferences change
const renderKey = ref(0);

// Simple group open/close state
const openGroups = ref(new Set());

const currentAppKey = computed(() => notificationStore.currentAppKey());

// Phase 14: Channel summary for overview section
const channelSummary = computed(() => {
  const appPrefs = appPreferences.value || {};
  const events = Object.values(appPrefs);
  
  const summary = {
    inApp: { enabled: false, available: true },
    email: { enabled: false, available: true },
    push: { enabled: false, available: false },
    whatsapp: { enabled: false, available: false },
    sms: { enabled: false, available: false }
  };
  
  events.forEach(event => {
    if (event.inApp?.enabled) summary.inApp.enabled = true;
    if (event.inApp?.available === false) summary.inApp.available = false;
    
    if (event.email?.enabled) summary.email.enabled = true;
    if (event.email?.available === false) summary.email.available = false;
    
    if (event.push?.enabled) summary.push.enabled = true;
    if (event.push?.available) summary.push.available = true;
    
    if (event.whatsapp?.enabled) summary.whatsapp.enabled = true;
    if (event.whatsapp?.available) summary.whatsapp.available = true;
    
    if (event.sms?.enabled) summary.sms.enabled = true;
    if (event.sms?.available) summary.sms.available = true;
  });
  
  return summary;
});

function scrollToChannel(channel) {
  const element = document.getElementById(`channel-section-${channel}`);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Open the section if it's collapsible
    if (channel === 'push' || channel === 'whatsapp' || channel === 'sms') {
      setTimeout(() => {
        const button = element.querySelector('button');
        if (button && button.getAttribute('aria-expanded') === 'false') {
          button.click();
        }
      }, 300);
    }
  }
}

// UI-only grouping definitions per app.
// These keys must match backend eventType values; we only group and label.
const GROUP_DEFINITIONS = {
  CRM: [
    {
      id: 'audit-lifecycle',
      label: 'Audit lifecycle',
      description: 'Stay informed as audits progress through their lifecycle.',
      events: [
        'AUDIT_CREATED',
        'AUDIT_IN_PROGRESS',
        'AUDIT_COMPLETED'
      ]
    },
    {
      id: 'corrective-actions',
      label: 'Corrective actions',
      description: 'Know when corrective actions are created or updated.',
      events: [
        'CORRECTIVE_ACTION_ASSIGNED',
        'CORRECTIVE_ACTION_UPDATED',
        'CORRECTIVE_ACTION_OVERDUE'
      ]
    },
    {
      id: 'subscription-billing',
      label: 'Subscription & billing',
      description: 'Receive updates about your LiteDesk subscription.',
      events: [
        'SUBSCRIPTION_RENEWAL',
        'SUBSCRIPTION_PAST_DUE',
        'SUBSCRIPTION_CANCELLED'
      ]
    },
    {
      id: 'system-alerts',
      label: 'System alerts',
      description: 'Important system-level alerts about your workspace.',
      events: [
        'SYSTEM_ALERT',
        'INTEGRATION_ERROR'
      ]
    }
  ],
  AUDIT: [
    {
      id: 'audit-assignments',
      label: 'Audit assignments',
      description: 'Notifications when you are assigned to an audit.',
      events: [
        'AUDIT_ASSIGNED',
        'AUDIT_UNASSIGNED'
      ]
    },
    {
      id: 'audit-status-changes',
      label: 'Audit status changes',
      description: 'Status changes for audits you are involved in.',
      events: [
        'AUDIT_STATUS_CHANGED',
        'AUDIT_DUE_SOON'
      ]
    },
    {
      id: 'ca-updates',
      label: 'Corrective action updates',
      description: 'Changes to corrective actions related to your audits.',
      events: [
        'CORRECTIVE_ACTION_UPDATED',
        'CORRECTIVE_ACTION_COMPLETED'
      ]
    }
  ],
  PORTAL: [
    {
      id: 'portal-corrective-actions',
      label: 'Corrective actions',
      description: 'Updates to corrective actions assigned to you.',
      events: [
        'PORTAL_CORRECTIVE_ACTION_ASSIGNED',
        'PORTAL_CORRECTIVE_ACTION_UPDATED'
      ]
    },
    {
      id: 'portal-visibility',
      label: 'Audit visibility',
      description: 'When new audits or findings become visible to you.',
      events: [
        'PORTAL_AUDIT_VISIBLE',
        'PORTAL_FINDING_VISIBLE'
      ]
    }
  ]
};

// Build UI model from backend-provided preferences and UI groups.
const groupedEvents = computed(() => {
  const appKey = currentAppKey.value || 'CRM';
  const raw = appPreferences.value || {};

  const definitions = GROUP_DEFINITIONS[appKey] || [];

  // Flatten known events from group definitions
  const knownEventTypes = new Set(
    definitions.flatMap((g) => g.events)
  );

  const result = [];

  for (const group of definitions) {
    const events = group.events
      .map((eventType) => {
        const conf = raw[eventType] || {};
        const inApp = conf.inApp || {};
        const email = conf.email || {};

        return {
          eventType,
          label: eventTypeToLabel(eventType),
          description: eventTypeToDescription(eventType, appKey),
          isUnknown: false,
          inAppEnabled: typeof inApp === 'object' ? !!inApp.enabled : !!inApp,
          inAppAvailable: typeof inApp === 'object' ? inApp.available !== false : true,
          emailEnabled: typeof email === 'object' ? !!email.enabled : !!email,
          emailAvailable: typeof email === 'object' ? email.available !== false : true,
          pushEnabled: conf.push?.enabled || false,
          pushAvailable: conf.push?.available !== false,
          whatsappEnabled: conf.whatsapp?.enabled || false,
          whatsappAvailable: conf.whatsapp?.available !== false,
          smsEnabled: conf.sms?.enabled || false,
          smsAvailable: conf.sms?.available !== false
        };
      })
      .filter(Boolean);

    if (events.length > 0) {
      result.push({
        id: group.id,
        label: group.label,
        description: group.description,
        events
      });
    }
  }

  // Handle unknown event types from backend (render as a separate group)
  const unknownEvents = Object.keys(raw)
    .filter((eventType) => !knownEventTypes.has(eventType))
    .map((eventType) => {
      const conf = raw[eventType] || {};
      const inApp = conf.inApp || {};
      const email = conf.email || {};

      return {
        eventType,
        label: 'System event',
        description: 'This event is managed by LiteDesk and may be required for system operation.',
        isUnknown: true,
        inAppEnabled: typeof inApp === 'object' ? !!inApp.enabled : !!inApp,
        inAppAvailable: typeof inApp === 'object' ? inApp.available !== false : true,
        emailEnabled: typeof email === 'object' ? !!email.enabled : !!email,
        emailAvailable: typeof email === 'object' ? email.available !== false : true,
        pushEnabled: conf.push?.enabled || false,
        pushAvailable: conf.push?.available !== false,
        whatsappEnabled: conf.whatsapp?.enabled || false,
        whatsappAvailable: conf.whatsapp?.available !== false,
        smsEnabled: conf.sms?.enabled || false,
        smsAvailable: conf.sms?.available !== false
      };
    });

  if (unknownEvents.length > 0) {
    result.push({
      id: 'system-events',
      label: 'Other system events',
      description: 'Read-only events managed by the system. Channels may be limited.',
      events: unknownEvents
    });
  }

  return result;
});

function isGroupOpen(id) {
  return openGroups.value.has(id);
}

function toggleGroup(id) {
  const copy = new Set(openGroups.value);
  if (copy.has(id)) {
    copy.delete(id);
  } else {
    copy.add(id);
  }
  openGroups.value = copy;
}

function eventTypeToLabel(eventType) {
  // Simple, UI-only mapping. We do not change backend semantics.
  const map = {
    AUDIT_CREATED: 'Audit created',
    AUDIT_IN_PROGRESS: 'Audit in progress',
    AUDIT_COMPLETED: 'Audit completed',
    CORRECTIVE_ACTION_ASSIGNED: 'Corrective action assigned',
    CORRECTIVE_ACTION_UPDATED: 'Corrective action updated',
    CORRECTIVE_ACTION_OVERDUE: 'Corrective action overdue',
    SUBSCRIPTION_RENEWAL: 'Subscription renewal',
    SUBSCRIPTION_PAST_DUE: 'Subscription payment issue',
    SUBSCRIPTION_CANCELLED: 'Subscription cancelled',
    SYSTEM_ALERT: 'System alert',
    INTEGRATION_ERROR: 'Integration error',
    AUDIT_ASSIGNED: 'Audit assigned',
    AUDIT_UNASSIGNED: 'Audit unassigned',
    AUDIT_STATUS_CHANGED: 'Audit status changed',
    AUDIT_DUE_SOON: 'Audit due soon',
    CORRECTIVE_ACTION_COMPLETED: 'Corrective action completed',
    PORTAL_CORRECTIVE_ACTION_ASSIGNED: 'Corrective action assigned to you',
    PORTAL_CORRECTIVE_ACTION_UPDATED: 'Corrective action updated',
    PORTAL_AUDIT_VISIBLE: 'New audit available',
    PORTAL_FINDING_VISIBLE: 'New finding visible'
  };

  return map[eventType] || eventType;
}

function eventTypeToDescription(eventType, appKey) {
  // Short, user-facing descriptions (UI-only).
  const map = {
    AUDIT_CREATED: 'When a new audit is created in this workspace.',
    AUDIT_IN_PROGRESS: 'When an audit moves into the in-progress stage.',
    AUDIT_COMPLETED: 'When an audit is marked as completed.',
    CORRECTIVE_ACTION_ASSIGNED: 'When a corrective action is assigned to an owner.',
    CORRECTIVE_ACTION_UPDATED: 'When details or status of a corrective action change.',
    CORRECTIVE_ACTION_OVERDUE: 'When a corrective action passes its due date.',
    SUBSCRIPTION_RENEWAL: 'Upcoming renewals for your LiteDesk subscription.',
    SUBSCRIPTION_PAST_DUE: 'Issues collecting payment for your subscription.',
    SUBSCRIPTION_CANCELLED: 'When your subscription is cancelled.',
    SYSTEM_ALERT: 'Important system-level alerts and incidents.',
    INTEGRATION_ERROR: 'Problems delivering events to connected systems.',
    AUDIT_ASSIGNED: 'When you are assigned to an audit.',
    AUDIT_UNASSIGNED: 'When you are removed from an audit.',
    AUDIT_STATUS_CHANGED: 'Status changes for audits you are involved in.',
    AUDIT_DUE_SOON: 'Upcoming deadlines for your audits.',
    CORRECTIVE_ACTION_COMPLETED: 'When a corrective action is completed.',
    PORTAL_CORRECTIVE_ACTION_ASSIGNED: 'When a corrective action is assigned to you in the portal.',
    PORTAL_CORRECTIVE_ACTION_UPDATED: 'When your corrective actions are updated.',
    PORTAL_AUDIT_VISIBLE: 'When a new audit becomes visible to you.',
    PORTAL_FINDING_VISIBLE: 'When a new finding or observation is shared with you.'
  };

  if (map[eventType]) return map[eventType];

  // Fallback description with app context
  if (appKey === 'PORTAL') {
    return 'Portal notification managed by LiteDesk.';
  }
  if (appKey === 'AUDIT') {
    return 'Audit notification managed by LiteDesk.';
  }
  return 'Notification managed by LiteDesk.';
}

// Phase 14: Push notification state
const pushPermissionStatus = ref('default'); // 'default' | 'granted' | 'denied'

// Check push permission status on mount
onMounted(async () => {
  if ('Notification' in window && 'serviceWorker' in navigator) {
    pushPermissionStatus.value = Notification.permission;
  }
});

const pushStatusText = computed(() => {
  if (pushPermissionStatus.value === 'granted') {
    return 'Active';
  }
  if (pushPermissionStatus.value === 'denied') {
    return 'Denied';
  }
  return 'Not enabled';
});

async function requestPushPermission() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    alert('Push notifications are not supported in this browser.');
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    pushPermissionStatus.value = permission;
    
    if (permission === 'granted') {
      // Subscribe to push notifications
      await subscribeToPush();
    }
  } catch (error) {
    console.error('[NotificationPreferences] Failed to request push permission:', error);
  }
}

async function subscribeToPush() {
  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Get VAPID public key
    const response = await fetch('/api/push/public-key');
    const { publicKey } = await response.json();
    
    if (!publicKey) {
      console.error('[NotificationPreferences] No VAPID public key available');
      return;
    }
    
    // Convert VAPID key
    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    
    // Subscribe
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });
    
    // Send subscription to backend
    const appKey = currentAppKey.value;
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        appKey,
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth'))
        }
      })
    });
    
    // Enable push in preferences
    // This will be handled by the backend when subscription is created
  } catch (error) {
    console.error('[NotificationPreferences] Failed to subscribe to push:', error);
  }
}

async function testPushNotification() {
  if (pushPermissionStatus.value !== 'granted') {
    return;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification('Test Notification', {
      body: 'Push notifications are working!',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'test-notification'
    });
  } catch (error) {
    console.error('[NotificationPreferences] Failed to show test notification:', error);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Phase 14: Handle global channel toggle
async function handleChannelGlobalToggle(channel, enabled) {
  // Enable/disable channel for all events that have this channel available
  const appPrefs = appPreferences.value || {};
  const eventTypes = Object.keys(appPrefs);
  
  // Update all events for this channel (with debouncing handled per event)
  for (const eventType of eventTypes) {
    const event = appPrefs[eventType];
    const channelData = event?.[channel];
    
    // Only toggle if channel is available for this event
    if (channelData?.available !== false) {
      handleToggle(eventType, channel, enabled);
    }
  }
}

// Handle toggle with immediate optimistic update and debounced API call
let debounceTimer = null;
function handleToggle(eventType, channel, enabled) {
  console.log('[NotificationPreferences] Toggle clicked:', { eventType, channel, enabled });
  
  // Clear any pending debounce
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  // Apply optimistic update immediately using store method (triggers reactivity properly)
  const success = applyOptimisticUpdate({ eventType, channel, enabled });
  if (!success) {
    console.warn('[NotificationPreferences] Could not apply optimistic update - channel not available');
    return;
  }

  // Force template re-render by updating key
  renderKey.value += 1;
  
  // Debug: Check if the computed property has the updated value
  try {
    const groupedEventsValue = groupedEvents.value;
    const updatedGroup = groupedEventsValue?.find(g => 
      g?.events?.some(e => e?.eventType === eventType)
    );
    const updatedEvent = updatedGroup?.events?.find(e => e?.eventType === eventType);
    
    const appKey = notificationStore?.currentAppKey() || 'CRM';
    // Access from store directly to avoid destructuring issues
    const rawPrefsValue = prefsStore.rawPreferences?.value;
    const appPrefsValue = prefsStore.appPreferences?.value;
    
    console.log('[NotificationPreferences] Optimistic update applied, debouncing API call.', {
      groupedEventsLength: groupedEventsValue?.length || 0,
      updatedEvent: updatedEvent ? {
        eventType: updatedEvent.eventType,
        inAppEnabled: updatedEvent.inAppEnabled,
        emailEnabled: updatedEvent.emailEnabled
      } : null,
      appPrefsValue: appPrefsValue?.[eventType] || null,
      rawPrefsApps: rawPrefsValue?.apps?.[appKey]?.[eventType] || null,
      allAppPrefs: Object.keys(appPrefsValue || {})
    });
  } catch (err) {
    console.error('[NotificationPreferences] Error in debug logging:', err);
  }

  // Debounce the API call to coalesce rapid changes
  debounceTimer = setTimeout(() => {
    console.log('[NotificationPreferences] Calling updatePreference API');
    updatePreference({ eventType, channel, enabled });
  }, 350);
}

onMounted(async () => {
  // Always load preferences on first mount; backend handles defaults.
  await fetchPreferences();

  // Open all groups by default for better discoverability on larger screens
  const appKey = currentAppKey.value || 'CRM';
  const defs = GROUP_DEFINITIONS[appKey] || [];
  const initial = new Set(defs.map((g) => g.id));
  if (defs.length > 0) {
    openGroups.value = initial;
  }
  
  // Check push permission status
  if ('Notification' in window && 'serviceWorker' in navigator) {
    pushPermissionStatus.value = Notification.permission;
  }
});
</script>


