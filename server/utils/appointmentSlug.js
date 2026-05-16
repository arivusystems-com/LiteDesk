/**
 * URL-safe slug helpers for appointment booking pages.
 */
function slugifyBase(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'booking';
}

/**
 * @param {string} base
 * @param {(slug: string) => Promise<boolean>} exists - returns true if slug taken in org
 */
async function ensureUniqueSlug(base, exists) {
  let slug = slugifyBase(base);
  if (!(await exists(slug))) return slug;
  for (let i = 2; i < 100; i++) {
    const candidate = `${slug}-${i}`.slice(0, 64);
    if (!(await exists(candidate))) return candidate;
  }
  return `${slug}-${Date.now().toString(36)}`.slice(0, 64);
}

module.exports = { slugifyBase, ensureUniqueSlug };
