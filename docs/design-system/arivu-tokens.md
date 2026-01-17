# Arivu Design Tokens v1.0

This document defines the **locked** Arivu Design Tokens as the single source of truth.

**Location**: `client/src/assets/main.css` (CSS `@theme` directive)

**Status**: ✅ **LOCKED** - Tokens are defined and available for use

---

## Color Tokens (Law 7: Intent-Based Token Law)

Colors communicate intent, not appearance. Light/Dark preserve intent, not brightness (Law 8).

### Valid Intents

| Intent | Meaning | Usage |
|--------|---------|-------|
| **Primary** | Intelligence, Trust | Main actions, brand identity |
| **Secondary** | Growth, Motion | App participation badges, secondary actions |
| **Neutral** | Structure, Calm | Backgrounds, borders, text (replaces gray-*) |
| **Success** | Completion | Success states, positive feedback |
| **Warning** | Risk, Attention | Warnings, caution states |
| **Danger** | Irreversible Change | Errors, destructive actions |

### Token Structure

Each intent provides a full scale: `50, 100, 200, 300, 400, 500, 600, 700, 800, 900`

**Usage in components:**
- `bg-primary-500` - Primary background
- `text-danger-600` - Danger text
- `border-neutral-300` - Neutral border
- `bg-success-50` - Success background (light)

**Law Compliance:**
- ✅ No hex colors in components
- ✅ No direct color names (green, blue, red)
- ✅ Components reference tokens by intent only
- ✅ Light/Dark preserve intent, not brightness

**Note**: `gray-*` colors remain available for backward compatibility during migration. Components should migrate to `neutral-*` over time.

---

## Spacing (Law 9: Spacing Is a Cognitive Rhythm)

**⚠️ WARNING: Spacing tokens are NOT the source of truth.**

**Arivu spacing is governed by Design Laws v1.0 (8-based system), not tokens.**

### Spacing System

Arivu uses a strict 8-based spacing system: **8, 16, 24, 32, 48, 64**

### Recommended Spacing Values

| Tailwind Class | Value | Usage |
|----------------|-------|-------|
| `p-0`, `m-0` | 0px | No spacing |
| `p-2`, `m-2`, `gap-2` | 8px | Within components |
| `p-4`, `m-4`, `gap-4` | 16px | Within components |
| `p-6`, `m-6`, `gap-6` | 24px | Between components |
| `p-8`, `m-8`, `gap-8` | 32px | Between components |
| `p-12`, `m-12` | 48px | Large spacing |
| `p-16`, `m-16` | 64px | Section spacing |

**Usage in components:**
- `p-4` - 16px padding
- `mb-6` - 24px margin bottom
- `gap-2` - 8px gap

**Law Compliance:**
- ✅ Only 8-based values: 8, 16, 24, 32, 48, 64
- ✅ Spacing is governed by Design Laws v1.0, not tokens
- ✅ Enforcement happens via linting/rules, not token overrides
- ✅ Cognitive rhythm preserved when using 8-based values

**Important Notes:**
- Spacing is **NOT** defined in token files
- Tailwind's default spacing scale remains available (for backward compatibility)
- Components should use 8-based values per Law 9
- Enforcement happens via linting/rules, not via token overrides (which would break existing components)

---

## Typography Tokens (Law 11: Typography Expresses Certainty)

Each role specifies font-size, line-height, font-weight. Labels are never bold.

### Typography Roles

| Role | Font Size | Line Height | Font Weight | Usage |
|------|-----------|-------------|-------------|-------|
| **Page Title** | 1.5rem (24px) | 1.2 | 700 (bold) | Where am I |
| **Section Title** | 1.125rem (18px) | 1.3 | 600 (semibold) | What am I doing |
| **Label** | 0.875rem (14px) | 1.4 | 400 (normal) | What is this |
| **Value** | 0.875rem (14px) | 1.4 | 400 (normal) | The truth |
| **Helper** | 0.875rem (14px) | 1.4 | 400 (normal) | Guidance |
| **Meta** | 0.75rem (12px) | 1.3 | 400 (normal) | Secondary truth |

