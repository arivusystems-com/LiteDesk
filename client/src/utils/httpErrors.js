/**
 * Human-readable message from apiClient/fetch errors (validation, generic HTTP messages).
 */
export function getApiErrorMessage(err) {
  if (!err) return 'Request failed';
  const d = err.response?.data;
  if (d && typeof d.errors === 'object' && d.errors !== null && !Array.isArray(d.errors)) {
    const parts = Object.values(d.errors).filter(Boolean);
    if (parts.length) return parts.join('; ');
  }
  if (d?.error && typeof d.error === 'string' && d.error.trim()) return d.error.trim();
  if (d?.message && typeof d.message === 'string' && d.message.trim()) return d.message.trim();
  return err.message || 'Request failed';
}
