<template>
  <!-- Wrapper keeps layout unchanged; icon is absolutely positioned -->
  <div
    class="w-full relative group"
    @mouseenter="isRowHovered = true"
    @mouseleave="isRowHovered = false"
    @focusin="isRowFocused = true"
    @focusout="isRowFocused = false"
  >
    <!-- Main click target (layout/spacing unchanged) -->
    <button
      type="button"
      class="w-full flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-left min-h-[44px]"
      @click="handleClick"
      :aria-label="item.title"
    >
      <!-- Icon -->
      <div class="mt-1 flex-shrink-0">
        <span
          class="inline-flex items-center justify-center w-8 h-8 rounded-full"
          :class="iconBgClass"
        >
          <component :is="iconComponent" class="w-4 h-4" :class="iconColorClass" />
        </span>
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <p
          class="text-sm"
          :class="item.readAt ? 'text-gray-700 dark:text-gray-300' : 'font-semibold text-gray-900 dark:text-white'"
        >
          {{ item.title }}
        </p>
        <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
          {{ entityLabel }}
        </p>
        <p class="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
          {{ relativeTime }}
        </p>
        <p
          v-if="unavailable"
          class="mt-1 text-xs text-amber-600 dark:text-amber-400"
        >
          This item is no longer available.
        </p>
      </div>
    </button>

    <!-- Inline actions (NotificationDrawer only) -->
    <div
      v-if="showActions"
      class="absolute right-2 bottom-2 flex items-center gap-1 transition-opacity"
      :class="actionsVisible ? 'opacity-100' : 'opacity-0'"
      :style="actionsVisible ? '' : 'pointer-events:none;'"
    >
      <!-- Inline feedback (no toast) -->
      <span
        v-if="feedbackText"
        class="absolute -top-6 right-0 text-[11px] text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-900/80 backdrop-blur px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-800"
        aria-live="polite"
      >
        {{ feedbackText }}
      </span>

      <!-- Open -->
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[28px] min-w-[28px]"
        :tabindex="actionsVisible ? 0 : -1"
        aria-label="Open notification"
        title="Open"
        @click.stop.prevent="handleOpenAction"
      >
        <ArrowTopRightOnSquareIcon class="w-4 h-4" aria-hidden="true" />
      </button>

      <!-- Mark as read (unread only) -->
      <button
        v-if="isUnread"
        type="button"
        class="inline-flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[28px] min-w-[28px]"
        :tabindex="actionsVisible ? 0 : -1"
        aria-label="Mark notification as read"
        title="Mark as read"
        @click.stop.prevent="handleMarkReadAction"
      >
        <CheckIcon class="w-4 h-4" aria-hidden="true" />
      </button>

      <!-- Snooze (time-based only) -->
      <Popover
        v-if="isTimeBased"
        v-slot="{ close }"
        class="relative"
      >
        <PopoverButton
          type="button"
          ref="snoozeButtonEl"
          class="inline-flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[28px] min-w-[28px]"
          :tabindex="actionsVisible ? 0 : -1"
          aria-label="Snooze options"
          title="Snooze"
        >
          <ClockIcon class="w-4 h-4" aria-hidden="true" />
        </PopoverButton>

        <PopoverPanel
          class="absolute right-0 bottom-full mb-2 w-56 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg p-2 z-20 focus:outline-none"
        >
          <div class="space-y-1">
            <button
              v-for="opt in snoozeOptions"
              :key="opt.key"
              type="button"
              class="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              :aria-label="opt.ariaLabel"
              @click="onSelectSnooze(opt, close)"
            >
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ opt.label }}
              </p>
              <p class="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                {{ opt.helpText }}
              </p>
            </button>
          </div>
        </PopoverPanel>
      </Popover>

      <!-- Resolve (resolvable only) -->
      <button
        v-if="isResolvable"
        type="button"
        class="inline-flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[28px] min-w-[28px]"
        :tabindex="actionsVisible ? 0 : -1"
        aria-label="Acknowledge notification (does not change record)"
        title="Acknowledge — Marks this notification as handled. Does not change the underlying record."
        @click.stop.prevent="handleResolveAction"
      >
        <CheckCircleIcon class="w-4 h-4" aria-hidden="true" />
      </button>
    </div>

    <!-- Anchored explainability popover (hidden by default on desktop) -->
    <Popover
      v-slot="{ close }"
      class="absolute right-2 top-2"
      :class="iconVisible ? 'opacity-100' : 'opacity-0'"
      :style="iconVisible ? '' : 'pointer-events:none;'"
    >
      <PopoverButton
        type="button"
        ref="infoButtonEl"
        class="inline-flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[28px] min-w-[28px]"
        :tabindex="iconVisible ? 0 : -1"
        :aria-label="`Why am I seeing this?`"
        @click="onInfoClick"
      >
        <InfoOutlineIcon class="w-4 h-4" aria-hidden="true" />
      </PopoverButton>

      <PopoverPanel
        ref="whyPanelEl"
        class="absolute mt-2 w-[320px] max-w-[calc(100vw-32px)] rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg p-4 z-10 focus:outline-none"
        :class="panelSide === 'right' ? 'right-0' : 'left-0'"
      >
        <div class="space-y-4">
          <div>
            <p class="text-sm font-semibold text-gray-900 dark:text-white">
              Why you received this notification
            </p>
            <p class="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
              A quick explanation based on the notification details.
            </p>
          </div>

          <!-- Trigger -->
          <div v-if="triggerLine">
            <p class="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              This happened because
            </p>
            <p class="mt-1 text-sm text-gray-900 dark:text-white">
              {{ triggerLine }}
            </p>
          </div>

          <!-- Your role -->
          <div v-if="roleLines.length">
            <p class="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              You received this because you are
            </p>
            <ul class="mt-1 text-sm text-gray-900 dark:text-white space-y-1">
              <li v-for="(line, idx) in roleLines" :key="idx" class="flex gap-2">
                <span class="text-gray-400 dark:text-gray-500">•</span>
                <span>{{ line }}</span>
              </li>
            </ul>
          </div>

          <!-- Delivery -->
          <div v-if="deliveryLine">
            <p class="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Delivered via
            </p>
            <p class="mt-1 text-sm text-gray-900 dark:text-white">
              {{ deliveryLine }}
            </p>
          </div>

          <!-- Control -->
          <div>
            <p class="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Control
            </p>
            <p class="mt-1 text-sm text-gray-700 dark:text-gray-300">
              You can manage notifications like this in Notification settings.
            </p>
            <div class="mt-2 flex flex-col gap-2">
              <router-link
                to="/settings?tab=notifications&notificationPage=overview"
                class="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                @click="close"
              >
                Open Notification settings
              </router-link>
              <router-link
                v-if="hasRuleId"
                to="/settings?tab=notifications&notificationPage=rules"
                class="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                @click="close"
              >
                Review notification rules
              </router-link>
            </div>
          </div>
        </div>
      </PopoverPanel>
    </Popover>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useNotificationStore } from '@/stores/notifications';
