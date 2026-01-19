import type { SidebarStructure, SidebarItem } from '@/types/sidebar.types';

const ALLOWED_KINDS = new Set<SidebarItem['kind']>(['surface', 'identity', 'app', 'platform']);

const FORBIDDEN_RAW_ENTITY_MODULE_KEYS = new Set([
  'tasks',
  'events',
  'forms',
  'items',
  'organizations',
]);

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[SidebarInvariantViolation] ${message}`);
  }
}

/**
 * Dev-only guardrail for the locked sidebar doctrine.
 *
 * Validates:
 * - identity contains only People
 * - appNav contains only one app lens
 * - no items use kinds outside surface | identity | app | platform
 */
export function assertValidSidebarStructure(structure: SidebarStructure): void {
  invariant(structure !== null && typeof structure === 'object', 'SidebarStructure must be an object');

  const allItems: SidebarItem[] = [
    ...structure.shell,
    ...structure.identity,
    ...(structure.appNav.dashboard ? [structure.appNav.dashboard] : []),
    ...structure.appNav.modules,
    ...structure.platform,
  ];

  for (const item of allItems) {
    invariant(ALLOWED_KINDS.has(item.kind), `Invalid sidebar item kind: ${(item as any).kind}`);
  }

  // Identity: People only.
  for (const item of structure.identity) {
    invariant(item.kind === 'identity', 'Identity section must contain only identity items');
    invariant(item.id === 'people', `Identity item must be People only (got: ${item.id})`);
  }

  // App lens: exactly one active app context.
  invariant(
    structure.appNav.appId === structure.appSwitcher.activeAppId,
    `appNav.appId must match appSwitcher.activeAppId (${structure.appNav.appId} vs ${structure.appSwitcher.activeAppId})`
  );

  // AppNav must not leak raw entities.
  for (const item of structure.appNav.modules) {
    invariant(item.kind === 'app', 'appNav.modules must contain only app items');
    if (typeof item.moduleKey === 'string') {
      invariant(
        !FORBIDDEN_RAW_ENTITY_MODULE_KEYS.has(item.moduleKey),
        `Forbidden raw entity leaked into SidebarStructure: ${item.moduleKey}`
      );
    }
  }
}

