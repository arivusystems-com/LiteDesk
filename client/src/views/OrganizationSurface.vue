<!--
  ============================================================================
  ORGANIZATIONSURFACE CONTRACT
  ============================================================================
  
  OrganizationSurface
  Contextual business organization view.
  Uses OrganizationSurfaceData projection only.
  Aligned with PeopleSurface and organization-surface-invariants.md
  
  OrganizationSurface is a contextual surface for Business Organizations.
  
  See docs/architecture/organization-surface-invariants.md for rules.
  
  OrganizationSurface MUST:
  - Show business context, not platform configuration
  - Be app-agnostic at the surface level
  - Show app-specific data only within app sections
  
  OrganizationSurface MUST NOT:
  - Show subscription, billing, limits, or enabledApps
  - Show tenant-only fields
  - Act as a primary navigation destination
  
  Structural Sections (v1):
  1. Header (business identity)
  2. People linked to the organization
  3. Work grouped by app (Sales, Helpdesk, Audit, etc.)
  4. Business details (progressive disclosure)
  5. Activity timeline
  
  ============================================================================
  EMPTY STATE PHILOSOPHY
  ============================================================================
  
  Empty states in OrganizationSurface follow these principles:
  
  1. Explain why data is missing
     - "No people linked yet" (not "No people")
     - "No work yet — this organization hasn't been used in Sales"
  
  2. Never prompt global creation
     - Do NOT show "Create new person" buttons
     - Do NOT show "Add organization" prompts
     - OrganizationSurface is contextual, not a creation surface
  
  3. Guide users back to context
     - "Add people from the People surface"
     - "Link this organization to deals in Sales"
     - Always reference the source context (People, Deals, etc.)
  
  4. Stay calm and non-CRM-like
     - Empty states are informational, not urgent
     - No call-to-action buttons that create new entities
     - Simple, clear messaging
  
  ============================================================================
  PERMISSION & READ-ONLY DESIGN
  ============================================================================
  
  NOTE:
  OrganizationSurface is read-only by design.
  Editing is intentional, scoped, and introduced only via explicit workflows.
  
  Read-only enforcement:
  - No edit affordances appear in this component
  - No inline editing capabilities
  - No "Edit organization" buttons or forms
  
  Future edit actions (if introduced) MUST be:
  - Scoped: Limited to specific fields or sections
  - App-specific: Editing happens within app context (Sales, Helpdesk, etc.)
  - Explicitly designed: Dedicated edit flows, not inline edits
  - Contextual: Editing happens from the app that owns the data
  
  Examples of allowed future extensions:
  - "Add to Sales" button (scoped, app-specific action)
  - "Link person" action (relationship management)
  - App-specific sub-surfaces (Sales organization detail, Helpdesk organization detail)
  
  Examples of FORBIDDEN extensions:
  - Global "Edit Organization" form
  - Inline editing of organization name
  - Sidebar navigation entries for OrganizationSurface
  - Tenant configuration exposure (subscription, limits, etc.)
  
  ============================================================================
  TENANT SAFETY
  ============================================================================
  
  DEFENSIVE UX FALLBACK:
  If the API accidentally returns tenant organization data (should never happen),
  we show a generic error instead of rendering the data.
  
  This is a defensive UX fallback, not normal flow.
  The backend should reject tenant orgs at the API level (403).
  This check is a last line of defense to prevent platform data leakage.
  
  ============================================================================
  FUTURE EXTENSION GUIDANCE
  ============================================================================
  
  Allowed future extensions (must maintain contextual, read-only principles):
  
  1. App-specific sub-surfaces
     - Sales organization detail (shows Sales-specific fields)
     - Helpdesk organization detail (shows Helpdesk-specific fields)
     - These would be accessed from within the app context
  
  2. Scoped actions
     - "Add to Sales" button (creates Sales participation)
     - "Link to Deal" action (creates relationship)
     - Actions are scoped to specific apps or relationships
  
  3. Relationship management
     - Link/unlink people from organization
     - Link/unlink deals from organization
     - All relationship changes happen from the related entity's surface
  
  Explicitly FORBIDDEN extensions:
  
  1. Global edit forms
     - No "Edit Organization" button in OrganizationSurface
     - No inline editing of organization fields
     - Editing must happen from app-specific surfaces
  
  2. Sidebar navigation entries
     - OrganizationSurface must never appear in sidebar
     - It is accessed only contextually (from People, Deals, Search)
  
  3. Tenant configuration exposure
     - Never show subscription, billing, limits
     - Never show enabledApps, security settings
     - Never show platform/tenant management fields
  
  4. Primary navigation destination
     - No "Organizations" tab in main navigation
     - No default route to organizations list
     - OrganizationSurface is always contextual
  
  ============================================================================
