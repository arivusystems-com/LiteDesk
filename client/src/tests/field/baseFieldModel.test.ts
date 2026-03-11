/**
 * BaseFieldModel contract tests.
 * Tests fallback priority: explicit flag > owner === 'system' > default.
 */

import { describe, it, expect } from 'vitest';
import type { BaseFieldMetadata } from '../../platform/fields/BaseFieldModel';
import {
  getIsEditableBase,
  getIsVisibleInConfigBase,
  getIsSystemBase,
  getIsComputedBase,
  getIsHideableBase,
  isSystemFieldBase,
  isCoreFieldBase,
  isParticipationFieldBase,
  classifyFieldBase,
} from '../../platform/fields/BaseFieldModel';

function meta(overrides: Partial<BaseFieldMetadata> = {}): BaseFieldMetadata {
  const base: BaseFieldMetadata = {
    owner: 'core',
    intent: 'primary',
    fieldScope: 'CORE',
    editable: true,
  };
  return { ...base, ...overrides };
}

describe('BaseFieldModel helpers', () => {
  describe('getIsEditableBase - fallback priority', () => {
    it('explicit isEditable: false overrides everything', () => {
      const m = meta({ owner: 'core', editable: true, isEditable: false });
      expect(getIsEditableBase(m)).toBe(false);
    });

    it('explicit isEditable: false overrides owner system', () => {
      const m = meta({ owner: 'system', editable: false, isEditable: true });
      expect(getIsEditableBase(m)).toBe(true);
    });

    it('owner === "system" makes field non-editable if no explicit flag', () => {
      const m = meta({ owner: 'system', intent: 'system', fieldScope: 'CORE', editable: false });
      expect(getIsEditableBase(m)).toBe(false);
    });

    it('missing flags default to editable when editable: true', () => {
      const m = meta({ owner: 'core', editable: true });
      expect(getIsEditableBase(m)).toBe(true);
    });

    it('undefined metadata returns true (default)', () => {
      expect(getIsEditableBase(undefined)).toBe(true);
    });
  });

  describe('getIsVisibleInConfigBase', () => {
    it('isVisibleInConfig: false respected', () => {
      const m = meta({ isVisibleInConfig: false });
      expect(getIsVisibleInConfigBase(m, 'someField')).toBe(false);
    });

    it('isVisibleInConfig: true respected', () => {
      const m = meta({ isVisibleInConfig: true });
      expect(getIsVisibleInConfigBase(m, 'someField')).toBe(true);
    });

    it('infrastructure field _id returns false when not explicitly overridden', () => {
      const m = meta({ owner: 'system', intent: 'system', fieldScope: 'CORE', editable: false });
      expect(getIsVisibleInConfigBase(m, '_id')).toBe(false);
    });

    it('infrastructure field __v returns false', () => {
      const m = meta({ owner: 'system' });
      expect(getIsVisibleInConfigBase(m, '__v')).toBe(false);
    });

    it('infrastructure field organizationId returns false', () => {
      const m = meta({ owner: 'system' });
      expect(getIsVisibleInConfigBase(m, 'organizationId')).toBe(false);
    });

    it('undefined metadata returns true for non-infra keys', () => {
      expect(getIsVisibleInConfigBase(undefined, 'title')).toBe(true);
    });
  });

  describe('getIsSystemBase', () => {
    it('returns true when owner is system', () => {
      const m = meta({ owner: 'system' });
      expect(getIsSystemBase(m)).toBe(true);
    });

    it('returns false when owner is core', () => {
      const m = meta({ owner: 'core' });
      expect(getIsSystemBase(m)).toBe(false);
    });

    it('explicit isSystem overrides owner', () => {
      const m = meta({ owner: 'core', isSystem: true });
      expect(getIsSystemBase(m)).toBe(true);
    });

    it('undefined metadata returns false', () => {
      expect(getIsSystemBase(undefined)).toBe(false);
    });
  });

  describe('getIsComputedBase', () => {
    it('returns true when isComputed is true', () => {
      const m = meta({ isComputed: true });
      expect(getIsComputedBase(m)).toBe(true);
    });

    it('returns false by default', () => {
      const m = meta({});
      expect(getIsComputedBase(m)).toBe(false);
    });
  });

  describe('getIsHideableBase', () => {
    it('system fields default to not hideable', () => {
      const m = meta({ owner: 'system' });
      expect(getIsHideableBase(m)).toBe(false);
    });

    it('core fields default to hideable', () => {
      const m = meta({ owner: 'core' });
      expect(getIsHideableBase(m)).toBe(true);
    });

    it('explicit isHideable overrides default', () => {
      const m = meta({ owner: 'system', isHideable: true });
      expect(getIsHideableBase(m)).toBe(true);
    });
  });

  describe('owner classification helpers', () => {
    it('isSystemFieldBase returns true for system owner', () => {
      expect(isSystemFieldBase(meta({ owner: 'system' }))).toBe(true);
      expect(isSystemFieldBase(meta({ owner: 'core' }))).toBe(false);
    });

    it('isCoreFieldBase returns true for core owner', () => {
      expect(isCoreFieldBase(meta({ owner: 'core' }))).toBe(true);
      expect(isCoreFieldBase(meta({ owner: 'system' }))).toBe(false);
    });

    it('isParticipationFieldBase returns true for participation owner', () => {
      expect(isParticipationFieldBase(meta({ owner: 'participation', fieldScope: 'SALES' }))).toBe(true);
      expect(isParticipationFieldBase(meta({ owner: 'core' }))).toBe(false);
    });
  });

  describe('classifyFieldBase', () => {
    it('returns system for system owner', () => {
      expect(classifyFieldBase(meta({ owner: 'system' }))).toBe('system');
    });

    it('returns core for core owner', () => {
      expect(classifyFieldBase(meta({ owner: 'core' }))).toBe('core');
    });

    it('returns fieldScope for participation owner', () => {
      expect(classifyFieldBase(meta({ owner: 'participation', fieldScope: 'SALES' }))).toBe('SALES');
    });

    it('returns system for undefined metadata (unknown default)', () => {
      expect(classifyFieldBase(undefined)).toBe('system');
    });
  });
});
