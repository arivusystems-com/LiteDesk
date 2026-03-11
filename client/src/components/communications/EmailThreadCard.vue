<template>
  <div :class="['flex-1 min-w-0', compact ? 'py-0' : 'py-1.5']">
    <div class="group/thread w-full overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-colors">
      <!-- Collapsed card header (always shown) -->
      <button
        type="button"
        class="w-full text-left transition-colors hover:bg-gray-50/70 dark:hover:bg-gray-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
        @click="$emit('toggle')"
      >
        <div class="flex items-center gap-3 px-4 pt-3 pb-2">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/10 dark:ring-indigo-400/10">
            <EnvelopeIcon class="w-4 h-4" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {{ thread.participantDisplay || `${thread.messageCount || 0} message${(thread.messageCount || 0) !== 1 ? 's' : ''}` }}
              </span>
              <span
                v-if="thread.unread"
                class="w-2 h-2 rounded-full bg-indigo-500 shrink-0"
                title="Unread"
              />
            </div>
            <p
              :class="[
                'text-sm mt-0.5 line-clamp-2 leading-5 max-w-[62ch]',
                thread.unread
                  ? 'font-semibold text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400'
              ]"
            >
              {{ thread.subject }}
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-2 pl-2">
            <span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              <span
                class="cursor-help"
                :title="formatFullDate ? formatFullDate(thread.lastActivityAt || thread.firstActivityAt) : ''"
                @pointerup.stop="handleTimestampPointerUp($event, thread.lastActivityAt || thread.firstActivityAt)"
              >
                {{ formatDate(thread.lastActivityAt || thread.firstActivityAt) }}
              </span>
            </span>
            <span class="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 group-hover/thread:text-gray-600 dark:group-hover/thread:text-gray-300 transition-colors">
              <ChevronRightIcon
                :class="['w-5 h-5 transition-transform duration-200', expanded && 'rotate-90']"
              />
            </span>
          </div>
        </div>
      </button>

      <!-- Expanded thread: inline content inside same card -->
      <Transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="expanded" class="border-t border-gray-200 dark:border-gray-700">
          <div class="px-4 pb-3.5 pt-2.5">
            <div
              v-for="(msg, mi) in thread.messages"
              :key="msg._id || mi"
              :class="[
                mi > 0 ? 'mt-3.5 pt-3.5 border-t border-gray-100 dark:border-gray-800' : '',
                'transition-colors'
              ]"
            >
              <!-- Message header (avatar + meta) -->
              <div class="flex items-start justify-between gap-2 pb-1.5">
                <div class="flex items-center gap-3 min-w-0">
                  <Avatar
                    v-if="msg.direction === 'outbound' && currentUser"
                    :user="currentUser"
                    size="sm"
                  />
                  <div
                    v-else
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-medium"
                    :class="[
                      msg.direction === 'outbound'
                        ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    ]"
                  >
                    {{ getMessageInitials(msg) }}
                  </div>
                  <div class="min-w-0 flex items-center gap-2 flex-wrap">
                    <span class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {{ getMessageSenderLabel(msg) }}
                    </span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">
                      <span
                        class="cursor-help"
                        :title="formatFullDate ? formatFullDate(msg.sentAt || msg.receivedAt) : ''"
                        @pointerup.stop="handleTimestampPointerUp($event, msg.sentAt || msg.receivedAt)"
                      >
                      {{ formatDate(msg.sentAt || msg.receivedAt) }}
                      </span>
                    </span>
                    <span
                      v-if="msg.direction === 'outbound'"
                      class="text-xs font-medium text-indigo-600 dark:text-indigo-400"
                    >
                      {{ msg.direction === 'outbound' ? 'Sent' : 'Received' }}
                    </span>
                  </div>
                </div>
                <div class="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    @click="$emit('create-task', msg)"
                    class="inline-flex items-center justify-center rounded-md border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                  >
                    Create task
                  </button>
                </div>
              </div>

              <!-- Message body -->
              <div class="max-w-[72ch] text-sm leading-[1.55] text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                {{ getMessageBody(msg.body) }}
              </div>

              <!-- Attachments -->
              <div v-if="msg.attachments && msg.attachments.length > 0" class="mt-3 grid gap-2.5">
                <a
                  v-for="(att, ai) in msg.attachments"
                  :key="ai"
                  :href="getEmailAttachmentUrl(att)"
                  target="_blank"
                  rel="noopener noreferrer"
                  :class="[
                    'group/attachment block overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 transition',
                    isEmailImageAttachment(att) ? '' : 'p-2.5',
                    isEmailImageAttachment(att)
                      ? 'cursor-pointer'
                      : 'hover:-translate-y-px hover:border-indigo-300 hover:shadow-sm dark:hover:border-indigo-500'
                  ]"
                >
                  <div
                    v-if="isEmailImageAttachment(att)"
                    class="relative max-h-[240px] overflow-hidden bg-slate-50 dark:bg-gray-800"
                  >
                    <img
                      :src="getEmailAttachmentUrl(att)"
                      :alt="getEmailAttachmentName(att)"
                      class="block max-h-[240px] w-full object-contain"
                      loading="lazy"
                    />
                    <div class="flex items-center justify-between gap-2 border-t border-gray-100 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
                      <span class="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{{ getEmailAttachmentName(att) }}</span>
                    </div>
                  </div>
                  <div v-else class="flex items-center gap-2.5">
                    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      <PaperClipIcon class="w-4 h-4" />
                    </div>
                    <div class="min-w-0 flex flex-col gap-0.5">
                      <span class="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{{ getEmailAttachmentName(att) }}</span>
                      <span class="text-xs text-gray-500 dark:text-gray-400">Attachment</span>
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { EnvelopeIcon, ChevronRightIcon, PaperClipIcon } from '@heroicons/vue/24/outline';
import Avatar from '@/components/common/Avatar.vue';

