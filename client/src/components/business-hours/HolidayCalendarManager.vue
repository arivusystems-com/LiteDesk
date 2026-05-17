<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Holiday calendars</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
          Link calendars to schedules so booked slots and SLAs skip holidays.
        </p>
      </div>
      <button
        type="button"
        class="px-3 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
        @click="openImport"
      >
        Import CSV
      </button>
    </div>

    <div v-if="loading" class="text-sm text-gray-500">Loading…</div>
    <div v-else class="grid gap-3">
      <div
        v-for="cal in calendars"
        :key="cal._id"
        class="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 flex items-start justify-between gap-3"
      >
        <div>
          <p class="font-medium text-gray-900 dark:text-white">{{ cal.name }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{ cal.dates?.length || 0 }} holidays
            <span v-if="cal.region"> · {{ cal.region }}</span>
          </p>
        </div>
        <button
          type="button"
          class="text-xs text-red-600 hover:underline"
          @click="remove(cal._id)"
        >
          Delete
        </button>
      </div>
      <p v-if="!calendars.length" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
        No holiday calendars yet. Import a CSV with <code class="text-xs">date,name</code> per line.
      </p>
    </div>

    <div
      v-if="showImport"
      class="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 space-y-3"
    >
      <h4 class="text-sm font-semibold text-gray-900 dark:text-white">Import calendar</h4>
      <input
        v-model="importName"
        type="text"
        placeholder="Calendar name"
        class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
      />
      <textarea
        v-model="importCsv"
        rows="6"
        placeholder="2026-01-01,New Year&#10;2026-12-25,Christmas"
        class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-mono"
      />
      <div class="flex gap-2">
        <button
          type="button"
          class="px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white"
          :disabled="importing"
          @click="submitImport"
        >
          {{ importing ? 'Importing…' : 'Import' }}
        </button>
        <button type="button" class="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600" @click="showImport = false">
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useBusinessHours } from '@/composables/useBusinessHours';
import { useNotifications } from '@/composables/useNotifications';

const { fetchHolidayCalendars, importHolidayCsv, deleteHolidayCalendar } = useBusinessHours();
const { success, error: notifyError } = useNotifications();

const loading = ref(true);
const calendars = ref([]);
const showImport = ref(false);
const importName = ref('');
const importCsv = ref('');
const importing = ref(false);

async function load() {
  loading.value = true;
  try {
    calendars.value = await fetchHolidayCalendars();
  } finally {
    loading.value = false;
  }
}

function openImport() {
  showImport.value = true;
  importName.value = '';
  importCsv.value = '';
}

async function submitImport() {
  importing.value = true;
  try {
    await importHolidayCsv({
      name: importName.value,
      csv: importCsv.value
    });
    success('Holiday calendar imported');
    showImport.value = false;
    await load();
  } catch (e) {
    notifyError(e?.message || 'Import failed');
  } finally {
    importing.value = false;
  }
}

async function remove(id) {
  if (!confirm('Delete this holiday calendar?')) return;
  try {
    await deleteHolidayCalendar(id);
    success('Calendar deleted');
    await load();
  } catch (e) {
    notifyError(e?.message || 'Delete failed');
  }
}

onMounted(load);

defineExpose({ reload: load });
</script>
