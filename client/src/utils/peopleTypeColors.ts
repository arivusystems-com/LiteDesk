/**
 * People participation type colors: semantic keys and/or #RRGGBB hex (same as picklist options).
 * BadgeCell and settings UI resolve everything to hex for display.
 */

export interface PeopleTypeDef {
  value: string;
  color: string;
  /**
   * `undefined` = inherit platform defaults for this type; `[]` = explicitly show no participation fields;
   * non-empty = explicit field keys.
   */
  fields?: string[];
}

/** Ordered palette used when rotating defaults for legacy string-only types */
const ROTATION_KEYS = [
  'indigo',
  'blue',
  'emerald',
  'amber',
  'violet',
  'rose',
  'cyan',
  'orange',
  'teal',
  'pink',
  'green',
  'purple'
] as const;

const ALLOWED = new Set<string>([
  ...ROTATION_KEYS,
  'slate',
  'red',
  'yellow',
  'gray'
]);

export const PEOPLE_TYPE_COLOR_OPTIONS: { key: string; label: string; hex: string }[] = [
  { key: 'indigo', label: 'Indigo', hex: '#6366f1' },
  { key: 'blue', label: 'Blue', hex: '#3b82f6' },
  { key: 'emerald', label: 'Emerald', hex: '#10b981' },
  { key: 'amber', label: 'Amber', hex: '#f59e0b' },
  { key: 'violet', label: 'Violet', hex: '#8b5cf6' },
  { key: 'rose', label: 'Rose', hex: '#f43f5e' },
  { key: 'cyan', label: 'Cyan', hex: '#06b6d4' },
  { key: 'orange', label: 'Orange', hex: '#ea580c' },
  { key: 'teal', label: 'Teal', hex: '#14b8a6' },
  { key: 'pink', label: 'Pink', hex: '#ec4899' },
  { key: 'green', label: 'Green', hex: '#22c55e' },
  { key: 'purple', label: 'Purple', hex: '#a855f7' },
  { key: 'slate', label: 'Slate', hex: '#64748b' },
  { key: 'red', label: 'Red', hex: '#ef4444' },
  { key: 'yellow', label: 'Yellow', hex: '#eab308' },
  { key: 'gray', label: 'Gray', hex: '#6b7280' }
];

export function normalizePeopleTypeColorKey(input: string | null | undefined, fallbackIndex = 0): string {
  const k = String(input ?? '')
    .toLowerCase()
    .trim();
  if (ALLOWED.has(k)) return k;
  const n = ROTATION_KEYS.length;
  const idx = ((fallbackIndex % n) + n) % n;
  return ROTATION_KEYS[idx] ?? 'indigo';
}

/** Valid 6-digit hex with optional leading #, or null */
export function normalizePeopleTypeHex(input: string | null | undefined): string | null {
  const s = String(input ?? '').trim();
  const m = s.match(/^#?([0-9A-Fa-f]{6})$/);
  if (!m?.[1]) return null;
  return `#${m[1].toLowerCase()}`;
}

export function typeDefsFromStrings(types: string[]): PeopleTypeDef[] {
  const paletteLen = PEOPLE_TYPE_COLOR_OPTIONS.length;
  return types.map((value, i) => {
    const opt = PEOPLE_TYPE_COLOR_OPTIONS[i % paletteLen];
    return {
      value,
      color: opt?.hex ?? '#64748b',
    };
  });
}

export function peopleTypeColorKeyToHex(key: string): string {
  const row = PEOPLE_TYPE_COLOR_OPTIONS.find((o) => o.key === key);
  return row?.hex ?? '#64748b';
}

/** Resolve stored value (hex or semantic key) to a display hex for badges and color inputs. */
export function peopleTypeColorToHex(c: string | null | undefined): string {
  const hex = normalizePeopleTypeHex(c);
  if (hex) return hex;
  return peopleTypeColorKeyToHex(normalizePeopleTypeColorKey(c, 0));
}

export function typeDefsToBadgeOptions(defs: PeopleTypeDef[]): { value: string; color: string }[] {
  return defs.map((d, i) => ({
    value: d.value,
    color: peopleTypeColorToHex(d.color || normalizePeopleTypeColorKey(undefined, i))
  }));
}

/** Persisted color: prefer hex when valid; otherwise canonical semantic key. */
export function coercePeopleTypeColorForSave(c: string | null | undefined, fallbackIndex = 0): string {
  const hex = normalizePeopleTypeHex(c);
  if (hex) return hex;
  return normalizePeopleTypeColorKey(c, fallbackIndex);
}

function isTypeDefish(x: unknown): x is { value?: unknown; color?: unknown; fields?: unknown } {
  return typeof x === 'object' && x !== null && !Array.isArray(x) && 'value' in x;
}

/** `undefined` = inherit; `[]` = explicit empty; non-empty = explicit list */
function parseTypeDefFields(raw: unknown): string[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) return undefined;
  if (raw.length === 0) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of raw) {
    const fk = String(x ?? '').trim();
    if (!fk) continue;
    const low = fk.toLowerCase();
    if (seen.has(low)) continue;
    seen.add(low);
    out.push(fk);
  }
  return out.length > 0 ? out : [];
}

