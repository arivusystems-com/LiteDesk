<template>
  <div class="task-description-editor rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
    <!-- Bubble menu (Notion-style: appears on text selection) -->
    <BubbleMenu
      v-if="editor"
      :editor="editor"
      :tippy-options="{ duration: 100, placement: 'top' }"
      class="flex items-center gap-0.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg py-1 px-1"
    >
      <div class="flex items-center gap-0.5" @mousedown.prevent>
      <button
        type="button"
        :class="['p-2 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700', editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : '']"
        title="Heading 1"
        @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
      >
        <span class="font-bold text-base">H1</span>
      </button>
      <button
        type="button"
        :class="['p-2 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700', editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : '']"
        title="Heading 2"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        <span class="font-semibold text-sm">H2</span>
      </button>
      <button
        type="button"
        :class="['p-2 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700', editor.isActive('heading', { level: 3 }) ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : '']"
        title="Heading 3"
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
      >
        <span class="font-medium text-sm">H3</span>
      </button>
      <span class="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-0.5" />
      <button
        type="button"
        :class="['p-2 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700', editor.isActive('bold') ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : '']"
        title="Bold"
        @click="editor.chain().focus().toggleBold().run()"
      >
        <span class="font-bold text-sm">B</span>
      </button>
      <button
        type="button"
        :class="['p-2 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700', editor.isActive('italic') ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : '']"
        title="Italic"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        <span class="italic text-sm">I</span>
      </button>
      <button
        type="button"
        :class="['p-2 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700', editor.isActive('strike') ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : '']"
        title="Strikethrough"
        @click="editor.chain().focus().toggleStrike().run()"
      >
        <span class="line-through text-sm">S</span>
      </button>
      <span class="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-0.5" />
      <button
        type="button"
        :class="['p-2 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700', editor.isActive('bulletList') ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : '']"
        title="Bullet list"
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 6a1 1 0 100-2 1 1 0 000 2zm0 4a1 1 0 100-2 1 1 0 000 2zm0 4a1 1 0 100-2 1 1 0 000 2zM8 5h10a1 1 0 010 2H8a1 1 0 010-2zm0 4h10a1 1 0 110 2H8a1 1 0 110-2zm0 4h10a1 1 0 110 2H8a1 1 0 110-2z" />
        </svg>
      </button>
      <button
        type="button"
        :class="['p-2 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700', editor.isActive('orderedList') ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : '']"
        title="Numbered list"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 4h14v1.5H2V4zm0 5h14v1.5H2V9zm0 5h14v1.5H2V14zM17 4v1.5h1V4h-1zm0 5v1.5h1V9h-1zm0 5v1.5h1V14h-1z" />
        </svg>
      </button>
      <span class="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-0.5" />
      <Popover v-slot="{ close }" class="relative">
        <PopoverButton
          type="button"
          :class="['p-2 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700', editor.isActive('link') ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : '']"
          title="Link"
          @click="linkUrl = editor.getAttributes('link')?.href || 'https://'"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </PopoverButton>
        <PopoverPanel
          class="absolute left-0 top-full mt-1 w-72 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg p-3 z-50 focus:outline-none"
          @mousedown.prevent
        >
          <div class="space-y-2">
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400">URL</label>
            <input
              v-model="linkUrl"
              type="url"
              placeholder="https://"
              class="w-full px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              @keydown.enter.prevent="applyLink(close)"
              @keydown.escape="close"
            />
            <div class="flex gap-2 justify-end">
              <button
                type="button"
                class="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                @click="close"
              >
                Cancel
              </button>
              <button
                type="button"
                class="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                @click="applyLink(close)"
              >
                Apply
              </button>
            </div>
          </div>
        </PopoverPanel>
      </Popover>
      <button
        v-if="editor.isActive('link')"
        type="button"
        class="p-2 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Remove link"
        @click="editor.chain().focus().unsetLink().run()"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      </div>
    </BubbleMenu>
    <!-- Editor content -->
    <EditorContent
      :editor="editor"
      class="[&_.tiptap]:min-h-[120px] [&_.tiptap]:text-md [&_.tiptap]:leading-[1.75] [&_.tiptap_p]:mb-2 [&_.tiptap_p:last-child]:mb-0 [&_.tiptap_p]:leading-[1.75] [&_.tiptap_h1]:text-2xl [&_.tiptap_h1]:font-bold [&_.tiptap_h1]:my-4 [&_.tiptap_h1]:mb-2 [&_.tiptap_h2]:text-xl [&_.tiptap_h2]:font-semibold [&_.tiptap_h2]:my-4 [&_.tiptap_h2]:mb-2 [&_.tiptap_h3]:text-lg [&_.tiptap_h3]:font-semibold [&_.tiptap_h3]:my-4 [&_.tiptap_h3]:mb-2 [&_.tiptap_ul]:pl-6 [&_.tiptap_ol]:pl-6 [&_.tiptap_ul]:list-disc [&_.tiptap_ol]:list-decimal [&_.tiptap_a]:text-indigo-600 [&_.tiptap_a]:underline dark:[&_.tiptap_a]:text-indigo-400"
    />
  </div>
