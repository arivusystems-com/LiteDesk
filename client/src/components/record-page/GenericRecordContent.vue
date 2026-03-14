<template>
  <div class="generic-record-content flex-1 min-h-0 overflow-hidden flex flex-col">
    <RecordPageShell
      :loading="loading"
      :error="error"
      :loading-message="`Loading ${moduleLabel}...`"
      :error-title="`Error Loading ${moduleLabel}`"
      :layout-props="layoutProps"
      @retry="fetchRecord"
    >
      <template v-if="record" #header>
        <RecordHeader
          :show-navigation="!embed"
          :can-previous="!!neighbors.previousId"
          :can-next="!!neighbors.nextId"
          :previous-label="`Previous ${moduleLabelSingular}`"
          :next-label="`Next ${moduleLabelSingular}`"
          @previous="goToPrevious"
          @next="goToNext"
        >
          <template #breadcrumbs>
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              {{ moduleLabel }} <span class="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500"></span> {{ (record?._id || '').slice(-8) || 'N/A' }}
            </span>
          </template>
          <template #pageActions>
            <button
              type="button"
              class="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Edit"
              title="Edit"
              @click="showEditModal = true"
            >
              <PencilSquareIcon class="w-5 h-5" />
            </button>
            <button
              type="button"
              class="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Copy URL"
              title="Copy URL"
              @click="copyUrl"
            >
              <ClipboardDocumentIcon class="w-5 h-5" />
            </button>
            <button
              type="button"
              class="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Delete"
              title="Delete"
              @click="showDeleteModal = true"
            >
              <TrashIcon class="w-5 h-5" />
            </button>
          </template>
        </RecordHeader>
      </template>

      <template v-if="record" #left>
        <div class="mb-6 sticky z-10 border-b border-gray-200/80 dark:border-gray-700/80 bg-white/95 dark:bg-gray-900/95 backdrop-blur py-4 lg:-top-6">
          <div class="flex items-center gap-3">
            <div class="min-w-0 flex-1">
              <EditableTitle
                :title="recordTitle"
                :can-edit="canEditRecord"
                @save="handleTitleSave"
              />
            </div>
          </div>
        </div>

        <div v-if="genericStateFields.length" class="mt-4">
          <RecordStateSection
            heading="Key fields"
            :fields="genericStateFields"
            :field-values="genericStateValues"
            :enable-legacy-fallback="false"
          />
        </div>

        <section v-if="record && genericSections.length" class="mt-4">
          <SectionStack
            :sections="genericSections"
            :record="record"
            :adapter="genericAdapter"
            :context="sectionContext"
          />
        </section>
      </template>

      <template v-if="record" #right>
        <RecordRightPane
          ref="rightPaneRef"
          :tabs="rightPaneTabs"
          :default-tab="recordLayoutIsMobile ? undefined : 'activity'"
          :show-header="embed"
          :show-close-button="embed"
          :title="embed ? moduleLabel : ''"
          :persistence-key="`generic-${moduleKey}-${record._id}`"
          :record-id="record._id"
          @close="$emit('close')"
        >
          <template #tab-activity>
            <ActivitySection
              :events="activityEvents"
              :ui="activityUi"
              :activity-pane-ready="true"
              :activity-search-open="activitySearchOpen"
              :activity-search-query="activitySearchQuery"
              :activity-filter-comments="activityFilterComments"
              :activity-filter-updates="activityFilterUpdates"
              :activity-filter-email="false"
              :new-comment-text="newCommentText"
              :show-notifications="false"
              @comment="handleAddComment"
              @update:activitySearchOpen="activitySearchOpen = $event"
              @update:activitySearchQuery="activitySearchQuery = $event"
              @update:activityFilterComments="activityFilterComments = $event"
              @update:activityFilterUpdates="activityFilterUpdates = $event"
              @update:newCommentText="newCommentText = $event"
            />
          </template>
          <template #tab-related>
            <div class="flex flex-col h-full p-4">
              <RelatedSection
                :record="record"
                :adapter="genericAdapter"
                :context="{ hideHeader: true }"
              />
            </div>
          </template>
        </RecordRightPane>
      </template>
    </RecordPageShell>

    <CreateRecordDrawer
      v-if="record"
      :is-open="showEditModal"
      :module-key="moduleKey"
      :record="record"
      @close="showEditModal = false"
      @saved="handleRecordUpdated"
    />

    <DeleteConfirmationModal
      :show="showDeleteModal"
      :record-name="recordTitle"
      :record-type="moduleKey"
      :deleting="deleting"
      @close="showDeleteModal = false"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useTabs } from '@/composables/useTabs';