/**
 * Parse GET / PUT response body: { types, typeDefs?, defaultRole?, default? } or legacy string[].
 */
export function parsePeopleTypesApiPayload(
  data: unknown,
  fallbackTypes: string[],
  fallbackDefault: string
): { types: string[]; defaultRole: string; typeDefs: PeopleTypeDef[] } {
  const fb = typeDefsFromStrings(fallbackTypes);
  const fbTypes = fb.map((d) => d.value);
  const fbDef = fallbackDefault || fbTypes[0] || '';

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const o = data as {
      types?: unknown;
      typeDefs?: unknown;
      defaultRole?: string;
      default?: string;
    };

    if (Array.isArray(o.typeDefs) && o.typeDefs.length > 0) {
      const typeDefs: PeopleTypeDef[] = [];
      for (let i = 0; i < o.typeDefs.length; i++) {
        const row = o.typeDefs[i];
        if (!isTypeDefish(row)) continue;
        const value = String(row.value ?? '').trim();
        if (!value) continue;
        const rawC = row.color != null ? String(row.color).trim() : '';
        const fields = parseTypeDefFields(row.fields);
        const td: PeopleTypeDef = {
          value,
          color: normalizePeopleTypeHex(rawC) ?? normalizePeopleTypeColorKey(rawC, typeDefs.length)
        };
        if (fields !== undefined) td.fields = fields;
        typeDefs.push(td);
      }
      if (typeDefs.length > 0) {
        const types = typeDefs.map((d) => d.value);
        const rawDef = o.defaultRole ?? o.default ?? types[0];
        const match = types.find((t) => t.toLowerCase() === String(rawDef).trim().toLowerCase());
        const dr = match ?? types[0] ?? '';
        return { types, defaultRole: dr, typeDefs };
      }
    }

    if (Array.isArray(o.types) && o.types.length > 0) {
      const first = o.types[0];
      if (isTypeDefish(first)) {
        const typeDefs: PeopleTypeDef[] = [];
        for (let i = 0; i < o.types.length; i++) {
          const row = o.types[i];
          if (!isTypeDefish(row)) continue;
          const value = String(row.value ?? '').trim();
          if (!value) continue;
          const rawC2 = row.color != null ? String(row.color).trim() : '';
          const fields = parseTypeDefFields(row.fields);
          const td2: PeopleTypeDef = {
            value,
            color: normalizePeopleTypeHex(rawC2) ?? normalizePeopleTypeColorKey(rawC2, typeDefs.length)
          };
          if (fields !== undefined) td2.fields = fields;
          typeDefs.push(td2);
        }
        if (typeDefs.length > 0) {
          const types = typeDefs.map((d) => d.value);
          const rawDef = o.defaultRole ?? o.default ?? types[0];
          const match = types.find((t) => t.toLowerCase() === String(rawDef).trim().toLowerCase());
          const dr2 = match ?? types[0] ?? '';
          return { types, defaultRole: dr2, typeDefs };
        }
      }

      const types = (o.types as unknown[]).map((s) => String(s)).filter(Boolean);
      if (types.length === 0) {
        return { types: fbTypes, defaultRole: fbDef || fbTypes[0] || '', typeDefs: fb };
      }
      const rawDef = o.defaultRole ?? o.default ?? types[0];
      const match = types.find((t) => t.toLowerCase() === String(rawDef).trim().toLowerCase());
      const typeDefs = typeDefsFromStrings(types);
      const dr3 = match ?? types[0] ?? '';
      return { types, defaultRole: dr3, typeDefs };
    }
  }

  if (Array.isArray(data) && data.length > 0) {
    const types = data.map((s) => String(s)).filter(Boolean);
    return { types, defaultRole: types[0] ?? '', typeDefs: typeDefsFromStrings(types) };
  }

  return { types: fbTypes, defaultRole: fbDef || fbTypes[0] || '', typeDefs: fb };
}
