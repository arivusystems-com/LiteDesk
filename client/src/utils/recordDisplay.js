/**
 * ============================================================================
 * Phase 0G: Record Display Utilities (Enhanced with Caching)
 * ============================================================================
 * 
 * Utilities for displaying record information in relationship UI:
 * - Get record labels (primaryField)
 * - Format record display names
 * - Fetch record details for display
 * - Cache record data for performance
 * 
 * ============================================================================
 */

import apiClient from '@/utils/apiClient';

// Cache for record data (key: appKey.moduleKey.recordId)
const recordCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get endpoint for a record type.
 * Server routes are module-based (/api/tasks, /api/deals, etc.), not /api/{appKey}/{moduleKey}.
 */
function getRecordEndpoint(appKey, moduleKey) {
  const normalizedModule = (moduleKey ?? '').toString().toLowerCase().trim();
  // Map moduleKey to actual server path (no appKey in path)
  const moduleToPath = {
    tasks: '/tasks',
    task: '/tasks',
    events: '/events',
    event: '/events',
    forms: '/forms',
    form: '/forms',
    deals: '/deals',
    deal: '/deals',
    people: '/people',
    organizations: '/v2/organization',
    organization: '/v2/organization',
    items: '/items',
    item: '/items'
  };
  const path = moduleToPath[normalizedModule];
  if (path) return path;
  if (normalizedModule === 'organizations' || normalizedModule === 'organization') return '/v2/organization';
  // Fallback: try moduleKey as path (e.g. /people, /groups)
  return `/${normalizedModule || 'unknown'}`;
}

/**
 * Generate cache key for a record
 */
function getCacheKey(appKey, moduleKey, recordId) {
  return `${appKey?.toLowerCase() || 'crm'}.${moduleKey?.toLowerCase() || 'unknown'}.${recordId}`;
}

/**
 * Fetch a single record by ID (with caching)
 */
export async function fetchRecord(appKey, moduleKey, recordId, forceRefresh = false) {
  const cacheKey = getCacheKey(appKey, moduleKey, recordId);
  
  // Check cache first (unless force refresh)
  if (!forceRefresh && recordCache.has(cacheKey)) {
    const cached = recordCache.get(cacheKey);
    // Check if cache is still valid
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    // Cache expired, remove it
    recordCache.delete(cacheKey);
  }
  
  try {
    const endpoint = getRecordEndpoint(appKey, moduleKey);
    const response = await apiClient.get(`${endpoint}/${recordId}`);
    
    if (response.success && response.data) {
      // Cache the record
      recordCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });
      return response.data;
    }
    
    return null;
  } catch (error) {
    console.error(`[recordDisplay] Error fetching record ${appKey}.${moduleKey}:${recordId}:`, error);
    return null;
  }
}

/**
 * Get display label for a record
 * Tries multiple fields in order: name, title, eventName, primaryField, email, id
 */
export function getRecordLabel(record) {
  if (!record) return 'Unnamed Record';
  
  // Preserve explicit labels from upstream formatters.
  if (record.label) return record.label;
  if (record.displayName) return record.displayName;
  if (record.fullName) return record.fullName;
  if (record.full_name) return record.full_name;

  // Try common fields
  if (record.name) return record.name;
  if (record.title) return record.title;
  if (record.eventName) return record.eventName;
  if (record.primaryField) return record.primaryField;
  if (record.email) return record.email;
  const firstName = record.firstName || record.first_name || '';
  const lastName = record.lastName || record.last_name || '';
  if (firstName || lastName) {
    return `${firstName} ${lastName}`.trim() || 'Unnamed Record';
  }
  if (record._id) return record._id.toString().substring(0, 8);
  if (record.id) return record.id.toString().substring(0, 8);
  
  return 'Unnamed Record';
}

/**
 * Get secondary text for a record (status, email, etc.)
 */
export function getRecordSecondaryText(record) {
  if (!record) return '';
  
  if (record.status) return record.status;
  if (record.email && !record.name && !record.title) return '';
  if (record.email) return record.email;
  if (record.stage) return record.stage;
  
  return '';
}

/**
 * Batch fetch records for display (with caching)
 */
export async function fetchRecordsForDisplay(records, forceRefresh = false) {
  if (!records || records.length === 0) return [];
  
  // Fetch records in parallel (cache will be checked inside fetchRecord)
  const fetchPromises = records.map(record => {
    const recordId = record.recordId ?? record.id ?? record._id;
    return fetchRecord(record.appKey, record.moduleKey, recordId, forceRefresh);
  });
  
  const fetchedRecords = await Promise.all(fetchPromises);
  
  // Combine with original record data and add labels
  return fetchedRecords.map((fetched, index) => {
    const original = records[index];
    return {
      ...original,
      ...fetched,
      label: getRecordLabel(fetched || original),
      secondaryText: getRecordSecondaryText(fetched || original)
    };
  });
}

/**
 * Clear record cache (useful on logout or when data changes)
 */
export function clearRecordCache() {
  recordCache.clear();
}

/**
 * Clear cache for a specific record
 */
export function clearRecordCacheFor(appKey, moduleKey, recordId) {
  const cacheKey = getCacheKey(appKey, moduleKey, recordId);
  recordCache.delete(cacheKey);
}

