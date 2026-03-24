# UX SPEC: LANDING PAGE — POST-LOGIN ENTRY POINT

**Status:** Draft for review
**Date:** 2026-03-24
**Authority:** Quill (UX/UI Design)
**Related Decision:** RB-006 (GRIT FIT list and shortlist are separate), Directive Part 1 (Two entry points)

---

## OVERVIEW

The landing page is the first screen a student-athlete, coach, or guidance counselor sees **after authentication**. It does not appear to anonymous users. Its purpose is to orient the user to their role and direct them to the appropriate primary action.

This spec covers **student-athlete landing only**. Coach and guidance counselor landings are separate specs.

---

## DESIGN INTENT

The BC High logo establishes two key principles:
1. **Confident, bold branding** — The maroon and gold palette conveys strength and trust
2. **Clear hierarchy** — The eagle symbol is the focus; everything else supports it

Applied to the landing page: The two entry paths (Browse and GRIT FIT) are equally visible but differently weighted. Browse is the *exploration hook*. GRIT FIT is the *conversion action*. The page should feel inviting (Cream background) and action-oriented (Maroon/Gold CTAs).

---

## STUDENT-ATHLETE LANDING PAGE

### Page Layout

```
┌─────────────────────────────────────────────────────────┐
│                    HEADER (Maroon)                      │
│  [Logo] Gritty Recruit Hub    [Nav] Home Shortlist...  │
│  Signed in as: [Student Name]     [Settings] [Logout]  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                                                         │
│         Welcome back, [First Name]!                     │
│                                                         │
│    Your GRIT FIT score: Calculated on [date]            │
│    [▸ Edit Profile] [▸ View Results Now]               │
│                                                         │
│    ─────────────────────────────────────────────────    │
│                                                         │
│           Choose how to explore colleges:              │
│                                                         │
│    ┌──────────────────────┐  ┌──────────────────────┐  │
│    │   📍 BROWSE MAP      │  │   ✓ GRIT FIT         │  │
│    │                      │  │                      │  │
│    │ Explore all 662      │  │ Your personalized    │  │
│    │ college football     │  │ match results        │  │
│    │ programs on an       │  │                      │  │
│    │ interactive map.     │  │ Up to 30 schools     │  │
│    │ No filtering.        │  │ that fit your stats  │  │
│    │                      │  │                      │  │
│    │ [Browse Map]         │  │ [View Results]       │  │
│    │ (Gold outline)       │  │ (Maroon, primary)    │  │
│    │ (Secondary action)   │  │ (Primary action)     │  │
│    └──────────────────────┘  └──────────────────────┘  │
│                                                         │
│    ─────────────────────────────────────────────────    │
│                                                         │
│    [?] What is GRIT FIT?                                │
│    [⧉] How does the shortlist work?                    │
│    [→] See recruiting examples from other athletes     │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    FOOTER                               │
│            Documentation  Privacy  Help  Contact        │
└─────────────────────────────────────────────────────────┘
```

### Design Specifications

#### Header
- **Height:** 64px
- **Background:** `#8B3A3A` (Maroon)
- **Content:**
  - Left: Gritty logo (wordmark) + "Recruit Hub" text in white
  - Center: Navigation links (Home, Shortlist, Profile, etc.) in white, with underline hover effect
  - Right: "Signed in as [Name]" + Settings icon + Logout link

#### Main Content Area
- **Background:** `#F5EFE0` (Cream) for warmth and visual distinction
- **Padding:** 48px (xl spacing)
- **Max-width:** 1200px, centered

#### Welcome Section
- **Headline (H2):** "Welcome back, [First Name]!"
- **Subheading (Body Large):** "Your GRIT FIT score: Calculated on [date]"
  - This only appears if profile is complete and GRIT FIT has been run
  - If profile is incomplete: "Complete your profile to get your personalized match results."
- **Action Buttons (if profile complete):**
  - [▸ Edit Profile] — Secondary button (outlined Maroon, 200px wide)
  - [▸ View Results Now] — Tertiary button (text link, Gold)
  - Positioned horizontally, left-aligned, 8px gap