import apiClient from '@/utils/apiClient';
import RecordPageShell from '@/components/record-page/RecordPageShell.vue';
import RecordHeader from '@/components/record-page/RecordHeader.vue';
import RecordStateSection from '@/components/record-page/RecordStateSection.vue';
import SectionStack from '@/components/record-page/sections/SectionStack.vue';
import RelatedSection from '@/components/record-page/sections/RelatedSection.vue';
import RecordRightPane from '@/components/record-page/RecordRightPane.vue';
import EditableTitle from '@/components/record-page/EditableTitle.vue';
import ActivitySection from '@/components/activity/ActivitySection.vue';
import CreateRecordDrawer from '@/components/common/CreateRecordDrawer.vue';
import DeleteConfirmationModal from '@/components/common/DeleteConfirmationModal.vue';
import { createGenericRecordAdapter } from '@/components/record-page/adapters/genericRecordAdapter';
import {
  normalizeSystemActivityEvent,
  normalizeCommentActivityEvent,
  sortActivityEventsByDate
} from '@/components/record-page/activityEventModel';
import { PencilSquareIcon, ClipboardDocumentIcon, TrashIcon } from '@heroicons/vue/24/outline';

const props = defineProps({
  moduleKey: { type: String, required: true },
  recordId: { type: String, required: true },
  embed: { type: Boolean, default: false }
});

const emit = defineEmits(['close']);

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { openTab } = useTabs();
const recordLayoutIsMobile = inject('recordLayoutIsMobile', ref(false));

const record = ref(null);
const loading = ref(true);
const error = ref(null);
const moduleDefinition = ref(null);
const activityRaw = ref([]);
const neighbors = ref({ previousId: null, nextId: null });
const expandedLeftSection = ref('');
const newCommentText = ref('');
const activitySearchOpen = ref(false);
const activitySearchQuery = ref('');
const activityFilterComments = ref(true);
const activityFilterUpdates = ref(true);
const showDeleteModal = ref(false);
const showEditModal = ref(false);
const deleting = ref(false);
const rightPaneRef = ref(null);

const moduleLabel = computed(() => {
  const key = (props.moduleKey || '').toLowerCase();
  const labels = { people: 'People', organizations: 'Organizations', events: 'Events', items: 'Items', forms: 'Forms' };
  return labels[key] || (key.charAt(0).toUpperCase() + key.slice(1));
});
const moduleLabelSingular = computed(() => {
  const s = moduleLabel.value;
  return s.endsWith('s') ? s.slice(0, -1) : s;
});

const recordTitle = computed(() => {
  const r = record.value;
  if (!r) return '';
  const namePart = (r.first_name && r.last_name ? `${r.first_name} ${r.last_name}`.trim() : '') || null;
  return (r.name ?? r.title ?? namePart ?? r.email ?? (r._id || '').slice(-8)) || 'Record';
});

const canEditRecord = computed(() => authStore.can?.(props.moduleKey, 'edit') ?? false);

