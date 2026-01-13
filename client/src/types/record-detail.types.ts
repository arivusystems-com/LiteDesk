/**
 * Record Detail Definition Contract
 * 
 * Defines the structure for rendering record detail pages from the app registry.
 * This contract ensures consistent rendering across all modules.
 */

import { PermissionOutcome } from './permission-visibility.types';
import { EmptyStateDefinition } from './empty-state.types';

/**
 * Field data types for record detail fields
 */
export type FieldDataType =
  | 'text'
  | 'email'
  | 'phone'
  | 'url'
  | 'number'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'status'
  | 'user'
  | 'organization'
  | 'relation'
  | 'tags'
  | 'richText'
  | 'image'
  | 'file';

/**
 * Field display configuration
 */
export interface DetailField {
  key: string;
  label: string;
  dataType: FieldDataType;
  fieldPath?: string; // Path to field in record (e.g., 'owner_id.firstName')
  permission?: string; // Permission required to view this field
  visibility: PermissionOutcome; // Computed visibility based on permissions
  order?: number; // Display order
  format?: string; // Format string for dates, numbers, etc.
  options?: Array<{ value: string; label: string }>; // For dropdown/select fields
  readonly?: boolean; // Whether field can be edited inline
}

/**
 * Section grouping fields
 */
export interface DetailSection {
  key: string;
  label: string;
  fields: DetailField[];
  order?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

/**
 * Tab configuration for record detail
 */
export interface DetailTab {
  key: string;
  label: string;
  sections: DetailSection[];
  order?: number;
  count?: number; // Optional count badge (e.g., for related records)
  permission?: string; // Permission required to view this tab
  visibility: PermissionOutcome; // Computed visibility
}

/**
 * Action button in record detail header
 */
export interface DetailAction {
  key: string;
  label: string;
  type: 'edit' | 'delete' | 'duplicate' | 'export' | 'share' | 'custom';
  route?: string; // Route to navigate to (e.g., '/people/:id/edit')
  permission?: string; // Permission required for this action
  visibility: PermissionOutcome; // Computed visibility
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  icon?: string;
  order?: number;
}

/**
 * Related record widget configuration
 */
export interface RelatedRecordWidget {
  key: string;
  label: string;
  moduleKey: string; // Module key for related records (e.g., 'deals', 'tasks')
  relationshipType: 'one-to-many' | 'many-to-many' | 'many-to-one';
  route?: string; // Route pattern for viewing related records (e.g., '/deals/:id')
  permission?: string; // Permission required to view related records
  visibility: PermissionOutcome; // Computed visibility
  order?: number;
  limit?: number; // Max number of related records to show
}

/**
 * Complete record detail definition
 */
export interface RecordDetailDefinition {
  version: number;
  moduleKey: string;
  appKey: string;
  title: string; // Module title (e.g., 'Person', 'Deal')
  description?: string;
  
  // Header configuration
  header: {
    titleField: string; // Field to use as title (e.g., 'name', 'first_name')
    subtitleField?: string; // Field to use as subtitle
    avatarField?: string; // Field to use as avatar/image
    statusField?: string; // Field to use as status badge
  };
  
  // Tabs and sections
  tabs: DetailTab[];
  defaultTab?: string; // Default active tab key
  
  // Actions
  actions: DetailAction[];
  
  // Related records
  relatedRecords?: RelatedRecordWidget[];
  
  // Empty state
  emptyState?: EmptyStateDefinition;
  
  // Metadata
  editRoute?: string; // Route pattern for editing (e.g., '/people/:id/edit')
  deletePermission?: string; // Permission required to delete
}

/**
 * App registry entry for record detail configuration
 */
export interface AppRegistryDetailEntry {
  // Header
  header?: {
    titleField?: string;
    subtitleField?: string;
    avatarField?: string;
    statusField?: string;
  };
  
  // Fields configuration
  fields?: Array<{
    key: string;
    label: string;
    dataType: FieldDataType;
    fieldPath?: string;
    permission?: string;
    order?: number;
    format?: string;
    options?: Array<{ value: string; label: string }>;
    readonly?: boolean;
  }>;
  
  // Sections configuration
  sections?: Array<{
    key: string;
    label: string;
    fields: string[]; // Array of field keys
    order?: number;
    collapsible?: boolean;
    defaultCollapsed?: boolean;
  }>;
  
  // Tabs configuration
  tabs?: Array<{
    key: string;
    label: string;
    sections: string[]; // Array of section keys
    order?: number;
    permission?: string;
  }>;
  
  // Actions configuration
  actions?: Array<{
    key: string;
    label: string;
    type: 'edit' | 'delete' | 'duplicate' | 'export' | 'share' | 'custom';
    route?: string;
    permission?: string;
    variant?: 'primary' | 'secondary' | 'danger' | 'outline';
    icon?: string;
    order?: number;
  }>;
  
  // Related records configuration
  relatedRecords?: Array<{
    key: string;
    label: string;
    moduleKey: string;
    relationshipType: 'one-to-many' | 'many-to-many' | 'many-to-one';
    route?: string;
    permission?: string;
    order?: number;
    limit?: number;
  }>;
  
  // Routes
  editRoute?: string;
  deletePermission?: string;
  
  // Empty states
  emptyStates?: Record<string, EmptyStateDefinition>;
}

