/**
 * FieldCapabilityEngine unit tests.
 * Verifies engine decisions align with BaseFieldModel behavior.
 * No UI rendering tests.
 */

import { describe, it, expect } from 'vitest';
import {
  isSystemField,
  isFieldVisibleInConfig,
  isComputedField,
  canEditField,
  canHideField,
} from '../../platform/fields/fieldCapabilityEngine';
import { getIsSystemBase, getIsEditableBase, getIsVisibleInConfigBase } from '../../platform/fields/BaseFieldModel';
import { getFieldMetadataFromRegistry } from '../../platform/fields/FieldRegistry';

function field(key: string) {
  return { key };
}

describe('FieldCapabilityEngine', () => {
  describe('_id', () => {
    it('isSystemField returns true', () => {
      expect(isSystemField('tasks', field('_id'))).toBe(true);
    });

    it('canEditField returns false', () => {
      expect(canEditField('tasks', field('_id'))).toBe(false);
    });

    it('isFieldVisibleInConfig returns false', () => {
      expect(isFieldVisibleInConfig('tasks', field('_id'))).toBe(false);
    });
  });

  describe('createdAt', () => {
    it('isSystemField returns true', () => {
      expect(isSystemField('tasks', field('createdAt'))).toBe(true);
    });

    it('canEditField returns false', () => {
      expect(canEditField('tasks', field('createdAt'))).toBe(false);
    });

    it('isFieldVisibleInConfig returns true', () => {
      expect(isFieldVisibleInConfig('tasks', field('createdAt'))).toBe(true);
    });
  });

  describe('derivedStatus', () => {
    it('isComputedField returns true', () => {
      expect(isComputedField('deal', field('derivedStatus'))).toBe(true);
    });

    it('canEditField returns false', () => {
      expect(canEditField('deal', field('derivedStatus'))).toBe(false);
    });
  });

  describe('Custom field (title)', () => {
    it('canEditField returns true', () => {
      expect(canEditField('tasks', field('title'))).toBe(true);
    });

    it('isSystemField returns false', () => {
      expect(isSystemField('tasks', field('title'))).toBe(false);
    });
  });

  describe('Cases: flattened nested paths under system objects', () => {
    it('isSystemField is true for assignmentControl leaf paths (list columns from schema)', () => {
      expect(isSystemField('cases', field('assignmentControl.lockReason'))).toBe(true);
      expect(isSystemField('case', field('assignmentControl.isLocked'))).toBe(true);
    });

    it('canEditField is false for those paths', () => {
      expect(canEditField('cases', field('assignmentControl.lockReason'))).toBe(false);
    });

    it('core case fields with dotted keys are not treated as system unless root is system', () => {
      expect(isSystemField('cases', field('title'))).toBe(false);
    });
  });

  describe('Unknown module', () => {
    it('safe fallback: isSystemField returns false', () => {
      expect(isSystemField('unknownModule', field('_id'))).toBe(false);
    });

    it('safe fallback: canEditField returns true (default editable for unknown)', () => {
      expect(canEditField('unknownModule', field('custom_xyz'))).toBe(true);
    });

    it('immutable id/audit: canEditField returns false even without registry metadata', () => {
      expect(canEditField('unknownModule', field('_id'))).toBe(false);
      expect(canEditField('unknownModule', field('createdAt'))).toBe(false);
      expect(canEditField('unknownModule', field('__v'))).toBe(false);
    });

    it('safe fallback: isFieldVisibleInConfig returns true when no metadata', () => {
      expect(isFieldVisibleInConfig('unknownModule', field('someField'))).toBe(true);
    });

    it('safe fallback: isComputedField returns false', () => {
      expect(isComputedField('unknownModule', field('derivedStatus'))).toBe(false);
    });

    it('safe fallback: canHideField returns true', () => {
      expect(canHideField('unknownModule', field('custom_xyz'))).toBe(true);
    });
  });

  describe('Engine aligns with BaseFieldModel behavior', () => {
    it('isSystemField matches getIsSystemBase', () => {
      const meta = getFieldMetadataFromRegistry('tasks', '_id');
      expect(isSystemField('tasks', field('_id'))).toBe(getIsSystemBase(meta));
    });

    it('isFieldVisibleInConfig matches getIsVisibleInConfigBase', () => {
      const meta = getFieldMetadataFromRegistry('tasks', 'createdAt');
      expect(isFieldVisibleInConfig('tasks', field('createdAt'))).toBe(
        getIsVisibleInConfigBase(meta, 'createdAt')
      );
    });

    it('canEditField returns false when getIsEditableBase returns false', () => {
      expect(canEditField('tasks', field('_id'))).toBe(false);
      const meta = getFieldMetadataFromRegistry('tasks', '_id');
      expect(getIsEditableBase(meta)).toBe(false);
    });

    it('canEditField returns true for editable core field', () => {
      expect(canEditField('tasks', field('title'))).toBe(true);
      const meta = getFieldMetadataFromRegistry('tasks', 'title');
      expect(getIsEditableBase(meta)).toBe(true);
    });
  });
});