const layoutProps = computed(() => ({
  leftExpanded: !!expandedLeftSection.value,
  forceMobile: props.embed,
  class: [
    props.embed ? 'flex-1 min-h-0 overflow-hidden flex flex-col' : '',
    { 'record-page-layout--left-expanded': !!expandedLeftSection.value },
    '[&.record-page-layout--left-expanded_.record-page-layout__right]:hidden',
    '[&.record-page-layout--left-expanded_.record-page-layout__left]:flex-[1_1_100%] [&.record-page-layout--left-expanded_.record-page-layout__left]:max-w-full [&.record-page-layout--left-expanded_.record-page-layout__left]:pr-0 [&.record-page-layout--left-expanded_.record-page-layout__left]:min-h-0 [&.record-page-layout--left-expanded_.record-page-layout__left]:overflow-hidden',
    '[&.record-page-layout--left-expanded_.record-page-layout__left-content]:max-w-full [&.record-page-layout--left-expanded_.record-page-layout__left-content]:pl-0 [&.record-page-layout--left-expanded_.record-page-layout__left-content]:pr-0 [&.record-page-layout--left-expanded_.record-page-layout__left-content]:flex [&.record-page-layout--left-expanded_.record-page-layout__left-content]:flex-col [&.record-page-layout--left-expanded_.record-page-layout__left-content]:flex-1 [&.record-page-layout--left-expanded_.record-page-layout__left-content]:min-h-0',
    '[&.record-page-layout--left-expanded_.record-page-layout__body]:px-4'
  ]
}));

const rightPaneTabs = computed(() => [
  { id: 'activity', name: 'Activity' },
  { id: 'related', name: 'Related' }
]);

