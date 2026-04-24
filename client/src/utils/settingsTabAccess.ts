/**
 * Which Settings sidebar / landing cards a user may see, based on role permissions.
 * Owners and org "Admin" role keep full access; everyone else is limited to explicit settings.* flags.
 */
export function canAccessSettingsTab(
  tabId: string,
  ctx: { isOwner: boolean; role: string | null | undefined; permissions: Record<string, any> | null | undefined }
): boolean {
  if (ctx.isOwner) return true;
  if (String(ctx.role || '').toLowerCase() === 'admin') return true;

  const p = ctx.permissions?.settings || {};

  switch (tabId) {
    case 'organization':
      return Boolean(p.edit || p.view);
    case 'users-access':
      return Boolean(p.manageUsers);
    case 'core-modules':
      return Boolean(p.customizeFields || p.edit);
    case 'applications':
      return Boolean(p.edit);
    case 'subscriptions':
      return Boolean(p.manageBilling);
    case 'notifications':
      return Boolean(p.view || p.edit || p.manageUsers);
    case 'security':
      return Boolean(p.edit);
    case 'integrations':
      return Boolean(p.manageIntegrations || p.edit);
    case 'automation':
      // Same bar as application configuration: assignment routing affects operational behavior org-wide.
      return Boolean(p.edit);
    default:
      return false;
  }
}

const SETTINGS_TAB_IDS = [
  'organization',
  'users-access',
  'core-modules',
  'applications',
  'automation',
  'subscriptions',
  'notifications',
  'security',
  'integrations',
] as const;

/** True if the user should see the Settings entry or any settings section (not only Overview). */
export function hasAnySettingsAccess(ctx: {
  isOwner: boolean;
  role: string | null | undefined;
  permissions: Record<string, any> | null | undefined;
}): boolean {
  return SETTINGS_TAB_IDS.some((id) => canAccessSettingsTab(id, ctx));
}