-->

<template>
  <div class="mx-auto max-w-7xl density-balanced">
    <!-- Loading State -->
    <div v-if="loading" class="p-8">
      <div class="space-y-6">
        <!-- Header Skeleton -->
        <div class="h-12 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        <div class="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
        
        <!-- Section Skeletons -->
        <div v-for="i in 4" :key="i" class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div class="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div class="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-8">
      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          <div class="flex-1">
            <h3 class="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
              Error Loading Organization
            </h3>
            <p class="text-sm text-red-700 dark:text-red-300">{{ error }}</p>
            <button 
              @click="fetchOrganization"
              class="mt-3 text-sm text-red-700 dark:text-red-300 hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- OrganizationSurface Content -->
    <div v-else-if="organization" class="space-y-6 p-6">
      <!-- A. Header Section -->
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-baseline gap-3 mb-2">
              <h1 class="text-3xl font-semibold text-gray-900 dark:text-gray-100">
                {{ organization.name }}
              </h1>
              
              <!-- Organization Type Badge (subtle, contextual) -->
              <span
                v-if="organization.types && organization.types.length > 0"
                class="text-xs font-normal text-gray-500 dark:text-gray-400"
              >
                {{ organization.types[0] }}
              </span>
            </div>
            
            <!-- Industry (if present) -->
            <p v-if="organization.industry" class="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {{ organization.industry }}
            </p>
            
            <!-- Primary Contact -->
            <div v-if="organization.primaryContact" class="mt-2">
              <span class="text-sm text-gray-500 dark:text-gray-400">Primary Contact: </span>
              <button
                @click="openTab(`/people/${organization.primaryContact.id}`)"
                class="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                {{ organization.primaryContact.displayName }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- B. People Section -->
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div class="flex items-center justify-between mb-2">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              People <span v-if="organization.peopleCount !== undefined" class="text-gray-500 dark:text-gray-400 font-normal">({{ organization.peopleCount }})</span>
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              People associated with this organization
            </p>
          </div>
          <button
            v-if="organization.peopleCount > organization.peoplePreview.length"
            @click="openTab(`/people?organization=${organization.id}`)"
            class="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View all
          </button>
        </div>
        
        <div v-if="organization.peoplePreview && organization.peoplePreview.length > 0" class="space-y-2 mt-4">
          <div
            v-for="person in organization.peoplePreview"
            :key="person.id"
            class="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
          >
            <button
              @click="openTab(`/people/${person.id}`)"
              class="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
            >
              {{ person.name }}
            </button>
            <span v-if="person.role" class="text-xs text-gray-500 dark:text-gray-400">
              {{ person.role }}
            </span>
          </div>
        </div>
        <!-- Empty state: Explain why data is missing, guide to context, never prompt global creation -->
        <p v-else-if="organization.peopleCount === 0" class="text-sm text-gray-500 dark:text-gray-400 italic mt-4">
          No people linked yet — add people from the People surface and link them to this organization.
        </p>
      </div>

      <!-- C. Work by App Section -->
      <div v-if="organization.apps && organization.apps.length > 0" class="space-y-4">
        <div
          v-for="app in organization.apps.filter(a => a.hasWork)"
          :key="app.appKey"
          class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
        >
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {{ getAppLabel(app.appKey) }}
          </h2>
          
          <div v-if="app.counts" class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
              v-for="(count, workType) in app.counts"
              :key="workType"
              class="text-center"
            >
              <div class="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {{ count }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">
                {{ workType }}
              </div>
            </div>
          </div>
          <p v-else class="text-sm text-gray-500 dark:text-gray-400">
            Work exists for this app.
          </p>
        </div>
        
        <!-- Empty state: Explain why data is missing, guide to context -->
        <div v-if="organization.apps.filter(a => a.hasWork).length === 0" class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p class="text-sm text-gray-500 dark:text-gray-400 italic">
            No work yet — this organization hasn't been used in any apps. Link it to deals in Sales, tickets in Helpdesk, or audits in Audit.
          </p>
        </div>
      </div>

      <!-- D. Business Details (Collapsed by Default) -->
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          @click="showBusinessDetails = !showBusinessDetails"
          class="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Business Details
          </h2>
          <svg
            :class="['w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform', { 'rotate-180': showBusinessDetails }]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        <div v-if="showBusinessDetails" class="px-6 pb-6 space-y-4">
          <!-- Helper note: Explain that details are managed by apps -->
          <p class="text-xs text-gray-500 dark:text-gray-400 italic mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
            These details are managed by the app that uses them (e.g., Sales, Helpdesk).
          </p>
          
          <div v-if="organization.website" class="flex items-start">
            <span class="text-sm font-medium text-gray-600 dark:text-gray-400 w-24 flex-shrink-0">Website:</span>
            <a
              :href="organization.website"
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {{ organization.website }}
            </a>
          </div>
          
          <div v-if="organization.phone" class="flex items-start">
            <span class="text-sm font-medium text-gray-600 dark:text-gray-400 w-24 flex-shrink-0">Phone:</span>
            <a
              :href="`tel:${organization.phone}`"
              class="text-sm text-gray-900 dark:text-gray-100"
            >
              {{ organization.phone }}
            </a>
          </div>
          
          <div v-if="organization.address" class="flex items-start">
            <span class="text-sm font-medium text-gray-600 dark:text-gray-400 w-24 flex-shrink-0">Address:</span>
            <span class="text-sm text-gray-900 dark:text-gray-100">{{ organization.address }}</span>
          </div>
          
          <div v-if="organization.annualRevenue" class="flex items-start">
            <span class="text-sm font-medium text-gray-600 dark:text-gray-400 w-24 flex-shrink-0">Revenue:</span>
            <span class="text-sm text-gray-900 dark:text-gray-100">
              {{ formatCurrency(organization.annualRevenue) }}
            </span>
          </div>
          
          <div v-if="organization.numberOfEmployees" class="flex items-start">
            <span class="text-sm font-medium text-gray-600 dark:text-gray-400 w-24 flex-shrink-0">Employees:</span>
            <span class="text-sm text-gray-900 dark:text-gray-100">
              {{ organization.numberOfEmployees.toLocaleString() }}
            </span>
          </div>
          
          <!-- Empty state: Explain why data is missing, guide to context -->
          <p v-if="!hasBusinessDetails" class="text-sm text-gray-500 dark:text-gray-400 italic">
            No business details available — add details when creating or editing this organization from the relevant app context.
          </p>
        </div>
      </div>

      <!-- E. Activity Timeline -->
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Recent Activity
        </h2>
        
        <div v-if="organization.recentActivity && organization.recentActivity.length > 0" class="space-y-4">
          <div
            v-for="(activity, index) in organization.recentActivity"
            :key="index"
            class="flex items-start gap-4 pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0"
          >
            <div class="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-gray-900 dark:text-gray-100">
                <template v-if="activity.personId && activity.personName">
                  <span>{{ getActivitySummaryBeforePerson(activity) }}</span>
                  <button
                    @click="openTab(`/people/${activity.personId}`)"
                    class="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    {{ activity.personName }}
                  </button>
                  <span>{{ getActivitySummaryAfterPerson(activity) }}</span>
                </template>
                <template v-else>
                  {{ formatActivitySummary(activity) }}
                </template>
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {{ formatDate(activity.timestamp) }}
              </p>
            </div>
          </div>
        </div>
        <!-- Empty state: Explain why data is missing -->
        <p v-else class="text-sm text-gray-500 dark:text-gray-400 italic">
          No recent activity — changes to this organization will appear here.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useTabs } from '@/composables/useTabs';
