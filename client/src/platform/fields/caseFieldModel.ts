import type {
  BaseFieldMetadata,
  BaseFieldOwner,
  BaseFieldIntent,
  BaseFieldScope,
  BaseFilterType,
} from './BaseFieldModel';
import {
  validateBaseFieldMetadata,
  classifyFieldBase,
  normalizeFieldKeyForMetadataLookup,
} from './BaseFieldModel';

export type CaseFieldOwner = BaseFieldOwner;
export type CaseFieldIntent = BaseFieldIntent;
export type CaseFieldScope = BaseFieldScope;
export type CaseFilterType = BaseFilterType;

export interface CaseFieldMetadata extends BaseFieldMetadata {}

export const CASE_FIELD_METADATA: Record<string, CaseFieldMetadata> = {
  // System and audit fields
  organizationId: { owner: 'system', intent: 'system', fieldScope: 'CORE', editable: false, isProtected: true, isSystem: true, isVisibleInConfig: false },
  createdBy: { owner: 'system', intent: 'system', fieldScope: 'CORE', editable: false, isSystem: true, isVisibleInConfig: true },
  updatedBy: { owner: 'system', intent: 'system', fieldScope: 'CORE', editable: false, isSystem: true, isVisibleInConfig: true },
  createdAt: { owner: 'system', intent: 'system', fieldScope: 'CORE', editable: false, isSystem: true, isVisibleInConfig: true },
  updatedAt: { owner: 'system', intent: 'system', fieldScope: 'CORE', editable: false, isSystem: true, isVisibleInConfig: true },
  _id: { owner: 'system', intent: 'system', fieldScope: 'CORE', editable: false, isSystem: true, isVisibleInConfig: false },
  __v: { owner: 'system', intent: 'system', fieldScope: 'CORE', editable: false, isSystem: true, isVisibleInConfig: false },
  deletedAt: { owner: 'system', intent: 'system', fieldScope: 'CORE', editable: false, isSystem: true, isVisibleInConfig: false },
  deletedBy: { owner: 'system', intent: 'system', fieldScope: 'CORE', editable: false, isSystem: true, isVisibleInConfig: false },
  deletionReason: { owner: 'system', intent: 'system', fieldScope: 'CORE', editable: false, isSystem: true, isVisibleInConfig: false },
  currentSlaCycle: { owner: 'system', intent: 'system', fieldScope: 'CORE', editable: false, isSystem: true, isVisibleInConfig: true },
  slaCycles: { owner: 'system', intent: 'system', fieldScope: 'CORE', editable: false, isSystem: true, isVisibleInConfig: true },
  activities: { owner: 'system', intent: 'system', fieldScope: 'CORE', editable: false, isSystem: true, isVisibleInConfig: true },
  assignmentControl: { owner: 'system', intent: 'system', fieldScope: 'CORE', editable: false, isSystem: true, isVisibleInConfig: true },
  source: { owner: 'system', intent: 'system', fieldScope: 'CORE', editable: false, isSystem: true, isVisibleInConfig: true },

  // Core case fields
  caseId: { owner: 'core', intent: 'identity', fieldScope: 'CORE', editable: false, isProtected: true, filterable: true, filterType: 'text' },
  title: { owner: 'core', intent: 'primary', fieldScope: 'CORE', editable: true, allowOnCreate: true, isProtected: true, filterable: true, filterType: 'text' },
  caseType: { owner: 'core', intent: 'state', fieldScope: 'CORE', editable: true, allowOnCreate: true, isProtected: true, filterable: true, filterType: 'select' },
  priority: { owner: 'core', intent: 'state', fieldScope: 'CORE', editable: true, allowOnCreate: true, isProtected: true, filterable: true, filterType: 'select' },
  status: { owner: 'core', intent: 'state', fieldScope: 'CORE', editable: true, allowOnCreate: true, isProtected: true, filterable: true, filterType: 'select' },
  contactId: { owner: 'core', intent: 'detail', fieldScope: 'CORE', editable: true, allowOnCreate: true, filterable: true, filterType: 'entity' },
  organizationRefId: { owner: 'core', intent: 'detail', fieldScope: 'CORE', editable: true, allowOnCreate: true, filterable: true, filterType: 'entity' },
  caseOwnerId: { owner: 'core', intent: 'detail', fieldScope: 'CORE', editable: true, allowOnCreate: true, isProtected: true, filterable: true, filterType: 'user' },
  channel: { owner: 'core', intent: 'state', fieldScope: 'CORE', editable: true, allowOnCreate: true, filterable: true, filterType: 'select' },
  relatedItemIds: { owner: 'core', intent: 'detail', fieldScope: 'CORE', editable: true, allowOnCreate: false, filterable: true, filterType: 'entity' },
  caseNotes: { owner: 'core', intent: 'detail', fieldScope: 'CORE', editable: true, allowOnCreate: false },
  resolutionSummary: { owner: 'core', intent: 'detail', fieldScope: 'CORE', editable: true, allowOnCreate: false },
  customFields: { owner: 'core', intent: 'detail', fieldScope: 'CORE', editable: true, allowOnCreate: false },
};

