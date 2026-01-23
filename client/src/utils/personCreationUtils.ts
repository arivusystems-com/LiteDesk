/**
 * ============================================================================
 * PERSON CREATION UTILITIES
 * ============================================================================
 * 
 * Utilities for building and working with Person creation intent context.
 * 
 * ============================================================================
 */

import type { CreatePersonIntentContext, AppKey, ParticipationType, FieldKey } from '@/types/personCreation.types';

/**
 * Intent mapping definition
 * 
 * Maps intent IDs to their configuration.
 */
export interface IntentMapping {
  id: string;
  label: string;
  description: string;
  appKey: AppKey;
  participationType: ParticipationType;
}

/**
 * Default intent mappings
 * 
 * These match the intent mappings in PeopleCreate.vue
 */
export const DEFAULT_INTENT_MAPPINGS: IntentMapping[] = [
  { id: 'sales-lead', label: 'Add Sales Lead', description: 'Add as a Sales Lead', appKey: 'SALES', participationType: 'LEAD' },
  { id: 'sales-contact', label: 'Add Sales Contact', description: 'Add as a Sales Contact', appKey: 'SALES', participationType: 'CONTACT' },
  { id: 'support-contact', label: 'Add Support Contact', description: 'Add as a Support Contact', appKey: 'HELPDESK', participationType: 'CONTACT' },
  { id: 'audit-member', label: 'Add Audit Member', description: 'Add as an Audit Member', appKey: 'AUDIT', participationType: 'MEMBER' },
  { id: 'portal-user', label: 'Add Portal User', description: 'Add as a Portal User', appKey: 'PORTAL', participationType: 'USER' },
  { id: 'project-member', label: 'Add Project Member', description: 'Add as a Project Member', appKey: 'PROJECTS', participationType: 'MEMBER' }
];

/**
 * Build intent context from intent mapping
 * 
 * Creates a CreatePersonIntentContext from an intent mapping.
 * This is a simplified version that assumes:
 * - Core fields are standard identity fields
 * - App fields are determined by the app and participation type
 * 
 * For a full implementation, this should call the backend resolver
 * to get the actual field lists based on app context.
 * 
 * @param intentMapping - The intent mapping to build context from
 * @param coreFields - Core identity fields (defaults to standard fields)
 * @param appFields - App-specific fields by app key (defaults to empty)
 * @returns CreatePersonIntentContext
 */
export function buildIntentContext(
  intentMapping: IntentMapping,
  coreFields: FieldKey[] = ['first_name', 'last_name', 'email', 'phone', 'mobile', 'source'],
  appFields: Record<AppKey, FieldKey[]> = {},
  excludedFields: FieldKey[] = ['type'] // STEP 1: Default excluded fields (structural fields)
): CreatePersonIntentContext {
  return {
    intentKey: intentMapping.id,
    intentLabel: intentMapping.label,
    participatingApps: [intentMapping.appKey],
    participationType: intentMapping.participationType,
    coreFields,
    appFields: {
      [intentMapping.appKey]: appFields[intentMapping.appKey] || []
    },
    excludedFields // STEP 1: Include excluded fields in intent context
  };
}

/**
 * Find intent mapping by ID
 * 
 * @param intentId - The intent ID to find
 * @returns IntentMapping or null if not found
 */
export function findIntentMapping(intentId: string): IntentMapping | null {
  return DEFAULT_INTENT_MAPPINGS.find(m => m.id === intentId) || null;
}

/**
 * Get participating apps for an intent
 * 
 * This function maps an intent to its participating apps.
 * It uses the same intent → app mapping used in command palette creation.
 * 
 * STEP 1: Normalize app keys (MANDATORY)
 * Always returns canonical uppercase app keys matching field metadata.
 * 
 * @param intent - The intent (can be IntentMapping, CreatePersonIntentContext, or intent ID string)
 * @returns Array of app keys (e.g., ['SALES'], ['HELPDESK']) - ALWAYS UPPERCASE
 */
export function getAppsForIntent(intent: IntentMapping | CreatePersonIntentContext | string | null): AppKey[] {
  if (!intent) return [];
  
  let apps: AppKey[] = [];
  
  // Handle string (intent ID)
  if (typeof intent === 'string') {
    const mapping = findIntentMapping(intent);
    apps = mapping ? [mapping.appKey] : [];
  }
  // Handle CreatePersonIntentContext
  else if ('participatingApps' in intent && Array.isArray(intent.participatingApps)) {
    apps = intent.participatingApps;
  }
  // Handle IntentMapping
  else if ('appKey' in intent) {
    apps = [intent.appKey];
  }
  
  // Normalize to uppercase (canonical form matching field metadata)
  return apps.map(app => app.toUpperCase() as AppKey).filter(Boolean);
}
