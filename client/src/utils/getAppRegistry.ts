/**
 * ============================================================================
 * PLATFORM UI: App Registry Fetcher
 * ============================================================================
 *
 * Returns tenant app registry for buildSidebarFromRegistry / module list.
 * Uses Pinia appShell cache (single load per session + explicit invalidation).
 * ============================================================================
 */

import { getActivePinia } from 'pinia';
import type { AppRegistry } from '@/types/sidebar.types';
import { useAppShellStore } from '@/stores/appShell';
import { fetchAppRegistryFromNetwork } from '@/utils/appRegistryNetwork';

/**
 * Fetch app registry — cached in appShell after first load.
 */
export async function getAppRegistry(): Promise<AppRegistry> {
  try {
    const pinia = getActivePinia();
    if (!pinia) {
      return fetchAppRegistryFromNetwork();
    }
    const appShellStore = useAppShellStore(pinia);
    return appShellStore.ensureCachedAppRegistry();
  } catch (error) {
    console.error('[getAppRegistry] Error resolving app registry:', error);
    return {};
  }
}
