/**
 * ============================================================================
 * MOMENTUM TYPE SYSTEM
 * ============================================================================
 * 
 * Defines the semantic contract for Momentum signals.
 * 
 * This module establishes the language and structure of Momentum without
 * any UI concerns or business logic.
 * 
 * ============================================================================
 */

/**
 * Momentum Severity Levels
 * 
 * Defines how urgent or important a signal is.
 */
export type MomentumSeverity = 'critical' | 'warning' | 'info';

/**
 * Momentum Categories
 * 
 * Groups signals by their domain or concern area.
 */
export type MomentumCategory = 'compliance' | 'engagement' | 'progress' | 'risk' | 'system';

/**
 * Action Intent
 * 
 * Describes what kind of action a signal implies, not the implementation.
 */
export type ActionIntent = 
  | 'review'      // Requires review/verification
  | 'update'      // Requires data update
  | 'engage'      // Requires engagement/outreach
  | 'investigate' // Requires investigation
  | 'view';       // Requires viewing details

/**
 * Momentum Signal Type Definition
 * 
 * Each signal type declares its semantic properties.
 * This drives interpretation (severity, category, intent) rather than
 * hardcoding these values in derivation or UI logic.
 */
export interface MomentumSignalType {
  /** Stable identifier for this signal type */
  id: string;
  
  /** Default severity level */
  defaultSeverity: MomentumSeverity;
  
  /** Category/domain this signal belongs to */
  category: MomentumCategory;
  
  /** Human-readable, plain language description */
  shortDescription: string;
  
  /** What kind of action this signal implies */
  actionIntent: ActionIntent;
}

/**
 * Momentum Signal Type Registry
 * 
 * All known signal types are defined here.
 * 
 * To add a new signal type:
 * 1. Define it here with stable id
 * 2. Use the id in derivation logic
 * 3. Interpretation (severity, category, intent) comes from this definition
 */
export const MOMENTUM_SIGNAL_TYPES: Record<string, MomentumSignalType> = {
  // Compliance Signals
  DO_NOT_CONTACT_FLAG: {
    id: 'do_not_contact_flag',
    defaultSeverity: 'critical',
    category: 'compliance',
    shortDescription: 'Person has requested not to be contacted',
    actionIntent: 'review'
  },
  
  CONTACT_DO_NOT_CONTACT_STATUS: {
    id: 'contact_do_not_contact_status',
    defaultSeverity: 'warning',
    category: 'compliance',
    shortDescription: 'Contact status is set to Do Not Contact',
    actionIntent: 'review'
  },
  
  // Engagement Signals
  NO_ACTIVITY_STALE: {
    id: 'no_activity_stale',
    defaultSeverity: 'warning',
    category: 'engagement',
    shortDescription: 'No activity recorded in extended period',
    actionIntent: 'engage'
  },
  
  RECENTLY_UPDATED: {
    id: 'recently_updated',
    defaultSeverity: 'info',
    category: 'engagement',
    shortDescription: 'Recently updated or active',
    actionIntent: 'view'
  },
  
  // Progress Signals
  LEAD_STATUS_MISSING: {
    id: 'lead_status_missing',
    defaultSeverity: 'info',
    category: 'progress',
    shortDescription: 'Lead status has not been set',
    actionIntent: 'update'
  },
  
  MISSING_REQUIRED_FIELDS: {
    id: 'missing_required_fields',
    defaultSeverity: 'critical',
    category: 'progress',
    shortDescription: 'Missing required participation fields',
    actionIntent: 'update'
  },
  
  LEAD_READY_FOR_CONVERSION: {
    id: 'lead_ready_for_conversion',
    defaultSeverity: 'info',
    category: 'progress',
    shortDescription: 'Lead is ready to be converted to Contact',
    actionIntent: 'update'
  },
  
  STALE_PARTICIPATION: {
    id: 'stale_participation',
    defaultSeverity: 'warning',
    category: 'engagement',
    shortDescription: 'No recent activity on this participation',
    actionIntent: 'engage'
  },
  
  DETACHED_REATTACHABLE: {
    id: 'detached_reattachable',
    defaultSeverity: 'info',
    category: 'progress',
    shortDescription: 'Person was previously part of this app',
    actionIntent: 'update'
  }
};

/**
 * Get signal type by ID
 */
export function getSignalType(id: string): MomentumSignalType | undefined {
  return MOMENTUM_SIGNAL_TYPES[id];
}

/**
 * Get all signal types for a category
 */
export function getSignalTypesByCategory(category: MomentumCategory): MomentumSignalType[] {
  return Object.values(MOMENTUM_SIGNAL_TYPES).filter(
    type => type.category === category
  );
}

