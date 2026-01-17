/**
 * ============================================================================
 * MOMENTUM SIGNAL INTERFACE
 * ============================================================================
 * 
 * Canonical shape for a Momentum signal.
 * 
 * All signals, regardless of source (derived locally or from API),
 * must conform to this interface.
 * 
 * ============================================================================
 */

import type { MomentumSeverity, MomentumCategory, ActionIntent } from './momentumTypes';
import { MOMENTUM_SIGNAL_TYPES } from './momentumTypes';

/**
 * Canonical Momentum Signal
 * 
 * This is the normalized shape all signals must conform to.
 * 
 * Fields:
 * - id: Unique identifier for this specific signal instance
 * - type: Reference to the signal type definition (MomentumSignalType.id)
 * - severity: Actual severity (may differ from type's defaultSeverity)
 * - category: Category/domain (from signal type)
 * - message: Human-readable message (plain language)
 * - action: Suggested action (label + intent, not implementation)
 * - context: Where this signal applies (appKey or participationId)
 * - timestamp: When this signal was generated/observed (optional)
 */
export interface MomentumSignal {
  /** Unique identifier for this signal instance */
  id: string;
  
  /** Signal type identifier (references MomentumSignalType.id) */
  type: string;
  
  /** Actual severity level */
  severity: MomentumSeverity;
  
  /** Category/domain */
  category: MomentumCategory;
  
  /** Human-readable message (plain language) */
  message: string;
  
  /** Suggested action */
  action: {
    /** Action label (what to show user) */
    label: string;
    
    /** Action intent (what kind of action) */
    intent: ActionIntent;
    
    /** Optional href for navigation */
    href: string | null;
    
    /** Optional handler function (for local actions) */
    handler: (() => void) | null;
  };
  
  /** Context: appKey or participationId where this signal applies */
  context: string;
  
  /** Timestamp when signal was generated/observed (optional) */
  timestamp?: Date | string;
}

/**
 * Create a normalized MomentumSignal from a signal type and data
 * 
 * This function applies interpretation (severity, category, intent) from
 * the signal type definition, ensuring consistency across the system.
 */
export function createMomentumSignal(
  typeId: string,
  message: string,
  context: string,
  actionLabel: string,
  options?: {
    severity?: MomentumSeverity;
    actionIntent?: ActionIntent;
    href?: string | null;
    handler?: (() => void) | null;
    timestamp?: Date | string;
  }
): MomentumSignal {
  // Get signal type definition (interpretation comes from here)
  const signalType = MOMENTUM_SIGNAL_TYPES[typeId];
  
  if (!signalType) {
    throw new Error(`Unknown signal type: ${typeId}. Available types: ${Object.keys(MOMENTUM_SIGNAL_TYPES).join(', ')}`);
  }
  
  // Generate unique ID for this signal instance
  const id = `${typeId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id,
    type: typeId,
    // Use provided severity or fall back to signal type's default
    severity: options?.severity || signalType.defaultSeverity,
    // Category always comes from signal type (not overridable)
    category: signalType.category,
    message,
    action: {
      label: actionLabel,
      // Use provided intent or fall back to signal type's default
      intent: options?.actionIntent || signalType.actionIntent,
      href: options?.href ?? null,
      handler: options?.handler ?? null
    },
    context,
    timestamp: options?.timestamp
  };
}

