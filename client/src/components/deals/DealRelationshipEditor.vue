<!--
  Deal Relationship Editor
  Manages dealPeople and dealOrganizations with add/remove/primary.
  UI-only; backend syncs legacy contactId/accountId.
-->
<template>
  <div class="space-y-6">
    <!-- A. People on this Deal -->
    <section class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 overflow-hidden">
      <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">People on this Deal</h3>
      </div>
      <div class="p-4 space-y-3">
        <ul v-if="sortedPeople.length" class="space-y-2">
          <li
            v-for="(entry, idx) in sortedPeople"
            :key="peopleKey(entry, idx)"
            class="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/80"
            :class="{ 'opacity-60': !entry.isActive }"
          >
            <div class="min-w-0 flex-1">
              <span class="font-medium text-gray-900 dark:text-white block truncate">
                {{ personName(entry.personId) }}
              </span>
              <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                <span class="text-xs text-gray-500 dark:text-gray-400">{{ roleLabel(entry.role, 'person') }}</span>
                <span
                  v-if="entry.isPrimary"
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300"
                >
                  Primary
                </span>
                <span
                  v-if="!entry.isActive"
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                >
                  Inactive
                </span>
              </div>
            </div>
            <div v-if="!readOnly" class="flex items-center gap-1 shrink-0">
              <button
                v-if="entry.isActive"
                type="button"
                @click="setPrimaryPerson(entry)"
                :disabled="entry.isPrimary"
                class="p-1.5 rounded text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Set as primary contact"
              >
                <StarIconSolid v-if="entry.isPrimary" class="w-4 h-4 text-brand-600" />
                <StarIcon v-else class="w-4 h-4" />
              </button>
              <button
                v-if="entry.isActive"
                type="button"
                @click="softRemovePerson(entry)"
                class="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                title="Remove from deal"
              >
                <TrashIcon class="w-4 h-4" />
              </button>
            </div>
          </li>
        </ul>
        <p v-else class="text-sm text-gray-500 dark:text-gray-400 py-2">No people linked yet.</p>

        <div v-if="!readOnly" class="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div class="flex flex-wrap gap-3">
            <div class="flex-1 min-w-[180px]">
              <select
                v-model="addPersonForm.personId"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select person...</option>
                <option v-for="p in peopleOptions" :key="p._id" :value="p._id">
                  {{ (p.first_name || '') + ' ' + (p.last_name || '') }} {{ p.email ? `(${p.email})` : '' }}
                </option>
              </select>
            </div>
            <div class="w-36">
              <select
                v-model="addPersonForm.role"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
              >
                <option v-for="r in personRoles" :key="r.value" :value="r.value">{{ r.label }}</option>
              </select>
            </div>
            <label class="flex items-center gap-2">
              <input type="checkbox" v-model="addPersonForm.isPrimary" class="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
              <span class="text-sm text-gray-700 dark:text-gray-300">Primary</span>
            </label>
            <span v-if="addPersonForm.isPrimary" class="text-xs text-gray-500 self-center">(Primary contact)</span>
            <button
              type="button"
              @click="addPerson"
              :disabled="!addPersonForm.personId"
              class="px-3 py-2 text-sm font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>
      </div>
      <p v-if="validationErrors.primaryContact" class="px-4 pb-3 text-sm text-red-600 dark:text-red-400">
        {{ validationErrors.primaryContact }}
      </p>
    </section>

    <!-- B. Organizations on this Deal -->
    <section class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 overflow-hidden">
      <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Organizations on this Deal</h3>
      </div>
      <div class="p-4 space-y-3">
        <ul v-if="sortedOrgs.length" class="space-y-2">
          <li
            v-for="(entry, idx) in sortedOrgs"
            :key="orgKey(entry, idx)"
            class="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/80"
            :class="{ 'opacity-60': !entry.isActive }"
          >
            <div class="min-w-0 flex-1">
              <span class="font-medium text-gray-900 dark:text-white block truncate">
                {{ orgName(entry.organizationId) }}
              </span>
              <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                <span class="text-xs text-gray-500 dark:text-gray-400">{{ roleLabel(entry.role, 'org') }}</span>
                <span
                  v-if="entry.isPrimary"
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300"
                >
                  Primary
                </span>
                <span
                  v-if="!entry.isActive"
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                >
                  Inactive
                </span>
              </div>
            </div>
            <div v-if="!readOnly" class="flex items-center gap-1 shrink-0">
              <button
                v-if="entry.isActive && entry.role === 'customer'"
                type="button"
                @click="setPrimaryOrg(entry)"
                :disabled="entry.isPrimary"
                class="p-1.5 rounded text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Set as primary customer"
              >
                <StarIconSolid v-if="entry.isPrimary" class="w-4 h-4 text-brand-600" />
                <StarIcon v-else class="w-4 h-4" />
              </button>
              <button
                v-if="entry.isActive"
                type="button"
                @click="softRemoveOrg(entry)"
                class="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                title="Remove from deal"
              >
                <TrashIcon class="w-4 h-4" />
              </button>
            </div>
          </li>
        </ul>
        <p v-else class="text-sm text-gray-500 dark:text-gray-400 py-2">No organizations linked yet.</p>

        <div v-if="!readOnly" class="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div class="flex flex-wrap gap-3">
            <div class="flex-1 min-w-[180px]">
              <select
                v-model="addOrgForm.organizationId"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select organization...</option>
                <option v-for="o in organizationOptions" :key="o._id" :value="o._id">
                  {{ o.name }}
                </option>
              </select>
            </div>
            <div class="w-32">
              <select
                v-model="addOrgForm.role"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
              >
                <option v-for="r in orgRoles" :key="r.value" :value="r.value">{{ r.label }}</option>
              </select>
            </div>
            <label class="flex items-center gap-2" :class="{ 'opacity-50': addOrgForm.role !== 'customer' }">
              <input type="checkbox" v-model="addOrgForm.isPrimary" :disabled="addOrgForm.role !== 'customer'" class="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
              <span class="text-sm text-gray-700 dark:text-gray-300">Primary</span>
            </label>
            <span v-if="addOrgForm.role !== 'customer'" class="text-xs text-gray-500 self-center">(Customer only)</span>
            <button
              type="button"
              @click="addOrganization"
              :disabled="!addOrgForm.organizationId"
              class="px-3 py-2 text-sm font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>
      </div>
      <p v-if="validationErrors.activeCustomer" class="px-4 pb-3 text-sm text-red-600 dark:text-red-400">
        {{ validationErrors.activeCustomer }}
      </p>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { StarIcon } from '@heroicons/vue/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/vue/24/solid';
