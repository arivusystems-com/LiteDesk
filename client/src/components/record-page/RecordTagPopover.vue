<template>
  <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
    <div class="flex items-center justify-between gap-2">
      <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Tags</h3>
      <button
        v-if="hasInstanceTags"
        type="button"
        class="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
        @click="openCreateTagEditor()"
      >
        New Tag
      </button>
    </div>

    <div class="mt-2">
      <input
        ref="tagSearchInputRef"
        v-model="tagSearchQuery"
        type="text"
        placeholder="Search or create a tag"
        class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        @focus="tagListOpen = true"
        @click="tagListOpen = true"
        @blur="handleTagSearchBlur"
      />
    </div>

    <div v-if="record?.tags?.length" class="mt-2 flex flex-wrap gap-1.5">
      <span
        v-for="tagName in record.tags"
        :key="`selected-${tagName}`"
        :class="['inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs', getTagChipClass(tagName)]"
      >
        <span class="truncate max-w-[180px]">{{ tagName }}</span>
        <button
          type="button"
          class="text-current/80 hover:text-current"
          @click="removeTagFromRecord(tagName)"
        >
          <XMarkIcon class="w-3.5 h-3.5" />
        </button>
      </span>
    </div>
  </div>

  <div class="max-h-72 overflow-y-auto px-2 py-2">
    <div v-if="!tagListOpen && !isTagEditorOpen" class="px-2 py-3 text-sm text-gray-500 dark:text-gray-400">
      Click the search box to view available tags.
    </div>

    <div v-else-if="!hasInstanceTags && !isTagEditorOpen" class="px-2 py-3 text-sm text-gray-500 dark:text-gray-400">
      <p>No tags created yet in this instance.</p>
      <button
        type="button"
        class="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
        @click="openCreateTagEditor(tagSearchQuery)"
      >
        Create first tag
      </button>
    </div>

    <template v-else-if="!isTagEditorOpen">
      <button
        v-if="canCreateTagFromSearch"
        type="button"
        class="w-full rounded-lg px-3 py-2 text-left text-sm text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
        @click="openCreateTagEditor(tagSearchQuery)"
      >
        Create "{{ normalizedTagSearch }}"
      </button>

      <button
        v-for="tagDef in filteredInstanceTags"
        :key="tagDef.name"
        type="button"
        class="group w-full rounded-lg px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
        @click="toggleTagForRecord(tagDef.name)"
      >
        <div class="flex items-center gap-2">
          <span :class="['h-2.5 w-2.5 rounded-full', getTagDotClass(tagDef.name)]"></span>
          <span class="flex-1 truncate text-sm text-gray-900 dark:text-white">{{ tagDef.name }}</span>
          <span
            v-if="tagDef.isPublic"
            class="rounded px-1.5 py-0.5 text-[10px] font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
          >
            Public
          </span>
          <CheckIcon
            v-if="isTagAssigned(tagDef.name)"
            class="w-4 h-4 text-indigo-600 dark:text-indigo-400"
          />
          <button
            type="button"
            class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            @click.stop="openEditTagEditor(tagDef)"
            aria-label="Edit tag"
          >
            <PencilSquareIcon class="w-4 h-4" />
          </button>
        </div>
      </button>
    </template>

    <template v-else>
      <div class="px-2 py-2 space-y-3">
        <div>
          <label class="text-xs text-gray-500 dark:text-gray-400">Tag Name</label>
          <input
            v-model="tagEditor.name"
            type="text"
            maxlength="50"
            class="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Enter tag name"
          />
        </div>

        <div>
          <label class="text-xs text-gray-500 dark:text-gray-400">Color</label>
          <div class="mt-1 flex items-center gap-2">
            <button
              v-for="option in TAG_COLOR_OPTIONS"
              :key="option.key"
              type="button"
              :class="[
                'h-6 w-6 rounded-full border-2 transition-colors',
                option.swatchClass,
                tagEditor.color === option.key ? 'border-gray-900 dark:border-white' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-500'
              ]"
              @click="tagEditor.color = option.key"
            ></button>
          </div>
        </div>

        <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <HeadlessCheckbox
            v-model="tagEditor.isPublic"
            checkbox-class="h-4 w-4"
          />
          Make tag public
        </label>

        <div class="flex items-center justify-between gap-2 pt-1">
          <button
            v-if="tagEditorMode === 'edit'"
            type="button"
            class="text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
            @click="deleteEditingTag"
          >
            Delete tag
          </button>
          <div class="ml-auto flex items-center gap-2">
            <button
              type="button"
              class="rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="closeTagEditor"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!canSaveTagEditor || isSavingTagState"
              @click="saveTagEditor"
            >
              {{ tagEditorMode === 'create' ? 'Create' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue';
import { CheckIcon, PencilSquareIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import HeadlessCheckbox from '@/components/ui/HeadlessCheckbox.vue';
import { useRecordTags } from './composables/useRecordTags';

const props = defineProps({
  /** Reactive record with _id and tags */
  record: { type: Object, default: null },
  /** localStorage key for tag definitions (e.g. from computed tagStorageKey) */
  tagStorageKey: { type: [String, Object], required: true },
  /** Whether the user can edit tags */
  canEdit: { type: Boolean, default: true },
  /** Persist tags to API and update record; receives cleaned string[] */
  persistTags: { type: Function, required: true },
  /** Which API to use for fetching instance tag list */
  instanceTagSource: { type: String, default: 'tasks' },
  /** Optional refetch after persist error */
  fetchRecord: { type: Function, default: null },
  /** When false, component resets search/editor state (e.g. popover closed) */
  open: { type: Boolean, default: false }
});

const recordRef = computed(() => props.record);

const tagStorageKeyValue = computed(() => (
  typeof props.tagStorageKey === 'object' && props.tagStorageKey !== null && 'value' in props.tagStorageKey
    ? props.tagStorageKey.value
    : props.tagStorageKey
));

const tagState = useRecordTags(recordRef, {
  tagStorageKey: tagStorageKeyValue,
  canEdit: computed(() => props.canEdit),
  persistTags: props.persistTags,
  instanceTagSource: props.instanceTagSource,
  fetchRecord: props.fetchRecord || (() => Promise.resolve())
});

const {
  TAG_COLOR_OPTIONS,
  tagSearchInputRef,
  tagListOpen,
  tagSearchQuery,
  instanceTagDefinitions,
  tagEditorMode,
  editingTagName,
  isSavingTagState,
  tagEditor,
  hasInstanceTags,
  normalizedTagSearch,
  filteredInstanceTags,
  canCreateTagFromSearch,
  isTagEditorOpen,
  canSaveTagEditor,
  getTagChipClass,
  getTagDotClass,
  openCreateTagEditor,
  openEditTagEditor,
  closeTagEditor,
  saveTagEditor,
  deleteEditingTag,
  toggleTagForRecord,
  removeTagFromRecord,
  handleTagSearchBlur,
  resetOnClose
} = tagState;

const isTagAssigned = (tagName) => Array.isArray(props.record?.tags) && props.record.tags.includes(tagName);

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    tagListOpen.value = false;
  } else {
    resetOnClose();
  }
});
</script>
