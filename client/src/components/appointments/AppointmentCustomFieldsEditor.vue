<template>
  <section class="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-gray-700/80 dark:bg-gray-900/80">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Booking questions</h2>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Optional extra fields guests fill in when booking (after name and email).
        </p>
      </div>
      <button
        type="button"
        class="shrink-0 rounded-lg border border-indigo-200 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/50"
        :disabled="fields.length >= maxFields"
        @click="addField"
      >
        + Add question
      </button>
    </div>

    <p v-if="!fields.length" class="mt-4 rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-700">
      No custom questions yet.
    </p>

    <div v-else class="mt-4 space-y-4">
      <div
        v-for="(field, idx) in fields"
        :key="field._localId || field.key || idx"
        class="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
      >
        <div class="flex items-start justify-between gap-2">
          <span class="text-xs font-medium uppercase tracking-wide text-gray-400">Question {{ idx + 1 }}</span>
          <button
            type="button"
            class="text-sm text-red-600 hover:underline dark:text-red-400"
            @click="removeField(idx)"
          >
            Remove
          </button>
        </div>
        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Label</label>
            <input
              v-model="field.label"
              type="text"
              class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholder="e.g. Company name"
              @blur="syncKey(field)"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Field type</label>
            <select
              v-model="field.type"
              class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              @change="onTypeChange(field)"
            >
              <option value="text">Short text</option>
              <option value="textarea">Long text</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="select">Dropdown</option>
            </select>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Field key</label>
            <input
              v-model="field.key"
              type="text"
              class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholder="company_name"
            />
          </div>
        </div>
        <label class="mt-3 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input v-model="field.required" type="checkbox" class="rounded border-gray-300 text-indigo-600" />
          Required
        </label>
        <div v-if="field.type === 'select'" class="mt-3">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Options (one per line)</label>
          <textarea
            :value="optionsText(field)"
            rows="3"
            class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            placeholder="Option A&#10;Option B"
            @input="setOptionsFromText(field, $event.target.value)"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { slugifyClient } from '@/utils/appointmentFormatters';

const fields = defineModel({ type: Array, default: () => [] });

const props = defineProps({
  maxFields: { type: Number, default: 12 }
});

let localId = 0;

function addField() {
  if (fields.value.length >= props.maxFields) return;
  fields.value = [
    ...fields.value,
    {
      _localId: `cf-${++localId}`,
      key: `question_${fields.value.length + 1}`,
      label: '',
      type: 'text',
      required: false,
      options: []
    }
  ];
}

function removeField(idx) {
  const next = [...fields.value];
  next.splice(idx, 1);
  fields.value = next;
}

function syncKey(field) {
  if (!field.label?.trim()) return;
  if (!field.key || field.key.startsWith('question_')) {
    field.key = slugifyClient(field.label).replace(/-/g, '_') || field.key;
  }
}

function onTypeChange(field) {
  if (field.type === 'select' && !field.options?.length) {
    field.options = ['Option 1', 'Option 2'];
  }
}

function optionsText(field) {
  return (field.options || []).join('\n');
}

function setOptionsFromText(field, text) {
  field.options = String(text || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}
</script>
