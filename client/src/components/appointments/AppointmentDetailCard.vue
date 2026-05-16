<template>
  <div
    v-if="appointment?.isAppointment"
    class="rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50/80 to-white p-5 shadow-sm dark:border-indigo-500/30 dark:from-indigo-950/40 dark:to-gray-900"
  >
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Appointment</p>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Booked via {{ appointmentSourceLabel(appointment.bookingSource) }}
        </p>
      </div>
      <BadgeCell v-if="appointment.appointmentType" :value="appointmentTypeLabel(appointment.appointmentType)" variant="info" />
    </div>

    <div class="mt-4 grid gap-3 sm:grid-cols-2">
      <div v-if="appointment.bookedByName" class="rounded-xl bg-white/80 p-3 dark:bg-gray-800/60">
        <p class="text-xs text-gray-500">Booked by</p>
        <p class="font-medium text-gray-900 dark:text-white">{{ appointment.bookedByName }}</p>
        <p v-if="appointment.bookedByEmail" class="text-sm text-gray-500">{{ appointment.bookedByEmail }}</p>
      </div>
      <div v-if="appointment.customerTimezone" class="rounded-xl bg-white/80 p-3 dark:bg-gray-800/60">
        <p class="text-xs text-gray-500">Guest timezone</p>
        <p class="text-sm font-medium text-gray-900 dark:text-white">{{ appointment.customerTimezone }}</p>
      </div>
      <div v-if="appointment.publicPageSlug" class="rounded-xl bg-white/80 p-3 dark:bg-gray-800/60">
        <p class="text-xs text-gray-500">Booking page</p>
        <a :href="publicBookUrl" target="_blank" rel="noopener" class="text-sm font-medium text-indigo-600 hover:underline">
          /book/{{ appointment.publicPageSlug }}
        </a>
      </div>
      <div v-if="appointment.meetingLink" class="rounded-xl bg-white/80 p-3 dark:bg-gray-800/60">
        <p class="text-xs text-gray-500">Meeting link</p>
        <a :href="appointment.meetingLink" target="_blank" rel="noopener" class="text-sm font-medium text-indigo-600 hover:underline break-all">
          Join meeting
        </a>
      </div>
    </div>

    <div
      v-if="appointment.noShow"
      class="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
    >
      Marked as no-show
      <span v-if="appointment.noShowMarkedAt" class="text-amber-700 dark:text-amber-300">
        · {{ formatMarkedAt(appointment.noShowMarkedAt) }}
      </span>
    </div>

    <div class="mt-4 flex flex-wrap gap-2">
      <a
        v-if="appointment.meetingLink"
        :href="appointment.meetingLink"
        target="_blank"
        rel="noopener"
        class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        Join
      </a>
      <button
        v-if="canComplete"
        type="button"
        class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        @click="$emit('complete')"
      >
        Mark completed
      </button>
      <button
        v-if="canMarkNoShow"
        type="button"
        class="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200"
        @click="$emit('no-show')"
      >
        Mark no-show
      </button>
      <button
        v-if="canCancel"
        type="button"
        class="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
        @click="$emit('cancel')"
      >
        Cancel appointment
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import BadgeCell from '@/components/common/table/BadgeCell.vue';
import { appointmentSourceLabel, appointmentTypeLabel } from '@/utils/appointmentFormatters';

const props = defineProps({
  appointment: { type: Object, default: null },
  status: { type: String, default: '' },
  canCancel: { type: Boolean, default: true }
});

defineEmits(['cancel', 'complete', 'no-show']);

const isPlanned = computed(() => props.status === 'Planned');
const canComplete = computed(
  () => isPlanned.value && !props.appointment?.noShow
);
const canMarkNoShow = computed(
  () => isPlanned.value && !props.appointment?.noShow
);
const canCancel = computed(
  () => props.canCancel && isPlanned.value && !props.appointment?.noShow
);

function formatMarkedAt(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
}

const publicBookUrl = computed(() => {
  if (!props.appointment?.publicPageSlug) return '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/book/${props.appointment.publicPageSlug}`;
});
</script>
