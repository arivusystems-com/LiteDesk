/**
 * ============================================================================
 * CANONICAL EVENT PERMISSION MODEL (UI-FACING EXPLANATION ONLY)
 * ============================================================================
 * 
 * See docs/architecture/event-domain-contract.md
 * 
 * This file defines a UI-facing explanation model only.
 * It does NOT enforce permissions or mutate event state.
 * 
 * Purpose:
 * - Provide a unified, normalized representation of event action permissions
 * - Support read-only explanation in EventExecutionSurface.vue
 * - Explain why actions are available or unavailable
 * 
 * This model:
 * - MUST NOT enforce permissions
 * - MUST NOT block actions
 * - MUST NOT mutate event state
 * - MUST ONLY explain permissions
 * 
 * ============================================================================
 */

export type EventAction =
  | 'START_EXECUTION'
  | 'COMPLETE_EXECUTION'
  | 'CANCEL_EXECUTION'
  | 'AUDIT_CHECK_IN'
  | 'AUDIT_SUBMIT';

export interface EventActionPermission {
  action: EventAction;
  allowed: boolean;
  reason?: string;
}
