<template>
  <div class="space-y-6">
    <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div class="flex flex-col md:flex-row md:items-end gap-4">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Helpdesk Analytics Dashboard</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Operational KPIs and SLA performance by trend, owner, and segment.</p>
        </div>
        <div class="flex items-end gap-3 md:ml-auto">
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">From</label>
            <input v-model="filters.from" type="date" class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">To</label>
            <input v-model="filters.to" type="date" class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
          </div>
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50"
            :disabled="loading"
            @click="fetchAnalytics"
          >
            {{ loading ? 'Refreshing...' : 'Refresh' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <p class="text-sm text-red-700 dark:text-red-300">{{ error }}</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <div v-for="card in summaryCards" :key="card.label" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ card.label }}</p>
        <p class="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{{ card.value }}</p>
      </div>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h4 class="text-base font-semibold text-gray-900 dark:text-white mb-4">Daily Trend (Created / Resolved / Breached)</h4>
      <div class="space-y-3 max-h-80 overflow-y-auto pr-1">
        <div v-for="point in trendPreview" :key="point.date" class="space-y-1">
          <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{{ point.date }}</span>
            <span>C {{ point.created }} | R {{ point.resolved }} | B {{ point.breached }}</span>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div class="h-2 rounded bg-indigo-100 dark:bg-indigo-900/40 overflow-hidden">
              <div class="h-2 bg-indigo-500" :style="{ width: normalizeBar(point.created) }"></div>
            </div>
            <div class="h-2 rounded bg-emerald-100 dark:bg-emerald-900/40 overflow-hidden">
              <div class="h-2 bg-emerald-500" :style="{ width: normalizeBar(point.resolved) }"></div>
            </div>
            <div class="h-2 rounded bg-rose-100 dark:bg-rose-900/40 overflow-hidden">
              <div class="h-2 bg-rose-500" :style="{ width: normalizeBar(point.breached) }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h4 class="text-base font-semibold text-gray-900 dark:text-white mb-4">Owner Performance</h4>
        <div class="space-y-3 max-h-96 overflow-y-auto">
          <div v-for="owner in owners" :key="owner.ownerId" class="p-3 rounded-lg border border-gray-100 dark:border-gray-700">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ ownerName(owner) }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ owner.owner?.email || owner.ownerId }}</p>
              </div>
              <span class="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                Open {{ owner.openCases }}
              </span>
            </div>
            <div class="mt-2 text-xs text-gray-600 dark:text-gray-300 flex flex-wrap gap-3">
              <span>Total {{ owner.totalCases }}</span>
              <span>SLA {{ owner.slaCompliancePercent }}%</span>
              <span>Reopen {{ owner.reopenRatePercent }}%</span>
              <span>Avg Res {{ owner.averageResolutionMinutes ?? '-' }}m</span>
            </div>
          </div>
          <p v-if="owners.length === 0" class="text-sm text-gray-500 dark:text-gray-400">No owner analytics available for selected range.</p>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h4 class="text-base font-semibold text-gray-900 dark:text-white mb-4">Distribution Snapshot</h4>
        <div class="space-y-4">
          <div>
            <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">By Priority</p>
            <div class="space-y-2">
              <div v-for="row in distribution.byPriority" :key="`p-${row.segment}`" class="flex items-center justify-between text-sm">
                <span class="text-gray-700 dark:text-gray-300">{{ row.segment }}</span>
                <span class="text-gray-600 dark:text-gray-400">{{ row.totalCases }} cases / SLA {{ row.slaCompliancePercent }}%</span>
              </div>
            </div>
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">By Channel</p>
            <div class="space-y-2">
              <div v-for="row in distribution.byChannel" :key="`c-${row.segment}`" class="flex items-center justify-between text-sm">
                <span class="text-gray-700 dark:text-gray-300">{{ row.segment }}</span>
                <span class="text-gray-600 dark:text-gray-400">{{ row.totalCases }} cases / SLA {{ row.slaCompliancePercent }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import apiClient from '@/utils/apiClient';

const loading = ref(false);
const error = ref('');
const summary = ref(null);
const trends = ref([]);
const owners = ref([]);
const distribution = ref({ byPriority: [], byChannel: [], byCaseType: [] });

const toDateInput = (date) => date.toISOString().slice(0, 10);
const now = new Date();
const last30 = new Date(now.getTime() - (29 * 24 * 60 * 60 * 1000));
const filters = ref({
  from: toDateInput(last30),
  to: toDateInput(now)
});

const summaryCards = computed(() => {
  const totals = summary.value?.totals || {};
  const resolution = summary.value?.resolution || {};
  const response = summary.value?.response || {};
  return [
    { label: 'Total Cases', value: totals.totalCases ?? 0 },
    { label: 'Open Cases', value: totals.openCases ?? 0 },
    { label: 'SLA Compliance', value: `${resolution.slaCompliancePercent ?? 0}%` },
    { label: 'Avg First Response', value: response.averageFirstResponseMinutes != null ? `${response.averageFirstResponseMinutes}m` : '-' }
  ];
});

const trendPreview = computed(() => trends.value.slice(-30));

function normalizeBar(value) {
  const max = Math.max(
    1,
    ...trendPreview.value.map((item) => Math.max(item.created || 0, item.resolved || 0, item.breached || 0))
  );
  const width = Math.round(((Number(value) || 0) / max) * 100);
  return `${Math.max(6, width)}%`;
}

function ownerName(owner) {
  const first = owner?.owner?.firstName || '';
  const last = owner?.owner?.lastName || '';
  return `${first} ${last}`.trim() || 'Unknown Owner';
}

async function fetchAnalytics() {
  loading.value = true;
  error.value = '';
  try {
    const params = new URLSearchParams();
    if (filters.value.from) params.set('from', new Date(filters.value.from).toISOString());
    if (filters.value.to) params.set('to', new Date(filters.value.to).toISOString());
    const query = params.toString() ? `?${params.toString()}` : '';

    const [summaryRes, trendsRes, ownersRes, distributionRes] = await Promise.all([
      apiClient(`/helpdesk/cases/analytics/summary${query}`, { method: 'GET' }),
      apiClient(`/helpdesk/cases/analytics/trends${query}`, { method: 'GET' }),
      apiClient(`/helpdesk/cases/analytics/owners${query}`, { method: 'GET' }),
      apiClient(`/helpdesk/cases/analytics/distribution${query}`, { method: 'GET' })
    ]);

    if (!summaryRes?.success || !trendsRes?.success || !ownersRes?.success || !distributionRes?.success) {
      throw new Error('Failed to load one or more analytics datasets');
    }

    summary.value = summaryRes.data || null;
    trends.value = trendsRes.data?.points || [];
    owners.value = ownersRes.data || [];
    distribution.value = distributionRes.data || { byPriority: [], byChannel: [], byCaseType: [] };
  } catch (err) {
    console.error('Failed to load Helpdesk analytics:', err);
    error.value = err?.message || 'Failed to load Helpdesk analytics';
  } finally {
    loading.value = false;
  }
}

onMounted(fetchAnalytics);
</script>
