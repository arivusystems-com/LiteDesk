/**
 * ============================================================================
 * PERSON CREATION INTENT CONTEXT
 * ============================================================================
 * 
 * This type defines the STRICT contract for Person creation intent.
 * 
 * ARCHITECTURAL INTENT:
 * - Intent is selected ONCE and locked for the entire creation session
 * - Intent determines participating apps, visible fields, and required fields
 * - Quick Create and Full Form MUST share the same intent context
 * - Full Form is a data-entry mode, NOT a separate creation path
 * 
 * CRITICAL RULES:
 * - Intent cannot be changed mid-creation
 * - Full Form MUST receive intent context as a required prop
 * - If intent context is missing, this is a bug (throw/block rendering)
 * 
 * See: docs/architecture/people-creation-intent.md
 * 
 * ============================================================================
 */

/**
 * App key identifier
 * 
 * Identifies which application this person creation is for.
 * Examples: 'SALES', 'HELPDESK', 'AUDIT', 'PROJECTS', 'PORTAL'
 */
export type AppKey = string;

/**
 * Participation type
 * 
 * The type of participation within the app.
 * Examples: 'LEAD', 'CONTACT', 'MEMBER', 'USER'
 */
export type ParticipationType = string;

/**
 * Field key identifier
 * 
 * Identifies a field in the People module.
 * Examples: 'first_name', 'email', 'lead_status'
 */
export type FieldKey = string;

/**
 * Person Creation Intent Context
 * 
 * Represents the user's intent for creating a person.
 * This object MUST be produced ONLY by the Intent Selector.
 * 
 * Once created, this context is locked and cannot be changed.
 * Both Quick Create and Full Form use this same context.
 */
export interface CreatePersonIntentContext {
  /**
   * Intent key
   * 
   * Unique identifier for this intent.
   * Examples: 'sales-lead', 'sales-contact', 'support-contact'
   */
  intentKey: string;

  /**
   * Intent label
   * 
   * Human-readable label for display.
   * Examples: 'Add Sales Lead', 'Add Sales Contact'
   */
  intentLabel: string;

  /**
   * Participating apps
   * 
   * Array of app keys that this person will participate in.
   * Typically a single app, but can be multiple for complex scenarios.
   */
  participatingApps: AppKey[];

  /**
   * Participation type
   * 
   * The type of participation within the primary app.
   * Examples: 'LEAD', 'CONTACT', 'MEMBER', 'USER'
   */
  participationType: ParticipationType;

  /**
   * Core identity fields
   * 
   * Fields that are always shown (core identity fields).
   * These are platform-level fields, not app-specific.
   */
  coreFields: FieldKey[];

  /**
   * App-specific fields
   * 
   * Fields organized by app key.
   * Only fields for apps in participatingApps should be included.
   */
  appFields: Record<AppKey, FieldKey[]>;

  /**
   * Excluded fields (optional)
   * 
   * Structural fields that should not be rendered in creation forms.
   * Examples: 'sales_type' (SALES role is shown via badge / intent, not as a free field)
   * 
   * These fields are excluded from rendering but may still be set programmatically.
   */
  excludedFields?: FieldKey[];
}
