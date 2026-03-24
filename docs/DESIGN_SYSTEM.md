# GRITTY RECRUIT HUB — PHASE 1 MVP DESIGN SYSTEM

**Status:** Draft for review
**Date:** 2026-03-24
**Authority:** Quill (UX/UI Design)
**Reference:** BC High Eagles Logo (Boston_College_High__MA__Eagles_Logo-221855465.png)

---

## COLOR PALETTE

### Primary Colors

| Color Name | Hex | RGB | Usage |
|---|---|---|---|
| **Maroon** | `#8B3A3A` | 139, 58, 58 | Primary brand color, headings, primary buttons, nav active state |
| **Gold** | `#D4AF37` | 212, 175, 55 | Accents, highlights, hover states, badges |
| **Cream** | `#F5EFE0` | 245, 239, 224 | Backgrounds, card surfaces, light overlays |

### Neutral Colors

| Color Name | Hex | RGB | Usage |
|---|---|---|---|
| **Charcoal** | `#2C2C2C` | 44, 44, 44 | Primary text, headings, dark mode base |
| **Stone Gray** | `#6B6B6B` | 107, 107, 107 | Secondary text, labels, muted content |
| **Light Gray** | `#E8E8E8` | 232, 232, 232 | Borders, dividers, inactive states |
| **White** | `#FFFFFF` | 255, 255, 255 | Primary background, card backgrounds |

### Semantic Colors

| Color Name | Hex | Usage | Contrast Ratio |
|---|---|---|---|
| **Success** | `#4CAF50` | Positive actions, completed journey steps, confirmations | 4.5:1 (AA) |
| **Warning** | `#FF9800` | Alerts, out-of-range status flags, caution states | 4.5:1 (AA) |
| **Error** | `#F44336` | Errors, invalid inputs, failed actions | 4.5:1 (AA) |
| **Info** | `#2196F3` | Informational messages, tooltips, hints | 4.5:1 (AA) |

### Status Flag Colors (GRIT FIT)

| Status | Hex | Meaning |
|---|---|---|
| **Currently Recommended** | `#4CAF50` | School is in current GRIT FIT results |
| **Out of Academic Reach** | `#F44336` | School's academic standards exceed student profile |
| **Below Academic Fit** | `#FF9800` | School's academic standards below student potential |
| **Out of Athletic Reach** | `#F44336` | School's athletic tier above student tier |
| **Below Athletic Fit** | `#FF9800` | School's athletic tier below student tier |
| **Outside Geographic Reach** | `#9C27B0` | School distance exceeds student's preferred radius |

---

## TYPOGRAPHY

### Font Stack

```css
/* Headings & Brand */
font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;

/* Body & UI */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
```

### Scale

| Type | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| **H1** | 2.5rem (40px) | 700 | 1.2 | Page titles, main headings |
| **H2** | 2rem (32px) | 700 | 1.3 | Section headings, modal titles |
| **H3** | 1.5rem (24px) | 600 | 1.4 | Subsection headings, card titles |
| **H4** | 1.25rem (20px) | 600 | 1.5 | Small headings, form labels |
| **Body Large** | 1.125rem (18px) | 400 | 1.6 | Primary body text |
| **Body Regular** | 1rem (16px) | 400 | 1.6 | Standard body text, UI copy |
| **Body Small** | 0.875rem (14px) | 400 | 1.5 | Secondary text, captions |
| **Body Tiny** | 0.75rem (12px) | 400 | 1.4 | Metadata, timestamps, helper text |

### Font Weights

| Weight | Name |
|---|---|
| 400 | Regular |
| 500 | Medium |
| 600 | SemiBold |
| 700 | Bold |

---

## SPACING & RHYTHM

All spacing values follow a 4px base unit. Use multiples of 4px for consistency.

| Unit | Value | Usage |
|---|---|---|
| **xs** | 4px | Micro-interactions, tight spacing |
| **sm** | 8px | Padding within buttons, gap between inline elements |
| **md** | 16px | Standard padding (cards, containers), margin between sections |
| **lg** | 24px | Major section separation |
| **xl** | 32px | Large container margins, page-level spacing |
| **2xl** | 48px | Extra-large spacing, container gaps |

### Container & Grid

- **Max content width:** 1200px
- **Gutter:** 16px (8px per side)
- **Mobile breakpoint:** 768px (switch to single-column, reduce gutters to 12px)

---

## COMPONENT DESIGN TOKENS

### Buttons

| State | Background | Text | Border | Shadow |
|---|---|---|---|---|
| **Primary (Maroon)** | `#8B3A3A` | `#FFFFFF` | none | `0 2px 4px rgba(0,0,0,0.2)` |
| **Primary Hover** | `#6B2C2C` | `#FFFFFF` | none | `0 4px 8px rgba(0,0,0,0.3)` |
| **Primary Active** | `#5A1F1F` | `#FFFFFF` | none | `0 1px 2px rgba(0,0,0,0.2)` |
| **Secondary (Gold)** | `#D4AF37` | `#2C2C2C` | none | `0 2px 4px rgba(0,0,0,0.15)` |
| **Secondary Hover** | `#C9A02B` | `#2C2C2C` | none | `0 4px 8px rgba(0,0,0,0.2)` |
| **Disabled** | `#E8E8E8` | `#6B6B6B` | none | none |

### Cards & Containers