import { getNotificationRoute, validateRoute } from '@/utils/notificationRouteMap';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue';
import {
  BellAlertIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/vue/24/solid';
import { InformationCircleIcon as InfoOutlineIcon } from '@heroicons/vue/24/outline';
import {
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ClockIcon
} from '@heroicons/vue/24/outline';

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  appKey: {
    type: String,
    required: true
  },
  showActions: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['navigated', 'snooze']);

const router = useRouter();
const store = useNotificationStore();
const unavailable = ref(false);

const relativeTime = computed(() => store.formatRelative(props.item.createdAt));

const iconComponent = computed(() => {
  if (props.item.priority === 'HIGH') return BellAlertIcon;
  if (props.item.priority === 'LOW') return InformationCircleIcon;
  return CheckCircleIcon;
});

const iconBgClass = computed(() => {
  if (props.item.priority === 'HIGH') return 'bg-red-100 dark:bg-red-900/40';
  if (props.item.priority === 'LOW') return 'bg-blue-100 dark:bg-blue-900/40';
  return 'bg-green-100 dark:bg-green-900/40';
});

const iconColorClass = computed(() => {
  if (props.item.priority === 'HIGH') return 'text-red-600 dark:text-red-400';
  if (props.item.priority === 'LOW') return 'text-blue-600 dark:text-blue-400';
  return 'text-green-600 dark:text-green-400';
});

const entityLabel = computed(() => {
  if (!props.item.entity || !props.item.entity.type) return 'Notification';
  return props.item.entity.type;
});

const eventType = computed(() => props.item?.eventType || null);
const recipientType = computed(() => props.item?.recipientType || null);
const channel = computed(() => props.item?.channel || 'IN_APP');
const ruleId = computed(() => props.item?.ruleId || null);
const hasRuleId = computed(() => !!ruleId.value);

function formatChannel(ch) {
  const normalized = String(ch || '').toUpperCase();
  const map = {
    IN_APP: 'In-app',
    INAPP: 'In-app',
    EMAIL: 'Email',
    PUSH: 'Push',
    WHATSAPP: 'WhatsApp',
    SMS: 'SMS'
  };
  return map[normalized] || 'In-app';
}

