/**
 * Field Governance Tests
 * 
 * Tests for field ownership, context, and access control rules.
 * See /docs/field-governance.md for complete rules.
 */

const {
  canReadField,
  canWriteField,
  filterFieldsByReadAccess,
  filterFieldsByWriteAccess,
  validateFieldWrite
} = require('../utils/fieldAccessControl');

// Mock field definitions
const createField = (key, owner, context, dataType = 'Text') => ({
  key,
  label: key,
  dataType,
  owner,
  context
});

// Mock user objects
const createUser = (isOwner = false, permissions = {}, appAccess = [], allowedApps = []) => ({
  _id: 'user123',
  isOwner,
  permissions,
  appAccess,
  allowedApps
});

describe('Field Governance Tests', () => {
  
  describe('1. Field Ownership Rules', () => {
    
    describe('Platform-Owned Fields', () => {
      const platformField = createField('platformField', 'platform', 'global');
      
      test('Owners can read platform fields', () => {
        const owner = createUser(true);
        expect(canReadField(platformField, owner, 'people')).toBe(true);
      });
      
      test('Owners can write to platform fields', () => {
        const owner = createUser(true);
        expect(canWriteField(platformField, owner, 'people')).toBe(true);
      });
      
      test('Regular users with view permission can read platform fields', () => {
        const user = createUser(false, { contacts: { view: true } });
        expect(canReadField(platformField, user, 'people')).toBe(true);
      });
      
      test('Regular users CANNOT write to platform fields', () => {
        const user = createUser(false, { contacts: { edit: true } });
        expect(canWriteField(platformField, user, 'people')).toBe(false);
      });
      
      test('Users without view permission CANNOT read platform fields', () => {
        const user = createUser(false, {});
        expect(canReadField(platformField, user, 'people')).toBe(false);
      });
    });
    
    describe('App-Owned Fields', () => {
      const appField = createField('salesField', 'app', 'sales');
      
      test('Owners can read app fields', () => {
        const owner = createUser(true);
        expect(canReadField(appField, owner, 'people')).toBe(true);
      });
      
      test('Owners can write to app fields', () => {
        const owner = createUser(true);
        expect(canWriteField(appField, owner, 'people')).toBe(true);
      });
      
      test('Users with app access and edit permission can write to app fields', () => {
        const user = createUser(false, 
          { contacts: { edit: true } },
          [{ appKey: 'SALES', status: 'ACTIVE' }]
        );
        expect(canWriteField(appField, user, 'people')).toBe(true);
      });
      
      test('Users without app access CANNOT write to app fields', () => {
        const user = createUser(false, { contacts: { edit: true } });
        expect(canWriteField(appField, user, 'people')).toBe(false);
      });
      
      test('Users without edit permission CANNOT write to app fields', () => {
        const user = createUser(false, 
          { contacts: { view: true } },
          [{ appKey: 'SALES', status: 'ACTIVE' }]
        );
        expect(canWriteField(appField, user, 'people')).toBe(false);
      });
      
      test('Global app fields require only edit permission', () => {
        const globalAppField = createField('globalAppField', 'app', 'global');
        const user = createUser(false, { contacts: { edit: true } });
        expect(canWriteField(globalAppField, user, 'people')).toBe(true);
      });
    });
    
    describe('Org-Owned Fields', () => {
      const orgField = createField('customField', 'org', 'global');
      
      test('Owners can read org fields', () => {
        const owner = createUser(true);
        expect(canReadField(orgField, owner, 'people')).toBe(true);
      });
      
      test('Owners can write to org fields', () => {
        const owner = createUser(true);
        expect(canWriteField(orgField, owner, 'people')).toBe(true);
      });
      
      test('Users with edit permission can write to org fields', () => {
        const user = createUser(false, { contacts: { edit: true } });
        expect(canWriteField(orgField, user, 'people')).toBe(true);
      });
      
      test('Users without edit permission CANNOT write to org fields', () => {
        const user = createUser(false, { contacts: { view: true } });
        expect(canWriteField(orgField, user, 'people')).toBe(false);
      });

      test('Org-owned fields with non-global context require app access to write (tenant app-scoped custom fields)', () => {
        const scopedOrgField = createField('tenant_sales_custom', 'org', 'sales');
        const withSales = createUser(
          false,
          { contacts: { edit: true } },
          [{ appKey: 'SALES', status: 'ACTIVE' }]
        );
        const editOnly = createUser(false, { contacts: { edit: true } });
        expect(canWriteField(scopedOrgField, withSales, 'people')).toBe(true);
        expect(canWriteField(scopedOrgField, editOnly, 'people')).toBe(false);
      });
    });
  });
  
  describe('2. Context Rules', () => {
    
    describe('Context Filtering Logic', () => {
      // Import the filter function from moduleController
      // Note: This would need to be exported or tested via integration tests
      // For now, we test the access control which uses context
      
      test('Global fields are accessible in all contexts', () => {
        const globalField = createField('globalField', 'platform', 'global');
        const user = createUser(false, { contacts: { view: true } });
        
        // Global fields should be readable regardless of context
        expect(canReadField(globalField, user, 'people')).toBe(true);
      });
      
      test('App-specific fields require app context', () => {
        const salesField = createField('salesField', 'app', 'sales');
        const user = createUser(false, 
          { contacts: { view: true, edit: true } },
          [{ appKey: 'SALES', status: 'ACTIVE' }]
        );
        
        // App fields require app access for write
        expect(canWriteField(salesField, user, 'people')).toBe(true);
      });
    });
  });
  
  describe('3. Access Control Rules', () => {
    
    describe('READ Access', () => {
      const fields = [
        createField('field1', 'platform', 'global'),
        createField('field2', 'app', 'sales'),
        createField('field3', 'org', 'global')
      ];
      
      test('Owners can read all fields', () => {
        const owner = createUser(true);
        const filtered = filterFieldsByReadAccess(fields, owner, 'people');
        expect(filtered.length).toBe(3);
      });
      
      test('Users with view permission can read all fields in module', () => {
        const user = createUser(false, { contacts: { view: true } });
        const filtered = filterFieldsByReadAccess(fields, user, 'people');
        expect(filtered.length).toBe(3);
      });
      
      test('Users without view permission cannot read any fields', () => {
        const user = createUser(false, {});
        const filtered = filterFieldsByReadAccess(fields, user, 'people');
        expect(filtered.length).toBe(0);
      });
      
      test('Missing user denies read access', () => {
        const filtered = filterFieldsByReadAccess(fields, null, 'people');
        expect(filtered.length).toBe(0);
      });
    });
    
    describe('WRITE Access', () => {
      const fields = [
        createField('platformField', 'platform', 'global'),
        createField('appField', 'app', 'sales'),
        createField('orgField', 'org', 'global')
      ];
      
      test('Owners can write to all fields', () => {
        const owner = createUser(true);
        const filtered = filterFieldsByWriteAccess(fields, owner, 'people');
        expect(filtered.length).toBe(3);
      });
      
      test('Regular users can only write to org fields with edit permission', () => {
        const user = createUser(false, { contacts: { edit: true } });
        const filtered = filterFieldsByWriteAccess(fields, user, 'people');
        // Should only have org field (platform and app fields require owner/app access)
        expect(filtered.length).toBe(1);
        expect(filtered[0].key).toBe('orgField');
      });
      
      test('Users with app access can write to app fields', () => {
        const user = createUser(false, 
          { contacts: { edit: true } },
          [{ appKey: 'SALES', status: 'ACTIVE' }]
        );
        const filtered = filterFieldsByWriteAccess(fields, user, 'people');
        // Should have app field and org field
        expect(filtered.length).toBe(2);
        expect(filtered.map(f => f.key)).toContain('appField');
        expect(filtered.map(f => f.key)).toContain('orgField');
      });
      
      test('Users without edit permission cannot write to any fields', () => {
        const user = createUser(false, { contacts: { view: true } });
        const filtered = filterFieldsByWriteAccess(fields, user, 'people');
        expect(filtered.length).toBe(0);
      });
    });
    
    describe('Field Write Validation', () => {
      const fields = [
        createField('platformField', 'platform', 'global'),
        createField('appField', 'app', 'sales'),
        createField('orgField', 'org', 'global')
      ];
      
      test('Validates platform field write access', () => {
        const owner = createUser(true);
        const validation = validateFieldWrite('platformField', fields, owner, 'people');
        expect(validation.allowed).toBe(true);
        
        const user = createUser(false, { contacts: { edit: true } });
        const validation2 = validateFieldWrite('platformField', fields, user, 'people');
        expect(validation2.allowed).toBe(false);
        expect(validation2.reason).toContain('Platform fields');
      });
      
      test('Validates app field write access', () => {
        const user = createUser(false, 
          { contacts: { edit: true } },
          [{ appKey: 'SALES', status: 'ACTIVE' }]
        );
        const validation = validateFieldWrite('appField', fields, user, 'people');
        expect(validation.allowed).toBe(true);
        
        const userNoApp = createUser(false, { contacts: { edit: true } });
        const validation2 = validateFieldWrite('appField', fields, userNoApp, 'people');
        expect(validation2.allowed).toBe(false);
        expect(validation2.reason).toContain('App-managed');
      });
      
      test('Validates org field write access', () => {
        const user = createUser(false, { contacts: { edit: true } });
        const validation = validateFieldWrite('orgField', fields, user, 'people');
        expect(validation.allowed).toBe(true);
        
        const userNoEdit = createUser(false, { contacts: { view: true } });
        const validation2 = validateFieldWrite('orgField', fields, userNoEdit, 'people');
        expect(validation2.allowed).toBe(false);
        expect(validation2.reason).toContain('Edit permission');
      });
      
      test('Returns allowed for unknown fields (backward compatibility)', () => {
        const user = createUser(false, { contacts: { edit: true } });
        const validation = validateFieldWrite('unknownField', fields, user, 'people');
        expect(validation.allowed).toBe(true);
        expect(validation.reason).toContain('not found in definitions');
      });
      
      test('Fails safely with missing parameters', () => {
        const validation = validateFieldWrite(null, fields, null, 'people');
        expect(validation.allowed).toBe(false);
        expect(validation.reason).toContain('Missing required');
      });
    });
  });
  
  describe('4. Edge Cases and Fail-Safe Behavior', () => {
    
    test('Missing user denies all access', () => {
      const field = createField('testField', 'org', 'global');
      expect(canReadField(field, null, 'people')).toBe(false);
      expect(canWriteField(field, null, 'people')).toBe(false);
    });
    
    test('Missing field returns false', () => {
      const user = createUser(false, { contacts: { view: true, edit: true } });
      expect(canReadField(null, user, 'people')).toBe(false);
      expect(canWriteField(null, user, 'people')).toBe(false);
    });
    
    test('Fields without owner default to platform behavior', () => {
      const fieldWithoutOwner = { key: 'test', context: 'global' };
      const user = createUser(false, { contacts: { view: true, edit: true } });
      
      // Should default to platform (read allowed, write denied for non-owners)
      expect(canReadField(fieldWithoutOwner, user, 'people')).toBe(true);
      expect(canWriteField(fieldWithoutOwner, user, 'people')).toBe(false);
    });
    
    test('Module alias handling (people -> contacts)', () => {
      const field = createField('testField', 'org', 'global');
      const user = createUser(false, { contacts: { view: true } });
      
      // Should work with both 'people' and 'contacts'
      expect(canReadField(field, user, 'people')).toBe(true);
      expect(canReadField(field, user, 'contacts')).toBe(true);
    });
    
    test('Empty fields array returns empty array', () => {
      const user = createUser(false, { contacts: { view: true } });
      expect(filterFieldsByReadAccess([], user, 'people')).toEqual([]);
      expect(filterFieldsByWriteAccess([], user, 'people')).toEqual([]);
    });
    
    test('Non-array fields handled gracefully', () => {
      const user = createUser(false, { contacts: { view: true } });
      expect(filterFieldsByReadAccess(null, user, 'people')).toEqual([]);
      expect(filterFieldsByReadAccess(undefined, user, 'people')).toEqual([]);
    });
  });
  
  describe('5. Integration Scenarios', () => {
    
    test('Complete field filtering workflow', () => {
      const fields = [
        createField('platform1', 'platform', 'global'),
        createField('platform2', 'platform', 'global'),
        createField('sales1', 'app', 'sales'),
        createField('support1', 'app', 'support'),
        createField('org1', 'org', 'global'),
        createField('org2', 'org', 'global')
      ];
      
      // Owner should see all fields
      const owner = createUser(true);
      const ownerReadable = filterFieldsByReadAccess(fields, owner, 'people');
      const ownerWritable = filterFieldsByWriteAccess(fields, owner, 'people');
      expect(ownerReadable.length).toBe(6);
      expect(ownerWritable.length).toBe(6);
      
      // Regular user with sales access
      const salesUser = createUser(false, 
        { contacts: { view: true, edit: true } },
        [{ appKey: 'SALES', status: 'ACTIVE' }]
      );
      const salesReadable = filterFieldsByReadAccess(fields, salesUser, 'people');
      const salesWritable = filterFieldsByWriteAccess(fields, salesUser, 'people');
      expect(salesReadable.length).toBe(6); // Can read all
      expect(salesWritable.length).toBe(3); // Can write: sales1, org1, org2
      expect(salesWritable.map(f => f.key)).toContain('sales1');
      expect(salesWritable.map(f => f.key)).toContain('org1');
      expect(salesWritable.map(f => f.key)).toContain('org2');
      
      // Regular user without app access
      const regularUser = createUser(false, { contacts: { view: true, edit: true } });
      const regularReadable = filterFieldsByReadAccess(fields, regularUser, 'people');
      const regularWritable = filterFieldsByWriteAccess(fields, regularUser, 'people');
      expect(regularReadable.length).toBe(6); // Can read all
      expect(regularWritable.length).toBe(2); // Can write: org1, org2 only
    });
  });
});

// Simple test runner for environments without Jest
if (typeof describe === 'undefined') {
  console.log('Field Governance Tests');
  console.log('Note: These tests require a test framework (Jest, Mocha, etc.)');
  console.log('Run with: npm test or jest fieldGovernance.test.js');
}

