/**
 * Reads SALES participation from person.participations.SALES only.
 * Participations is the sole source of truth.
 *
 * @param {Object} person - Person document or plain object
 * @returns {{ role: string|null, lead_status: string|null, contact_status: string|null }}
 */
function getSalesParticipationValues(person) {
  if (!person) {
    return { role: null, lead_status: null, contact_status: null };
  }

  const sales = person.participations?.SALES;

  return {
    role: sales?.role ?? null,
    lead_status: sales?.lead_status ?? null,
    contact_status: sales?.contact_status ?? null
  };
}

module.exports = { getSalesParticipationValues };
