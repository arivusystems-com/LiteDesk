# Core Modules - Visual Language Reference

## Quick Reference: Visual Indicators

### Platform Ownership
- **Badge:** "Platform Capability" (top-right of cards)
- **Color:** Neutral blue-gray
- **Icon:** Shield or platform icon
- **Meaning:** Owned by platform, cannot be deleted/renamed

### Application States

#### Required (Locked) 🔒
- **Visual:** Lock icon, gray border, disabled toggle
- **Color:** Gray (#6B7280)
- **Behavior:** Cannot be changed
- **Example:** "Sales - Required - 🔒 Locked"

#### Optional (Enabled) ✓
- **Visual:** Green toggle ON, green accent border
- **Color:** Green (#10B981)
- **Behavior:** Can be toggled OFF (with confirmation)
- **Example:** "Audit - Optional - [Toggle: ON]"

#### Optional (Disabled) ○
- **Visual:** Gray toggle OFF, gray border
- **Color:** Gray (#9CA3AF)
- **Behavior:** Can be toggled ON
- **Example:** "Portal - Optional - [Toggle: OFF]"

#### Not Used —
- **Visual:** Grayed out card, no toggle
- **Color:** Light gray (#E5E7EB)
- **Behavior:** Not applicable
- **Example:** "Projects - Not Used - [Disabled]"

---

## Module List View Structure

```
Card Components:
1. Module Icon
2. Module Name
3. Description (one line)
4. "Used by" badges (app icons/names)
5. "View Details →" link
6. "Platform Capability" badge (top-right)
```

---

## Module Detail View Structure

```
Header:
- Module icon (large)
- Module name
- Description
- Back navigation

Platform Info Box:
- Explains platform ownership
- States cannot be deleted/renamed
- Available to all applications

Application Usage List:
- Each app as a card
- Shows: Icon, Name, Status, Usage explanation
- Required: Lock icon, no toggle
- Optional (enabled): Toggle ON, warning message
- Optional (disabled): Toggle OFF, info message
- Not used: Disabled state, no toggle
```

---

## Interaction Patterns

### Enabling Optional App
1. Click toggle (OFF → ON)
2. Immediate save
3. Success toast
4. Card border turns green

### Disabling Optional App
1. Click toggle (ON → OFF)
2. **Confirmation modal appears**
3. If confirmed: Save, warning message, success toast
4. If cancelled: Revert toggle, no changes

### Viewing Details
1. Click "View Details →" on card
2. Navigate to detail view
3. See full app usage breakdown
4. Toggle optional apps

---

## Example: People Module

### List View
```
┌─────────────────────────────────────────┐
│ 👥 People    [Platform Capability]     │
│ Contact and lead management             │
│                                          │
│ Used by: [Sales] [Helpdesk] [Audit]     │
│                                          │
│ [View Details →]                        │
└─────────────────────────────────────────┘
```

### Detail View - Required
```
┌─────────────────────────────────────────┐
│ [Sales Icon] Sales                      │
│ Required - Used for contact management  │
│ [🔒 Locked]                             │
└─────────────────────────────────────────┘
```

### Detail View - Optional (Enabled)
```
┌─────────────────────────────────────────┐
│ [Audit Icon] Audit                      │
│ Optional - Used for auditor contacts    │
│ [Toggle: ON ✓]                         │
│                                          │
│ ⚠️ Disabling will remove People access │
│    from Audit. Cannot be undone.        │
└─────────────────────────────────────────┘
```

### Detail View - Optional (Disabled)
```
┌─────────────────────────────────────────┐
│ [Portal Icon] Portal                    │
│ Optional - Customer profile management  │
│ [Toggle: OFF]                          │
│                                          │
│ ℹ️ Enable to allow Portal users to     │
│    manage their contact information.    │
└─────────────────────────────────────────┘
```

---

## Safety Mechanisms

1. **Lock Icon** - Required apps cannot be changed
2. **Confirmation Modal** - Before disabling optional apps
3. **Impact Warnings** - Explain consequences
4. **Platform Badge** - Indicates ownership
5. **No Delete/Rename** - Core modules are protected

---

## Color Palette

- **Platform Badge:** #4B5563 (neutral blue-gray)
- **Required/Locked:** #6B7280 (gray)
- **Optional Enabled:** #10B981 (green)
- **Optional Disabled:** #9CA3AF (light gray)
- **Not Used:** #E5E7EB (very light gray)
- **Warning:** #F59E0B (amber)
- **Info:** #3B82F6 (blue)

---

## Success Criteria

✅ **Understands "shared capability"** - Platform badge + info box  
✅ **Cannot break apps** - Locks + confirmations + warnings  
✅ **Feels protected** - Professional styling + clear ownership