#### Two-Path Section

A card-based layout presenting Browse and GRIT FIT as two equal options:

**Browse Card (Left)**
- **Title (H3):** "📍 Browse Map"
- **Description:** "Explore all 662 college football programs on an interactive map. No filtering. See the full landscape at a glance."
- **Icon:** Map pin (24px)
- **Button:** [Browse Map] — Secondary button (Gold outline, Maroon text)
- **Card styling:**
  - Background: `#FFFFFF` (white)
  - Border: `2px solid #D4AF37` (Gold)
  - Padding: 24px (lg)
  - Border-radius: 8px
  - Shadow: `0 2px 8px rgba(0,0,0,0.1)`

**GRIT FIT Card (Right)**
- **Title (H3):** "✓ GRIT FIT"
- **Description:** "Your personalized match results. Up to 30 schools that fit your athletic stats, academic profile, and financial situation. Ranked by fit."
- **Icon:** Checkmark (24px)
- **Button:** [View Results] — Primary button (Maroon fill, white text)
- **Card styling:**
  - Background: `#FFFFFF` (white)
  - Border: `2px solid #8B3A3A` (Maroon)
  - Padding: 24px (lg)
  - Border-radius: 8px
  - Shadow: `0 4px 12px rgba(139,58,58,0.15)` (Maroon shadow for emphasis)
- **Visual weight:** Slightly larger shadow and border thickness to indicate primary action

**Layout (Desktop):**
- Two cards side-by-side, 50% width each, 16px gap
- Cards stack vertically on mobile (768px and below)
- On mobile, GRIT FIT card appears first (primary action above secondary)

#### Help Section
- **Title (H4):** "Need help?"
- **Three collapsible links:**
  1. "[?] What is GRIT FIT?" — Expands to explain algorithm, 4 gates, 30-school limit
  2. "[⧉] How does the shortlist work?" — Explains persistent vs. dynamic, status flags
  3. "[→] See recruiting examples from other athletes" — Links to help center or case studies
- **Styling:**
  - Text color: `#6B6B6B` (Stone Gray)
  - Hover color: `#8B3A3A` (Maroon)
  - Cursor changes to pointer
  - Underline appears on hover

#### Footer
- **Height:** 48px
- **Background:** `#2C2C2C` (Charcoal)
- **Text color:** `#E8E8E8` (Light Gray)
- **Links:** Documentation, Privacy Policy, Help, Contact
- **Links color:** `#D4AF37` (Gold) with underline, hover darkens to `#C9A02B`

---

## CONDITIONAL STATES

### Profile Incomplete
If the user has authenticated but hasn't completed their GRIT FIT profile:

- Welcome message changes: "Almost there! Complete your profile to see your personalized matches."
- GRIT FIT card button text becomes: [Complete Profile] (points to profile form)
- "Your GRIT FIT score" line is hidden
- Browse Map card remains unchanged (accessible at any time)

**Mockup (Profile Incomplete):**
```
Welcome back, [First Name]!

Almost there! Complete your profile to see your personalized matches.

[Edit Profile] [→ Get Started]

[Browse Map Card] [Complete Profile Card]
```

### Profile Complete, GRIT FIT Not Run
If profile is complete but user hasn't triggered a GRIT FIT calculation:

- "Your GRIT FIT score: Not calculated yet" message appears
- GRIT FIT button text: [Calculate Matches] instead of [View Results]
- Subtext: "Run the algorithm to see your personalized recommendations."

### GRIT FIT Results Stale (Profile Edited)
If a user edits their profile after a GRIT FIT calculation:

- Subtext changes: "Your matches were calculated on [old date]. [Recalculate] to refresh."
- GRIT FIT button text remains: [View Results] (shows old results)
- A secondary action "[Recalculate]" appears next to the date
- Coach dashboard and shortlist show the *current* results (recalculated on demand)

---

## INTERACTION SPECIFICATIONS