function validateAllCaseMetadata(): void {
  for (const [fieldName, metadata] of Object.entries(CASE_FIELD_METADATA)) {
    validateBaseFieldMetadata(fieldName, metadata);
  }
}

validateAllCaseMetadata();

export function getCaseFieldMetadata(fieldName: string): CaseFieldMetadata | undefined {
  const normalizedName = normalizeFieldKeyForMetadataLookup(fieldName);
  if (CASE_FIELD_METADATA[fieldName]) return CASE_FIELD_METADATA[fieldName];

  for (const [key, metadata] of Object.entries(CASE_FIELD_METADATA)) {
    if (normalizeFieldKeyForMetadataLookup(key) === normalizedName) return metadata;
  }
  return undefined;
}

export function isCaseCoreField(fieldName: string): boolean {
  return getCaseFieldMetadata(fieldName)?.owner === 'core';
}

export function isCaseProtectedField(fieldName: string): boolean {
  return getCaseFieldMetadata(fieldName)?.isProtected === true;
}

export function getCoreCaseFields(): string[] {
  return Object.entries(CASE_FIELD_METADATA)
    .filter(([_, metadata]) => metadata.owner === 'core')
    .map(([fieldName]) => fieldName);
}

export function getCaseSystemFields(): string[] {
  return Object.entries(CASE_FIELD_METADATA)
    .filter(([_, metadata]) => metadata.owner === 'system')
    .map(([fieldName]) => fieldName);
}

export function getCaseParticipationFields(appKey: string): string[] {
  return Object.entries(CASE_FIELD_METADATA)
    .filter(([_, metadata]) => metadata.owner === 'participation' && metadata.fieldScope === appKey)
    .map(([fieldName]) => fieldName);
}

export function getCaseQuickCreateFields(): string[] {
  return Object.entries(CASE_FIELD_METADATA)
    .filter(([_, metadata]) =>
      metadata.allowOnCreate === true ||
      (metadata.owner === 'core' && metadata.intent === 'primary')
    )
    .map(([fieldName]) => fieldName);
}

export function classifyCaseField(fieldName: string): string {
  const metadata = getCaseFieldMetadata(fieldName);
  return classifyFieldBase(metadata as BaseFieldMetadata | undefined);
}

export function groupCaseFields(fieldKeys: string[]): {
  coreIdentity: string[];
  participation: Record<string, string[]>;
  system: string[];
} {
  const coreIdentity: string[] = [];
  const participation: Record<string, string[]> = {};
  const system: string[] = [];

  for (const fieldKey of fieldKeys) {
    const classification = classifyCaseField(fieldKey);
    if (classification === 'core') {
      coreIdentity.push(fieldKey);
      continue;
    }
    if (classification === 'system') {
      system.push(fieldKey);
      continue;
    }
    if (!participation[classification]) participation[classification] = [];
    participation[classification].push(fieldKey);
  }

  return { coreIdentity, participation, system };
}
