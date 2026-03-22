/**
 * ============================================================================
 * SALES Participation – Participations as Source of Truth
 * ============================================================================
 *
 * Participations is the sole source of truth. All reads/writes use person.participations.SALES.
 *
 * setSalesParticipationIn() – Use for all write paths.
 * syncSalesParticipation() – Normalizes participations.SALES structure when reading.
 * ============================================================================
 */

/**
 * Build participations with SALES data. Use for all SALES writes.
 * Does NOT mutate; returns new participations object.
 *
 * @param {Object} existingParticipations - Current person.participations or {}
 * @param {{ role?: string|null, lead_status?: string|null, contact_status?: string|null }} sales - SALES values to set
 * @returns {Object} New participations object (with SALES set or removed)
 */
function setSalesParticipationIn(existingParticipations, sales) {
  const { role, lead_status, contact_status } = sales;
  const hasSalesData = role != null || lead_status != null || contact_status != null;

  const participations = { ...(existingParticipations || {}) };

  if (!hasSalesData) {
    delete participations.SALES;
    return participations;
  }

  participations.SALES = {
    role: role ?? null,
    lead_status: lead_status ?? null,
    contact_status: contact_status ?? null
  };
  return participations;
}

const SALES_UPDATE_KEYS = ['sales_type', 'lead_status', 'contact_status'];

/**
 * Extract SALES values from update payload and remove them from the payload.
 * Returns `sales: null` when no SALES-related keys are present (e.g. only helpdesk_role) — cross-app safety.
 * Legacy top-level `type` is never read for role; it is stripped from `cleaned` if present.
 * Does not mutate `updateData`; `cleaned` is always a shallow copy when input is a plain object.
 *
 * @param {Object} [updateData] - Update payload (sales_type, lead_status, contact_status)
 * @returns {{ sales: { role, lead_status, contact_status }|null, cleaned: Object }}
 */
function extractSalesFromUpdate(updateData) {
  if (!updateData || typeof updateData !== 'object') {
    return { sales: null, cleaned: updateData };
  }

  const cleaned = { ...updateData };
  delete cleaned.type;

  const touched = SALES_UPDATE_KEYS.some((k) =>
    Object.prototype.hasOwnProperty.call(updateData, k)
  );
  if (!touched) {
    return { sales: null, cleaned };
  }

  const sales = {
    role: updateData.sales_type ?? null,
    lead_status: updateData.lead_status ?? null,
    contact_status: updateData.contact_status ?? null
  };
  delete cleaned.sales_type;
  delete cleaned.lead_status;
  delete cleaned.contact_status;
  return { sales, cleaned };
}

/**
 * Strip helpdesk_role from payload and return role value (undefined = key absent).
 */
function extractHelpdeskRoleFromUpdate(updateData) {
  if (!updateData || typeof updateData !== 'object') {
    return { helpdeskRole: undefined, cleaned: updateData, touched: false };
  }
  if (!Object.prototype.hasOwnProperty.call(updateData, 'helpdesk_role')) {
    return { helpdeskRole: undefined, cleaned: updateData, touched: false };
  }
  const helpdeskRole = updateData.helpdesk_role;
  const cleaned = { ...updateData };
  delete cleaned.helpdesk_role;
  return { helpdeskRole, cleaned, touched: true };
}

function mergeHelpdeskRoleIntoParticipations(existingParticipations, helpdeskRole) {
  const p = { ...(existingParticipations || {}) };
  p.HELPDESK = { ...(p.HELPDESK || {}), role: helpdeskRole ?? null };
  return p;
}

/**
 * Normalizes person.participations.SALES structure when reading.
 * Participations is the sole source of truth.
 *
 * @param {Object} person - Person object with participations.SALES
 */
function syncSalesParticipation(person) {
  if (!person) return;

  const sales = person.participations?.SALES;
  const role = sales?.role ?? null;
  const lead_status = sales?.lead_status ?? null;
  const contact_status = sales?.contact_status ?? null;

  const hasSalesData = role != null || lead_status != null || contact_status != null;

  if (!hasSalesData) {
    if (person.participations?.SALES) {
      delete person.participations.SALES;
    }
    return;
  }

  person.participations = person.participations || {};
  person.participations.SALES = {
    role,
    lead_status,
    contact_status
  };
}

module.exports = {
  setSalesParticipationIn,
  extractSalesFromUpdate,
  extractHelpdeskRoleFromUpdate,
  mergeHelpdeskRoleIntoParticipations,
  syncSalesParticipation
};
