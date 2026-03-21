<template>
  <Teleport to="body">
    <Transition name="email-compose-drawer">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[10000] flex justify-end overflow-x-hidden"
        @keydown.esc.prevent="close"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 z-0 bg-black/40 backdrop-blur-sm"
          @click="close"
          aria-hidden="true"
        />

        <!-- Drawer panel -->
        <aside
          class="relative z-10 w-full sm:w-[36rem] max-w-[95vw] bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-2xl flex flex-col max-h-screen"
          role="dialog"
          aria-modal="true"
          aria-label="Send Email"
        >
          <!-- Header: matches CreateRecordDrawer / TaskEditDrawer -->
          <div class="flex-shrink-0 bg-indigo-700 dark:bg-indigo-800 px-4 py-6 sm:px-6">
            <div class="flex items-center justify-between">
              <h2 class="text-base font-semibold text-white">Send Email</h2>
              <button
                type="button"
                @click="close"
                class="relative rounded-md text-indigo-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer"
                aria-label="Close"
              >
                <span class="absolute -inset-2.5" />
                <span class="sr-only">Close panel</span>
                <XMarkIcon class="size-6" aria-hidden="true" />
              </button>
            </div>
            <p class="mt-1 text-sm text-indigo-300">Compose and send an email from this record.</p>
          </div>

          <!-- Body -->
          <form @submit.prevent="handleSend" class="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div class="flex-1 overflow-y-auto p-6 space-y-4">
              <!-- Error -->
              <div
                v-if="error"
                class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300"
              >
                {{ error }}
              </div>

              <!-- To (editable, pre-filled) -->
              <div>
                <label class="block text-sm/6 font-medium text-gray-900 dark:text-white">To</label>
                <input
                  v-model="form.to"
                  type="email"
                  required
                  class="block w-full mt-2 rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white text-base outline-1 -outline-offset-1 outline-gray-300/20 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6 dark:focus:bg-gray-800 dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                  placeholder="recipient@example.com"
                />
              </div>

              <!-- Cc / Bcc toggle -->
              <div class="flex gap-3 text-sm">
                <button
                  type="button"
                  @click="showCc = !showCc"
                  class="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  {{ showCc ? '− Cc' : '+ Cc' }}
                </button>
                <button
                  type="button"
                  @click="showBcc = !showBcc"
                  class="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  {{ showBcc ? '− Bcc' : '+ Bcc' }}
                </button>
              </div>

              <!-- Cc (optional) -->
              <div v-if="showCc">
                <label class="block text-sm/6 font-medium text-gray-900 dark:text-white">Cc</label>
                <input
                  v-model="form.cc"
                  type="text"
                  class="block w-full mt-2 rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white text-base outline-1 -outline-offset-1 outline-gray-300/20 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6 dark:focus:bg-gray-800 dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                  placeholder="cc@example.com (comma-separated)"
                />
              </div>

              <!-- Bcc (optional) -->
              <div v-if="showBcc">
                <label class="block text-sm/6 font-medium text-gray-900 dark:text-white">Bcc</label>
                <input
                  v-model="form.bcc"
                  type="text"
                  class="block w-full mt-2 rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white text-base outline-1 -outline-offset-1 outline-gray-300/20 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6 dark:focus:bg-gray-800 dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                  placeholder="bcc@example.com (comma-separated)"
                />
              </div>

              <!-- Subject -->
              <div>
                <label class="block text-sm/6 font-medium text-gray-900 dark:text-white">Subject</label>
                <input
                  v-model="form.subject"
                  type="text"
                  required
                  class="block w-full mt-2 rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white text-base outline-1 -outline-offset-1 outline-gray-300/20 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6 dark:focus:bg-gray-800 dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                  placeholder="Email subject"
                />
              </div>

              <!-- Template -->
              <div>
                <label class="block text-sm/6 font-medium text-gray-900 dark:text-white">Template</label>
                <Listbox
                  :model-value="selectedTemplateId"
                  @update:model-value="handleTemplateChange"
                  as="div"
                  class="mt-2 relative"
                >
                  <ListboxButton
                    class="block w-full rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white text-base outline-1 -outline-offset-1 outline-gray-300/20 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6 dark:focus:bg-gray-800 dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500 cursor-default text-left relative"
                  >
                    <span :class="['block truncate', !selectedTemplateId && 'text-gray-500 dark:text-gray-400']">
                      {{ selectedTemplateId ? (templates.find((t) => t.id === selectedTemplateId)?.name ?? selectedTemplateId) : '— No template —' }}
                    </span>
                    <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronUpDownIcon class="h-5 w-5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                    </span>
                  </ListboxButton>
                  <Transition
                    leave-active-class="transition duration-100 ease-in"
                    leave-from-class="opacity-100"
                    leave-to-class="opacity-0"
                  >
                    <ListboxOptions
                      class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-700 py-1 text-base shadow-lg ring-1 ring-black/5 dark:ring-white/10 focus:outline-none sm:text-sm"
                    >
                      <ListboxOption
                        :value="''"
                        v-slot="{ active, selected }"
                      >
                        <li
                          :class="[
                            'relative cursor-default select-none py-2 pl-4 pr-10',
                            active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100' : 'text-gray-900 dark:text-gray-100'
                          ]"
                        >
                          <span :class="[selected ? 'font-medium' : 'font-normal', 'block truncate']">— No template —</span>
                          <span
                            v-if="selected"
                            class="absolute inset-y-0 right-0 flex items-center pr-3 text-indigo-600 dark:text-indigo-400"
                          >
                            <CheckIcon class="h-5 w-5" aria-hidden="true" />
                          </span>
                        </li>
                      </ListboxOption>
                      <ListboxOption
                        v-for="t in templates"
                        :key="t.id"
                        :value="t.id"
                        v-slot="{ active, selected }"
                      >
                        <li
                          :class="[
                            'relative cursor-default select-none py-2 pl-4 pr-10',
                            active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100' : 'text-gray-900 dark:text-gray-100'
                          ]"
                        >
                          <span :class="[selected ? 'font-medium' : 'font-normal', 'block truncate']">{{ t.name }}</span>
                          <span
                            v-if="selected"
                            class="absolute inset-y-0 right-0 flex items-center pr-3 text-indigo-600 dark:text-indigo-400"
                          >
                            <CheckIcon class="h-5 w-5" aria-hidden="true" />
                          </span>
                        </li>
                      </ListboxOption>
                    </ListboxOptions>
                  </Transition>
                </Listbox>
              </div>

              <!-- Body (rich text) -->
              <div>
                <label class="block text-sm/6 font-medium text-gray-900 dark:text-white">Message</label>
                <div class="mt-2">
                  <TaskDescriptionEditor
                    v-model="form.body"
                    placeholder="Write your message... (type '/' for formatting)"
                    class="[&_.tiptap]:min-h-[160px]"
                  />
                </div>
              </div>

              <!-- Attachments -->
              <div>
                <label class="block text-sm/6 font-medium text-gray-900 dark:text-white">Attachments <span class="font-normal text-gray-500 dark:text-gray-400">(max 10MB per file, 25MB total)</span></label>
                <input
                  ref="fileInputRef"
                  type="file"
                  class="hidden"
                  multiple
                  @change="handleFileSelect"
                />
                <button
                  type="button"
                  @click="fileInputRef?.click()"
                  :disabled="uploading"
                  class="mt-2 inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-900 dark:text-white rounded-md bg-gray-100 dark:bg-gray-700 outline-1 -outline-offset-1 outline-gray-300/20 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 dark:outline-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  {{ uploading ? 'Uploading...' : 'Attach file' }}
                </button>
                <ul v-if="attachments.length" class="mt-2 space-y-2">
                  <li
                    v-for="(att, idx) in attachments"
                    :key="idx"
                    class="flex items-center justify-between gap-2 py-1.5 px-3 bg-gray-100 dark:bg-gray-700/50 rounded-md text-sm text-gray-900 dark:text-gray-300"
                  >
                    <span class="truncate text-gray-700 dark:text-gray-300">{{ att.fileName }}</span>
                    <button
                      type="button"
                      @click="removeAttachment(idx)"
                      class="p-1 text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                      title="Remove"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                type="button"
                @click="close"
                class="rounded-md bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-xs ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="rounded-md bg-indigo-600 dark:bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 dark:hover:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!form.to || !form.subject"
              >
                Send
              </button>
            </div>
          </form>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue';
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/vue';
import { ChevronUpDownIcon, CheckIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import { useAuthStore } from '@/stores/auth';
import apiClient from '@/utils/apiClient';
import TaskDescriptionEditor from '@/components/record-page/TaskDescriptionEditor.vue';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  relatedTo: {
    type: Object,
    default: null
  },
  initialTo: { type: String, default: '' }
});