const genericAdapter = computed(() => {
  if (!record.value || !moduleDefinition.value) return null;
  return createGenericRecordAdapter({
    formatDate: (d) => (d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'),
    moduleDefinition: moduleDefinition.value,
    canEditDetails: (_, fieldKey) => canEditRecord.value,
    saveDetailField: async (fieldKey, value) => {
      try {
        await apiClient.put(`/${props.moduleKey}/${props.recordId}`, { [fieldKey]: value });
        if (record.value) record.value[fieldKey] = value;
      } catch (e) {
        console.error('Save field error:', e);
      }
    },
    getRelatedGroups: () => [],
    openRelatedItem: (item) => {
      const path = item?.recordPath || (item?.moduleKey && item?.id ? `/${item.moduleKey}/${item.id}` : null);
      if (path) openTab(path, { background: false, insertAdjacent: true });
    },
    canUnlinkRelated: () => false,
    onUnlinkRelated: () => {},
    handleDescriptionSave: async (value) => {
      try {
        await apiClient.put(`/${props.moduleKey}/${props.recordId}`, { description: value });
        if (record.value) record.value.description = value;
      } catch (e) {
        console.error('Save description error:', e);
      }
    },
    canEditDescription: canEditRecord.value,
    expandedLeftSection,
    openLeftSection: (key) => { expandedLeftSection.value = key; }
  });
});

const genericStateFields = computed(() => (genericAdapter.value ? genericAdapter.value.getStateFields(record.value, {}) : []));
const genericStateValues = computed(() => (genericAdapter.value ? genericAdapter.value.getStateValues(record.value) : {}));
const genericSections = computed(() => (genericAdapter.value ? genericAdapter.value.getSections(record.value) : []));
const sectionContext = computed(() => ({ expandedLeftSection: expandedLeftSection.value, module: 'generic' }));

const activityUi = computed(() => ({
  moduleKey: props.moduleKey,
  recordId: props.recordId,
  addComment: (content, attachments, parentCommentId) => addComment(content, attachments, parentCommentId)
}));

const activityEvents = computed(() => {
  const raw = activityRaw.value || [];
  const recordRef = { module: props.moduleKey, id: String(props.recordId) };
  const events = raw.map((e) => {
    if (e.type === 'system') {
      return normalizeSystemActivityEvent({
        _id: e.id,
        action: e.payload?.action,
        message: e.payload?.message,
        details: e.payload?.details,
        user: e.actor,
        timestamp: e.createdAt
      }, { recordRef });
    }
    if (e.type === 'comment') {
      return normalizeCommentActivityEvent({
        _id: e.payload?.commentId || e.id,
        content: e.payload?.body,
        author: e.actor,
        createdAt: e.createdAt,
        parentCommentId: e.payload?.parentCommentId,
        attachments: e.payload?.attachments || [],
        reactions: e.payload?.reactions || [],
        recordRef
      });
    }
    return null;
  }).filter(Boolean);
  return sortActivityEventsByDate(events);
});

async function fetchRecord() {
  if (!props.recordId || props.recordId === 'new') {
    loading.value = false;
    error.value = 'Invalid record';
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const [recordRes, modulesRes, activityRes, neighborsRes] = await Promise.all([
      apiClient.get(`/${props.moduleKey}/${props.recordId}`),
      apiClient.get('/modules'),
      apiClient.get(`/modules/${props.moduleKey}/records/${props.recordId}/activity`).catch(() => ({ success: true, data: [] })),
      apiClient.get(`/modules/${props.moduleKey}/records/${props.recordId}/neighbors`).catch(() => ({ success: true, data: { previousId: null, nextId: null } }))
    ]);

    if (recordRes?.success && recordRes?.data) {
      record.value = recordRes.data;
    } else if (recordRes && !recordRes.success) {
      record.value = null;
      error.value = recordRes?.message || 'Failed to load record';
    } else {
      const data = recordRes?.data ?? recordRes;
      record.value = data && !Array.isArray(data) ? data : null;
    }

    const modules = Array.isArray(modulesRes) ? modulesRes : modulesRes?.data ?? modulesRes?.data?.data ?? modulesRes?.modules ?? [];
    moduleDefinition.value = modules.find((m) => String(m?.key || '').toLowerCase() === props.moduleKey.toLowerCase()) || null;

    if (activityRes?.success && Array.isArray(activityRes.data)) activityRaw.value = activityRes.data;
    else activityRaw.value = [];

    if (neighborsRes?.success && neighborsRes.data) neighbors.value = neighborsRes.data;
    else neighbors.value = { previousId: null, nextId: null };
  } catch (e) {
    error.value = e?.message || 'Failed to load record';
    record.value = null;
  } finally {
    loading.value = false;
  }
}

async function addComment(content, attachments, parentCommentId) {
  try {
    await apiClient.post(`/modules/${props.moduleKey}/records/${props.recordId}/comments`, {
      content: typeof content === 'string' ? content : (content?.content || ''),
      parentCommentId: parentCommentId || null
    });
    await fetchRecord();
  } catch (e) {
    console.error('Add comment error:', e);
  }
}

function handleAddComment(payload) {
  const content = typeof payload === 'string' ? payload.trim() : String(payload?.content || '').trim();
  if (!content) return;
  addComment(content, [], null);
}

function handleTitleSave(value) {
  if (!record.value) return;
  apiClient.put(`/${props.moduleKey}/${props.recordId}`, { name: value }).then(() => {
    record.value.name = value;
  }).catch((e) => console.error('Save title error:', e));
}

function goToPrevious() {
  if (neighbors.value.previousId) router.push(`/${props.moduleKey}/${neighbors.value.previousId}`);
}
function goToNext() {
  if (neighbors.value.nextId) router.push(`/${props.moduleKey}/${neighbors.value.nextId}`);
}

function copyUrl() {
  const url = window.location.href;
  navigator.clipboard.writeText(url).catch(() => {});
}

function handleRecordUpdated(updated) {
  if (updated && record.value) Object.assign(record.value, updated);
  showEditModal.value = false;
}

async function confirmDelete() {
  deleting.value = true;
  try {
    await apiClient.delete(`/${props.moduleKey}/${props.recordId}`);
    router.push(`/${props.moduleKey}`);
    emit('close');
  } catch (e) {
    error.value = e?.message || 'Failed to delete';
  } finally {
    deleting.value = false;
    showDeleteModal.value = false;
  }
}

watch(() => [props.moduleKey, props.recordId], () => fetchRecord(), { immediate: false });
onMounted(() => fetchRecord());
</script>
