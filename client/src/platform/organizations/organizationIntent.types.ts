/**
 * ORGANIZATION INTENT CONFIGURATION - TYPES
 * 
 * ARCHITECTURAL PURPOSE:
 * This file defines TypeScript interfaces for Organization Intent Definitions.
 * 
 * IMPORTANT: This is a CONFIGURATION LAYER ONLY.
 * - It does NOT create organizations
 * - It does NOT enforce backend validation rules
 * - It does NOT modify existing create/edit behavior
 * 
 * PURPOSE:
 * This configuration exists to drive UI intent & status visibility.
 * It provides a canonical mapping between:
 * - Organization types (Customer, Vendor, Partner, etc.)
 * - Allowed lifecycle statuses for each type
 * - Default status values
 * - Editability rules for create vs. edit contexts
 * 
 * USAGE:
 * This configuration is read-only and serves as the source of truth
 * for which statuses should be visible/selectable in the UI based on
 * the organization types selected.
 */

/**
 * Defines the intent configuration for a specific organization type pattern.
 * 
 * An intent maps one or more organization types to:
 * - The statuses that should be visible/selectable
 * - The default status to use when creating organizations
 * - Whether status can be set during create vs. edit
 */
export interface OrganizationIntentDefinition {
  /** Unique identifier for this intent (e.g. 'customer', 'vendor') */
  key: string;
  
  /** Human-readable label for this intent */
  label: string;
  
  /** Organization types this intent applies to (e.g. ['Customer']) */
  organizationTypes: string[];
  
  /** Statuses that are visible/selectable for this intent */
  allowedStatuses: string[];
  
  /** Default status to use when creating organizations with these types */
  defaultStatus: string;
  
  /** Whether status can be set/changed during organization creation */
  editableInCreate: boolean;
  
  /** Whether status can be changed after organization is created */
  editableInEdit: boolean;
}