function triggerFromEventType(evt) {
  const t = String(evt || '').toUpperCase();
  const map = {
    TASK_ASSIGNED: 'A task was assigned.',
    TASK_CREATED: 'A task was created.',
    TASK_STATUS_CHANGED: 'A task was updated.',
    TASK_DUE_SOON: 'A task is due soon.',
    AUDIT_ASSIGNED: 'An audit was assigned.',
    AUDIT_CHECKED_IN: 'An audit was checked in.',
    AUDIT_SUBMITTED: 'An audit was submitted for review.',
    AUDIT_APPROVED: 'An audit was approved.',
    AUDIT_REJECTED: 'An audit was rejected.',
    CORRECTIVE_ACTION_CREATED: 'A corrective action was created.',
    CORRECTIVE_ACTION_DUE_SOON: 'A corrective action is due soon.',
    CORRECTIVE_ACTION_OVERDUE: 'A corrective action is overdue.',
    EVIDENCE_UPLOADED: 'Evidence or files were uploaded.',
    PORTAL_ACCOUNT_CREATED: 'A portal account was created.',
    USER_ADDED_TO_APP: 'Access was updated in your workspace.',
    SYSTEM_TRIAL_EXPIRING: 'Your trial is approaching its end.',
    SYSTEM_SUBSCRIPTION_SUSPENDED: 'Your subscription status changed.'
  };
  if (map[t]) return map[t];
  if (t.startsWith('SYSTEM_')) return 'A system update occurred.';
  return 'An update occurred in your workspace.';
}

function roleLinesFromMetadata({ recipientTypeValue, ruleIdValue }) {
  const lines = [];
  const rt = String(recipientTypeValue || '').toUpperCase();

  if (ruleIdValue) {
    lines.push('Triggered by one of your notification rules.');
  }

  if (rt.includes('ASSIGNEE')) lines.push('An assignee.');
  else if (rt.includes('OWNER')) lines.push('An owner.');
  else if (rt.includes('MENTION')) lines.push('Mentioned.');
  else if (rt.includes('RULE')) lines.push('Matched a notification rule.');
  else if (rt.includes('SYSTEM')) lines.push('A default recipient for this type of update.');

  // If we still have nothing, keep it calm and non-technical.
  if (lines.length === 0) {
    lines.push('A relevant participant.');
  }

  // Deduplicate while preserving order
  return [...new Set(lines)];
}

const triggerLine = computed(() => triggerFromEventType(eventType.value));
const deliveryLine = computed(() => formatChannel(channel.value));
const roleLines = computed(() => roleLinesFromMetadata({ recipientTypeValue: recipientType.value, ruleIdValue: ruleId.value }));

// Popover positioning (lightweight flip to keep in viewport)
const infoButtonEl = ref(null);
const whyPanelEl = ref(null);
const panelSide = ref('right'); // 'right' (default) or 'left'

// Visibility behavior:
// - Desktop: hidden unless row hover or focus
// - Touch (coarse pointer): always visible
const isRowHovered = ref(false);
const isRowFocused = ref(false);
const isCoarsePointer = ref(false);

let coarseMedia = null;
function syncCoarsePointer() {
  if (!coarseMedia) return;
  isCoarsePointer.value = !!coarseMedia.matches;
}

onMounted(() => {
  if (typeof window === 'undefined' || !window.matchMedia) return;
  coarseMedia = window.matchMedia('(pointer: coarse)');
  syncCoarsePointer();
  // eslint-disable-next-line no-unused-vars
  const handler = () => syncCoarsePointer();
  coarseMedia.addEventListener?.('change', handler);
  // Safari fallback
  coarseMedia.addListener?.(handler);
});

onBeforeUnmount(() => {
  if (!coarseMedia) return;
  // eslint-disable-next-line no-unused-vars
  const handler = () => syncCoarsePointer();
  coarseMedia.removeEventListener?.('change', handler);
  coarseMedia.removeListener?.(handler);
  coarseMedia = null;
});

const iconVisible = computed(() => {
  return isCoarsePointer.value || isRowHovered.value || isRowFocused.value;
});

// Actions follow the same reveal rules as the info icon
const actionsVisible = computed(() => iconVisible.value);

function computePanelSide() {
  const toEl = (maybe) => {
    if (!maybe) return null;
    // Headless UI components may return component instances via ref
    if (maybe.$el) return maybe.$el;
    return maybe;
  };

  const panelEl = toEl(whyPanelEl.value);
  if (!panelEl || typeof panelEl.getBoundingClientRect !== 'function') return;

  const panelRect = panelEl.getBoundingClientRect();
  const viewportW = window.innerWidth || document.documentElement.clientWidth;

  // If we overflow on the left, align panel to the left edge of the icon.
  if (panelRect.left < 8) {
    panelSide.value = 'left';
    return;
  }
  // If we overflow on the right, align panel to the right edge of the icon.
  if (panelRect.right > viewportW - 8) {
    panelSide.value = 'right';
  }
}

