<template>
  <section class="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-gray-700/80 dark:bg-gray-900/80">
    <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Availability</h2>
    <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
      Controls when visitors can book. Slot length and buffers apply on top of your schedule.
    </p>

    <div class="mt-5 space-y-3">
      <label
        v-for="opt in sourceOptions"
        :key="opt.value"
        class="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors"
        :class="scheduleSource === opt.value
          ? 'border-indigo-600 bg-indigo-50/40 dark:border-indigo-500 dark:bg-indigo-950/30'
          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'"
      >
        <input
          v-model="scheduleSource"
          type="radio"
          class="mt-1 border-gray-300 text-indigo-600 focus:ring-indigo-500"
          :value="opt.value"
          @change="onSourceChange"
        />
        <span class="min-w-0">
          <span class="block text-sm font-semibold text-gray-900 dark:text-white">{{ opt.label }}</span>
          <span class="block text-xs text-gray-500 dark:text-gray-400">{{ opt.hint }}</span>
        </span>
      </label>
    </div>

    <div v-if="scheduleSource === 'inherit'" class="mt-4">
      <AvailabilitySourceCard :user-id="inheritUserId" label="Inherited schedule" />
    </div>

    <div v-else-if="scheduleSource === 'custom'" class="mt-4 space-y-3">
      <div>
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Saved schedule</label>
        <BusinessHoursSelect
          v-model="businessHourSetId"
          :options="setOptions"
          placeholder="Select a schedule…"
          class="mt-1.5"
        />
      </div>
      <p v-if="setsLoading" class="text-xs text-gray-500">Loading schedules…</p>
      <p v-else-if="!setOptions.length" class="text-xs text-amber-600 dark:text-amber-400">
        No schedules yet.
        <button type="button" class="font-medium underline" @click="goToBusinessHours">Create one in Settings</button>
      </p>
    </div>

    <div v-else class="mt-4 space-y-5">
      <div>
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Available days</p>
        <div class="mt-2 flex flex-wrap gap-2">
          <button
            v-for="(label, idx) in DAY_LABELS"
            :key="idx"
            type="button"
            class="rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 active:scale-95"
            :class="availableDays.includes(idx)
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'"
            @click="toggleDay(idx)"
          >
            {{ label }}
          </button>
        </div>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">From</label>
          <input
            v-model="workingHours.start"
            type="time"
            class="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div>
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">To</label>
          <input
            v-model="workingHours.end"
            type="time"
            class="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>
      <div>
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Timezone</label>
        <TimezoneSelect v-model="workingHours.timezone" class="mt-1.5" />
      </div>
    </div>

    <div class="mt-5 grid gap-4 sm:grid-cols-2">
      <div>
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Slot length</label>
        <BusinessHoursSelect
          v-model="slotDurationMinutes"
          :options="slotDurationOptions"
          class="mt-1.5"
        />
      </div>
      <div>
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Buffer between meetings</label>
        <BusinessHoursSelect
          v-model="bufferMinutes"
          :options="bufferOptions"
          class="mt-1.5"
        />
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AvailabilitySourceCard from '@/components/business-hours/AvailabilitySourceCard.vue';
import BusinessHoursSelect from '@/components/business-hours/BusinessHoursSelect.vue';
import TimezoneSelect from '@/components/business-hours/TimezoneSelect.vue';
import { useBusinessHours } from '@/composables/useBusinessHours';
import { DAY_LABELS, SLOT_DURATION_OPTIONS, BUFFER_OPTIONS } from '@/utils/appointmentFormatters';

const scheduleSource = defineModel('scheduleSource', { type: String, default: 'inherit' });
const businessHourSetId = defineModel('businessHourSetId', { type: String, default: null });
const availableDays = defineModel('availableDays', { type: Array, default: () => [1, 2, 3, 4, 5] });
const workingHours = defineModel('workingHours', {
  type: Object,
  default: () => ({ start: '09:00', end: '18:00', timezone: 'UTC' })
});
const slotDurationMinutes = defineModel('slotDurationMinutes', { type: Number, default: 30 });
const bufferMinutes = defineModel('bufferMinutes', { type: Number, default: 10 });

defineProps({
  inheritUserId: { type: String, default: null }
});

const router = useRouter();
const { fetchSets } = useBusinessHours();

const setsLoading = ref(false);
const scheduleSets = ref([]);

const sourceOptions = [
  { value: 'inherit', label: 'Use my business hours', hint: 'From Settings → Business Hours (personal, team, or company default).' },
  { value: 'custom', label: 'Use a saved schedule', hint: 'Pick a schedule you created in Business Hours.' },
  { value: 'legacy', label: 'Hours only for this booking page', hint: 'Custom days and times that do not change your main schedule.' }
];

const slotDurationOptions = SLOT_DURATION_OPTIONS.map((o) => ({ value: o.value, label: o.label }));
const bufferOptions = BUFFER_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

const setOptions = computed(() =>
  scheduleSets.value
    .filter((s) => s.status === 'active')
    .map((s) => ({ value: s._id, label: `${s.name} (${s.timezone})` }))
);

function toggleDay(idx) {
  const days = [...(availableDays.value || [])];
  const i = days.indexOf(idx);
  if (i >= 0) days.splice(i, 1);
  else days.push(idx);
  days.sort((a, b) => a - b);
  availableDays.value = days;
}

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

function goToBusinessHours() {
  router.push({ path: '/settings', query: { tab: 'business-hours' } });
}

onMounted(loadSets);
watch(scheduleSource, (v) => {
  if (v === 'custom') loadSets();
});
</script>
