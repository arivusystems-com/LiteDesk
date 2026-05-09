<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Integrations</h2>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Connect external tools to enhance your workspace. All integrations are optional and can be turned off at any time.
      </p>
    </div>

    <!-- Info Banner -->
    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3 class="text-sm font-semibold text-blue-800 dark:text-blue-300">Optional, Safe Integrations</h3>
          <p class="text-sm text-blue-700 dark:text-blue-400 mt-1">
            Integrations are optional and do not change your core data. Disabling an integration stops new data from flowing but does not delete existing business records.
          </p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-sm text-red-800 dark:text-red-300">
          {{ error.message || 'Failed to load integrations' }}
        </p>
      </div>
    </div>

    <!-- Content -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Catalog / List -->
      <div class="lg:col-span-1 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Available Integrations</h3>
          <span class="text-xs text-gray-500 dark:text-gray-400">{{ integrations.length }} integrations</span>
        </div>
        <div class="space-y-3">
          <button
            v-for="integration in integrations"
            :key="integration.key"
            @click="selectIntegration(integration)"
            :class="[
              'w-full text-left p-4 rounded-lg border transition-all flex items-start gap-3',
              selectedIntegration && selectedIntegration.key === integration.key
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-400 dark:hover:border-indigo-400 hover:shadow-sm'
            ]"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <h4 class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {{ integration.name }}
                </h4>
                <span
                  v-if="integration.scope === 'platform'"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
                >
                  Platform-wide
                </span>
                <span
                  v-else
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                >
                  App-specific
                </span>
              </div>
              <p class="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                {{ integration.description }}
              </p>
              <div class="mt-2 flex items-center gap-2">
                <span
                  :class="[
                    'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium',
                    integration.enabled
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  ]"
                >
                  {{ integration.enabled ? 'Enabled' : 'Disabled' }}
                </span>
                <span
                  v-if="integration.recommended"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300"
                >
                  Recommended
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Detail View -->
      <div class="lg:col-span-2">
        <div v-if="!selectedIntegration" class="h-full flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 bg-gray-50 dark:bg-gray-800/40">
          <div class="text-center">
            <p class="text-sm font-medium text-gray-900 dark:text-white mb-1">Select an integration to view details</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">You can safely explore integrations without enabling them.</p>
          </div>
        </div>
        <div v-else class="space-y-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white">{{ selectedIntegration.name }}</h3>
                <span
                  v-if="selectedIntegration.scope === 'platform'"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
                >
                  Platform-wide
                </span>
                <span
                  v-else
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                >
                  App-specific
                </span>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
                {{ selectedIntegration.description }}
              </p>
            </div>
            <div class="flex flex-col items-end gap-2">
              <span
                :class="[
                  'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
                  selectedIntegration.enabled
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                ]"
              >
                {{ selectedIntegration.enabled ? 'Enabled' : 'Disabled' }}
              </span>
              <button
                v-if="selectedIntegration.enabled"
                type="button"
                @click="confirmDisable"
                :disabled="actionLoading"
                class="px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Disable Integration
              </button>
              <button
                v-else
                type="button"
                @click="confirmEnable"
                :disabled="actionLoading"
                class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enable Integration
              </button>
            </div>
          </div>

          <!-- Scope & Apps -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-gray-50 dark:bg-gray-800/60 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Scope</h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                <span v-if="selectedIntegration.scope === 'platform'">
                  This integration is platform-wide and can be used across all applications.
                </span>
                <span v-else>
                  This integration is app-specific and only affects the applications listed.
                </span>
              </p>
              <div v-if="selectedIntegration.apps && selectedIntegration.apps.length" class="mt-3 flex flex-wrap gap-2">
                <span
                  v-for="appKey in selectedIntegration.apps"
                  :key="appKey"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                >
                  {{ appKey }}
                </span>
              </div>
            </div>
            <div class="bg-gray-50 dark:bg-gray-800/60 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Connection Status</h4>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {{ selectedIntegration.enabled ? 'New activity will continue to flow through this integration.' : 'New activity will no longer flow through this integration.' }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Existing records in your CRM, helpdesk, or other tools are not deleted when disabling this integration.
              </p>
            </div>
          </div>

          <!-- Email Provider: Configuration Status -->
          <div
            v-if="selectedIntegration.key === 'email-provider' && selectedIntegration.configStatus !== undefined"
            class="rounded-lg p-4 border"
            :class="selectedIntegration.configStatus === 'configured'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'"
          >
            <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Configuration</h4>
            <p v-if="selectedIntegration.configStatus === 'configured'" class="text-sm text-green-800 dark:text-green-300">
              Email service is configured via environment (AWS SES or SMTP). Notifications will be sent when this integration is enabled.
            </p>
            <p v-else class="text-sm text-amber-800 dark:text-amber-300">
              Email service is not configured. Add AWS SES or SMTP credentials to the server environment variables to send emails. See <code class="text-xs bg-gray-200 dark:bg-gray-700 px-1 rounded">.env.example</code> for required variables.
            </p>
            <button
              v-if="selectedIntegration.configStatus === 'configured'"
              type="button"
              @click="sendTestEmail"
              :disabled="testEmailLoading"
              class="mt-3 px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ testEmailLoading ? 'Sending…' : 'Send Test Email' }}
            </button>
          </div>

          <div
            v-if="selectedIntegration.key === 'email-provider'"
            class="rounded-lg p-4 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40"
          >
            <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Email Provider Configuration</h4>
            <p
              v-if="emailCriticalFieldsLocked"
              class="mb-3 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2"
            >
              Critical provider fields are owner-only. You can update non-critical fields like From Name, Reply-To, and SMTP secure mode.
            </p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label class="text-sm">
                <span class="block mb-1 text-gray-700 dark:text-gray-300">
                  Provider
                  <span class="text-[10px] text-gray-500 dark:text-gray-400 ml-1">(owner-only)</span>
                </span>
                <select v-model="emailConfig.provider" :disabled="emailCriticalFieldsLocked" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed">
                  <option value="resend">resend</option>
                  <option value="smtp">smtp</option>
                  <option value="aws-ses">aws-ses</option>
                </select>
              </label>

              <label class="text-sm">
                <span class="block mb-1 text-gray-700 dark:text-gray-300">
                  From Email
                  <span class="text-[10px] text-gray-500 dark:text-gray-400 ml-1">(owner-only)</span>
                </span>
                <input v-model="emailConfig.fromEmail" :disabled="emailCriticalFieldsLocked" type="email" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed" placeholder="hello@yourdomain.com" />
              </label>

              <label class="text-sm">
                <span class="block mb-1 text-gray-700 dark:text-gray-300">From Name</span>
                <input v-model="emailConfig.fromName" type="text" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2" placeholder="Your Company" />
              </label>

              <label class="text-sm">
                <span class="block mb-1 text-gray-700 dark:text-gray-300">Reply-To</span>
                <input v-model="emailConfig.replyTo" type="email" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2" placeholder="support@yourdomain.com" />
              </label>

              <label class="text-sm">
                <span class="block mb-1 text-gray-700 dark:text-gray-300">
                  SMTP Host
                  <span class="text-[10px] text-gray-500 dark:text-gray-400 ml-1">(owner-only)</span>
                </span>
                <input v-model="emailConfig.smtpHost" :disabled="emailCriticalFieldsLocked" type="text" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed" placeholder="smtp.resend.com" />
              </label>

              <label class="text-sm">
                <span class="block mb-1 text-gray-700 dark:text-gray-300">
                  SMTP Port
                  <span class="text-[10px] text-gray-500 dark:text-gray-400 ml-1">(owner-only)</span>
                </span>
                <input v-model="emailConfig.smtpPort" :disabled="emailCriticalFieldsLocked" type="number" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed" placeholder="587" />
              </label>

              <label class="text-sm">
                <span class="block mb-1 text-gray-700 dark:text-gray-300">
                  SMTP User
                  <span class="text-[10px] text-gray-500 dark:text-gray-400 ml-1">(owner-only)</span>
                </span>
                <input v-model="emailConfig.smtpUser" :disabled="emailCriticalFieldsLocked" type="text" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed" placeholder="resend" />
              </label>

              <label class="text-sm">
                <span class="block mb-1 text-gray-700 dark:text-gray-300">
                  SMTP Password / API Key
                  <span class="text-[10px] text-gray-500 dark:text-gray-400 ml-1">(owner-only)</span>
                  <span v-if="emailConfig.hasSmtpPass" class="text-xs text-gray-500 dark:text-gray-400">({{ emailConfig.smtpPassMasked || 'saved' }})</span>
                </span>
                <input v-model="emailConfig.smtpPass" :disabled="emailCriticalFieldsLocked" type="password" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed" placeholder="Leave blank to keep existing secret" />
              </label>
            </div>

            <label class="mt-3 inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input v-model="emailConfig.smtpSecure" type="checkbox" class="rounded border-gray-300 dark:border-gray-600" />
              Use secure SMTP (TLS)
            </label>

            <div class="mt-4">
              <button
                type="button"
                @click="saveEmailConfig"
                :disabled="savingConfig"
                class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ savingConfig ? 'Saving...' : 'Save Email Settings' }}
              </button>
            </div>
          </div>

          <div
            v-if="selectedIntegration.key === 'email-provider'"
            class="rounded-lg p-4 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40"
          >
            <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Webhook Simulator</h4>
            <p class="text-xs text-gray-600 dark:text-gray-400 mb-3">
              Trigger delivery lifecycle events without waiting for provider callbacks.
            </p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label class="text-sm">
                <span class="block mb-1 text-gray-700 dark:text-gray-300">Event Type</span>
                <select
                  v-model="webhookSim.eventType"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2"
                >
                  <option v-for="evt in webhookTemplates.supportedEventTypes" :key="`sim-${evt}`" :value="evt">{{ evt }}</option>
                </select>
              </label>
              <label class="text-sm">
                <span class="block mb-1 text-gray-700 dark:text-gray-300">Provider Label</span>
                <input
                  v-model="webhookSim.provider"
                  type="text"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2"
                  placeholder="simulator"
                />
              </label>
              <div class="text-sm">
                <span class="block mb-1 text-gray-700 dark:text-gray-300">Target Message</span>
                <p class="text-xs text-gray-600 dark:text-gray-400 break-all">
                  {{ webhookTemplates.latestExternalMessageId || 'No sent message yet' }}
                </p>
              </div>
            </div>
            <div class="mt-3">
              <button
                type="button"
                @click="runWebhookSimulation"
                :disabled="simulatingWebhook || (!webhookTemplates.latestCommunicationId && !webhookTemplates.latestExternalMessageId)"
                class="px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ simulatingWebhook ? 'Simulating...' : 'Simulate Webhook Event' }}
              </button>
            </div>
          </div>

          <div
            v-if="selectedIntegration.key === 'email-provider'"
            class="rounded-lg p-4 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40"
          >
            <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Communication Policy</h4>
            <p
              v-if="communicationPolicyLocked"
              class="mb-3 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2"
            >
              Communication policy is owner-only.
            </p>

            <div class="space-y-3">
              <label class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  v-model="communicationPolicy.outboundEmail.enabled"
                  type="checkbox"
                  class="rounded border-gray-300 dark:border-gray-600"
                  :disabled="communicationPolicyLocked"
                />
                Enable outbound email from Communication API
              </label>

              <label class="text-sm block">
                <span class="block mb-1 text-gray-700 dark:text-gray-300">Max recipients per message</span>
                <input
                  v-model.number="communicationPolicy.outboundEmail.maxRecipientsPerMessage"
                  type="number"
                  min="1"
                  max="1000"
                  class="w-full md:w-64 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  :disabled="communicationPolicyLocked"
                />
              </label>

              <div>
                <span class="block mb-1 text-sm text-gray-700 dark:text-gray-300">Allowed modules for outbound emails</span>
                <div class="flex flex-wrap gap-2">
                  <label
                    v-for="moduleKey in communicationPolicy.supportedModuleKeys"
                    :key="`policy-${moduleKey}`"
                    class="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900"
                  >
                    <input
                      :value="moduleKey"
                      v-model="communicationPolicy.outboundEmail.allowedModuleKeys"
                      type="checkbox"
                      class="rounded border-gray-300 dark:border-gray-600"
                      :disabled="communicationPolicyLocked"
                    />
                    {{ moduleKey }}
                  </label>
                </div>
              </div>

              <div>
                <span class="block mb-1 text-sm text-gray-700 dark:text-gray-300">Suppression policy</span>
                <div class="flex flex-col gap-2">
                  <label class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      v-model="communicationPolicy.outboundEmail.suppression.autoSuppressOnBounce"
                      type="checkbox"
                      class="rounded border-gray-300 dark:border-gray-600"
                      :disabled="communicationPolicyLocked"
                    />
                    Auto-suppress recipients on bounce events
                  </label>
                  <label class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      v-model="communicationPolicy.outboundEmail.suppression.autoSuppressOnComplaint"
                      type="checkbox"
                      class="rounded border-gray-300 dark:border-gray-600"
                      :disabled="communicationPolicyLocked"
                    />
                    Auto-suppress recipients on complaint events
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="selectedIntegration.key === 'email-provider' && selectedIntegration.emailDomainVerification"
            class="rounded-lg p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20"
          >
            <div class="flex items-center justify-between gap-3 mb-1">
              <h4 class="text-sm font-semibold text-gray-900 dark:text-white">Sender Domain Verification</h4>
              <button
                type="button"
                @click="checkEmailDomainStatus"
                :disabled="checkingDomainStatus"
                class="px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ checkingDomainStatus ? 'Checking...' : 'Check Status' }}
              </button>
            </div>
            <p class="text-xs text-blue-800 dark:text-blue-300 mb-3">Live DNS check for sender domain authentication records.</p>
            <p class="text-xs text-gray-600 dark:text-gray-300 mb-3">
              Domain: <span class="font-medium">{{ selectedIntegration.emailDomainVerification.domain || 'Not set' }}</span>
            </p>
            <p class="text-[11px] text-gray-500 dark:text-gray-400 mb-3" v-if="selectedIntegration.emailDomainVerification.checkedAt">
              Last checked: {{ formatCheckedAt(selectedIntegration.emailDomainVerification.checkedAt) }}
            </p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div class="rounded-md border border-blue-200 dark:border-blue-700 px-3 py-2 bg-white dark:bg-gray-900/30">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-xs font-semibold text-gray-900 dark:text-white">Sender Identity</p>
                  <span :class="['inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium', verificationStatusClass(selectedIntegration.emailDomainVerification.senderIdentity?.status)]">
                    {{ selectedIntegration.emailDomainVerification.senderIdentity?.status || 'not_checked' }}
                  </span>
                </div>
                <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{{ selectedIntegration.emailDomainVerification.senderIdentity?.note }}</p>
              </div>
              <div class="rounded-md border border-blue-200 dark:border-blue-700 px-3 py-2 bg-white dark:bg-gray-900/30">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-xs font-semibold text-gray-900 dark:text-white">SPF</p>
                  <span :class="['inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium', verificationStatusClass(selectedIntegration.emailDomainVerification.spf?.status)]">
                    {{ selectedIntegration.emailDomainVerification.spf?.status || 'not_checked' }}
                  </span>
                </div>
                <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{{ selectedIntegration.emailDomainVerification.spf?.note }}</p>
              </div>
              <div class="rounded-md border border-blue-200 dark:border-blue-700 px-3 py-2 bg-white dark:bg-gray-900/30">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-xs font-semibold text-gray-900 dark:text-white">DKIM</p>
                  <span :class="['inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium', verificationStatusClass(selectedIntegration.emailDomainVerification.dkim?.status)]">
                    {{ selectedIntegration.emailDomainVerification.dkim?.status || 'not_checked' }}
                  </span>
                </div>
                <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{{ selectedIntegration.emailDomainVerification.dkim?.note }}</p>
              </div>
              <div class="rounded-md border border-blue-200 dark:border-blue-700 px-3 py-2 bg-white dark:bg-gray-900/30">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-xs font-semibold text-gray-900 dark:text-white">DMARC</p>
                  <span :class="['inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium', verificationStatusClass(selectedIntegration.emailDomainVerification.dmarc?.status)]">
                    {{ selectedIntegration.emailDomainVerification.dmarc?.status || 'not_checked' }}
                  </span>
                </div>
                <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{{ selectedIntegration.emailDomainVerification.dmarc?.note }}</p>
              </div>
            </div>
          </div>

          <div
            v-if="selectedIntegration.key === 'email-provider'"
            class="rounded-lg p-4 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40"
          >
            <div class="flex items-center justify-between gap-3 mb-3">
              <h4 class="text-sm font-semibold text-gray-900 dark:text-white">Delivery Diagnostics (24h)</h4>
              <button
                type="button"
                @click="loadPipelineDiagnostics"
                :disabled="loadingDiagnostics"
                class="px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ loadingDiagnostics ? 'Refreshing...' : 'Refresh' }}
              </button>
            </div>

            <div class="mb-4">
              <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">Failure categories</p>
              <div v-if="diagnostics.failureBreakdown.length > 0" class="flex flex-wrap gap-2">
                <span
                  v-for="row in diagnostics.failureBreakdown"
                  :key="`failure-${row.category}`"
                  :class="['inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium', failureCategoryClass(row.category)]"
                >
                  {{ row.category }}: {{ row.count }}
                </span>
              </div>
              <p v-else class="text-xs text-gray-500 dark:text-gray-400">No failures recorded in the last 24h.</p>
            </div>

            <div>
              <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">Recent lifecycle events</p>
              <div v-if="diagnostics.recentEvents.length > 0" class="space-y-2 max-h-56 overflow-auto pr-1">
                <div
                  v-for="evt in diagnostics.recentEvents"
                  :key="`evt-${evt._id}`"
                  class="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 px-3 py-2"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-xs font-semibold text-gray-900 dark:text-white">{{ evt.eventType }}</span>
                    <span class="text-[11px] text-gray-500 dark:text-gray-400">{{ formatCheckedAt(evt.createdAt) }}</span>
                  </div>
                  <p class="text-[11px] text-gray-600 dark:text-gray-300 mt-1">
                    source: {{ evt.source }}<span v-if="evt.payload?.failureCategory"> | failure: {{ evt.payload.failureCategory }}</span>
                  </p>
                  <p v-if="evt.payload?.error" class="text-[11px] text-red-700 dark:text-red-300 mt-1 break-words">
                    error: {{ evt.payload.error }}
                  </p>
                </div>
              </div>
              <p v-else class="text-xs text-gray-500 dark:text-gray-400">No communication events found for this window.</p>
            </div>
          </div>

          <div
            v-if="selectedIntegration.key === 'email-provider'"
            class="rounded-lg p-4 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40"
          >
            <div class="flex items-center justify-between gap-3 mb-3">
              <h4 class="text-sm font-semibold text-gray-900 dark:text-white">Suppressed Recipients</h4>
              <button
                type="button"
                @click="loadSuppressions"
                :disabled="loadingSuppressions"
                class="px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ loadingSuppressions ? 'Refreshing...' : 'Refresh' }}
              </button>
            </div>
            <p class="text-xs text-gray-600 dark:text-gray-400 mb-3">
              Recipients are auto-suppressed when delivery events report bounce or complaint.
            </p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
              <div class="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 px-3 py-2">
                <p class="text-[11px] text-gray-500 dark:text-gray-400">Active total</p>
                <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ suppressionStats.activeTotal }}</p>
              </div>
              <div class="rounded-md border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
                <p class="text-[11px] text-amber-800 dark:text-amber-300">Bounced</p>
                <p class="text-sm font-semibold text-amber-900 dark:text-amber-200">{{ suppressionStats.byReason.bounced }}</p>
              </div>
              <div class="rounded-md border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-3 py-2">
                <p class="text-[11px] text-red-800 dark:text-red-300">Complained</p>
                <p class="text-sm font-semibold text-red-900 dark:text-red-200">{{ suppressionStats.byReason.complained }}</p>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
              <label class="text-xs">
                <span class="block mb-1 text-gray-700 dark:text-gray-300">Search email</span>
                <input
                  v-model.trim="suppressionSearch"
                  type="text"
                  placeholder="name@example.com"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2.5 py-1.5"
                />
              </label>
              <label class="text-xs">
                <span class="block mb-1 text-gray-700 dark:text-gray-300">Reason filter</span>
                <select
                  v-model="suppressionReasonFilter"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2.5 py-1.5"
                >
                  <option value="all">all</option>
                  <option value="bounced">bounced</option>
                  <option value="complained">complained</option>
                </select>
              </label>
              <div class="text-xs text-gray-600 dark:text-gray-400 flex items-end">
                Showing {{ filteredSuppressionRows.length }} of {{ suppressionRows.length }}
              </div>
            </div>
            <div v-if="filteredSuppressionRows.length > 0" class="space-y-2 max-h-56 overflow-auto pr-1">
              <div
                v-for="row in filteredSuppressionRows"
                :key="`sup-${row.email}`"
                class="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 px-3 py-2 flex items-center justify-between gap-3"
              >
                <div class="min-w-0">
                  <p class="text-xs font-semibold text-gray-900 dark:text-white break-all">{{ row.email }}</p>
                  <p class="text-[11px] text-gray-600 dark:text-gray-300 mt-1">
                    reason:
                    <span :class="['inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ml-1', suppressionReasonClass(row.reason)]">
                      {{ row.reason }}
                    </span>
                    <span class="ml-2">last event: {{ formatCheckedAt(row.lastEventAt) }}</span>
                  </p>
                </div>
                <button
                  type="button"
                  @click="removeSuppressedRecipient(row.email)"
                  :disabled="!isOwnerLike || removingSuppressionEmail === row.email"
                  class="shrink-0 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
                >
                  {{ removingSuppressionEmail === row.email ? 'Removing...' : 'Remove' }}
                </button>
              </div>
            </div>
            <p v-else class="text-xs text-gray-500 dark:text-gray-400">No suppressed recipients match the current filter.</p>
            <p v-if="!isOwnerLike" class="mt-2 text-[11px] text-amber-700 dark:text-amber-300">
              Only workspace owner can remove suppression entries.
            </p>
          </div>

          <!-- Data Sharing -->
          <div class="bg-white dark:bg-gray-900/40 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">What data is shared</h4>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {{ selectedIntegration.dataSharedSummary }}
            </p>
            <p v-if="selectedIntegration.dataSharedDetails" class="text-xs text-gray-500 dark:text-gray-400">
              {{ selectedIntegration.dataSharedDetails }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import apiClient from '@/utils/apiClient';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const isOwnerLike = computed(() => authStore.isOwner || String(authStore.userRole || '').toLowerCase() === 'owner');

const integrations = ref([]);
const selectedIntegration = ref(null);
const loading = ref(true);
const error = ref(null);
const actionLoading = ref(false);
const testEmailLoading = ref(false);
const savingConfig = ref(false);
const checkingDomainStatus = ref(false);
const loadingDiagnostics = ref(false);
const diagnostics = ref({
  failureBreakdown: [],
  recentEvents: []
});
const webhookTemplates = ref({
  latestCommunicationId: '',
  latestExternalMessageId: '',
  supportedEventTypes: ['delivered', 'opened', 'bounced', 'complained']
});
const webhookSim = ref({
  eventType: 'delivered',
  provider: 'simulator'
});
const simulatingWebhook = ref(false);
const loadingSuppressions = ref(false);
const removingSuppressionEmail = ref('');
const suppressionRows = ref([]);
const suppressionSearch = ref('');
const suppressionReasonFilter = ref('all');
const suppressionStats = ref({
  activeTotal: 0,
  byReason: { bounced: 0, complained: 0 }
});
const emailConfig = ref({
  provider: 'resend',
  fromEmail: '',
  fromName: '',
  replyTo: '',
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPass: '',
  smtpSecure: false,
  smtpPassMasked: '',
  hasSmtpPass: false
});
const communicationPolicy = ref({
  outboundEmail: {
    enabled: true,
    maxRecipientsPerMessage: 50,
    allowedModuleKeys: ['people', 'organizations', 'deals', 'tasks', 'cases'],
    suppression: {
      autoSuppressOnBounce: true,
      autoSuppressOnComplaint: true
    }
  },
  supportedModuleKeys: ['people', 'organizations', 'deals', 'tasks', 'cases']
});
const emailCriticalFieldsLocked = computed(() => !isOwnerLike.value);
const communicationPolicyLocked = computed(() => !isOwnerLike.value);

const verificationStatusClass = (status) => {
  const value = String(status || '').toLowerCase();
  if (value === 'configured') return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
  if (value === 'missing' || value === 'no_record' || value === 'missing_sender' || value === 'unverified') {
    return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300';
  }
  if (value === 'dns_unreachable' || value === 'lookup_error') {
    return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
  }
  return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
};

const checkEmailDomainStatus = async () => {
  if (!selectedIntegration.value || selectedIntegration.value.key !== 'email-provider') return;
  checkingDomainStatus.value = true;
  try {
    await fetchIntegrationDetail('email-provider', { forceRefresh: true });
  } catch (err) {
    console.error('Failed to refresh email domain verification status:', err);
    alert('Failed to refresh sender domain verification status');
  } finally {
    checkingDomainStatus.value = false;
  }
};

const failureCategoryClass = (category) => {
  const value = String(category || '').toLowerCase();
  if (value === 'auth_error' || value === 'config_error') {
    return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
  }
  if (value === 'network_error' || value === 'provider_rejected' || value === 'attachment_error') {
    return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300';
  }
  return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
};

const suppressionReasonClass = (reason) => {
  const value = String(reason || '').toLowerCase();
  if (value === 'complained') {
    return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
  }
  if (value === 'bounced') {
    return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300';
  }
  return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
};

const filteredSuppressionRows = computed(() => {
  const query = String(suppressionSearch.value || '').trim().toLowerCase();
  const reason = String(suppressionReasonFilter.value || 'all').toLowerCase();
  return suppressionRows.value.filter((row) => {
    const rowEmail = String(row?.email || '').toLowerCase();
    const rowReason = String(row?.reason || '').toLowerCase();
    const matchesQuery = !query || rowEmail.includes(query);
    const matchesReason = reason === 'all' || rowReason === reason;
    return matchesQuery && matchesReason;
  });
});

const loadSuppressionStats = async () => {
  if (!selectedIntegration.value || selectedIntegration.value.key !== 'email-provider') return;
  try {
    const data = await apiClient('/communications/suppressions/stats', { method: 'GET' });
    suppressionStats.value = {
      activeTotal: Number(data?.data?.activeTotal) || 0,
      byReason: {
        bounced: Number(data?.data?.byReason?.bounced) || 0,
        complained: Number(data?.data?.byReason?.complained) || 0
      }
    };
  } catch (err) {
    console.error('Failed to load suppression stats:', err);
    suppressionStats.value = {
      activeTotal: 0,
      byReason: { bounced: 0, complained: 0 }
    };
  }
};

const loadSuppressions = async () => {
  if (!selectedIntegration.value || selectedIntegration.value.key !== 'email-provider') return;
  loadingSuppressions.value = true;
  try {
    const data = await apiClient('/communications/suppressions', { method: 'GET' });
    suppressionRows.value = Array.isArray(data?.data?.suppressions) ? data.data.suppressions : [];
  } catch (err) {
    console.error('Failed to load suppression list:', err);
    suppressionRows.value = [];
  } finally {
    loadingSuppressions.value = false;
  }
  await loadSuppressionStats();
};

const removeSuppressedRecipient = async (email) => {
  if (!email) return;
  if (!isOwnerLike.value) {
    alert('Only workspace owner can remove suppression entries');
    return;
  }
  const ok = confirm(`Remove "${email}" from suppression list?`);
  if (!ok) return;
  removingSuppressionEmail.value = email;
  try {
    const data = await apiClient(`/communications/suppressions/${encodeURIComponent(email)}`, {
      method: 'DELETE'
    });
    if (data?.success) {
      suppressionRows.value = suppressionRows.value.filter((row) => row.email !== email);
      await loadSuppressionStats();
    } else {
      alert(data?.message || 'Failed to remove suppression entry');
    }
  } catch (err) {
    console.error('Failed to remove suppression entry:', err);
    alert(err?.response?.data?.message || err?.message || 'Failed to remove suppression entry');
  } finally {
    removingSuppressionEmail.value = '';
  }
};

const loadPipelineDiagnostics = async () => {
  if (!selectedIntegration.value || selectedIntegration.value.key !== 'email-provider') return;
  loadingDiagnostics.value = true;
  try {
    const data = await apiClient('/communications/pipeline-diagnostics', { method: 'GET' });
    diagnostics.value = {
      failureBreakdown: data?.data?.failureBreakdown || [],
      recentEvents: data?.data?.recentEvents || []
    };
  } catch (err) {
    console.error('Failed to load communication diagnostics:', err);
    diagnostics.value = { failureBreakdown: [], recentEvents: [] };
  } finally {
    loadingDiagnostics.value = false;
  }
};

const loadWebhookTemplates = async () => {
  if (!selectedIntegration.value || selectedIntegration.value.key !== 'email-provider') return;
  try {
    const data = await apiClient('/communications/webhook-test/templates', { method: 'GET' });
    webhookTemplates.value = {
      latestCommunicationId: data?.data?.latestCommunicationId || '',
      latestExternalMessageId: data?.data?.latestExternalMessageId || '',
      supportedEventTypes: data?.data?.supportedEventTypes || ['delivered', 'opened', 'bounced', 'complained']
    };
    if (!webhookTemplates.value.supportedEventTypes.includes(webhookSim.value.eventType)) {
      webhookSim.value.eventType = webhookTemplates.value.supportedEventTypes[0] || 'delivered';
    }
  } catch (err) {
    console.error('Failed to load webhook templates:', err);
  }
};

const runWebhookSimulation = async () => {
  if (!selectedIntegration.value || selectedIntegration.value.key !== 'email-provider') return;
  if (!webhookTemplates.value.latestCommunicationId && !webhookTemplates.value.latestExternalMessageId) {
    alert('No eligible outbound communication found yet. Send at least one email first.');
    return;
  }
  simulatingWebhook.value = true;
  try {
    const payload = {
      communicationId: webhookTemplates.value.latestCommunicationId || undefined,
      externalMessageId: webhookTemplates.value.latestExternalMessageId || undefined,
      eventType: webhookSim.value.eventType,
      provider: webhookSim.value.provider || 'simulator'
    };
    const data = await apiClient('/communications/webhook-test/simulate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (data?.success) {
      await loadPipelineDiagnostics();
      alert(`Simulated webhook event: ${webhookSim.value.eventType}`);
    } else {
      alert(data?.message || 'Webhook simulation failed');
    }
  } catch (err) {
    console.error('Webhook simulation failed:', err);
    alert(err?.response?.data?.message || err?.message || 'Webhook simulation failed');
  } finally {
    simulatingWebhook.value = false;
  }
};

const formatCheckedAt = (value) => {
  if (!value) return '';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const fetchIntegrations = async () => {
  loading.value = true;
  error.value = null;
  try {
    const data = await apiClient('/settings/integrations', { method: 'GET' });
    if (data && data.success && data.integrations) {
      integrations.value = data.integrations;
      if (!selectedIntegration.value && integrations.value.length > 0) {
        selectedIntegration.value = integrations.value[0];
        await fetchIntegrationDetail(selectedIntegration.value.key);
      }
    } else {
      integrations.value = [];
    }
  } catch (err) {
    console.error('Failed to fetch integrations:', err);
    error.value = err;
  } finally {
    loading.value = false;
  }
};

const fetchIntegrationDetail = async (key, options = {}) => {
  try {
    const forceRefresh = options.forceRefresh === true;
    const data = await apiClient(`/settings/integrations/${key}`, {
      method: 'GET',
      cache: forceRefresh ? 'no-store' : undefined,
      params: forceRefresh ? { _t: Date.now() } : undefined
    });
    if (data && data.success && data.integration) {
      selectedIntegration.value = data.integration;
      if (data.integration.key === 'email-provider') {
        const cfg = data.integration.emailConfig || {};
        emailConfig.value = {
          provider: cfg.provider || 'resend',
          fromEmail: cfg.fromEmail || '',
          fromName: cfg.fromName || '',
          replyTo: cfg.replyTo || '',
          smtpHost: cfg.smtpHost || '',
          smtpPort: cfg.smtpPort || 587,
          smtpUser: cfg.smtpUser || '',
          smtpPass: '',
          smtpSecure: cfg.smtpSecure === true,
          smtpPassMasked: cfg.smtpPassMasked || '',
          hasSmtpPass: cfg.hasSmtpPass === true
        };
        const policy = data.integration.communicationPolicy || {};
        communicationPolicy.value = {
          outboundEmail: {
            enabled: policy.outboundEmail?.enabled !== false,
            maxRecipientsPerMessage: Number(policy.outboundEmail?.maxRecipientsPerMessage) || 50,
            allowedModuleKeys: Array.isArray(policy.outboundEmail?.allowedModuleKeys) && policy.outboundEmail.allowedModuleKeys.length > 0
              ? policy.outboundEmail.allowedModuleKeys
              : ['people', 'organizations', 'deals', 'tasks', 'cases'],
            suppression: {
              autoSuppressOnBounce: policy.outboundEmail?.suppression?.autoSuppressOnBounce !== false,
              autoSuppressOnComplaint: policy.outboundEmail?.suppression?.autoSuppressOnComplaint !== false
            }
          },
          supportedModuleKeys: Array.isArray(policy.supportedModuleKeys) && policy.supportedModuleKeys.length > 0
            ? policy.supportedModuleKeys
            : ['people', 'organizations', 'deals', 'tasks', 'cases']
        };
        await loadWebhookTemplates();
        await loadPipelineDiagnostics();
        await loadSuppressions();
      }
      // Update list entry to keep states in sync
      const idx = integrations.value.findIndex((i) => i.key === key);
      if (idx !== -1) {
        integrations.value[idx] = {
          ...integrations.value[idx],
          enabled: data.integration.enabled,
          status: data.integration.status
        };
      }
    }
  } catch (err) {
    console.error('Failed to fetch integration detail:', err);
  }
};

const saveEmailConfig = async () => {
  if (!selectedIntegration.value || selectedIntegration.value.key !== 'email-provider') return;
  savingConfig.value = true;
  try {
    const payload = {
      provider: emailConfig.value.provider,
      fromEmail: emailConfig.value.fromEmail,
      fromName: emailConfig.value.fromName,
      replyTo: emailConfig.value.replyTo,
      smtpHost: emailConfig.value.smtpHost,
      smtpPort: Number(emailConfig.value.smtpPort) || 587,
      smtpUser: emailConfig.value.smtpUser,
      smtpPass: emailConfig.value.smtpPass,
      smtpSecure: !!emailConfig.value.smtpSecure,
      communicationPolicy: {
        outboundEmail: {
          enabled: communicationPolicy.value.outboundEmail.enabled !== false,
          maxRecipientsPerMessage: Number(communicationPolicy.value.outboundEmail.maxRecipientsPerMessage) || 50,
          allowedModuleKeys: communicationPolicy.value.outboundEmail.allowedModuleKeys,
          suppression: {
            autoSuppressOnBounce: communicationPolicy.value.outboundEmail.suppression?.autoSuppressOnBounce !== false,
            autoSuppressOnComplaint: communicationPolicy.value.outboundEmail.suppression?.autoSuppressOnComplaint !== false
          }
        }
      }
    };

    const data = await apiClient('/settings/integrations/email-provider/config', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    if (data?.success) {
      alert('Email provider settings saved');
      emailConfig.value.smtpPass = '';
      await fetchIntegrationDetail('email-provider');
      await fetchIntegrations();
    } else {
      alert(data?.message || 'Failed to save email settings');
    }
  } catch (err) {
    console.error('Failed to save email config:', err);
    alert(err?.response?.data?.message || err?.message || 'Failed to save email settings');
  } finally {
    savingConfig.value = false;
  }
};

const selectIntegration = async (integration) => {
  selectedIntegration.value = integration;
  await fetchIntegrationDetail(integration.key);
};

const confirmEnable = async () => {
  if (!selectedIntegration.value) return;
  const ok = confirm(
    'Enable this integration? This will start sending and receiving data as described. You can disable it at any time.'
  );
  if (!ok) return;
  await enableIntegration(selectedIntegration.value.key);
};

const confirmDisable = async () => {
  if (!selectedIntegration.value) return;
  const ok = confirm(
    'Disable this integration? New data will stop flowing, but existing records in your tools will not be deleted.'
  );
  if (!ok) return;
  await disableIntegration(selectedIntegration.value.key);
};

const enableIntegration = async (key) => {
  actionLoading.value = true;
  try {
    const data = await apiClient(`/settings/integrations/${key}/enable`, { method: 'POST' });
    if (data && data.success) {
      await fetchIntegrations();
      await fetchIntegrationDetail(key);
    } else {
      alert(data.message || 'Failed to enable integration');
    }
  } catch (err) {
    console.error('Failed to enable integration:', err);
    alert('Failed to enable integration');
  } finally {
    actionLoading.value = false;
  }
};

const disableIntegration = async (key) => {
  actionLoading.value = true;
  try {
    const data = await apiClient(`/settings/integrations/${key}/disable`, { method: 'POST' });
    if (data && data.success) {
      await fetchIntegrations();
      await fetchIntegrationDetail(key);
    } else {
      alert(data.message || 'Failed to disable integration');
    }
  } catch (err) {
    console.error('Failed to disable integration:', err);
    alert('Failed to disable integration');
  } finally {
    actionLoading.value = false;
  }
};

const sendTestEmail = async () => {
  if (!selectedIntegration.value || selectedIntegration.value.key !== 'email-provider') return;
  testEmailLoading.value = true;
  try {
    const data = await apiClient(`/settings/integrations/email-provider/test`, { method: 'POST' });
    if (data && data.success) {
      alert(data.message || 'Test email sent. Check your inbox (or Mailtrap in dev).');
    } else {
      alert(data.message || data.error || 'Failed to send test email');
    }
  } catch (err) {
    console.error('Failed to send test email:', err);
    alert(err?.response?.data?.message || err?.message || 'Failed to send test email');
  } finally {
    testEmailLoading.value = false;
  }
};

onMounted(() => {
  fetchIntegrations();
});
</script>
