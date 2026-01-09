/**
 * ============================================================================
 * Phase 0I: Provisioning Intents (Metadata Only)
 * ============================================================================
 * 
 * Defines provisioning intent metadata.
 * 
 * These constants describe what should happen during provisioning,
 * but contain NO execution logic.
 * 
 * No automation, no workflows — just declared intent.
 * ============================================================================
 */

module.exports = {
  DEMO_TO_TRIAL: {
    source: 'DEMO_REQUEST',
    targetStatus: 'TRIAL',
    creates: ['INSTANCE', 'ORGANIZATION', 'OWNER_USER'],
    initializes: ['TenantAppConfiguration', 'Subscription']
  }
};