import apiClient from '@/utils/apiClient';

const route = useRoute();
const { openTab } = useTabs();

// State
const loading = ref(true);
const error = ref(null);
const organization = ref(null);
const showBusinessDetails = ref(false);

// Computed
const hasBusinessDetails = computed(() => {
  if (!organization.value) return false;
  return !!(
    organization.value.website ||
    organization.value.phone ||
    organization.value.address ||
    organization.value.annualRevenue ||
    organization.value.numberOfEmployees
  );
});

// Methods
const fetchOrganization = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const response = await apiClient(`/organizations/${route.params.id}/surface`, {
      method: 'GET'
    });
    
    if (response.success) {
      // DEFENSIVE UX FALLBACK: Check for tenant organization data
      // This should never happen (backend should reject with 403),
      // but this is a last line of defense to prevent platform data leakage.
      const data = response.data;
      
      // If the API accidentally returns tenant data (should never happen),
      // show a generic error instead of rendering.
      // We check for tenant-only fields that should never be in OrganizationSurfaceData.
      // Note: OrganizationSurfaceData type explicitly excludes these fields,
      // so if they appear, something went wrong.
      if (data.subscription || data.enabledApps || data.limits || data.isTenant === true) {
        console.error('[OrganizationSurface] Tenant organization data detected - rejecting');
        error.value = 'This organization cannot be accessed via OrganizationSurface.';
        organization.value = null;
        return;
      }
      
      organization.value = data;
    } else {
      error.value = response.message || 'Failed to load organization';
    }
  } catch (err) {
    console.error('Error fetching organization surface:', err);
    
    // Handle specific error cases
    if (err.status === 403) {
      error.value = 'This organization cannot be accessed via OrganizationSurface.';
    } else if (err.status === 404) {
      error.value = 'Organization not found.';
    } else {
      error.value = err.message || 'Failed to load organization';
    }
  } finally {
    loading.value = false;
  }
};

