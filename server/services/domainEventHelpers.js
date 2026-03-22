/**
 * ============================================================================
 * PLATFORM CORE: Domain Event Helpers
 * ============================================================================
 *
 * Build and emit domain events only when real changes occur. Used by
 * People, Organization, and Deal controllers.
 *
 * ============================================================================
 */

const { emit } = require('./domainEvents');
const { getStageConfig } = require('./configRegistry');

function toId(v) {
  if (v == null) return null;
  return v.toString ? v.toString() : String(v);
}

function eq(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((x, i) => eq(x, b[i]));
  }
  return false;
}

function resolveOwner(entityType, current) {
  if (!current) return null;
  let ref = null;
  if (entityType === 'people') ref = current.assignedTo || current.lead_owner || null;
  else if (entityType === 'organization') ref = current.assignedTo || null;
  else if (entityType === 'deal') ref = current.ownerId || null;
  if (!ref) return null;
  return toId(ref && ref._id ? ref._id : ref);
}

/**
 * Emit People events: lifecycle change, type change. Only when actually changed.
 *
 * @param {Object} opts
 * @param {Object|null} opts.previous - Record before update
 * @param {Object} opts.current - Record after update
 * @param {string} [opts.appKey] - App context
 * @param {string|Object|null} [opts.triggeredBy] - User ID or 'system'
 * @param {string|Object|null} [opts.organizationId] - Tenant org ID
 */
function emitPeopleEvents({ previous, current, appKey = 'SALES', triggeredBy = null, organizationId = null }) {
  if (!current) return;
  const entityId = toId(current._id);
  const orgId = organizationId ? toId(organizationId) : null;

  const { getSalesParticipationValues } = require('../utils/getSalesParticipationValues');
  const prevSales = previous ? getSalesParticipationValues(previous) : {};
  const currSales = getSalesParticipationValues(current);
  const prevType = prevSales.role;
  const currType = currSales.role;
  const prevLead = prevSales.lead_status;
  const currLead = currSales.lead_status;
  const prevContact = prevSales.contact_status;
  const currContact = currSales.contact_status;

  const ownerId = resolveOwner('people', current);

  if (prevType !== undefined && !eq(prevType, currType)) {
    emit({
      entityType: 'people',
      entityId,
      eventType: 'people.sales_type.changed',
      previousState: previous
        ? { sales_type: prevType, lead_status: prevLead, contact_status: prevContact }
        : null,
      currentState: { sales_type: currType, lead_status: currLead, contact_status: currContact },
      appKey,
      triggeredBy,
      organizationId: orgId,
      ownerId
    });
  }

  const lifecycleChanged = !eq(prevLead, currLead) || !eq(prevContact, currContact);
  if (lifecycleChanged) {
    emit({
      entityType: 'people',
      entityId,
      eventType: 'people.lifecycle.changed',
      previousState: previous
        ? { sales_type: prevType, lead_status: prevLead, contact_status: prevContact }
        : null,
      currentState: { sales_type: currType, lead_status: currLead, contact_status: currContact },
      appKey,
      triggeredBy,
      organizationId: orgId,
      ownerId
    });
  }
}

/**
 * Emit Organization events: lifecycle change, type change. Only when actually changed.
 *
 * @param {Object} opts
 * @param {Object|null} opts.previous - Record before update
 * @param {Object} opts.current - Record after update
 * @param {string} [opts.appKey]
 * @param {string|Object|null} [opts.triggeredBy]
 * @param {string|Object|null} [opts.organizationId] - Tenant org ID (context)
 */
function emitOrganizationEvents({ previous, current, appKey = 'SALES', triggeredBy = null, organizationId = null }) {
  if (!current) return;
  const entityId = toId(current._id);
  const orgId = organizationId ? toId(organizationId) : null;

  const prevTypes = previous?.types;
  const currTypes = current?.types;
  const prevCustomer = previous?.customerStatus;
  const currCustomer = current?.customerStatus;
  const prevPartner = previous?.partnerStatus;
  const currPartner = current?.partnerStatus;
  const prevVendor = previous?.vendorStatus;
  const currVendor = current?.vendorStatus;

  const ownerId = resolveOwner('organization', current);

  if (!eq(prevTypes, currTypes)) {
    emit({
      entityType: 'organization',
      entityId,
      eventType: 'organization.type.changed',
      previousState: previous ? { types: prevTypes, customerStatus: prevCustomer, partnerStatus: prevPartner, vendorStatus: prevVendor } : null,
      currentState: { types: currTypes, customerStatus: currCustomer, partnerStatus: currPartner, vendorStatus: currVendor },
      appKey,
      triggeredBy,
      organizationId: orgId,
      ownerId
    });
  }

  const lifecycleChanged = !eq(prevCustomer, currCustomer) || !eq(prevPartner, currPartner) || !eq(prevVendor, currVendor);
  if (lifecycleChanged) {
    emit({
      entityType: 'organization',
      entityId,
      eventType: 'organization.lifecycle.changed',
      previousState: previous ? { types: prevTypes, customerStatus: prevCustomer, partnerStatus: prevPartner, vendorStatus: prevVendor } : null,
      currentState: { types: currTypes, customerStatus: currCustomer, partnerStatus: currPartner, vendorStatus: currVendor },
      appKey,
      triggeredBy,
      organizationId: orgId,
      ownerId
    });
  }
}