### Browse Map Button Click
- **Action:** Navigate to `/browse` (full map, no filters, all 662 schools)
- **Loading state:** Button shows spinner for 0.5-1s while map initializes
- **Analytics:** Log event "browse_map_clicked" with timestamp

### View Results Button Click
- **Action:** Navigate to `/grit-fit/results` with default view = Map View
- **Loading state:** Button shows spinner, then page loads
- **Behavior if GRIT FIT not calculated:** Show inline error message "Run GRIT FIT first" and disable button
- **Analytics:** Log event "grit_fit_view_results_clicked"

### Edit Profile Button Click
- **Action:** Navigate to `/profile/edit`
- **Behavior:** Pre-populate form with current profile data
- **Return after edit:** User returns to landing page with updated welcome message

### Help Links (Expandable)
- **Animation:** Accordion open/close, 200ms ease-in-out
- **Icon change:** [?] rotates 180° on open/close
- **Content:** Static text blocks, no external links (for MVP)

---

## RESPONSIVE DESIGN

### Tablet (768px–1023px)
- Header nav collapses to hamburger menu
- Main content padding: 24px (lg) instead of 48px
- Browse/GRIT FIT cards remain side-by-side (50% width each)
- Help section links change from collapsible to horizontal row with smaller text

### Mobile (< 768px)
- Header: Logo + hamburger menu only, no inline nav
- Main content padding: 16px (md)
- Welcome section: Single-column, centered
- Browse/GRIT FIT cards: Stack vertically (100% width), GRIT FIT first
- Help section: Simplified to 2 links max (collapsible)
- Font sizes reduced: H2 → 1.75rem, H3 → 1.25rem

---

## ACCESSIBILITY NOTES

- **Focus management:** Tab order is: Edit Profile → View Results → Browse Map → Help links → Footer links
- **ARIA labels:** Each button has explicit aria-label (e.g., "Browse all 662 schools on the interactive map")
- **Color contrast:**
  - Maroon text on Cream bg: 7.2:1 (AAA)
  - Gold buttons on white: 4.8:1 (AA)
  - All text meets minimum 4.5:1 contrast
- **Skip link:** "Skip to main content" link above header for screen reader users
- **Icon + text:** Every icon has accompanying text label (no icon-only buttons)

---

## COPY GUIDANCE

### Headlines
- Keep short and action-oriented
- Reference student by first name when appropriate
- Use clear language about what each path does

### Help Text
- Use conversational tone
- Explain "why" not just "how"
- Link to deeper help resources, not embedded in landing

### Button Text
- Action-oriented verbs: "Browse Map", "View Results", "Complete Profile"
- Avoid generic "Submit" or "Continue"

---

## COMPONENT DEPENDENCIES

This page requires:
- [ ] Header component (nav, logout, user menu)
- [ ] Card component (with border/shadow variants)
- [ ] Button component (Primary, Secondary, Tertiary)
- [ ] Expandable accordion component (Help section)
- [ ] Footer component

All components must follow DESIGN_SYSTEM.md color and typography rules.

---

## IMPLEMENTATION NOTES

**Owner:** Nova (component implementation), Quill (design sign-off)

**Key decisions to confirm with Chris:**
1. Should "View Results Now" button be visible even if GRIT FIT not calculated, or should it be disabled/hidden?
   - **Current assumption:** Disabled/hidden if not calculated, with inline hint: "Complete your profile to calculate your matches"
2. Should Browse Map be equally prominent, or positioned as secondary?
   - **Current assumption:** Equal visual weight (same card size, similar button styling)
3. Should help links be collapsible, or expand to full help page?
   - **Current assumption:** Collapsible inline (MVP simplicity)

---

## APPROVAL GATE

This spec requires sign-off from:
- [ ] Quill (design consistency with DESIGN_SYSTEM.md)
- [ ] Chris (product confirmation of two-path approach)
- [ ] Nova (technical feasibility check)

Once signed off, Nova proceeds to component implementation.

---

*Landing Page Spec v1.0 — subject to revision based on stakeholder feedback and usability testing.*
