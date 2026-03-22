/**
 * Composable to fetch people types (Lead, Contact, Customer, Agent, …) from tenant config.
 * Falls back per appKey when config or API is missing.
 *
 * @param appKey - App key (e.g. 'SALES', 'HELPDESK') or Ref/Computed. When null/empty, skips fetch.
 */
import { ref, onMounted, watch, type Ref } from 'vue';
import apiClient from '@/utils/apiClient';
import { peopleTypesCacheVersion } from '@/utils/peopleTypesInvalidate';
import {
  type PeopleTypeDef,
  typeDefsFromStrings,
  parsePeopleTypesApiPayload
} from '@/utils/peopleTypeColors';

const DEFAULT_BY_APP = {
  SALES: ['Lead', 'Contact'],
  HELPDESK: ['Customer', 'Agent']
} as const;

function defaultsForApp(key: string | null | undefined): string[] {
  const u = key && String(key).trim() ? String(key).toUpperCase() : 'SALES';
  const list = (DEFAULT_BY_APP as Record<string, readonly string[]>)[u] ?? DEFAULT_BY_APP.SALES;
  return [...list];
}

function defaultRoleForApp(key: string | null | undefined): string {
  const types = defaultsForApp(key);
  return types[0] || 'Lead';
}

export function usePeopleTypes(appKey: string | Ref<string | null | undefined> = 'SALES') {
  const isRef = typeof appKey === 'object' && appKey !== null && 'value' in appKey;
  const getKey = () => (isRef ? (appKey as Ref<string | null | undefined>).value : (appKey as string));

  const fallbackKey = getKey() ?? null;
  const initialTypes = defaultsForApp(fallbackKey);
  const types = ref<string[]>(initialTypes);
  const typeDefs = ref<PeopleTypeDef[]>(typeDefsFromStrings(initialTypes));
  const defaultRole = ref<string>(defaultRoleForApp(fallbackKey));
  const loading = ref(false);

  async function fetchTypes(key: string | null) {
    if (!key || String(key).trim() === '') {
      types.value = [];
      typeDefs.value = [];
      defaultRole.value = defaultRoleForApp(null);
      return;
    }
    const fallbackTypes = defaultsForApp(key);
    const fallbackDefault = fallbackTypes[0] || defaultRoleForApp(key);
    loading.value = true;
    try {
      const res = (await apiClient.get('/settings/core-modules/people/people-types', {
        params: { appKey: key }
      })) as { success?: boolean; data?: unknown };
      const parsed = parsePeopleTypesApiPayload(res?.data, fallbackTypes, fallbackDefault);
      types.value = parsed.types;
      typeDefs.value = parsed.typeDefs;
      defaultRole.value = parsed.defaultRole;
    } catch {
      types.value = fallbackTypes;
      typeDefs.value = typeDefsFromStrings(fallbackTypes);
      defaultRole.value = fallbackDefault;
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => fetchTypes(getKey() ?? null));

  if (isRef) {
    watch(
      appKey as Ref<string | null | undefined>,
      (key) => {
        if (!key || String(key).trim() === '') {
          types.value = [];
          typeDefs.value = [];
          defaultRole.value = defaultRoleForApp(null);
          return;
        }
        const fb = defaultsForApp(key);
        types.value = fb;
        typeDefs.value = typeDefsFromStrings(fb);
        defaultRole.value = defaultRoleForApp(key);
        fetchTypes(key ?? null);
      },
      { immediate: false }
    );
  }

  watch(peopleTypesCacheVersion, () => {
    const key = getKey();
    if (key && String(key).trim() !== '') {
      fetchTypes(key);
    }
  });

  return { types, typeDefs, defaultRole, loading, refetch: () => fetchTypes(getKey() ?? null) };
}
