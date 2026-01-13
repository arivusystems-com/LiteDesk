/**
 * ============================================================================
 * Permission Visibility Outcomes
 * ============================================================================
 * Defines how permissions translate to UI visibility and interactivity.
 * - HIDDEN:   Not visible at all
 * - VISIBLE:  Visible but disabled (upsell/admin hint)
 * - ENABLED:  Visible and usable
 * ============================================================================
 */

export enum PermissionOutcome {
  HIDDEN = 'HIDDEN',
  VISIBLE = 'VISIBLE',
  ENABLED = 'ENABLED',
}

