import DOMPurify from 'dompurify';

/** Tags produced by TaskDescriptionEditor (TipTap) for record descriptions. */
export const ALLOWED_RICH_DESCRIPTION_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  's',
  'u',
  'a',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'blockquote'
];

/**
 * After DOMPurify, ensure real hyperlinks open in a new tab. Skips fragment-only anchors.
 */
export function withLinksOpenInNewTab(html: string): string {
  if (!html || !html.includes('<a') || typeof document === 'undefined') return html;

  const tpl = document.createElement('template');
  tpl.innerHTML = html;

  tpl.content.querySelectorAll('a[href]').forEach((anchor) => {
    const href = (anchor.getAttribute('href') || '').trim();
    if (!href || href.startsWith('#')) return;

    anchor.setAttribute('target', '_blank');
    const rel = new Set(
      (anchor.getAttribute('rel') || '')
        .split(/\s+/)
        .filter(Boolean)
    );
    rel.add('noopener');
    rel.add('noreferrer');
    anchor.setAttribute('rel', [...rel].join(' '));
  });

  return tpl.innerHTML;
}

/**
 * Restricted sanitization matching the RTE, then new-tab behavior for links.
 */
export function sanitizeRichDescriptionHtml(raw: string): string {
  const str = String(raw || '');
  if (!str.trim()) return '';

  const clean = DOMPurify.sanitize(str, {
    ALLOWED_TAGS: ALLOWED_RICH_DESCRIPTION_TAGS
  });
  return withLinksOpenInNewTab(clean);
}
