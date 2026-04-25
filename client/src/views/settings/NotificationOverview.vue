<template>
  <div class="w-full max-w-4xl mx-auto">
    <!-- Header -->
    <header class="mb-6">
      <!-- Breadcrumb -->
      <nav class="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <router-link to="/settings" class="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          Settings
        </router-link>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
        <router-link to="/settings?tab=notifications&notificationPage=overview" class="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          Notifications
        </router-link>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
        <span class="text-gray-900 dark:text-white">Overview</span>
      </nav>
      <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
        Notification Overview
      </h1>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Learn how notifications work and what you can control.
      </p>
    </header>

    <!-- Section 1: What you're notified about -->
    <section class="mb-8">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        What you're notified about
      </h2>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Notifications are organized by intent to help you stay informed without being overwhelmed.
      </p>

      <div class="space-y-4">
        <!-- Assignments -->
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Assignments
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
            When tasks, audits, or corrective actions are assigned to you.
          </p>
          <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>• Audit assigned to you</p>
            <p>• Task assigned to you</p>
            <p>• Corrective action assigned to you</p>
          </div>
          <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <span class="text-xs text-gray-500 dark:text-gray-400">System-defined</span>
          </div>
        </div>

        <!-- Updates -->
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Updates
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Status changes, submissions, approvals, and other important updates.
          </p>
          <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>• Audit status changed</p>
            <p>• Task completed</p>
            <p>• Audit submitted for review</p>
            <p>• Evidence uploaded</p>
          </div>
          <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <span class="text-xs text-gray-500 dark:text-gray-400">System-defined • Rule-based</span>
          </div>
        </div>

        <!-- Deadlines -->
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Deadlines
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Reminders for upcoming or overdue items.
          </p>
          <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>• Corrective action due soon</p>
            <p>• Task deadline approaching</p>
            <p>• Overdue corrective actions</p>
          </div>
          <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <span class="text-xs text-gray-500 dark:text-gray-400">System-defined • User-controlled</span>
          </div>
        </div>

        <!-- Conversations -->
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Conversations
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Activity that involves collaboration and review.
          </p>
          <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>• Audit needs review</p>
            <p>• Audit approved or rejected</p>
          </div>
          <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <span class="text-xs text-gray-500 dark:text-gray-400">System-defined</span>
          </div>
        </div>

        <!-- Compliance & System Events -->
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Compliance & system events
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Account activity, system updates, and compliance-related notifications.
          </p>
          <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>• Portal account created</p>
            <p>• User added to app</p>
            <p>• Trial expiring</p>
            <p>• Subscription status changes</p>
          </div>
          <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <span class="text-xs text-gray-500 dark:text-gray-400">System-defined</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 2: How you're notified -->
    <section class="mb-8">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        How you're notified
      </h2>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Choose where and how you receive notifications across different delivery channels.
      </p>

      <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 mb-4">
        <div class="space-y-4">
          <!-- In-App -->
          <div class="flex items-start justify-between pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0">
            <div class="flex-1">
              <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-1">
                In-app
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Always available • All apps
              </p>
            </div>
            <span class="text-xs text-gray-500 dark:text-gray-400">Always on</span>
          </div>

          <!-- Email -->
          <div class="flex items-start justify-between pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0">
            <div class="flex-1">
              <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-1">
                Email
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Optional • All apps
              </p>
            </div>
            <span class="text-xs text-gray-500 dark:text-gray-400">Configurable</span>
          </div>

          <!-- Push -->
          <div class="flex items-start justify-between pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0">
            <div class="flex-1">
              <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-1">
                Push
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                High-priority alerts • Available in selected apps
              </p>
            </div>
            <span class="text-xs text-gray-500 dark:text-gray-400">Configurable</span>
          </div>

          <!-- WhatsApp -->
          <div class="flex items-start justify-between pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0">
            <div class="flex-1">
              <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-1">
                WhatsApp
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Critical events • Audit, Portal
              </p>
            </div>
            <span class="text-xs text-gray-500 dark:text-gray-400">Configurable</span>
          </div>

          <!-- SMS -->
          <div class="flex items-start justify-between last:border-0 last:pb-0">
            <div class="flex-1">
              <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-1">
                SMS
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Emergency fallback • Portal
              </p>
            </div>
            <span class="text-xs text-gray-500 dark:text-gray-400">Configurable</span>
          </div>
        </div>
      </div>

      <router-link
        to="/settings?tab=notifications&notificationPage=preferences"
        class="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
      >
        Manage delivery channels
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </router-link>
    </section>

    <!-- Section 3: Your notification control -->
    <section class="mb-8">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Your notification control
      </h2>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Customize your notification experience to match your workflow.
      </p>

      <div class="space-y-4">
        <!-- Preferences -->
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Preferences
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Toggle what types of notifications you receive per event. Control which channels are used for each notification type.
              </p>
              <router-link
                to="/settings?tab=notifications&notificationPage=preferences"
                class="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                Manage preferences
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </router-link>
            </div>
          </div>
        </div>

        <!-- Rules -->
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Rules
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Create custom notification conditions. Set up rules based on assignments, priorities, statuses, and more.
              </p>
              <router-link
                to="/settings?tab=notifications&notificationPage=rules"
                class="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                Manage rules
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </router-link>
            </div>
          </div>
        </div>

        <!-- Digests -->
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Digests
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Receive daily or weekly summaries of your notifications instead of real-time alerts. Reduce notification noise while staying informed.
              </p>
              <router-link
                to="/settings?tab=notifications&notificationPage=preferences#digests"
                class="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                Manage digests
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 4: Admin visibility (admin only) -->
    <section v-if="authStore.isAdminLike" class="mb-8">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Admin tools
      </h2>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Monitor notification delivery health and analytics across your organization.
      </p>

      <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Health dashboard
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
              View delivery statistics, channel health, event volume, and user notification patterns. Identify potential issues before they impact your team.
            </p>
            <router-link
              to="/settings?tab=notifications&notificationPage=health"
              class="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              Open health dashboard
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </router-link>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/authRegistry';

const authStore = useAuthStore();
</script>
