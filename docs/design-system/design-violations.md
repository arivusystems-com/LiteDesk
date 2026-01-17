# Design Violations Log

This document tracks design law violations discovered and resolved during development. It serves as institutional memory for patterns, fixes, and insights.

## peopledetail.vue (Legacy → Canonical)

- **Screen**: Person Detail
- **Component**: Mixed App Participations card
- **Law violated**: Law 13 — Cards Are Responsibility Boundaries
- **Fix**: Split into Platform-Mediated (read-only) card and App-owned action card
- **Insight**: Governance and actions must never share responsibility surfaces

- **Screen**: Person Detail
- **Component**: Attach vs Convert actions
- **Law violated**: Law 6 — Attach vs Convert
- **Fix**: Quiet Attach (text-link) vs weighty Convert (explicit modal)
- **Insight**: Reversibility must be felt before semantics

- **Screen**: Person Detail
- **Component**: Ownership encoding
- **Law violated**: Law 4 — Identity & Ownership
- **Fix**: Labels + structure, no color semantics
- **Insight**: Ownership must survive grayscale and theming

- **Screen**: Person Detail
- **Component**: Loading states
- **Law violated**: Law 16 — State Transparency
- **Fix**: Skeletons reflecting real layout
- **Insight**: Loading is paused reality, not a different UI

- **Screen**: Person Detail
- **Component**: Color usage throughout
- **Law violated**: Law 7 — Intent-Based Token Law
- **Fix**: Replaced all direct color names (red, green, yellow, blue) with intent tokens (danger, success, warning, secondary)
- **Insight**: Colors must communicate intent, not appearance

- **Screen**: Person Detail
- **Component**: Spacing values
- **Law violated**: Law 9 — Spacing Is a Cognitive Rhythm
- **Fix**: Replaced non-8-based spacing (gap-3, mb-1, px-3, py-1.5) with 8-based system (8, 16, 24, 32, 48, 64)
- **Insight**: Arbitrary spacing breaks cognitive rhythm and visual consistency

- **Screen**: Person Detail
- **Component**: Screen-level density
- **Law violated**: Law 10 — Density Is a Mode
- **Fix**: Declared `density-balanced` class on root container
- **Insight**: Density must be explicit, not inferred from component spacing

- **Screen**: Person Detail
- **Component**: Form labels and definition terms
- **Law violated**: Law 11 — Typography Expresses Certainty
- **Fix**: Removed `font-medium` from all `<dt>` and `<label>` elements
- **Insight**: Labels are never bold; hierarchy comes from size and color, not weight

- **Screen**: Person Detail
- **Component**: Interactive elements (buttons, close icons)
- **Law violated**: Law 18 — Accessibility Is Structural
- **Fix**: Added `min-h-[40px]` to all buttons, `p-2` + `min-w-[40px] min-h-[40px]` to close button
- **Insight**: Accessibility is structural, not decorative; minimum hit targets are non-negotiable