async function onInfoClick() {
  // Default to right-aligned (opens to the left), then adjust after panel renders.
  panelSide.value = 'right';
  try {
    await nextTick();
    // Two passes helps when transitions/layout settle.
    computePanelSide();
    requestAnimationFrame(() => computePanelSide());
  } catch (e) {
    // Never block interaction if measurement fails
    console.warn('[NotificationItem] Popover positioning failed:', e);
  }
}

const isUnread = computed(() => !props.item?.readAt);

const isTimeBased = computed(() => {
  const t = String(eventType.value || '').toUpperCase();
  return t.includes('DUE_SOON') || t.includes('OVERDUE') || t.includes('EXPIRING');
});

const isResolvable = computed(() => {
  const entType = String(props.item?.entity?.type || '').toUpperCase();
  // Best-effort: treat corrective actions as resolvable items (user can address/close them).
  return entType === 'CORRECTIVE_ACTION';
});

async function handleOpenAction() {
  await handleClick();
}

async function handleMarkReadAction() {
  await store.markRead(props.item.id);
  flashFeedback('Marked read');
}

function handleSnoozeAction() {
  // replaced by smart snooze popover
}

async function handleResolveAction() {
  // “Resolve” is a lightweight acknowledgement: mark as read (no new APIs).
  await store.markRead(props.item.id);
  flashFeedback('Acknowledged');
}

const feedbackText = ref('');
let feedbackTimer = null;
function flashFeedback(text) {
  feedbackText.value = text;
  if (feedbackTimer) clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => {
    feedbackText.value = '';
    feedbackTimer = null;
  }, 1200);
}

// Smart Snooze v1 (UI-only): fixed set of options
const snoozeButtonEl = ref(null);

function parseDueAt() {
  const raw =
    props.item?.dueAt ||
    props.item?.deadlineAt ||
    props.item?.entity?.dueAt ||
    props.item?.entity?.deadlineAt;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function nextBusinessMorning(date) {
  const d = new Date(date);
  d.setHours(9, 0, 0, 0);
  return d;
}

function getUntilTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return nextBusinessMorning(d);
}

function getUntilNextWeek() {
  const d = new Date();
  // Next Monday 9am
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const daysUntilMonday = ((8 - day) % 7) || 7;
  d.setDate(d.getDate() + daysUntilMonday);
  return nextBusinessMorning(d);
}

function focusSnoozeButton() {
  const maybe = snoozeButtonEl.value;
  const el = maybe?.$el || maybe;
  if (el && typeof el.focus === 'function') el.focus();
}

const snoozeOptions = computed(() => {
  const now = Date.now();
  const dueAt = parseDueAt();
  const opts = [
    {
      key: '1h',
      label: '1 hour',
      helpText: 'Hide this notification for 1 hour. Reappears automatically.',
      until: new Date(now + 60 * 60 * 1000)
    },
    {
      key: 'tomorrow',
      label: 'Until tomorrow',
      helpText: 'Hide this notification until tomorrow. Reappears automatically.',
      until: getUntilTomorrow()
    },
    {
      key: 'nextweek',
      label: 'Until next week',
      helpText: 'Hide this notification until next week. Reappears automatically.',
      until: getUntilNextWeek()
    }
  ];

  if (dueAt && dueAt.getTime() > now) {
    opts.push({
      key: 'duedate',
      label: 'Until due date',
      helpText: 'Hide this notification until its due date. Reappears automatically.',
      until: dueAt
    });
  }

  return opts.map(o => ({
    ...o,
    ariaLabel: o.key === '1h'
      ? 'Snooze for 1 hour'
      : `Snooze ${o.label.toLowerCase()}`
  }));
});

function onSelectSnooze(opt, closePopover) {
  const untilMs = opt.until.getTime();
  const label = opt.label;

  flashFeedback(`Snoozed ${label === '1 hour' ? 'for 1 hour' : `until ${label.toLowerCase().replace('until ', '')}`}`);

  // Close popover and return focus to trigger
  closePopover?.();
  nextTick(() => focusSnoozeButton());

  // Slight delay so the inline feedback can be perceived before the row disappears.
  setTimeout(() => {
    emit('snooze', { id: props.item.id, until: untilMs, label });
  }, 200);
}

async function handleClick() {
  // Optimistically mark as read
  await store.markRead(props.item.id);

  // Get route from centralized map
  const route = getNotificationRoute(props.appKey, props.item.entity);
  
  if (!route) {
    console.warn('[NotificationItem] No route available for:', {
      appKey: props.appKey,
      entity: props.item.entity
    });
    unavailable.value = true;
    return;
  }

  // Validate route exists before navigating
  if (!validateRoute(router, route)) {
    console.warn('[NotificationItem] Route validation failed:', route);
    unavailable.value = true;
    return;
  }

  try {
    await router.push(route);
    emit('navigated');
  } catch (err) {
    console.error('[NotificationItem] Navigation error:', err);
    unavailable.value = true;
  }
}
</script>