/**
 * Resolve deal won/lost from stage or derivedStatus. Uses config when available.
 *
 * @param {Object} record - Deal record
 * @param {string} [appKey]
 * @returns {Promise<'won'|'lost'|null>}
 */
async function resolveDealWonLost(record, appKey = 'SALES') {
  const stage = (record?.stage || '').toString().trim();
  const derived = (record?.derivedStatus || record?.status || '').toString().trim().toLowerCase();
  if (derived === 'won') return 'won';
  if (derived === 'lost') return 'lost';
  const legacyWon = ['Closed Won', 'Won'].some((s) => stage === s || derived === s.toLowerCase());
  const legacyLost = ['Closed Lost', 'Lost'].some((s) => stage === s || derived === s.toLowerCase());
  if (legacyWon) return 'won';
  if (legacyLost) return 'lost';
  try {
    const pipeline = record?.pipeline;
    const cfg = await getStageConfig(pipeline, stage, appKey);
    const ds = (cfg?.derivedStatus || '').toString().trim().toLowerCase();
    if (ds === 'won') return 'won';
    if (ds === 'lost') return 'lost';
  } catch (_) {}
  return null;
}

/**
 * Emit Deal events: stage change, pipeline change, deal won/lost. Only when actually changed.
 *
 * @param {Object} opts
 * @param {Object|null} opts.previous - Record before update (null for create)
 * @param {Object} opts.current - Record after update
 * @param {string} [opts.appKey]
 * @param {string|Object|null} [opts.triggeredBy]
 * @param {string|Object|null} [opts.organizationId] - Tenant org ID (deal.organizationId)
 */
async function emitDealEvents({ previous, current, appKey = 'SALES', triggeredBy = null, organizationId = null }) {
  if (!current) return;
  const entityId = toId(current._id);
  const orgId = organizationId ? toId(organizationId) : (current.organizationId ? toId(current.organizationId) : null);
  const ownerId = resolveOwner('deal', current);

  const prevStage = previous?.stage;
  const currStage = current?.stage;
  const prevPipeline = previous?.pipeline;
  const currPipeline = current?.pipeline;

  if (prevStage !== undefined && prevStage !== currStage) {
    emit({
      entityType: 'deal',
      entityId,
      eventType: 'deal.stage.changed',
      previousState: previous ? { stage: prevStage, pipeline: prevPipeline } : null,
      currentState: { stage: currStage, pipeline: currPipeline },
      appKey,
      triggeredBy,
      organizationId: orgId,
      ownerId
    });
  }

  if (prevPipeline !== undefined && !eq(prevPipeline, currPipeline)) {
    emit({
      entityType: 'deal',
      entityId,
      eventType: 'deal.pipeline.changed',
      previousState: previous ? { stage: prevStage, pipeline: prevPipeline } : null,
      currentState: { stage: currStage, pipeline: currPipeline },
      appKey,
      triggeredBy,
      organizationId: orgId,
      ownerId
    });
  }

  const prevWonLost = await resolveDealWonLost(previous, appKey);
  const currWonLost = await resolveDealWonLost(current, appKey);
  if (currWonLost === 'won' && prevWonLost !== 'won') {
    emit({
      entityType: 'deal',
      entityId,
      eventType: 'deal.deal.won',
      previousState: previous ? { stage: prevStage, pipeline: prevPipeline } : null,
      currentState: { stage: currStage, pipeline: currPipeline },
      appKey,
      triggeredBy,
      organizationId: orgId,
      ownerId
    });
  }
  if (currWonLost === 'lost' && prevWonLost !== 'lost') {
    emit({
      entityType: 'deal',
      entityId,
      eventType: 'deal.deal.lost',
      previousState: previous ? { stage: prevStage, pipeline: prevPipeline } : null,
      currentState: { stage: currStage, pipeline: currPipeline },
      appKey,
      triggeredBy,
      organizationId: orgId,
      ownerId
    });
  }
}

module.exports = {
  emitPeopleEvents,
  emitOrganizationEvents,
  emitDealEvents,
  resolveDealWonLost
};