const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatDate = (timestamp) => {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '-';
  
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

const getAppLabel = (appKey) => {
  const labels = {
    'SALES': 'Sales',
    'HELPDESK': 'Helpdesk',
    'AUDIT': 'Audit',
    'PORTAL': 'Portal',
    'PROJECTS': 'Projects',
    'LMS': 'Learning Management'
  };
  return labels[appKey] || appKey;
};

/**
 * Format activity summary for human-readable display
 * Improves readability by:
 * - Using user display name instead of raw IDs
 * - Making action descriptions more natural
 * - Handling generic/system actions gracefully
 * - Converting technical action names to human-friendly text
 * - Removing raw ObjectIds from summaries
 */
const formatActivitySummary = (activity) => {
  if (!activity) return 'Activity recorded';
  
  const user = activity.user || 'System';
  const action = activity.action || '';
  
  // Map common action patterns to human-friendly descriptions
  const actionMap = {
    'created this record': 'created this organization',
    'created': 'created this organization',
    'updated': 'updated this organization',
    'status_changed': 'changed status',
    'customer_status_changed': 'changed customer status',
    'partner_status_changed': 'changed partner status',
    'vendor_status_changed': 'changed vendor status',
    'name_changed': 'changed name',
    'industry_changed': 'changed industry',
    'website_changed': 'changed website',
    'phone_changed': 'changed phone',
    'address_changed': 'changed address',
    'annual_revenue_changed': 'changed annual revenue',
    'number_of_employees_changed': 'changed number of employees',
    'primary_contact_changed': 'changed primary contact',
    'performed an action': 'made a change',
    'unknown': 'made a change'
  };
  
  // Remove ObjectIds from action before processing
  // ObjectIds are 24-character hexadecimal strings
  const objectIdPattern = /['"]?[0-9a-fA-F]{24}['"]?/g;
  let cleanAction = action.replace(objectIdPattern, '').trim();
  
  // Get human-friendly action description
  let formattedAction = actionMap[cleanAction.toLowerCase()] || cleanAction;
  
  // If action contains underscores, convert to readable text
  if (formattedAction.includes('_') && !actionMap[cleanAction.toLowerCase()]) {
    formattedAction = formattedAction
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  // Handle common patterns with ObjectIds removed
  if (formattedAction.includes('created people')) {
    formattedAction = 'created a person';
  } else if (formattedAction.includes('created organization')) {
    formattedAction = 'created this organization';
  } else if (formattedAction.includes('linked')) {
    formattedAction = formattedAction.replace(/linked\s+to\s*/gi, 'linked');
  }
  
  // Build final summary
  let summary = `${user} ${formattedAction}`;
  
  // Use provided summary if it exists and is different from our generated one
  if (activity.summary && activity.summary.trim() && activity.summary !== `${user} ${action}`) {
    summary = activity.summary.trim();
    
    // Remove raw ObjectIds (24-character hexadecimal strings)
    // Pattern: matches ObjectIds in quotes, parentheses, or standalone
    summary = summary.replace(objectIdPattern, '');
    
    // Clean up common patterns in provided summary
    summary = summary.replace(/performed an action/gi, 'made a change');
    summary = summary.replace(/unknown/gi, 'made a change');
    
    // Clean up common patterns that result from ObjectId removal
    summary = summary.replace(/\s+created\s+people\s*/gi, ' created a person');
    summary = summary.replace(/\s+created\s+people\s+['"]/gi, ' created a person');
    summary = summary.replace(/\s+created\s+organization\s*/gi, ' created this organization');
    summary = summary.replace(/\s+linked\s+to\s*/gi, ' linked');
    summary = summary.replace(/\s+unlinked\s+from\s*/gi, ' unlinked');
    
    // Remove extra spaces and clean up punctuation
    summary = summary.replace(/\s+/g, ' ').trim();
    summary = summary.replace(/\s+([.,;:])/g, '$1'); // Remove space before punctuation
    summary = summary.replace(/([.,;:])\s*([.,;:])/g, '$1'); // Remove duplicate punctuation
    summary = summary.replace(/^\s*,\s*/, ''); // Remove leading comma
    summary = summary.replace(/\s*,\s*$/, ''); // Remove trailing comma
  }
  
  // Ensure proper capitalization
  if (summary.length > 0) {
    summary = summary.charAt(0).toUpperCase() + summary.slice(1);
  }
  
  return summary;
};

/**
 * Get the part of activity summary before the person name
 * Used to split summary for rendering person name as link
 */
const getActivitySummaryBeforePerson = (activity) => {
  if (!activity || !activity.personName) return formatActivitySummary(activity);
  
  let summary = formatActivitySummary(activity);
  
  // Check if this is a person creation action
  const isPersonCreation = activity.action && 
    (activity.action.includes('people') || 
     activity.action.includes('person') ||
     summary.toLowerCase().includes('created a person') ||
     summary.toLowerCase().includes('created person'));
  
  if (isPersonCreation) {
    // Replace "created a person" or "created person" with "created "
    summary = summary.replace(/\bcreated (a )?person\b/gi, 'created ');
    return summary;
  }
  
  // If person name appears in summary, get text before it
  const nameIndex = summary.indexOf(activity.personName);
  if (nameIndex !== -1) {
    return summary.substring(0, nameIndex);
  }
  
  return summary;
};

/**
 * Get the part of activity summary after the person name
 * Used to split summary for rendering person name as link
 */
const getActivitySummaryAfterPerson = (activity) => {
  if (!activity || !activity.personName) return '';
  
  let summary = formatActivitySummary(activity);
  
  // Check if this is a person creation action
  const isPersonCreation = activity.action && 
    (activity.action.includes('people') || 
     activity.action.includes('person') ||
     summary.toLowerCase().includes('created a person') ||
     summary.toLowerCase().includes('created person'));
  
  if (isPersonCreation) {
    // For creation actions, there's no text after the person name
    return '';
  }
  
  // If person name appears in summary, get text after it
  const nameIndex = summary.indexOf(activity.personName);
  if (nameIndex !== -1) {
    return summary.substring(nameIndex + activity.personName.length);
  }
  
  return '';
};

// Listen for refresh events from command palette or other sources
const handleRefreshOrganization = (event) => {
  const { organizationId } = event.detail || {};
  // Only refresh if this is the current organization
  if (organizationId && organizationId === route.params.id) {
    fetchOrganization();
  }
};

// Lifecycle
onMounted(() => {
  fetchOrganization();
  
  // Listen for refresh events
  if (typeof window !== 'undefined') {
    window.addEventListener('litedesk:refresh-organization', handleRefreshOrganization);
  }
});

onUnmounted(() => {
  // Clean up event listener
  if (typeof window !== 'undefined') {
    window.removeEventListener('litedesk:refresh-organization', handleRefreshOrganization);
  }
});
</script>