</template>

<script setup>
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/vue-3';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { SlashCommands } from './slashCommands.js';
import { ref, watch, onBeforeUnmount } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: "Write or type '/' for commands"
  }
});

const emit = defineEmits(['update:modelValue', 'blur', 'cancel']);

const linkUrl = ref('https://');

const editor = useEditor({
  content: props.modelValue || '',
  extensions: [
    StarterKit.configure({
      heading: false
    }),
    Heading.configure({
      levels: [1, 2, 3]
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-indigo-600 dark:text-indigo-400 underline hover:no-underline'
      }
    }),
    Placeholder.configure({
      placeholder: props.placeholder
    }),
    SlashCommands
  ],
  editorProps: {
    attributes: {
      class: 'rte-content min-h-[120px] px-6 py-4 text-md text-gray-900 dark:text-white focus:outline-none'
    },
    handleKeyDown: (view, event) => {
      if (event.key === 'Escape') {
        emit('cancel');
        return true;
      }
      return false;
    }
  },
  onBlur: ({ event }) => {
    // Defer to avoid blur when clicking BubbleMenu (tippy-box) or slash command menu
    setTimeout(() => {
      if (!editor.value?.isFocused) {
        const target = event?.relatedTarget;
        const isInteractiveMenu = target && typeof target.closest === 'function' &&
          (target.closest('.slash-command-list') || target.closest('.tippy-box'));
        if (!isInteractiveMenu) {
          emit('blur');
        }
      }
    }, 0);
  },
  onUpdate: ({ editor: e }) => {
    emit('update:modelValue', e.getHTML());
  }
});

watch(
  () => props.modelValue,
  (newVal) => {
    const current = editor.value?.getHTML();
    const normalized = newVal?.trim() || '';
    const currentNorm = current?.trim() || '';
    if (editor.value && normalized !== currentNorm) {
      editor.value.commands.setContent(normalized, false);
    }
  },
  { immediate: false }
);

const applyLink = (close) => {
  const url = linkUrl.value?.trim();
  if (url) {
    editor.value?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }
  close();
};

const focus = () => {
  editor.value?.commands.focus();
};

defineExpose({ focus });

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>

<style scoped>
/* TipTap Placeholder: show on any empty paragraph (new line) */
/* emptyNodeClass='is-empty' for empty nodes; emptyEditorClass='is-editor-empty' when doc is empty */
.task-description-editor :deep(.tiptap p.is-empty::before),
.task-description-editor :deep(.tiptap p.is-editor-empty::before) {
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
  color: #9ca3af;
}
/* Stabilize last line: prevent empty trailing block from collapsing and causing jitter */
.task-description-editor :deep(.tiptap p:last-child) {
  min-height: 1.75em;
}
</style>
