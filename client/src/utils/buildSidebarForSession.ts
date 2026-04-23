import type { AppRegistry, SidebarStructure } from '@/types/sidebar.types';
import { getAppRegistry } from '@/utils/getAppRegistry';
import { buildSidebarFromRegistry } from '@/utils/buildSidebarFromRegistry';
import { createPermissionSnapshot } from '@/types/permission-snapshot.types';

type UserLike = Parameters<typeof createPermissionSnapshot>[0];

export type BuildSidebarForSessionResult = {
  structure: SidebarStructure;
  entitlementScopedRegistry: AppRegistry;
};

/**
 * Builds the locked SidebarStructure for the current session:
 * - Filters app registry by app entitlement (hasAppAccess)
 * - Keeps PLATFORM entry for internal module resolution
 * - Hides Core section when the user has no Sales app entitlement
 *
 * Used by Nav (platform shell), AuditLayout, and PortalLayout so behavior stays consistent.
 */
export async function buildSidebarStructureForSession(
  user: UserLike,
  hasAppAccess: (appKey: string) => boolean
): Promise<BuildSidebarForSessionResult> {
  const registry = await getAppRegistry();

  const entitlementScopedRegistry = Object.fromEntries(
    Object.entries(registry).filter(([appKey]) => {
      if (String(appKey).toUpperCase() === 'PLATFORM') return true;
      return hasAppAccess(appKey);
    })
  ) as AppRegistry;

  const snapshot = createPermissionSnapshot(user);
  const structure = await buildSidebarFromRegistry(entitlementScopedRegistry, snapshot);

  if (!hasAppAccess('SALES')) {
    structure.coreModules = [];
  }

  return { structure, entitlementScopedRegistry };
}
