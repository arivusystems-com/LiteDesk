/**
 * ============================================================================
 * ORGANIZATIONSURFACE DATA CONTRACT
 * ============================================================================
 * 
 * This type defines the STRICT data contract for OrganizationSurface UI.
 * 
 * IMPORTANT: This is a PROJECTION, not a model.
 * - Backend responses MUST be mapped to this shape before reaching the UI
 * - This type enforces the boundary between platform data and UX
 * - It prevents platform/tenant fields from leaking into business context
 * 
 * See docs/architecture/organization-surface-invariants.md for the architectural
 * rules that this contract enforces.
 * 
 * ============================================================================
 */

/**
 * Primary contact reference (minimal identity only)
 */
export interface PrimaryContactReference {
  id: string;
  displayName: string; // e.g., "John Doe" or "Jane Smith"
}

/**
 * People preview item (for preview lists)
 */
export interface PeoplePreview {
  id: string;
  name: string; // Full name or display name
  role?: string; // Role/title if available
}

/**
 * App participation summary
 * Shows which apps have work associated with this organization
 */
export interface AppParticipation {
  appKey: string; // 'SALES', 'HELPDESK', 'AUDIT', etc.
  hasWork: boolean; // Whether any work exists for this app
  counts?: {
    [workType: string]: number; // e.g., { deals: 5, tickets: 12 }
  };
}

/**
 * Activity log entry (read-only, for timeline display)
 */
export interface ActivityEntry {
  timestamp: Date | string; // ISO date string or Date object
  user: string; // User display name
  userId?: string; // User ID (optional)
  action: string; // Action type (e.g., "created", "updated", "status_changed")
  summary: string; // Human-readable summary
  personId?: string; // Person ID if activity involves a person (optional)
  personName?: string; // Person name if activity involves a person (optional)
}

/**
 * OrganizationSurfaceData
 * 
 * The ONLY allowed data shape for OrganizationSurface UI.
 * 
 * This type represents a BUSINESS ORGANIZATION (isTenant: false) as a
 * contextual surface. It excludes all platform/tenant concerns.
 * 
 * Structural Sections (aligned with organization-surface-invariants.md):
 * 1. Header (business identity) - id, name, industry, types, status fields, primaryContact
 * 2. People linked to the organization - peopleCount, peoplePreview
 * 3. Work grouped by app - apps (app participation)
 * 4. Business details (progressive disclosure) - website, phone, address, annualRevenue, numberOfEmployees
 * 5. Activity timeline - recentActivity
 */
export interface OrganizationSurfaceData {
  // ==========================================================================
  // IDENTITY / HEADER
  // ==========================================================================
  
  /** Organization ID */
  id: string;
  
  /** Organization name */
  name: string;
  
  /** Industry classification */
  industry?: string;
  
  /** Organization types (Customer, Partner, Vendor, Distributor, Dealer) */
  types?: string[];
  
  /** Customer status (if type includes 'Customer') */
  customerStatus?: 'Active' | 'Prospect' | 'Churned' | 'Lead Customer';
  
  /** Partner status (if type includes 'Partner') */
  partnerStatus?: 'Active' | 'Onboarding' | 'Inactive';
  
  /** Vendor status (if type includes 'Vendor') */
  vendorStatus?: 'Approved' | 'Pending' | 'Suspended';
  
  /** Primary contact reference (id + display name only) */
  primaryContact?: PrimaryContactReference;
  
  // ==========================================================================
  // RELATIONSHIPS
  // ==========================================================================
  
  /** Total count of people linked to this organization */
  peopleCount: number;
  
  /** Preview list of people (small list for display) */
  peoplePreview: PeoplePreview[];
  
  // ==========================================================================
  // APP PARTICIPATION (read-only, grouped by app)
  // ==========================================================================
  
  /** Apps that have work associated with this organization */
  apps: AppParticipation[];
  
  // ==========================================================================
  // BUSINESS DETAILS (progressive disclosure)
  // ==========================================================================
  
  /** Website URL */
  website?: string;
  
  /** Phone number */
  phone?: string;
  
  /** Physical address */
  address?: string;
  
  /** Annual revenue */
  annualRevenue?: number;
  
  /** Number of employees */
  numberOfEmployees?: number;
  
  // ==========================================================================
  // ACTIVITY
  // ==========================================================================
  
  /** Recent activity entries (for timeline display) */
  recentActivity: ActivityEntry[];
}

/**
 * ============================================================================
 * EXPLICIT EXCLUSIONS
 * ============================================================================
 * 
 * The following fields are EXPLICITLY EXCLUDED from OrganizationSurfaceData
 * because they are platform/tenant concerns, not business context:
 * 
 * EXCLUDED FIELDS:
 * 
 * - subscription: Subscription and billing information (tenant-only)
 *   WHY: OrganizationSurface shows business context, not platform configuration
 * 
 * - enabledApps: App enablement for tenant organization (tenant-only)
 *   WHY: This is workspace configuration, not business organization data
 * 
 * - limits: Usage limits for tenant organization (tenant-only)
 *   WHY: Platform resource constraints, not business information
 * 
 * - security: Security configuration for tenant organization (tenant-only)
 *   WHY: Platform security settings, not business context
 * 
 * - database: Database configuration (tenant-only, infrastructure)
 *   WHY: Infrastructure details, not business information
 * 
 * - crmInitialized: CRM initialization flag (tenant-only, internal)
 *   WHY: Internal platform state, not business data
 * 
 * - moduleOverrides: Module participation overrides (tenant-only, configuration)
 *   WHY: Platform configuration, not business context
 * 
 * - integrations: Integration state (tenant-only, platform configuration)
 *   WHY: Platform integration settings, not business information
 * 
 * - settings: Organization settings (tenant-only, workspace configuration)
 *   WHY: Workspace preferences, not business organization data
 * 
 * - isTenant: Tenant flag (platform-only, should never be true for business orgs)
 *   WHY: This flag distinguishes tenant vs business orgs; business orgs are isTenant: false
 * 
 * - slug: Workspace slug (tenant-only, URL identifier)
 *   WHY: Platform URL identifier, not business information
 * 
 * - createdBy: Creator user reference (system field, not business context)
 *   WHY: System audit field, not part of business identity
 * 
 * - assignedTo: Assigned user reference (work assignment, not business context)
 *   WHY: Work assignment field, not part of business identity
 * 
 * - accountManager: Account manager reference (work assignment, not business context)
 *   WHY: Work assignment field, not part of business identity
 * 
 * - timestamps (createdAt, updatedAt): System timestamps (system fields)
 *   WHY: System audit fields, not business information
 * 
 * - activityLogs: Full activity logs (system field, use recentActivity instead)
 *   WHY: Use recentActivity projection instead of raw activityLogs
 * 
 * - legacyOrganizationId: Migration field (system field)
 *   WHY: Internal migration field, not business data
 * 
 * These exclusions ensure that OrganizationSurface NEVER displays platform
 * configuration or tenant management concerns. It is purely a business context
 * surface for customers, partners, vendors, etc.
 * 
 * ============================================================================
 */
