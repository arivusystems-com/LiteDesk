import type { AppRegistry, SidebarStructure } from '@/types/sidebar.types';
import { getAppRegistry } from '@/utils/getAppRegistry';
import { buildSidebarFromRegistry } from '@/utils/buildSidebarFromRegistry';
import { createPermissionSnapshot } from '@/types/permission-snapshot.types';

type PermissionSnapshotUserLike = Parameters<typeof createPermissionSnapshot>[0];
type UserLike = PermissionSnapshotUserLike & {
  allowedApps?: string[];
  appAccess?: Array<{
    appKey?: string;
    status?: string;
  }>;
};

export type BuildSidebarForSessionResult = {
  structure: SidebarStructure;
  entitlementScopedRegistry: AppRegistry;
};

type NormalizedUserAppAccess = {
  allowedAppKeys: Set<string>;
  hasExplicitUserAppAccessData: boolean;
};

function normalizeUserAppAccess(user: UserLike): NormalizedUserAppAccess {
  const allowedAppKeys = new Set<string>();
  const normalizedAllowedApps = Array.isArray(user?.allowedApps) ? user.allowedApps : [];

  for (const app of normalizedAllowedApps) {
    if (typeof app !== 'string') continue;
    const appKey = app.trim().toUpperCase();
    if (appKey) allowedAppKeys.add(appKey);
  }

  const normalizedAppAccess = Array.isArray(user?.appAccess) ? user.appAccess : [];
  for (const access of normalizedAppAccess) {
    if (!access || typeof access !== 'object') continue;
    const appKey = typeof access.appKey === 'string' ? access.appKey.trim().toUpperCase() : '';
    if (!appKey) continue;
    const status = String(access.status || 'ACTIVE').toUpperCase();
    if (status === 'ACTIVE') {
      allowedAppKeys.add(appKey);
    }
  }

  return {
    allowedAppKeys,
    hasExplicitUserAppAccessData: normalizedAllowedApps.length > 0 || normalizedAppAccess.length > 0,
  };
}

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
  const { allowedAppKeys, hasExplicitUserAppAccessData } = normalizeUserAppAccess(user);

  const entitlementScopedRegistry = Object.fromEntries(
    Object.entries(registry).filter(([appKey]) => {
      if (String(appKey).toUpperCase() === 'PLATFORM') return true;
      if (hasExplicitUserAppAccessData) {
        return allowedAppKeys.has(String(appKey).toUpperCase());
      }
      // Legacy fallback: if explicit app access is missing in session payload,
      // use existing entitlement helper so older users do not lose navigation.
      return hasAppAccess(appKey);
    })
  ) as AppRegistry;

  const snapshot = createPermissionSnapshot(user);
  const structure = await buildSidebarFromRegistry(entitlementScopedRegistry, snapshot);

  const hasSalesUserAccess = hasExplicitUserAppAccessData
    ? allowedAppKeys.has('SALES')
    : hasAppAccess('SALES');
  if (!hasSalesUserAccess) {
    structure.coreModules = [];
  }

  return { structure, entitlementScopedRegistry };
}