- **Background:** `#FFFFFF`
- **Border:** `1px solid #E8E8E8`
- **Border Radius:** `8px`
- **Shadow (resting):** `0 2px 8px rgba(0,0,0,0.1)`
- **Shadow (hover):** `0 4px 12px rgba(0,0,0,0.15)`
- **Padding:** 16px (md)

### Form Inputs

| State | Background | Border | Text |
|---|---|---|---|
| **Default** | `#FFFFFF` | `#D4D4D4` | `#2C2C2C` |
| **Focus** | `#FFFFFF` | `#8B3A3A` (2px) | `#2C2C2C` |
| **Error** | `#FFF5F5` | `#F44336` (2px) | `#2C2C2C` |
| **Disabled** | `#F5F5F5` | `#E8E8E8` | `#B0B0B0` |

- **Border Radius:** 4px
- **Padding:** 12px 16px
- **Font Size:** 1rem
- **Line Height:** 1.5

### Navigation

- **Active State:** Text color `#8B3A3A`, underline `#D4AF37` (3px)
- **Hover State:** Text color `#6B2C2C`, background `#F5F5F5`
- **Background:** `#FFFFFF` or `#F5EFE0` (light variant)

---

## DARK MODE (Future Consideration)

Currently, all specs are for light mode. If dark mode is introduced later, apply these token substitutions:

| Light | Dark |
|---|---|
| `#FFFFFF` backgrounds | `#1A1A1A` backgrounds |
| `#2C2C2C` text | `#E8E8E8` text |
| `#E8E8E8` borders | `#333333` borders |
| `#8B3A3A` maroon | `#D77777` (lightened for contrast) |
| `#D4AF37` gold | `#E8C547` (lightened for contrast) |

---

## ACCESSIBILITY REQUIREMENTS

### Contrast Ratios

- **Large text (18px+, bold):** Minimum 3:1 contrast ratio
- **Normal text:** Minimum 4.5:1 contrast ratio
- **UI components:** Minimum 3:1 contrast ratio

All primary button + text combinations meet WCAG AA standards (4.5:1 minimum).

### Interactive Elements

- **Focus indicators:** Visible 2px outline at `#8B3A3A` with 2px offset
- **Disabled states:** Must be visually distinct (reduced opacity + gray color)
- **Touch targets:** Minimum 44px × 44px (mobile), 40px × 40px (desktop)

### Icons & Imagery

- All icons must have text labels or aria-labels
- Color should never be the only indicator (use text, icons, or pattern)
- Ensure sufficient contrast for icon-only buttons

---

## RESPONSIVE DESIGN

### Breakpoints

```
Mobile:   < 768px
Tablet:   768px - 1023px
Desktop:  ≥ 1024px
```

### Mobile Adjustments

- **Font sizes:** Reduce body text by 2px on mobile
- **Spacing:** Use `sm` (8px) instead of `md` (16px) for tighter layouts
- **Buttons:** Full width on mobile, unless grouped (pair at 50% width each)
- **Cards:** Stack vertically on mobile, 1-2 columns on tablet, 2-3 on desktop
- **Navigation:** Hamburger menu on mobile, top nav on desktop

---

## COMPONENT CHECKLIST

The following components must be designed and built with consistent application of this design system:

- [ ] Buttons (Primary, Secondary, Tertiary, Icon)
- [ ] Form inputs (Text, Email, Password, Dropdown, Checkbox, Radio)
- [ ] Cards (with variants: plain, clickable, interactive)
- [ ] Navigation (Top nav, sidebar, breadcrumbs)
- [ ] Modals (Header, body, footer, close action)
- [ ] Alerts & Toasts (Success, Error, Warning, Info)
- [ ] Tables (sortable, filterable, with responsive stacking)
- [ ] Tabs (horizontal tabs, mobile-responsive)
- [ ] Status badges & flags (color-coded)
- [ ] File upload widget (with drag-drop)
- [ ] Timeline / Recruiting journey steps (vertical, collapsible)
- [ ] Map legend (color key, marker types)

---

## USAGE RULES

### Color Usage

1. **Maroon (#8B3A3A)** — Primary brand color, should dominate the interface but not exceed 30% of total screen area
2. **Gold (#D4AF37)** — Accent and highlight only, use sparingly for call-to-action focus
3. **Cream (#F5EFE0)** — Alternative background for sections, use to create visual hierarchy
4. **Neutrals** — All body text, labels, and secondary UI elements

### When to Break the Palette

- Status flag colors (Success, Warning, Error, Info) override the primary palette for semantic clarity
- Map visualization may use school-specific tier colors (Power 4, G5, FCS, etc.) — document color choices in GRIT FIT integration spec

### Dark Theme Approach

Do not implement dark mode in MVP. If requested post-MVP, use the dark mode tokens above.

---

## APPROVAL & IMPLEMENTATION

**Design System Owner:** Quill
**Implementation Owner:** Nova (components), Morty/Patch (auth flows)
**Review Gate:** Scout confirms no conflicts with AUTOMATION_ARCHITECTURE or project specs

**Next Steps:**
1. Quill reviews and signs off this document
2. Nova creates Tailwind config or CSS modules matching this palette
3. Each screen spec (Landing, GRIT FIT Map, Shortlist, etc.) references this system explicitly
4. All components must pass Quill's consistency check before implementation

---

*Design System version 1.0 — subject to revision based on stakeholder feedback and accessibility testing.*
