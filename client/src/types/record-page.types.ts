/**
 * Record Page primitives – app-agnostic types.
 * No business logic, no module-specific naming.
 */

export interface RecordStateSectionProps {
  heading?: string;
  enableLegacyFallback?: boolean;
  fields?: Array<{
    key: string;
    label: string;
    icon?: unknown;
    column?: 'left' | 'right';
    slotKey?: string;
    valueKey?: string;
  }>;
  fieldValues?: Record<string, string | null | undefined>;
  status?: string | null;
  owner?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  priority?: string | null;
  timeEstimate?: string | null;
  signals?: string[];
  nextActionHint?: string | null;
}

export interface RecordFieldGroup {
  label: string;
  key?: string;
}

export interface RecordActivityEvent {
  id: string;
  type: 'comment' | 'system' | 'attachment' | 'activity';
  createdAt?: string;
  [key: string]: unknown;
}

export interface RelatedRecordsGroup {
  label: string;
  key?: string;
  count?: number;
  open?: boolean;
}