**Usage in components:**
- `text-page-title` - Page title styling
- `text-section-title` - Section title styling
- `text-label` - Label styling (never bold)
- `text-value` - Value styling
- `text-helper` - Helper text styling
- `text-meta` - Meta text styling

**Law Compliance:**
- ✅ Labels are never bold
- ✅ Hierarchy through size and color, not weight
- ✅ Semantic roles, not arbitrary sizes

---

## Token Mapping to Arivu Design Laws

| Token Category | Law | Compliance |
|----------------|-----|------------|
| Color Tokens | Law 7: Intent-Based Token Law | ✅ Intent-based, no hex/direct colors |
| Color Tokens | Law 8: Light & Dark Mode Law | ✅ Intent preserved, not brightness |
| Spacing | Law 9: Spacing Is a Cognitive Rhythm | ✅ 8-based system (governed by Design Laws, not tokens) |
| Typography Tokens | Law 11: Typography Expresses Certainty | ✅ Labels never bold, semantic roles |

---

## Implementation Details

### Token Definition Location

**Primary Location**: `client/src/assets/main.css`

Tokens are defined using Tailwind v4's `@theme` directive:

```css
@import 'tailwindcss';

@theme {
  /* Color tokens */
  --color-primary-50: #f5f3ff;
  --color-primary-100: #ede9fe;
  /* ... full scale ... */
  
  /* Typography tokens */
  --font-size-page-title: 1.5rem;
  --line-height-page-title: 1.2;
  --font-weight-page-title: 700;
  /* ... all roles ... */
}

@layer utilities {
  .text-page-title { /* ... */ }
  /* ... all typography utilities ... */
}
```

### Token Availability

- ✅ **Color tokens**: Available immediately via Tailwind classes (`bg-primary-500`, `text-danger-600`, etc.)
- ✅ **Typography utilities**: Available via custom classes (`.text-page-title`, `.text-label`, etc.)
- ⚠️ **Spacing**: Governed by Design Laws v1.0 (8-based system), NOT tokens. Tailwind defaults remain available.

### Backward Compatibility

- `gray-*` colors remain available during migration
- `brand-*` colors remain available (mapped to `primary-*`)
- Tailwind default spacing remains available
- Existing components continue to work

---

## Migration Notes

1. **System-Level Change Only**: Tokens are defined in `main.css`. No Vue components were modified.

2. **Neutral Replaces Gray**: The `neutral-*` token scale fully replaces the conceptual role of `gray-*`. Components should migrate to `neutral-*` over time.

3. **Typography Utilities**: Use semantic role classes (`.text-page-title`, `.text-label`, etc.) instead of direct font-size utilities.

4. **Spacing Migration**: Components should migrate to 8-based spacing values (8, 16, 24, 32, 48, 64) over time. Spacing is governed by Design Laws v1.0, not tokens.

5. **No New Intents**: If a new color intent is needed, it must be rejected per Law 7.

---

## Files Modified

- ✅ `client/src/assets/main.css` - Updated (contains `@theme` directive with all tokens)
- ✅ `client/tailwind.config.ts` - Created (TypeScript config for IDE support)

## Files NOT Modified

- ✅ No Vue components modified
- ✅ No pages modified
- ✅ No UI files modified

This is a system-level change only, as required.

---

## Token Lock Status

**Status**: ✅ **LOCKED**

- Color tokens: ✅ Defined and available
- Typography tokens: ✅ Defined and available  
- Spacing: ✅ Governed by Design Laws v1.0 (8-based system), NOT tokens

**Token Source of Truth**: `client/src/assets/main.css` (`@theme` directive)

**Spacing Source of Truth**: Design Laws v1.0 (Law 9: Spacing Is a Cognitive Rhythm)

**Note**: `tailwind.config.ts` exists only for IDE autocomplete and type checking. It does NOT define spacing tokens.
