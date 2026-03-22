/**
 * Creation context detection for context-aware person creation.
 *
 * Determines whether the user is in Sales context (create→attach as Lead)
 * or Global context (identity-only creation).
 *
 * Sales context: /deals, /dashboard, /sales/*
 * Global context: /people, /platform/*, or other routes
 */
import { computed, type Ref } from 'vue';
import { useRoute } from 'vue-router';
import { useAppShellStore } from '@/stores/appShell';

const SALES_PATH_PREFIXES = ['/deals', '/dashboard', '/sales'];

/**
 * Check if the given path indicates Sales context.
 */
export function isSalesContextFromPath(path: string): boolean {
  if (!path || typeof path !== 'string') return false;
  const base = path.split('?')[0];
  const p = (base ?? path).trim().toLowerCase();
  return SALES_PATH_PREFIXES.some((prefix) => p.startsWith(prefix.toLowerCase()));
}

export type CreationContextAppKey = 'SALES' | 'HELPDESK';

export type CreationContext = 'ALL' | CreationContextAppKey;

/**
 * Get creation context app key from route and optional override.
 *
 * @param routePath - Current route path
 * @param overrideAppKey - Optional override (e.g. from peopleContext on People page)
 * @returns 'SALES' when in Sales context, null for Global
 */
export function getCreationContextAppKey(
  routePath: string,
  overrideAppKey?: string | null
): CreationContextAppKey | null {
  if (overrideAppKey && String(overrideAppKey).toUpperCase() === 'SALES') {
    return 'SALES';
  }
  if (overrideAppKey && String(overrideAppKey).toUpperCase() === 'HELPDESK') {
    return 'HELPDESK';
  }
  return isSalesContextFromPath(routePath) ? 'SALES' : null;
}

type ContextAppKeyOverride = string | null | undefined | Ref<string | null | undefined>;

/**
 * Composable: resolve creation context for person creation.
 *
 * @param contextAppKeyOverride - Optional prop/override (Ref or raw).
 *   - `'SALES' | 'HELPDESK'`: force app create→attach context
 *   - `null`: explicit global (identity-only on People "All People"); still honors Sales *route* (/deals, /sales, …)
 *   - `undefined`: infer — Sales route, then on /people/* use shell activeApp (for palette / omitted prop)
 * @returns { appKey, context, isSalesContext, isAppContext } (reactive)
 *   - context: 'ALL' | 'SALES' | 'HELPDESK' — determines drawer behavior
 *   - isAppContext: true when context !== 'ALL' (show app section)
 */
export function useCreationContext(
  contextAppKeyOverride?: ContextAppKeyOverride
): {
  appKey: import('vue').ComputedRef<CreationContextAppKey | null>;
  context: import('vue').ComputedRef<CreationContext>;
  isSalesContext: import('vue').ComputedRef<boolean>;
  isAppContext: import('vue').ComputedRef<boolean>;
} {
  const route = useRoute();
  const appShellStore = useAppShellStore();

  const appKey = computed((): CreationContextAppKey | null => {
    const override =
      contextAppKeyOverride && typeof contextAppKeyOverride === 'object' && 'value' in contextAppKeyOverride
        ? (contextAppKeyOverride as Ref<string | null | undefined>).value
        : (contextAppKeyOverride as string | null | undefined);

    if (override != null && override !== '') {
      const upper = String(override).toUpperCase();
      if (upper === 'SALES') return 'SALES';
      if (upper === 'HELPDESK') return 'HELPDESK';
    }

    if (isSalesContextFromPath(route.path)) {
      return 'SALES' as const;
    }

    // Explicit null: parent chose global list context (e.g. People "All People") — do not follow shell activeApp
    if (override === null) {
      return null;
    }

    // undefined: infer from shell when on People routes (e.g. prop omitted)
    if (route.path === '/people' || route.path.startsWith('/people/')) {
      const active = appShellStore.activeApp;
      if (active && String(active).toUpperCase() === 'SALES') {
        return 'SALES' as const;
      }
      if (active && String(active).toUpperCase() === 'HELPDESK') {
        return 'HELPDESK' as const;
      }
    }
    return null;
  });

  const context = computed((): CreationContext => appKey.value ?? 'ALL');

  const isSalesContext = computed(() => appKey.value === 'SALES');

  const isAppContext = computed(() => appKey.value !== null);

  return {
    appKey,
    context,
    isSalesContext,
    isAppContext,
  };
}
