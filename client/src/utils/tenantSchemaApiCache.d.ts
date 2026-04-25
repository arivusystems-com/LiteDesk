/**
 * Types for `tenantSchemaApiCache.js` (in-memory cache for /settings/core-modules, /modules).
 */
export interface CoreModulesSettingsResponse {
  modules?: unknown[]
  [key: string]: unknown
}

export function fetchCoreModulesSettingsCached(): Promise<CoreModulesSettingsResponse>
export function fetchModulesListCached(params?: Record<string, unknown>): Promise<unknown>
export function invalidateTenantSchemaCaches(): void
