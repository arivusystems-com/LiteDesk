<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950/20">
    <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-sm font-medium text-indigo-600 dark:text-indigo-400">
            {{ isAdminEdit ? 'Admin · Booking page' : 'My Appointments' }}
          </p>
          <h1 class="mt-1 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {{ isAdminEdit ? editUserLabel : 'Booking page' }}
          </h1>
          <p class="mt-2 max-w-xl text-gray-600 dark:text-gray-400">
            <template v-if="isAdminEdit">
              Configure this user's public booking page and availability.
            </template>
            <template v-else>
              Share your link so customers can book time on your calendar. Every booking creates an event automatically.
            </template>
          </p>
        </div>
        <div class="flex items-center gap-3">
          <label class="flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <span class="text-gray-600 dark:text-gray-300">Page live</span>
            <button
              type="button"
              role="switch"
              :aria-checked="form.enabled"
              class="relative h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              :class="form.enabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'"
              @click="form.enabled = !form.enabled"
            >
              <span
                class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-out"
                :class="form.enabled ? 'translate-x-5' : ''"
              />
            </button>
          </label>
          <button
            type="button"
            class="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all duration-200 hover:bg-indigo-700 hover:shadow-indigo-600/40 active:scale-[0.98] disabled:opacity-50"
            :disabled="saving || !slugAvailable"
            @click="handleSave"
          >
            {{ saving ? 'Saving…' : 'Save changes' }}
          </button>
        </div>
      </div>

      <Transition name="fade">
        <div v-if="error" class="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          {{ error }}
        </div>
      </Transition>

      <div v-if="loading" class="flex justify-center py-24">
        <div class="h-10 w-10 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
      </div>

      <div v-else>
      <div class="grid gap-8 lg:grid-cols-5">
        <div class="space-y-6 lg:col-span-3">
          <section class="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700/80 dark:bg-gray-900/80">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Public link</h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">This is the URL you share with customers.</p>
            <div class="mt-4">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Page name</label>
              <input
                v-model="form.displayName"
                type="text"
                class="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-gray-900 transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800/50 dark:text-white"
                placeholder="e.g. Book a demo with Alex"
                @blur="maybeAutoSlug"
              />
            </div>
            <div class="mt-4">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">URL path</label>
              <div
                class="mt-1.5 flex overflow-hidden rounded-xl border transition-colors duration-200"
                :class="slugAvailable ? 'border-gray-200 dark:border-gray-600' : 'border-amber-400 ring-2 ring-amber-400/30'"
              >
                <span class="flex items-center bg-gray-100 px-3 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">/book/</span>
                <input
                  v-model="form.slug"
                  type="text"
                  class="min-w-0 flex-1 border-0 bg-white px-3 py-2.5 text-gray-900 focus:ring-0 dark:bg-gray-900 dark:text-white"
                  @input="onSlugInput"
                />
              </div>
              <p v-if="!slugAvailable" class="mt-1 text-xs text-amber-600 dark:text-amber-400">This URL is already taken</p>
            </div>
            <div v-if="bookingUrl" class="mt-4 flex items-center gap-2 rounded-xl bg-indigo-50/80 p-3 dark:bg-indigo-950/40">
              <LinkIcon class="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
              <a :href="bookingUrl" target="_blank" rel="noopener" class="min-w-0 truncate text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-300">{{ bookingUrl }}</a>
              <button type="button" class="shrink-0 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-50 dark:bg-gray-800" @click="copyLink">Copy</button>
            </div>
          </section>

          <section class="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-gray-700/80 dark:bg-gray-900/80">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Availability</h2>
            <div class="mt-4">
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Available days</p>
              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  v-for="(label, idx) in DAY_LABELS"
                  :key="idx"
                  type="button"
                  class="rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 active:scale-95"
                  :class="form.availableDays.includes(idx)
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'"
                  @click="toggleDay(idx)"
                >
                  {{ label }}
                </button>
              </div>
            </div>
            <div class="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">From</label>
                <input v-model="form.workingHours.start" type="time" class="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">To</label>
                <input v-model="form.workingHours.end" type="time" class="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
              </div>
            </div>
            <div class="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Slot length</label>
                <select v-model.number="form.slotDurationMinutes" class="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 dark:border-gray-600 dark:bg-gray-800 dark:text-white">
                  <option v-for="o in SLOT_DURATION_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Buffer between meetings</label>
                <select v-model.number="form.bufferMinutes" class="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 dark:border-gray-600 dark:bg-gray-800 dark:text-white">
                  <option v-for="o in BUFFER_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
              </div>
            </div>
          </section>

          <section class="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-gray-700/80 dark:bg-gray-900/80">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Meeting format</h2>
            <div class="mt-4 grid gap-3 sm:grid-cols-3">
              <button
                v-for="opt in MEETING_TYPE_OPTIONS"
                :key="opt.value"
                type="button"
                class="rounded-xl border-2 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                :class="form.meetingType === opt.value
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-sm dark:bg-indigo-950/30'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'"
                @click="form.meetingType = opt.value"
              >
                <VideoCameraIcon v-if="opt.icon === 'video'" class="h-6 w-6 text-indigo-600" />
                <MapPinIcon v-else class="h-6 w-6 text-indigo-600" />
                <p class="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{{ opt.label }}</p>
              </button>
            </div>
          </section>

          <section
            v-if="form.meetingType === 'google_meet'"
            class="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-gray-700/80 dark:bg-gray-900/80"
          >
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Google Calendar & Meet</h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Connect Google Calendar to auto-create Meet links when someone books.
            </p>
            <div v-if="!config?._id" class="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              Save this page first, then connect Google Calendar.
            </div>
            <div v-else class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p v-if="calendarStatus.connected" class="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  Connected as {{ calendarStatus.accountEmail }}
                </p>
                <p v-else class="text-sm text-gray-600 dark:text-gray-400">Not connected</p>
              </div>
              <div class="flex gap-2">
                <button
                  v-if="!calendarStatus.connected"
                  type="button"
                  class="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                  :disabled="calendarConnecting"
                  @click="connectGoogleCalendar"
                >
                  {{ calendarConnecting ? 'Opening…' : 'Connect Google Calendar' }}
                </button>
                <button
                  v-else
                  type="button"
                  class="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                  @click="disconnectGoogleCalendar"
                >
                  Disconnect
                </button>
              </div>
            </div>
            <p class="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Uses the same Google OAuth app as Gmail (Settings → Integrations → Email). Enable the
              <strong>Google Calendar API</strong> in your Google Cloud project. If you see
              “Insufficient permission”, remove this app at
              <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener" class="text-indigo-600 underline">Google Account permissions</a>
              then connect again.
            </p>
            <p
              v-if="calendarStatus.redirectUri"
              class="mt-2 rounded-lg bg-gray-100 px-3 py-2 font-mono text-xs text-gray-700 break-all dark:bg-gray-800 dark:text-gray-300"
            >
              Add this exact URL under Google Cloud → OAuth client → Authorized redirect URIs:<br />
              <span class="text-indigo-600 dark:text-indigo-400">{{ calendarStatus.redirectUri }}</span>
            </p>
          </section>

          <section class="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-gray-700/80 dark:bg-gray-900/80">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Branding</h2>
            <div class="mt-4 flex items-center gap-4">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Accent color</label>
              <input v-model="form.branding.themeColor" type="color" class="h-10 w-14 cursor-pointer rounded-lg border-0" />
            </div>
            <div class="mt-4">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Welcome message</label>
              <textarea
                v-model="form.branding.welcomeNote"
                rows="3"
                class="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </section>
        </div>

        <div class="lg:col-span-2">
          <div class="sticky top-6">
            <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Live preview</p>
            <div
              class="overflow-hidden rounded-2xl border border-gray-200/80 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl dark:border-gray-700"
              :style="{ '--accent': form.branding.themeColor || '#4f46e5' }"
            >
              <div class="h-2 bg-[var(--accent)]" />
              <div class="bg-white p-6 dark:bg-gray-900" :class="{ 'opacity-60': !form.enabled }">
                <div class="flex items-center gap-3">
                  <div class="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/15 text-lg font-bold text-[var(--accent)]">
                    {{ (form.displayName || 'Y')[0] }}
                  </div>
                  <div>
                    <p class="font-semibold text-gray-900 dark:text-white">{{ form.displayName || 'Your name' }}</p>
                    <p class="text-sm text-gray-500">{{ form.slotDurationMinutes }} min meeting</p>
                  </div>
                </div>
                <p class="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  {{ form.branding.welcomeNote || 'Welcome message preview…' }}
                </p>
                <div class="mt-6 flex flex-wrap gap-2">
                  <span
                    v-for="i in 4"
                    :key="i"
                    class="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  >
                    {{ previewSlot(i) }}
                  </span>
                </div>
                <p v-if="!form.enabled" class="mt-4 text-center text-xs font-medium text-amber-600">Page is paused</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section v-if="isAdmin" class="mt-12 border-t border-gray-200 pt-10 dark:border-gray-800">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">All booking pages</h2>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Personal and team pages in your organization.
            </p>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200"
            @click="openCreateTeamPage"
          >
            + Create team page
          </button>
        </div>
        <div v-if="teamLoading" class="mt-6 flex justify-center py-8">
          <div class="h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
        </div>
        <div
          v-else-if="teamConfigs.length === 0"
          class="mt-6 rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700"
        >
          No booking pages configured yet.
        </div>
        <div v-else class="mt-6 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <table class="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-800/80">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Name</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Type</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Page</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Status</th>
                <th class="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
              <tr v-for="row in teamConfigs" :key="row._id">
                <td class="px-4 py-3 text-gray-900 dark:text-white">{{ rowLabel(row) }}</td>
                <td class="px-4 py-3">
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="row.ownerType === 'team'
                      ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'"
                  >
                    {{ row.ownerType === 'team' ? 'Team' : 'Personal' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-gray-600 dark:text-gray-400">/book/{{ row.slug }}</td>
                <td class="px-4 py-3">
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="row.enabled
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'"
                  >
                    {{ row.enabled ? 'Live' : 'Paused' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right space-x-3">
                  <button
                    type="button"
                    class="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                    @click="row.ownerType === 'team' ? openTeamEdit(row) : openPersonalEdit(row)"
                  >
                    Edit
                  </button>
                  <a
                    v-if="row.bookingUrl"
                    :href="row.bookingUrl"
                    target="_blank"
                    rel="noopener"
                    class="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Open
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import apiClient from '@/utils/apiClient';
import { useAuthStore } from '@/stores/authRegistry';
import { useTabs } from '@/composables/useTabs';
import { LinkIcon, VideoCameraIcon, MapPinIcon } from '@heroicons/vue/24/outline';
import { useAppointmentConfig } from '@/composables/useAppointmentConfig';
import {
  DAY_LABELS,
  SLOT_DURATION_OPTIONS,
  BUFFER_OPTIONS,
  MEETING_TYPE_OPTIONS,
  slugifyClient
} from '@/utils/appointmentFormatters';
import { useNotifications } from '@/composables/useNotifications';

const {
  config,
  loading,
  saving,
  error,
  slugAvailable,
  bookingUrl,
  fetchMyConfig,
  fetchUserConfig,
  saveUserConfig,
  saveConfig,
  checkSlug
} = useAppointmentConfig();

const { success: notifySuccess, error: notifyError } = useNotifications();
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const { openTab } = useTabs();
const isAdmin = computed(() => authStore.isAdminLike);
const editUserId = computed(() => route.params.userId || null);
const isAdminEdit = computed(
  () => editUserId.value && String(editUserId.value) !== String(authStore.user?._id)
);
const editUserLabel = ref('User booking page');
const teamConfigs = ref([]);
const teamLoading = ref(false);
const calendarStatus = ref({ connected: false, accountEmail: null });
const calendarConnecting = ref(false);

const form = reactive({
  displayName: '',
  slug: '',
  enabled: true,
  availableDays: [1, 2, 3, 4, 5],
  workingHours: { start: '09:00', end: '18:00', timezone: 'UTC' },
  slotDurationMinutes: 30,
  bufferMinutes: 10,
  meetingType: 'offline',
  appointmentTypes: ['demo', 'consultation'],
  branding: { themeColor: '#4f46e5', welcomeNote: '', logoUrl: '' }
});

let slugDebounce;
function onSlugInput() {
  form.slug = slugifyClient(form.slug);
  clearTimeout(slugDebounce);
  slugDebounce = setTimeout(() => checkSlug(form.slug, config.value?._id), 400);
}

function maybeAutoSlug() {
  if (!form.slug && form.displayName) {
    form.slug = slugifyClient(form.displayName);
    checkSlug(form.slug);
  }
}

function toggleDay(idx) {
  const i = form.availableDays.indexOf(idx);
  if (i >= 0) form.availableDays.splice(i, 1);
  else form.availableDays.push(idx);
  form.availableDays.sort((a, b) => a - b);
}

function previewSlot(i) {
  const h = 9 + i;
  return `${h}:00 ${h < 12 ? 'AM' : 'PM'}`;
}

async function handleSave() {
  form.workingHours.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || form.workingHours.timezone;
  if (isAdminEdit.value) {
    await saveUserConfig(editUserId.value, { ...form });
  } else {
    await saveConfig({ ...form });
  }
  notifySuccess('Booking page saved');
  await refreshCalendarStatus();
}

async function refreshCalendarStatus() {
  if (!config.value?._id) return;
  try {
    const res = await apiClient.get(`/appointments/calendar/${config.value._id}/status`);
    if (res.success) calendarStatus.value = res.data;
  } catch {
    calendarStatus.value = { connected: false, accountEmail: null };
  }
}

async function connectGoogleCalendar() {
  if (!config.value?._id) return;
  calendarConnecting.value = true;
  try {
    const res = await apiClient.get(`/appointments/calendar/${config.value._id}/google/start`);
    if (!res.success || !res.data?.url) {
      notifyError(res.message || 'Could not start Google connection');
      return;
    }
    const w = 520;
    const h = 720;
    const left = Math.max(0, Math.round((window.screen.availWidth - w) / 2));
    const top = Math.max(0, Math.round((window.screen.availHeight - h) / 2));
    const popup = window.open(
      res.data.url,
      'google-calendar-oauth',
      `popup=yes,width=${w},height=${h},left=${left},top=${top}`
    );
    if (!popup) {
      window.location.href = res.data.url;
      return;
    }
    const timer = setInterval(async () => {
      if (popup.closed) {
        clearInterval(timer);
        calendarConnecting.value = false;
        await fetchConfig();
        await refreshCalendarStatus();
      }
    }, 500);
  } catch (e) {
    notifyError(e?.message || 'Connection failed');
  } finally {
    calendarConnecting.value = false;
  }
}

async function disconnectGoogleCalendar() {
  if (!config.value?._id) return;
  await apiClient.delete(`/appointments/calendar/${config.value._id}/google`);
  calendarStatus.value = { connected: false, accountEmail: null };
  notifySuccess('Google Calendar disconnected');
}

async function fetchConfig() {
  if (isAdminEdit.value) {
    await fetchUserConfig(editUserId.value);
    const owner = teamConfigs.value.find((r) => String(r.ownerId?._id || r.ownerId) === String(editUserId.value));
    if (owner) editUserLabel.value = rowLabel(owner);
    else editUserLabel.value = config.value?.displayName || 'User booking page';
  } else {
    await fetchMyConfig();
  }
}

async function copyLink() {
  if (!bookingUrl.value) return;
  await navigator.clipboard.writeText(bookingUrl.value);
  notifySuccess('Link copied');
}

watch(config, (c) => {
  if (!c) return;
  Object.assign(form, {
    displayName: c.displayName || '',
    slug: c.slug || '',
    enabled: c.enabled !== false,
    availableDays: [...(c.availableDays || [1, 2, 3, 4, 5])],
    workingHours: { ...form.workingHours, ...(c.workingHours || {}) },
    slotDurationMinutes: c.slotDurationMinutes ?? 30,
    bufferMinutes: c.bufferMinutes ?? 10,
    meetingType: c.meetingType || 'offline',
    appointmentTypes: c.appointmentTypes || ['demo', 'consultation'],
    branding: { ...form.branding, ...(c.branding || {}) }
  });
  if (c.googleCalendar) {
    calendarStatus.value = {
      connected: !!c.googleCalendar.connected,
      accountEmail: c.googleCalendar.accountEmail || null
    };
  }
}, { immediate: true });

function teamOwnerName(row) {
  const u = row.ownerId;
  if (u && typeof u === 'object') {
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
    return name || u.email || u.username || row.displayName || 'User';
  }
  return row.displayName || 'User';
}

function rowLabel(row) {
  if (row.ownerType === 'team') {
    const count = row.memberUserIds?.length || 0;
    return `${row.displayName || 'Team'} (${count} members)`;
  }
  return teamOwnerName(row);
}

function openCreateTeamPage() {
  openTab('/appointments/team/configure', { title: 'Team booking', icon: '👥' });
  router.push({ name: 'appointments-team-configure-new' });
}

function openTeamEdit(row) {
  const path = `/appointments/team/configure/${row._id}`;
  openTab(path, { title: row.displayName || 'Team booking', icon: '👥' });
  router.push({ name: 'appointments-team-configure', params: { id: row._id } });
}

function openPersonalEdit(row) {
  const userId = row.ownerId?._id || row.ownerId;
  const path = `/appointments/configure/user/${userId}`;
  const name = teamOwnerName(row);
  openTab(path, { title: `${name} · Booking`, icon: '📅' });
  router.push({ name: 'appointments-configure-user', params: { userId } });
}

async function fetchTeamConfigs() {
  if (!isAdmin.value) return;
  teamLoading.value = true;
  try {
    const res = await apiClient.get('/appointments/config');
    if (res.success) teamConfigs.value = Array.isArray(res.data) ? res.data : [];
  } catch {
    teamConfigs.value = [];
  } finally {
    teamLoading.value = false;
  }
}

onMounted(async () => {
  if (isAdmin.value) await fetchTeamConfigs();
  await fetchConfig();
  await refreshCalendarStatus();
  if (route.query.calendar === 'connected') {
    notifySuccess('Google Calendar connected');
    router.replace({ query: {} });
  } else if (route.query.calendar === 'error') {
    notifyError(route.query.message || 'Google Calendar connection failed');
    router.replace({ query: {} });
  }
});

watch(() => config.value?._id, () => refreshCalendarStatus());
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
