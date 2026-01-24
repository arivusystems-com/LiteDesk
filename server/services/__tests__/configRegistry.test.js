/**
 * ============================================================================
 * Configuration Registry Service - Test Hooks
 * ============================================================================
 * 
 * Minimal test coverage for configuration registry service.
 * These tests verify the core registry logic without requiring full database setup.
 * 
 * For full integration tests, see the main test suite.
 * ============================================================================
 */

const {
  getEntityTypes,
  getLifecycles,
  getLifecycleStatusMappings,
  computeDerivedStatus,
  getEntityConfiguration,
  getAllConfigurations
} = require('../configRegistry');

// Mock models for testing
jest.mock('../../models/EntityType', () => ({
  find: jest.fn(),
  findOne: jest.fn()
}));

jest.mock('../../models/Lifecycle', () => ({
  find: jest.fn()
}));

jest.mock('../../models/LifecycleStatusMap', () => ({
  find: jest.fn()
}));

const EntityType = require('../../models/EntityType');
const Lifecycle = require('../../models/Lifecycle');
const LifecycleStatusMap = require('../../models/LifecycleStatusMap');

describe('Configuration Registry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEntityTypes', () => {
    it('should return entity types for a given entity', async () => {
      EntityType.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { key: 'lead', label: 'Lead', entity: 'people', isActive: true },
            { key: 'contact', label: 'Contact', entity: 'people', isActive: true }
          ])
        })
      });

      const types = await getEntityTypes('people');

      expect(types).toHaveLength(2);
      expect(types[0].key).toBe('lead');
      expect(types[1].key).toBe('contact');
    });

    it('should filter by appKey when provided', async () => {
      EntityType.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { key: 'lead', label: 'Lead', entity: 'people', appKey: 'sales', isActive: true }
          ])
        })
      });

      const types = await getEntityTypes('people', 'SALES');

      expect(EntityType.find).toHaveBeenCalledWith(
        expect.objectContaining({ appKey: 'sales' })
      );
    });

    it('should return empty array on error', async () => {
      EntityType.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockRejectedValue(new Error('Database error'))
        })
      });

      const types = await getEntityTypes('people');

      expect(types).toEqual([]);
    });
  });

  describe('getLifecycles', () => {
    it('should return lifecycles for a given entity type', async () => {
      Lifecycle.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { key: 'lead-lifecycle', label: 'Lead Lifecycle', entityTypeKey: 'lead', order: 0 }
          ])
        })
      });

      const lifecycles = await getLifecycles('lead');

      expect(lifecycles).toHaveLength(1);
      expect(lifecycles[0].key).toBe('lead-lifecycle');
    });
  });

  describe('getLifecycleStatusMappings', () => {
    it('should return status mappings for a given lifecycle', async () => {
      LifecycleStatusMap.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              lifecycleKey: 'lead-lifecycle',
              derivedStatus: 'New',
              sourceStatusField: 'lead_status',
              sourceStatusValue: 'New'
            }
          ])
        })
      });

      const mappings = await getLifecycleStatusMappings('lead-lifecycle');

      expect(mappings).toHaveLength(1);
      expect(mappings[0].derivedStatus).toBe('New');
    });
  });

  describe('computeDerivedStatus', () => {
    it('should return null when no config exists', async () => {
      EntityType.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([])
        })
      });

      const status = await computeDerivedStatus('people', { type: 'Lead' });

      expect(status).toBeNull();
    });

    it('should compute derived status from record data', async () => {
      // Mock entity types
      EntityType.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { key: 'lead', label: 'Lead', entity: 'people', isActive: true }
          ])
        })
      });

      // Mock lifecycles
      Lifecycle.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { key: 'lead-lifecycle', label: 'Lead Lifecycle', entityTypeKey: 'lead', order: 0 }
          ])
        })
      });

      // Mock status mappings
      LifecycleStatusMap.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              lifecycleKey: 'lead-lifecycle',
              derivedStatus: 'New',
              sourceStatusField: 'lead_status',
              sourceStatusValue: 'New'
            }
          ])
        })
      });

      const status = await computeDerivedStatus('people', {
        type: 'Lead',
        lead_status: 'New'
      });

      expect(status).toBe('New');
    });

    it('should return null when no matching mapping found', async () => {
      EntityType.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { key: 'lead', label: 'Lead', entity: 'people', isActive: true }
          ])
        })
      });

      Lifecycle.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { key: 'lead-lifecycle', label: 'Lead Lifecycle', entityTypeKey: 'lead', order: 0 }
          ])
        })
      });

      LifecycleStatusMap.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([])
        })
      });

      const status = await computeDerivedStatus('people', {
        type: 'Lead',
        lead_status: 'Unknown'
      });

      expect(status).toBeNull();
    });
  });

  describe('getEntityConfiguration', () => {
    it('should return complete configuration for an entity', async () => {
      EntityType.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { key: 'lead', label: 'Lead', entity: 'people', isActive: true }
          ])
        })
      });

      Lifecycle.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { key: 'lead-lifecycle', label: 'Lead Lifecycle', entityTypeKey: 'lead', order: 0 }
          ])
        })
      });

      LifecycleStatusMap.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([])
        })
      });

      const config = await getEntityConfiguration('people');

      expect(config).toHaveProperty('entity', 'people');
      expect(config).toHaveProperty('entityTypes');
      expect(config.entityTypes).toHaveLength(1);
      expect(config.entityTypes[0]).toHaveProperty('lifecycles');
    });
  });

  describe('getAllConfigurations', () => {
    it('should return configurations for all entities', async () => {
      EntityType.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([])
        })
      });

      const configs = await getAllConfigurations();

      expect(configs).toHaveProperty('people');
      expect(configs).toHaveProperty('organization');
      expect(configs).toHaveProperty('deal');
    });
  });
});
