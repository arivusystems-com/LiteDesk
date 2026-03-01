/**
 * ============================================================================
 * ORGANIZATIONSURFACE MAPPER
 * ============================================================================
 * 
 * Maps Organization model to OrganizationSurfaceData projection.
 * 
 * IMPORTANT: This is a STRICT projection that:
 * - Only includes business organization fields
 * - Explicitly excludes platform/tenant fields
 * - Never spreads the org document
 * - Never exposes tenant/platform concerns
 * 
 * See client/src/types/organizationSurface.types.ts for the target type.
 * See docs/architecture/organization-surface-invariants.md for rules.
 * 
 * ============================================================================
 */

/**
 * Map Organization document to OrganizationSurfaceData projection
 * 
 * @param {Object} orgDoc - Organization Mongoose document (must be business org, isTenant: false)
 * @param {Object} relatedData - Related data needed for surface
 * @param {number} relatedData.peopleCount - Total count of people linked to org
 * @param {Array} relatedData.peoplePreview - Preview list of people (id, name, role)
 * @param {Array} relatedData.apps - App participation summary
 * @param {Array} relatedData.recentActivity - Recent activity entries (limited)
 * @returns {Object} OrganizationSurfaceData projection
 */
function mapOrganizationToSurface(orgDoc, relatedData = {}) {
  // SAFETY: Never spread orgDoc - explicitly map only allowed fields
  // This prevents accidental exposure of platform/tenant fields
  
  const org = orgDoc.toObject ? orgDoc.toObject() : orgDoc;
  
  // Map primary contact if it exists (populated or as ID)
  let primaryContact = undefined;
  if (org.primaryContact) {
    if (typeof org.primaryContact === 'object' && org.primaryContact._id) {
      // Populated primary contact
      const contact = org.primaryContact;
      primaryContact = {
        id: contact._id.toString(),
        displayName: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email || 'Unknown',
        email: contact.email || undefined
      };
    } else if (typeof org.primaryContact === 'string' || org.primaryContact._id) {
      // Just an ID - would need to be populated separately
      // For now, leave undefined if not populated
      primaryContact = undefined;
    }
  }
  
  // Build the projection - ONLY allowed fields
  // 
  // EXPLICIT EXCLUSIONS (these fields are NEVER included):
  // - subscription: Tenant-only subscription/billing info
  // - enabledApps: Tenant-only app enablement
  // - limits: Tenant-only usage limits
  // - security: Tenant-only security configuration
  // - database: Tenant-only database configuration
  // - crmInitialized: Internal platform state
  // - moduleOverrides: Tenant-only module configuration
  // - integrations: Tenant-only integration state
  // - settings: Tenant-only workspace settings
  // - isTenant: Platform flag (should never be true for business orgs)
  // - slug: Tenant-only workspace identifier
  // - createdBy: System audit field
  // - assignedTo: Work assignment field
  // - accountManager: Work assignment field
  // - timestamps (createdAt, updatedAt): System audit fields
  // - activityLogs: Raw activity logs (use recentActivity projection instead)
  // - legacyOrganizationId: Migration field
  //
  // These exclusions ensure OrganizationSurface NEVER displays platform
  // configuration or tenant management concerns.
  
  const projection = {
    // ==========================================================================
    // IDENTITY / HEADER
    // ==========================================================================
    id: org._id.toString(),
    name: org.name || '',
    industry: org.industry || undefined,
    types: Array.isArray(org.types) ? org.types : undefined,
    customerStatus: org.customerStatus || undefined,
    partnerStatus: org.partnerStatus || undefined,
    vendorStatus: org.vendorStatus || undefined,
    primaryContact: primaryContact,
    
    // ==========================================================================
    // RELATIONSHIPS
    // ==========================================================================
    peopleCount: relatedData.peopleCount || 0,
    peoplePreview: Array.isArray(relatedData.peoplePreview) ? relatedData.peoplePreview : [],
    
    // ==========================================================================
    // APP PARTICIPATION
    // ==========================================================================
    apps: Array.isArray(relatedData.apps) ? relatedData.apps : [],
    
    // ==========================================================================
    // BUSINESS DETAILS
    // ==========================================================================
    website: org.website || undefined,
    phone: org.phone || undefined,
    address: org.address || undefined,
    annualRevenue: typeof org.annualRevenue === 'number' ? org.annualRevenue : undefined,
    numberOfEmployees: typeof org.numberOfEmployees === 'number' ? org.numberOfEmployees : undefined,
    
    // ==========================================================================
    // ACTIVITY
    // ==========================================================================
    recentActivity: Array.isArray(relatedData.recentActivity) ? relatedData.recentActivity : []
  };
  
  // Remove undefined optional fields for cleaner response
  Object.keys(projection).forEach(key => {
    if (projection[key] === undefined) {
      delete projection[key];
    }
  });
  
  return projection;
}

module.exports = {
  mapOrganizationToSurface
};