import { TrashIcon } from '@heroicons/vue/24/outline';

const personRoles = [
  { value: 'primary_contact', label: 'Primary contact' },
  { value: 'decision_maker', label: 'Decision maker' },
  { value: 'influencer', label: 'Influencer' },
  { value: 'partner_contact', label: 'Partner contact' },
];
const orgRoles = [
  { value: 'customer', label: 'Customer' },
  { value: 'partner', label: 'Partner' },
  { value: 'reseller', label: 'Reseller' },
];

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ dealPeople: [], dealOrganizations: [] }),
  },
  people: { type: Array, default: () => [] },
  organizations: { type: Array, default: () => [] },
  readOnly: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'validate']);

const dealPeople = computed({
  get: () => Array.isArray(props.modelValue?.dealPeople) ? [...props.modelValue.dealPeople] : [],
  set: (v) => emit('update:modelValue', { ...props.modelValue, dealPeople: v }),
});
const dealOrganizations = computed({
  get: () => Array.isArray(props.modelValue?.dealOrganizations) ? [...props.modelValue.dealOrganizations] : [],
  set: (v) => emit('update:modelValue', { ...props.modelValue, dealOrganizations: v }),
});

const addPersonForm = ref({ personId: '', role: 'primary_contact', isPrimary: false });
const addOrgForm = ref({ organizationId: '', role: 'customer', isPrimary: false });
const validationErrors = ref({ primaryContact: '', activeCustomer: '' });

watch(
  () => addOrgForm.value.role,
  (role) => {
    if (role !== 'customer') {
      addOrgForm.value = { ...addOrgForm.value, isPrimary: false };
    }
  }
);

const sortedPeople = computed(() => {
  const list = dealPeople.value.filter((p) => p.personId);
  return [...list].sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0));
});
const sortedOrgs = computed(() => {
  const list = dealOrganizations.value.filter((o) => o.organizationId);
  return [...list].sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0));
});

const peopleOptions = computed(() => props.people || []);
const organizationOptions = computed(() => props.organizations || []);

