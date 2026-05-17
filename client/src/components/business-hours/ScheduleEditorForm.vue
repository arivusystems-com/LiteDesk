<template>
  <div class="grid gap-3 sm:grid-cols-2">
    <div class="sm:col-span-2">
      <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Name</label>
      <input
        v-model="form.name"
        type="text"
        placeholder="e.g. Default company hours"
        class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      />
    </div>
    <BusinessHoursSelect
      v-model="form.linkedTo.type"
      label="Scope"
      :options="scopeOptions"
      :disabled="isDefaultLocked"
    />
    <BusinessHoursSelect v-model="form.status" label="Status" :options="statusOptions" />

    <div v-if="form.linkedTo.type === 'group'" class="sm:col-span-2">
      <BusinessHoursSelect
        v-model="form.linkedTo.id"
        label="Team"
        :options="groupOptions"
        placeholder="Select a team…"
      />
      <p v-if="!groupOptions.length" class="mt-1 text-xs text-amber-600 dark:text-amber-400">
        No teams found. Create a team under Users &amp; Access first.
      </p>
    </div>

    <div v-if="form.linkedTo.type === 'user'" class="sm:col-span-2">
      <BusinessHoursSelect
        v-model="form.linkedTo.id"
        label="User"
        :options="userOptions"
        placeholder="Select a user…"
      />
    </div>

    <div class="sm:col-span-2">
      <TimezoneSelect v-model="form.timezone" label="Timezone" />
    </div>
    <div class="sm:col-span-2">
      <BusinessHoursSelect
        v-model="form.holidayCalendarId"
        label="Holiday calendar"
        :options="holidayCalendarOptions"
        allow-empty
        empty-label="None"
        :empty-value="null"
        placeholder="None"
      />
    </div>
    <label class="sm:col-span-2 inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
      <input v-model="form.overtimeAllowed" type="checkbox" class="rounded text-indigo-600" />
      Allow scheduling outside these hours (with confirmation)
    </label>
    <label
      v-if="form.linkedTo.type === 'company'"
      class="sm:col-span-2 inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
    >
      <input v-model="form.isDefault" type="checkbox" class="rounded text-indigo-600" />
      Company default schedule
    </label>

    <div class="sm:col-span-2">
      <ScheduleWeekEditor v-model="form.week" />
    </div>

    <div v-if="previewSetId" class="sm:col-span-2">
      <SchedulePreviewPanel :set-id="previewSetId" :timezone="form.timezone" />
    </div>
  </div>
</template>

<script setup>
import { watch } from 'vue';
import BusinessHoursSelect from '@/components/business-hours/BusinessHoursSelect.vue';
import TimezoneSelect from '@/components/business-hours/TimezoneSelect.vue';
import ScheduleWeekEditor from '@/components/business-hours/ScheduleWeekEditor.vue';
import SchedulePreviewPanel from '@/components/business-hours/SchedulePreviewPanel.vue';

const form = defineModel('form', { type: Object, required: true });

defineProps({
  scopeOptions: { type: Array, default: () => [] },
  statusOptions: { type: Array, default: () => [] },
  holidayCalendarOptions: { type: Array, default: () => [] },
  groupOptions: { type: Array, default: () => [] },
  userOptions: { type: Array, default: () => [] },
  isDefaultLocked: { type: Boolean, default: false },
  previewSetId: { type: String, default: null }
});

watch(
  () => form.value.linkedTo?.type,
  (type, prevType) => {
    if (type === prevType || !form.value?.linkedTo) return;
    form.value.linkedTo.id = null;
    if (type !== 'company') {
      form.value.isDefault = false;
    }
  }
);
</script>
