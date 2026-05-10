<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="connect-inbox-title"
      @click.self="close"
    >
      <div
        class="relative flex max-h-[min(90vh,560px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        @click.stop
      >
        <div class="flex items-start justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h2 id="connect-inbox-title" class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ step === 1 ? 'Connect email' : 'Connect Gmail' }}
          </h2>
          <button
            type="button"
            class="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label="Close"
            @click="close"
          >
            <XMarkIcon class="h-5 w-5" />
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <template v-if="step === 1">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              How do you want to sync your emails?
            </p>
            <div class="mt-4 space-y-3">
              <label
                class="flex cursor-pointer gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/30"
              >
                <input
                  v-model="syncMethod"
                  type="radio"
                  value="inbox_import"
                  class="mt-1 border-gray-300 text-emerald-600 focus:ring-emerald-500"
                >
                <span class="min-w-0 flex-1">
                  <span class="flex flex-wrap items-center gap-2">
                    <span class="text-sm font-medium text-gray-900 dark:text-white">Workspace inbox import</span>
                    <span class="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Recommended
                    </span>
                  </span>
                  <span class="mt-1 block text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                    Import <span class="font-medium">INBOX</span> from Gmail into LiteDesk using a read-only Gmail scope. You can run sync anytime from Inbox.
                  </span>
                </span>
              </label>
              <div
                class="flex gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-3.5 opacity-60 dark:border-gray-700 dark:bg-gray-800/40"
              >
                <input type="radio" disabled class="mt-1 border-gray-300">
                <span class="min-w-0 flex-1">
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Full 2-way Gmail send &amp; receive</span>
                  <span class="mt-1 block text-xs text-gray-500 dark:text-gray-500">Coming later — LiteDesk does not send mail through your personal Gmail yet.</span>
                </span>
              </div>
            </div>
          </template>

          <template v-else>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              You are setting up inbox import for Gmail.
            </p>
            <label class="mt-4 block text-sm font-medium text-gray-800 dark:text-gray-200">
              Email address <span class="text-red-600 dark:text-red-400">*</span>
              <input
                v-model="emailHint"
                type="email"
                autocomplete="email"
                class="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                placeholder="you@company.com"
              >
            </label>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-500">
              Used as a sign-in hint on Google’s screen. It should match the Google account you will authorize.
            </p>
            <div
              class="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-xs leading-relaxed text-gray-700 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300"
            >
              <p class="font-medium text-gray-900 dark:text-white">Before you click Allow on Google</p>
              <p class="mt-2">
                Google may show a warning for apps that are still in testing or verification. You can use
                <span class="font-medium">Advanced</span>
                to proceed and grant access if you trust this workspace.
              </p>
              <p class="mt-2 text-gray-600 dark:text-gray-400">
                LiteDesk requests read-only access to import messages you already have permission to read; workspace policies still apply.
              </p>
            </div>
          </template>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 px-5 py-4 dark:border-gray-800">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            @click="step === 1 ? close() : (step = 1)"
          >
            {{ step === 1 ? 'Cancel' : 'Back' }}
          </button>
          <button
            v-if="step === 1"
            type="button"
            class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            :disabled="syncMethod !== 'inbox_import'"
            @click="step = 2"
          >
            Continue
          </button>
          <button
            v-else
            type="button"
            class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            :disabled="loading || !emailLooksValid"
            @click="submitConnect"
          >
            {{ loading ? 'Opening Google…' : 'Connect email' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  initialEmail: { type: String, default: '' }
});

const emit = defineEmits(['update:modelValue', 'connect']);

const step = ref(1);
const syncMethod = ref('inbox_import');
const emailHint = ref('');

const emailLooksValid = computed(() => {
  const s = String(emailHint.value || '').trim();
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
});

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      step.value = 1;
      syncMethod.value = 'inbox_import';
      emailHint.value = String(props.initialEmail || '').trim();
    }
  }
);

watch(
  () => props.initialEmail,
  (v) => {
    if (props.modelValue && !emailHint.value) {
      emailHint.value = String(v || '').trim();
    }
  }
);

function close() {
  emit('update:modelValue', false);
}

function submitConnect() {
  if (!emailLooksValid.value) return;
  emit('connect', { loginHint: String(emailHint.value).trim() });
}
</script>
