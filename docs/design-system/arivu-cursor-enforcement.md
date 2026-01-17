# Arivu Cursor Enforcement

You are enforcing the **Arivu Design Laws v1.0**.

These laws are **non-negotiable** and override personal preference, speed, and convenience.

## Pre-Code Checklist

Before writing or modifying any UI code, identify:

1. **Surface type**: App Background, Primary, Secondary, Interactive, Elevated
2. **Ownership**: Platform, App, Entity, Person
3. **Component intent**: Primary, Secondary, Tertiary, Destructive
4. **Screen density**: Comfortable, Balanced, Dense

## Hard Rules

- **No hex colors or direct color names** in components
- **Only intent-based tokens** are allowed
- **Only 8-based spacing**: 8, 16, 24, 32, 48, 64
- **Cards must not mix ownership**
- **Attach and Convert** must be visually and semantically distinct
- **Components must explicitly handle**: loading, empty, and error states
- **Accessibility is mandatory**: keyboard, contrast, focus

## Violation Protocol

If a change violates any law:

1. **STOP**
2. Explain which law is violated
3. Do not write code until the violation is resolved

When in doubt, ask: **Which law permits this change?**