function personName(pid) {
  if (!pid) return '—';
  const p = typeof pid === 'object' ? pid : props.people.find((x) => x._id === pid);
  if (!p) return '—';
  return [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || '—';
}
function orgName(oid) {
  if (!oid) return '—';
  const o = typeof oid === 'object' ? oid : props.organizations.find((x) => x._id === oid);
  return o?.name || '—';
}
function roleLabel(role, kind) {
  if (kind === 'person') return personRoles.find((r) => r.value === role)?.label || role;
  return orgRoles.find((r) => r.value === role)?.label || role;
}
function peopleKey(entry, idx) {
  const id = entry.personId?._id ?? entry.personId;
  return `p-${id}-${entry.role}-${idx}`;
}
function orgKey(entry, idx) {
  const id = entry.organizationId?._id ?? entry.organizationId;
  return `o-${id}-${entry.role}-${idx}`;
}

function unsetPrimaryPeople() {
  const next = dealPeople.value.map((p) => ({ ...p, isPrimary: false }));
  dealPeople.value = next;
}
function unsetPrimaryOrgs() {
  const next = dealOrganizations.value.map((o) => ({ ...o, isPrimary: false }));
  dealOrganizations.value = next;
}

function addPerson() {
  const id = addPersonForm.value.personId;
  if (!id) return;
  const isPrimary = !!addPersonForm.value.isPrimary;
  const role = isPrimary ? 'primary_contact' : (addPersonForm.value.role || 'primary_contact');

  if (isPrimary) unsetPrimaryPeople();

  const existing = dealPeople.value.find(
    (p) => (p.personId?._id || p.personId) === id && p.role === role
  );
  let list = [...dealPeople.value];
  if (existing) {
    list = list.map((p) =>
      (p.personId?._id || p.personId) === id && p.role === role
        ? { ...p, isPrimary, isActive: true }
        : p
    );
  } else {
    list.push({
      personId: id,
      role,
      isPrimary,
      isActive: true,
      addedAt: new Date(),
    });
  }
  dealPeople.value = list;
  addPersonForm.value = { personId: '', role: 'primary_contact', isPrimary: false };
}

function setPrimaryPerson(entry) {
  if (entry.isPrimary) return;
  unsetPrimaryPeople();
  const id = entry.personId?._id || entry.personId;
  const list = dealPeople.value.map((p) => {
    if ((p.personId?._id || p.personId) !== id || p.role !== entry.role) return p;
    return { ...p, isPrimary: true, role: 'primary_contact' };
  });
  dealPeople.value = list;
}

function softRemovePerson(entry) {
  const id = entry.personId?._id || entry.personId;
  const list = dealPeople.value.map((p) =>
    (p.personId?._id || p.personId) === id && p.role === entry.role ? { ...p, isActive: false } : p
  );
  dealPeople.value = list;
}

function addOrganization() {
  const id = addOrgForm.value.organizationId;
  if (!id) return;
  const role = addOrgForm.value.role || 'customer';
  const isPrimary = role === 'customer' && !!addOrgForm.value.isPrimary;

  if (isPrimary) unsetPrimaryOrgs();

  const existing = dealOrganizations.value.find(
    (o) => (o.organizationId?._id || o.organizationId) === id && o.role === role
  );
  let list = [...dealOrganizations.value];
  if (existing) {
    list = list.map((o) =>
      (o.organizationId?._id || o.organizationId) === id && o.role === role
        ? { ...o, isPrimary, isActive: true }
        : o
    );
  } else {
    list.push({
      organizationId: id,
      role,
      isPrimary,
      isActive: true,
      addedAt: new Date(),
    });
  }
  dealOrganizations.value = list;
  addOrgForm.value = { organizationId: '', role: 'customer', isPrimary: false };
}

function setPrimaryOrg(entry) {
  if (entry.isPrimary) return;
  unsetPrimaryOrgs();
  const id = entry.organizationId?._id || entry.organizationId;
  const list = dealOrganizations.value.map((o) =>
    (o.organizationId?._id || o.organizationId) === id && o.role === entry.role ? { ...o, isPrimary: true } : o
  );
  dealOrganizations.value = list;
}

function softRemoveOrg(entry) {
  const id = entry.organizationId?._id || entry.organizationId;
  const list = dealOrganizations.value.map((o) =>
    (o.organizationId?._id || o.organizationId) === id && o.role === entry.role ? { ...o, isActive: false } : o
  );
  dealOrganizations.value = list;
}

function validate() {
  validationErrors.value = { primaryContact: '', activeCustomer: '' };
  const people = dealPeople.value.filter((p) => p.isActive);
  const orgs = dealOrganizations.value.filter((o) => o.isActive);
  const primaryContacts = people.filter((p) => p.isPrimary && p.role === 'primary_contact');
  const primaryCustomers = orgs.filter((o) => o.isPrimary && o.role === 'customer');
  const activeCustomers = orgs.filter((o) => o.role === 'customer');

  if (primaryContacts.length !== 1) {
    validationErrors.value.primaryContact = 'There must be exactly one primary contact (role: Primary contact).';
  }
  if (activeCustomers.length < 1) {
    validationErrors.value.activeCustomer = 'There must be at least one active customer organization.';
  } else if (primaryCustomers.length !== 1) {
    validationErrors.value.activeCustomer = 'There must be exactly one primary customer organization.';
  }

  const valid = !validationErrors.value.primaryContact && !validationErrors.value.activeCustomer;
  emit('validate', valid);
  return valid;
}

watch(
  () => props.modelValue,
  (v) => {
    validationErrors.value = { primaryContact: '', activeCustomer: '' };
  },
  { deep: true }
);

defineExpose({ validate });
</script>
