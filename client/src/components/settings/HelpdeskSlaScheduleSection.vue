<template>
  <div class="space-y-4">
    <label class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
      <input
        v-model="enabled"
        type="checkbox"
        class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
      />
      <span>Use business hours for SLA calculations</span>
    </label>

    <template v-if="enabled">
      <p class="text-xs text-gray-500 dark:text-gray-400">
        SLA targets count only time inside the selected schedule (breaks and holidays excluded).
        <RouterLink
          :to="{ path: '/settings', query: { tab: 'business-hours' } }"
          class="font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Manage schedules
        </RouterLink>
      </p>

      <div class="space-y-3">
        <label
          v-for="opt in sourceOptions"
          :key="opt.value"
          class="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors"
          :class="scheduleSource === opt.value
            ? 'border-indigo-600 bg-indigo-50/40 dark:border-indigo-500 dark:bg-indigo-950/30'
            : 'border-gray-200 dark:border-gray-700'"
        >
          <input
            v-model="scheduleSource"
            type="radio"
            class="mt-0.5 border-gray-300 text-indigo-600 focus:ring-indigo-500"
            :value="opt.value"
            @change="onSourceChange"
          />
          <span class="min-w-0">
            <span class="block text-sm font-medium text-gray-900 dark:text-white">{{ opt.label }}</span>
            <span class="block text-xs text-gray-500 dark:text-gray-400">{{ opt.hint }}</span>
          </span>
        </label>
      </div>

      <AvailabilitySourceCard
        v-if="scheduleSource === 'inherit'"
        label="Company SLA schedule"
      />

      <div v-else-if="scheduleSource === 'custom'" class="space-y-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Saved schedule</label>
        <BusinessHoursSelect
          v-model="businessHourSetId"
          :options="setOptions"
          placeholder="Select a schedule…"
        />
        <p v-if="setsLoading" class="text-xs text-gray-500">Loading schedules…</p>
        <p v-else-if="!setOptions.length" class="text-xs text-amber-600 dark:text-amber-400">
          No schedules found. Create one under Business Hours in Settings.
        </p>
      </div>

      <div v-else class="space-y-4">
        <p class="text-xs text-gray-500 dark:text-gray-400">Inline hours used only for Helpdesk SLA (not shared with other modules).</p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Timezone</label>
            <TimezoneSelect v-model="timezone" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Start</label>
            <input
              v-model="startTime"
              type="time"
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">End</label>
            <input
              v-model="endTime"
              type="time"
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        <div class="flex flex-wrap gap-3">
          <label
            v-for="day in weekDays"
            :key="day.value"
            class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
          >
            <input
              v-model="workingDays"
              :value="day.value"
              type="checkbox"
              class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>{{ day.label }}</span>
          </label>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import AvailabilitySourceCard from '@/components/business-hours/AvailabilitySourceCard.vue';
import BusinessHoursSelect from '@/components/business-hours/BusinessHoursSelect.vue';
import TimezoneSelect from '@/components/business-hours/TimezoneSelect.vue';
import { useBusinessHours } from '@/composables/useBusinessHours';

const businessHours = defineModel('businessHours', {
  type: Object,
  required: true
});

const { fetchSets } = useBusinessHours();
const setsLoading = ref(false);
const scheduleSets = ref([]);

const sourceOptions = [
  { value: 'inherit', label: 'Company default schedule', hint: 'Uses your org default from Business Hours settings.' },
  { value: 'custom', label: 'Pick a saved schedule', hint: 'Choose any active schedule (e.g. Support Team India).' },
  { value: 'legacy', label: 'Helpdesk-only inline hours', hint: 'Keep separate hours just for SLA on this page.' }
];

const weekDays = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' }
];

const enabled = computed({
  get: () => Boolean(businessHours.value?.enabled),
  set: (v) => {
    businessHours.value = { ...businessHours.value, enabled: v };
  }
});

const scheduleSource = computed({
  get: () => businessHours.value?.scheduleSource || 'legacy',
  set: (v) => {
    businessHours.value = { ...businessHours.value, scheduleSource: v };
  }
});

const businessHourSetId = computed({
  get: () => businessHours.value?.businessHourSetId || null,
  set: (v) => {
    businessHours.value = { ...businessHours.value, businessHourSetId: v || null };
  }
});

const timezone = computed({
  get: () => businessHours.value?.timezone || 'UTC',
  set: (v) => {
    businessHours.value = { ...businessHours.value, timezone: v };
  }
});

const startTime = computed({
  get: () => businessHours.value?.startTime || '09:00',
  set: (v) => {
    businessHours.value = { ...businessHours.value, startTime: v };
  }
});

const endTime = computed({
  get: () => businessHours.value?.endTime || '18:00',
  set: (v) => {
    businessHours.value = { ...businessHours.value, endTime: v };
  }
});

const workingDays = computed({
  get: () => businessHours.value?.workingDays || [1, 2, 3, 4, 5],
  set: (v) => {
    businessHours.value = { ...businessHours.value, workingDays: [...v].sort((a, b) => a - b) };
  }
});

const setOptions = computed(() =>
  scheduleSets.value
    .filter((s) => s.status === 'active')
    .map((s) => ({ value: s._id, label: `${s.name} (${s.timezone})` }))
);

function onSourceChange() {
  if (scheduleSource.value === 'custom' && !businessHourSetId.value && setOptions.value.length) {
    businessHourSetId.value = setOptions.value[0].value;
  }
  if (scheduleSource.value !== 'custom') {
    businessHourSetId.value = null;
  }
}

async function loadSets() {
  setsLoading.value = true;
  try {
    scheduleSets.value = await fetchSets({ status: 'active' });
  } catch {
    scheduleSets.value = [];
  } finally {
    setsLoading.value = false;
  }
}

onMounted(loadSets);
watch(scheduleSource, (v) => {
  if (v === 'custom') loadSets();
});
</script>
