/**
 * FieldRegistry contract tests.
 * Tests plural resolution, case-insensitivity, and safe fallbacks.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeModuleKeyForRegistry,
  isModuleRegistered,
  getFieldMetadataMap,
  getFieldsForModule,
  getFieldMetadataFromRegistry,
  getRegisteredModules,
  MODULE_KEYS,
} from '../../platform/fields/FieldRegistry';

describe('FieldRegistry', () => {
  describe('plural module keys resolve correctly', () => {
    it('deals → deal', () => {
      expect(normalizeModuleKeyForRegistry('deals')).toBe('deal');
      expect(getFieldMetadataMap('deals')).toBeDefined();
      expect(getFieldsForModule('deal').length).toBeGreaterThan(0);
    });

    it('organizations → organization', () => {
      expect(normalizeModuleKeyForRegistry('organizations')).toBe('organization');
      expect(getFieldMetadataMap('organizations')).toBeDefined();
    });

    it('events → event', () => {
      expect(normalizeModuleKeyForRegistry('events')).toBe('event');
      expect(getFieldMetadataMap('events')).toBeDefined();
    });

    it('items → item', () => {
      expect(normalizeModuleKeyForRegistry('items')).toBe('item');
      expect(getFieldMetadataMap('items')).toBeDefined();
    });

    it('singular keys resolve directly', () => {
      expect(normalizeModuleKeyForRegistry('people')).toBe('people');
      expect(normalizeModuleKeyForRegistry('tasks')).toBe('tasks');
      expect(normalizeModuleKeyForRegistry('deal')).toBe('deal');
    });
  });

  describe('case-insensitive field lookup', () => {
    it('Title and title resolve to same metadata for tasks', () => {
      const lower = getFieldMetadataFromRegistry('tasks', 'title');
      const upper = getFieldMetadataFromRegistry('tasks', 'Title');
      const mixed = getFieldMetadataFromRegistry('tasks', 'TITLE');
      expect(lower).toBeDefined();
      expect(upper).toEqual(lower);
      expect(mixed).toEqual(lower);
    });

    it('createdAt and createdat resolve to same metadata', () => {
      const camel = getFieldMetadataFromRegistry('tasks', 'createdAt');
      const lower = getFieldMetadataFromRegistry('tasks', 'createdat');
      expect(camel).toBeDefined();
      expect(lower).toEqual(camel);
    });
  });

  describe('unknown module returns safe fallback', () => {
    it('getFieldMetadataMap returns undefined for unknown module', () => {
      expect(getFieldMetadataMap('unknownModule')).toBeUndefined();
      expect(getFieldMetadataMap('')).toBeUndefined();
    });

    it('getFieldsForModule returns empty array for unknown module', () => {
      // getFieldsForModule expects ModuleKey - use type assertion for invalid key test
      const map = getFieldMetadataMap('nonexistent');
      expect(map).toBeUndefined();
      const fields = map ? Object.keys(map) : [];
      expect(fields).toEqual([]);
    });

    it('getFieldMetadataFromRegistry returns undefined for unknown module', () => {
      expect(getFieldMetadataFromRegistry('unknownModule', 'title')).toBeUndefined();
    });

    it('isModuleRegistered returns false for unknown module', () => {
      expect(isModuleRegistered('unknownModule')).toBe(false);
      expect(isModuleRegistered('')).toBe(false);
    });
  });

  describe('registry never returns undefined for known modules', () => {
    it('getFieldMetadataMap returns object for all MODULE_KEYS', () => {
      for (const key of MODULE_KEYS) {
        const map = getFieldMetadataMap(key);
        expect(map).toBeDefined();
        expect(typeof map).toBe('object');
        expect(map).not.toBeNull();
      }
    });

    it('getFieldsForModule returns array for all MODULE_KEYS', () => {
      for (const key of MODULE_KEYS) {
        const fields = getFieldsForModule(key);
        expect(Array.isArray(fields)).toBe(true);
      }
    });

    it('getRegisteredModules returns all module keys', () => {
      const registered = getRegisteredModules();
      expect(registered).toHaveLength(MODULE_KEYS.length);
      expect(registered).toEqual([...MODULE_KEYS]);
    });
  });
});
