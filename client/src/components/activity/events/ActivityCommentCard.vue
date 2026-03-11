<template>
  <div class="w-full">
    <div
      :class="[
        'group/comment overflow-hidden rounded-md border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900',
        ui.commentMentionsCurrentUser(event) ? 'border-l-2 border-l-indigo-500 dark:border-l-indigo-400' : ''
      ]"
    >
      <div class="flex items-start justify-between gap-2 px-4 pt-3 pb-2">
        <div class="flex items-center gap-3 min-w-0">
          <Avatar
            v-if="event.author && typeof event.author === 'object'"
            :user="event.author"
            size="sm"
          />
          <div v-else class="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs font-medium">
            {{ ui.getInitials(event.author) }}
          </div>
          <div class="min-w-0 flex items-baseline gap-2 flex-wrap">
            <span class="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {{ ui.getAuthorName(event.author) }}
            </span>
            <span
              v-if="event.createdAt"
              class="text-xs text-gray-500 dark:text-gray-400 cursor-help"
              :title="ui.formatFullTimestamp(event.createdAt)"
              @pointerup="ui.handleTimestampPointerUp($event, event.createdAt)"
            >
              {{ ui.formatRelativeActivityTime(event.createdAt) }}
            </span>
            <span v-if="event.editedAt" class="text-xs text-gray-400 dark:text-gray-500">(edited)</span>
          </div>
        </div>
        <Menu
          v-if="ui.canEditComment(event)"
          as="div"
          class="relative ml-2 opacity-0 group-hover/comment:opacity-100 transition-opacity"
        >
          <MenuButton
            class="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <EllipsisVerticalIcon class="w-4 h-4" />
          </MenuButton>
          <MenuItems
            class="absolute right-0 mt-1 w-36 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black/5 focus:outline-none z-10"
          >
            <MenuItem v-slot="{ active }">
              <button
                type="button"
                :class="[active ? 'bg-gray-100 dark:bg-gray-700' : '', 'flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300']"
                @click="ui.startEditComment(event)"
              >
                <PencilSquareIcon class="w-4 h-4" />
                Edit
              </button>
            </MenuItem>
          </MenuItems>
        </Menu>
      </div>

      <div v-if="ui.editingCommentId === event.id" class="px-4 pb-3.5 text-sm leading-[1.55] text-gray-700 dark:text-gray-300 space-y-2">
        <CommentInput
          v-model="editingText"
          v-model:existing-attachments="editingAttachments"
          :show-submit="true"
          :submit-on-enter="true"
          variant="activity"
          placeholder="Edit comment..."
          class="mb-2"
          @files-change="ui.handleEditCommentFilesChange"
          @submit="ui.saveEditComment"
        >
          <template #footerActions="{ canSubmit }">
            <button
              type="button"
              class="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              @click="ui.cancelEditComment"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="!canSubmit || !ui.isEditingCommentDirty"
              class="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="ui.handleSaveEditCommentClick"
            >
              Save
            </button>
          </template>
        </CommentInput>
      </div>

      <div v-else class="px-4 pb-3.5 text-sm leading-[1.55] text-gray-700 dark:text-gray-300 [&_p]:m-0 [&_p]:leading-[1.55]">
        <div
          v-if="searchQuery.trim()"
          v-html="ui.highlightSearchText(event.content || event.text)"
          class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
        ></div>
        <CommentContent v-else :content="event.content || event.text" />

        <AttachmentList :attachments="event.attachments || []" :ui="ui" />
      </div>

      <ReactionBar
        v-if="ui.editingCommentId !== event.id"
        :event="event"
        :ui="ui"
        :is-thread-view-active="isThreadViewActive"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue';
import { EllipsisVerticalIcon, PencilSquareIcon } from '@heroicons/vue/24/outline';
import Avatar from '@/components/common/Avatar.vue';
import CommentInput from '@/components/record-page/CommentInput.vue';
import CommentContent from '@/components/record-page/CommentContent.vue';
import ReactionBar from '../controls/ReactionBar.vue';
import AttachmentList from '../controls/AttachmentList.vue';

const props = defineProps({
  event: { type: Object, required: true },
  ui: { type: Object, required: true },
  searchQuery: { type: String, default: '' },
  isThreadViewActive: { type: Boolean, default: false }
});

const editingText = computed({
  get: () => props.ui.editingCommentText,
  set: (value) => props.ui.setEditingCommentText(value)
});

const editingAttachments = computed({
  get: () => props.ui.editingCommentAttachments,
  set: (value) => props.ui.setEditingCommentAttachments(value)
});
</script>