const emit = defineEmits(['close', 'sent', 'submit']);

const authStore = useAuthStore();
const form = ref({
  to: '',
  cc: '',
  bcc: '',
  subject: '',
  body: ''
});
const showCc = ref(false);
const showBcc = ref(false);
const templates = ref([]);
const selectedTemplateId = ref('');
const error = ref(null);
const attachments = ref([]);
const uploading = ref(false);
const fileInputRef = ref(null);

watch(() => props.initialTo, (val) => {
  form.value.to = val || '';
}, { immediate: true });

async function loadTemplates() {
  try {
    const data = await apiClient.get('/communications/templates');
    if (data?.success && data?.data?.templates) {
      templates.value = data.data.templates;
    }
  } catch {
    templates.value = [];
  }
}

function applyTemplate() {
  const t = templates.value.find((x) => x.id === selectedTemplateId.value);
  if (t) {
    form.value.subject = t.subject || form.value.subject;
    form.value.body = t.body || '';
  }
}

function handleTemplateChange(v) {
  selectedTemplateId.value = v;
  applyTemplate();
}

watch(() => props.isOpen, (open) => {
  if (open) {
    form.value.to = props.initialTo || '';
    form.value.cc = '';
    form.value.bcc = '';
    form.value.subject = '';
    form.value.body = '';
    error.value = null;
    attachments.value = [];
    showCc.value = false;
    showBcc.value = false;
    selectedTemplateId.value = '';
    loadTemplates();
  }
});

