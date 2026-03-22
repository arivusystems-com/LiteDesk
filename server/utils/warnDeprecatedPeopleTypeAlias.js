/**
 * HELPDESK must use `helpdesk_role`, never `type`.
 * SALES Lead/Contact must use `sales_type`, never top-level `type`.
 */

/**
 * Reject legacy top-level `type` on People write payloads (formData / update body).
 * Run after {@link helpdeskTypeAliasViolation} so HELPDESK gets the specific error first.
 *
 * @returns {{ status: number, body: object } | null}
 */
function peopleLegacyTopLevelTypeViolation(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (!Object.prototype.hasOwnProperty.call(payload, 'type')) return null;
  const t = payload.type;
  if (t === undefined || t === null) return null;
  if (typeof t === 'string' && t.trim() === '') return null;
  return {
    status: 400,
    body: {
      success: false,
      message:
        'Top-level `type` is no longer accepted on People. Use `sales_type` for SALES (Lead/Contact) or `helpdesk_role` for HELPDESK.',
      code: 'PEOPLE_USE_SALES_TYPE_OR_HELPDESK_ROLE',
    },
  };
}

/**
 * @returns {{ status: number, body: object } | null} Response to send if violation; otherwise null.
 */
function helpdeskTypeAliasViolation(appKey, payload) {
  const k = String(appKey || '').toUpperCase();
  if (k !== 'HELPDESK' || !payload || typeof payload !== 'object') return null;
  if (!payload.type) return null;
  return {
    status: 400,
    body: {
      success: false,
      message: 'Use `helpdesk_role` instead of `type` for HELPDESK.',
      code: 'HELPDESK_USE_HELPDESK_ROLE',
    },
  };
}

module.exports = {
  helpdeskTypeAliasViolation,
  peopleLegacyTopLevelTypeViolation,
};