const props = defineProps({
  thread: {
    type: Object,
    required: true
  },
  expanded: {
    type: Boolean,
    default: false
  },
  currentUser: {
    type: Object,
    default: null
  },
  /** When true, reduces padding (for use inside ActivityTimeline) */
  compact: {
    type: Boolean,
    default: false
  },
  formatDate: {
    type: Function,
    required: true
  },
  formatFullDate: {
    type: Function,
    default: null
  },
  onTimestampPointerUp: {
    type: Function,
    default: null
  }
});

const handleTimestampPointerUp = (event, date) => {
  if (typeof props.onTimestampPointerUp === 'function') {
    props.onTimestampPointerUp(event, date);
  }
};

defineEmits(['toggle', 'create-task']);

function getMessageBody(body) {
  if (!body || typeof body !== 'string') return '(no content)';
  let t = body
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
  return t.replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*\n/g, '\n\n').trim() || '(no content)';
}

function getMessageSenderLabel(msg) {
  if (msg.direction === 'outbound') {
    const u = props.currentUser;
    if (u) {
      const first = u.firstName || u.first_name || '';
      const last = u.lastName || u.last_name || '';
      if (first || last) return `${first} ${last}`.trim();
      if (u.username) return u.username;
      if (u.email) return u.email;
    }
    return 'You';
  }
  const from = msg.fromAddress || '';
  const match = from.match(/^([^<]+)\s*<[^>]+>$/);
  if (match) return match[1].trim();
  return from || 'Unknown';
}

function getMessageInitials(msg) {
  if (msg.direction === 'outbound' && props.currentUser) {
    const u = props.currentUser;
    const first = u.firstName || u.first_name || '';
    const last = u.lastName || u.last_name || '';
    if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
    if (first) return first[0].toUpperCase();
    if (u.email) return u.email[0].toUpperCase();
    return 'Y';
  }
  const from = msg.fromAddress || '';
  const email = from.replace(/^[^<]*<([^>]+)>.*$/, '$1').trim() || from;
  return email[0]?.toUpperCase() || '?';
}

function getEmailAttachmentUrl(att) {
  if (!att?.storagePath) return '#';
  return `/api/uploads/${att.storagePath}`;
}

function getEmailAttachmentName(att) {
  return att?.fileName || att?.name || 'Attachment';
}

function isEmailImageAttachment(att) {
  if (!att) return false;
  const mime = (att.mimeType || att.mimetype || '').toLowerCase();
  if (mime.startsWith('image/')) return true;
  const name = getEmailAttachmentName(att).toLowerCase();
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name);
}
</script>
