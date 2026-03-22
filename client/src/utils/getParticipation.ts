/**
 * Always use getParticipation(person, appKey) for display logic.
 * Participations is the sole source of truth.
 */

/**
 * Convert participationType (LEAD, CONTACT, etc.) to standardized role format for attach/create API.
 * Backend maps role → model type field.
 */
export function toAttachRole(type: string | null | undefined): string | null {
  if (!type || typeof type !== 'string') return null;
  const t = type.trim().toUpperCase();
  const map: Record<string, string> = {
    LEAD: 'Lead',
    CONTACT: 'Contact',
    MEMBER: 'Member',
    USER: 'User',
    PARTNER: 'Partner',
    CUSTOMER: 'Customer',
    AGENT: 'Agent'
  };
  return map[t] ?? (type.charAt(0).toUpperCase() + type.slice(1).toLowerCase());
}

/**
 * Get participation data for a person in an app from person.participations[appKey] only.
 *
 * @param person - Person record
 * @param appKey - App key (e.g. 'SALES')
 * @returns Participation object or null
 */
export function getParticipation(person: Record<string, unknown> | null | undefined, appKey: string): { role: string; lead_status?: string; contact_status?: string } | null {
  const participations = person?.participations as Record<string, { role?: string; lead_status?: string; contact_status?: string }> | undefined;
  if (participations?.[appKey]) {
    return participations[appKey] as { role: string; lead_status?: string; contact_status?: string };
  }
  return null;
}