function close() {
  emit('close');
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_TOTAL_SIZE = 25 * 1024 * 1024; // 25MB total

async function handleFileSelect(event) {
  const files = event.target.files;
  if (!files?.length) return;
  const token = authStore.user?.token;
  let runningTotal = attachments.value.reduce((sum, a) => sum + (a.fileSize || 0), 0);
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      error.value = `"${file.name}" exceeds 10MB per-file limit`;
      event.target.value = '';
      return;
    }
    if (runningTotal + file.size > MAX_TOTAL_SIZE) {
      error.value = `Total attachments would exceed 25MB limit (${file.name} not added)`;
      event.target.value = '';
      return;
    }
    uploading.value = true;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/communications/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      const result = await res.json();
      if (result.success) {
        const size = result.fileSize ?? file.size;
        attachments.value.push({
          fileName: result.fileName || file.name,
          fileType: result.fileType || file.type,
          fileSize: size,
          storagePath: result.storagePath
        });
        runningTotal += size;
      } else {
        error.value = result.message || result.error || 'Upload failed';
      }
    } catch (err) {
      error.value = err.message || 'Upload failed';
    } finally {
      uploading.value = false;
    }
  }
  event.target.value = '';
}

function removeAttachment(idx) {
  attachments.value.splice(idx, 1);
}

function handleSend() {
  if (!props.relatedTo?.moduleKey || !props.relatedTo?.recordId) {
    error.value = 'Invalid record context';
    return;
  }

  const totalSize = attachments.value.reduce((sum, a) => sum + (a.fileSize || 0), 0);
  if (totalSize > MAX_TOTAL_SIZE) {
    error.value = `Total attachment size exceeds 25MB limit`;
    return;
  }

  const parseEmails = (s) =>
    (s || '')
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e && e.includes('@'));

  const payload = {
    relatedTo: props.relatedTo,
    to: [form.value.to.trim()],
    cc: parseEmails(form.value.cc),
    bcc: parseEmails(form.value.bcc),
    subject: form.value.subject.trim(),
    body: form.value.body,
    attachments: attachments.value.length ? attachments.value : []
  };

  emit('submit', payload);
}
</script>

<style scoped>
.email-compose-drawer-enter-active aside {
  transition: transform 0.3s ease-out;
}

.email-compose-drawer-enter-from aside {
  transform: translateX(100%);
}

.email-compose-drawer-leave-active {
  transition: opacity 0.2s ease-out;
}

.email-compose-drawer-leave-active aside {
  transition: transform 0.25s ease-out;
}

.email-compose-drawer-leave-to {
  opacity: 0;
}

.email-compose-drawer-leave-to aside {
  transform: translateX(100%);
}
</style>
