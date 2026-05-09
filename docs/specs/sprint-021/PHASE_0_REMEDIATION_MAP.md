# Sprint 021 — Phase 0 Audit: Belmont Hill Style Remediation Map

**Date:** 2026-05-09
**Author:** Nova (audit) — pending operator review before any code work begins
**Goal:** Eliminate BC High style leak across Belmont Hill user surfaces (Goal 2 of Sprint 021).

---

## 1. Token Model — Current State

The repo uses CSS custom properties keyed by a body class (`body.school-belmont-hill`) set in `Layout.jsx` from `useSchoolIdentity()`. Only **four** tokens are currently swapped in `src/index.css`:

| Token              | BC High default     | Belmont Hill override |
|--------------------|---------------------|------------------------|
| `--brand-maroon`   | `#8B3A3A`           | `#1B3D8F` (deep blue) |
| `--brand-gold`     | `#D4AF37`           | `#B41F2E` (scarlet) |
| `--brand-gold-dark`| `#A8871D`           | `#8A1722` (darker scarlet) |
| `--brand-overlay-rgba` | `rgba(245,239,224,0.9)` | `rgba(245,232,234,0.92)` |

Components that use `var(--brand-*)` already theme correctly. **Leaks come from components that hardcode the BC High hex/rgba values instead of using the variable.**

**Diff target:** every hardcoded `#8B3A3A`, `#D4AF37`, `#A8871D`, `#7A3232`, `#6B2C2C`, `#F5EFE0`, and their rgba forms across in-scope files.

---

## 2. New Tokens Proposed

The current four-var system cannot cover every leak case. The following additions are proposed and require Chris's value sign-off before remediation begins.

| New token                   | Purpose                                                           | BC High default   | Belmont Hill value (proposed) |
|-----------------------------|-------------------------------------------------------------------|-------------------|-------------------------------|
| `--brand-cream`             | Tinted off-white surface (alt-row bg, hover bg, badge bg)         | `#F5EFE0`         | `#FAF0F1` *(scarlet-tinted off-white — proposed; requires sign-off)* |
| `--brand-maroon-darker`     | Gradient endpoint (e.g. progress bars, hero gradients)            | `#6B2C2C`         | `#6B1019` *(darker scarlet — proposed)* |
| `--brand-maroon-rgb`        | RGB triplet for use in `rgba(var(--brand-maroon-rgb), α)`         | `139, 58, 58`     | `27, 61, 143`                |
| `--brand-gold-rgb`          | RGB triplet for accents and shadows                                | `212, 175, 55`    | `180, 31, 46`                |
| `--brand-mobile-menu-bg`    | Mobile dropdown sandwich menu background (currently `#7A3232`, a slightly darker maroon than `--brand-maroon`) | `#7A3232` | `#15327A` *(slightly darker than primary blue — proposed)* |
| `--scoreboard-strip-text`   | CollapsibleTitleStrip inner text color — overrides for legibility | `var(--brand-gold)` | `#FFFFFF` *(per spec note: "white for readability")* |

**Open questions for Chris (block remediation):**
- **Q1.** Confirm the exact `--brand-cream` BH value. Proposed `#FAF0F1`; alternatives are `#FBF2F3` (lighter) or stay at `#FFFFFF` (no tint at all on alt-row backgrounds).
- **Q2.** Confirm `--brand-maroon-darker` BH value `#6B1019` vs. a less aggressive `#7A1825`.
- **Q3.** Confirm `--brand-mobile-menu-bg` BH value `#15327A` vs. just using `--brand-maroon` (`#1B3D8F`) directly with no offset.
- **Q4.** Approve `--scoreboard-strip-text` going to white on Belmont Hill (matches spec note).

---

## 3. Remediation Map by Surface

Categories:
- **A** — Direct var swap (e.g. `'#8B3A3A'` → `'var(--brand-maroon)'`).
- **B** — Use new RGB-channel token in `rgba()`.
- **C** — Use new tinted-cream / darker-maroon token.
- **D** — Override to fixed neutral (e.g. white) for readability — uses new token, not a brand swap.
- **E** — CSS-side rule (in `index.css`) needs to move under `body.school-*` selector or use new token.
- **F** — SVG attribute → must be converted to inline `style` to accept CSS var.

---

### Student Home — 3-Step Recruiting Journey + Take the Tour

| File | Line(s) | Current | Remediation | Cat |
|------|--------|---------|-------------|-----|
| `src/components/home/JourneyCard.jsx` | 13 | `border: '2px solid #8B3A3A'` | `var(--brand-maroon)` | A |
| `src/components/home/JourneyCard.jsx` | 16 | `boxShadow: '0 4px 12px rgba(139,58,58,0.12)'` | `rgba(var(--brand-maroon-rgb), 0.12)` | B |
| `src/components/home/JourneyCard.jsx` | 52 | `backgroundColor: '#8B3A3A'` | `var(--brand-maroon)` | A |
| `src/components/home/JourneyCard.jsx` | 101 | `backgroundColor: '#8B3A3A'` | `var(--brand-maroon)` | A |
| `src/components/home/JourneyStepper.jsx` | 24 | `stroke="#8B3A3A"` (SVG attr) | Convert to `style={{stroke:'var(--brand-maroon)'}}` | F |
| `src/components/home/JourneyStepper.jsx` | 28 | `stroke="#8B3A3A"` (SVG attr) | Convert to `style={{stroke:'var(--brand-maroon)'}}` | F |
| `src/components/Tutorial.jsx` | 216 | `borderLeft: '3px solid #D4AF37'` | `var(--brand-gold)` | A |
| `src/components/Tutorial.jsx` | 229 | `color: '#8B3A3A'` (mailto link) | `var(--brand-maroon)` | A |
| `src/components/Tutorial.jsx` | 249 | `backgroundColor: i === idx ? '#8B3A3A' : '#D4D4D4'` (page dot) | `var(--brand-maroon)` | A |
| `src/components/Tutorial.jsx` | 258 | `backgroundColor: '#8B3A3A'` (Next button) | `var(--brand-maroon)` | A |
| `src/components/NextStepsDashboard.jsx` | 93 | `background: '#F5EFE0'` (card bg) | `var(--brand-cream)` | C |
| `src/components/NextStepsDashboard.jsx` | 100, 122, 134, 261, 294, 482, 739, 760, 767 | `color: '#8B3A3A'` (number/label/heading text) | `var(--brand-maroon)` | A |
| `src/components/NextStepsDashboard.jsx` | 118, 265, 270, 379, 765 | `color: '#D4AF37'` (gap number / WOW! callout) | `var(--brand-gold)` | A |
| `src/components/NextStepsDashboard.jsx` | 149 | `background: '#F5EFE0'` | `var(--brand-cream)` | C |
| `src/components/NextStepsDashboard.jsx` | 182 | `background: '#8B3A3A'` (CTA strip bg) | `var(--brand-maroon)` | A |
| `src/components/NextStepsDashboard.jsx` | 183, 380, 382, 387 | `color: '#F5EFE0'` (text on maroon strip — needs to read on Belmont Hill blue) | Keep `var(--brand-cream)` ONLY if BH cream is still readable on BH blue; otherwise hardcode `#FFFFFF` | C / D |
| `src/components/NextStepsDashboard.jsx` | 187, 372, 478 | `border: '1px solid #D4AF37'` | `var(--brand-gold)` | A |
| `src/components/NextStepsDashboard.jsx` | 477 | `background: '#F5EFE0'` | `var(--brand-cream)` | C |

---

### Student Profile — Financial Privacy + Cancel/Save buttons

| File | Line(s) | Current | Remediation | Cat |
|------|--------|---------|-------------|-----|
| `src/components/FieldGroup.jsx` | 66 | `color: '#8B3A3A'` (FieldGroup section title — drives the Financial Privacy section header) | `var(--brand-maroon)` | A |
| `src/pages/ProfilePage.jsx` | 357 | `accentColor: '#8B3A3A'` (financial privacy checkbox) | `var(--brand-maroon)` | A |
| `src/pages/ProfilePage.jsx` | 376 | `backgroundColor: '#F5EFE0'` (avatar fallback bg) | `var(--brand-cream)` | C |
| `src/pages/ProfilePage.jsx` | 389 | `color: '#8B3A3A'` (avatar initial fallback) | `var(--brand-maroon)` | A |
| `src/pages/ProfilePage.jsx` | 449 | `e.target.style.backgroundColor = '#F5EFE0'` (hover) | `var(--brand-cream)` | C |
| `src/pages/ProfilePage.jsx` | 643 | `color: '#8B3A3A'` (Cancel button) | `var(--brand-maroon)` | A |
| `src/pages/ProfilePage.jsx` | 653 | `backgroundColor: saving ? '#E8E8E8' : '#8B3A3A'` (Save Profile button) | `var(--brand-maroon)` | A |

**Note:** `src/components/SlideOutForm.jsx:241` (`backgroundColor: '#8B3A3A'` — Save Changes button) is the **admin slide-out form**, not the Profile page. Out of scope for Goal 2 unless Chris wants admin-side cleaned simultaneously. **Flag for confirmation.**

---

### Student Grit Fit Map — School details card / area counter circles / map legend

| File | Line(s) | Current | Remediation | Cat |
|------|--------|---------|-------------|-----|
| `src/components/SchoolDetailsCard.jsx` | 75 | `color: '#8B3A3A'` (card title) | `var(--brand-maroon)` | A |
| `src/components/SchoolDetailsCard.jsx` | 282 | `color: '#8B3A3A'` (Match Rank emphasis) | `var(--brand-maroon)` | A |
| `src/components/GritFitMapView.jsx` | 160 | `'background:#D4AF37;color:#8B3A3A;cursor:pointer;'` (popup "Add to Shortlist" btn) | `background:var(--brand-gold);color:var(--brand-maroon);` | A |
| `src/components/GritFitMapView.jsx` | 198 | popup heading `color:#8B3A3A` | `color:var(--brand-maroon)` | A |
| `src/components/GritFitMapView.jsx` | 241, 249 | popup link colors `#8B3A3A` | `var(--brand-maroon)` | A |
| `src/components/GritFitMapView.jsx` | 274 | cluster icon HTML: `background:rgba(139,58,58,0.85);border:2px solid #8B3A3A` (multi-school area counter circles) | `background:rgba(var(--brand-maroon-rgb),0.85);border:2px solid var(--brand-maroon)` | B |
| `src/components/GritFitMapView.jsx` | 293 | `const color = TIER_COLORS[school.type] \|\| '#8B3A3A'` (pin fallback) | Verify whether pin colors should brand-swap or stay as tier indicators (likely stay; flag) | — |
| `src/components/GritFitMapView.jsx` | 348 | `backgroundColor: '#F5EFE0'` (likely map legend background per spec) | `var(--brand-cream)` | C |
| `src/index.css` | 207, 212 | `.marker-cluster-* { background: rgba(139, 58, 58, ...) !important }` (Leaflet cluster overrides — applies globally) | Use `rgba(var(--brand-maroon-rgb), ...)` so cascade swaps with body class | E + B |

---

### Student Grit Fit — Title / scores / why-recommending / what-if / toggles / recalc / clear

| File | Line(s) | Current | Remediation | Cat |
|------|--------|---------|-------------|-----|
| `src/pages/GritFitPage.jsx` | 192 | `backgroundColor: recalculating ? '#E8E8E8' : '#D4AF37'` (Recalculate btn) | `var(--brand-gold)` | A |
| `src/pages/GritFitPage.jsx` | 218 | `color: '#8B3A3A'` (Clear all filters btn) | `var(--brand-maroon)` | A |
| `src/pages/GritFitPage.jsx` | 232 | `borderColor: '#8B3A3A'` (active filter dropdown) | `var(--brand-maroon)` | A |
| `src/pages/GritFitPage.jsx` | 342 | `border: '2px solid #8B3A3A'` (filter btn base) | `var(--brand-maroon)` | A |
| `src/pages/GritFitPage.jsx` | 664, 668 | error state — text + back-button bg `#8B3A3A` | `var(--brand-maroon)` | A |
| `src/pages/GritFitPage.jsx` | 713 | `color: '#8B3A3A'` ("Your Grit Fit Matches" title) | `var(--brand-maroon)` | A |
| `src/pages/GritFitPage.jsx` | 801, 802, 815, 816 | Map / Table view toggle btns — bg/text `#8B3A3A` (active/inactive) | `var(--brand-maroon)` | A |
| `src/pages/GritFitPage.jsx` | 872 | `color: '#8B3A3A'` (text-button) | `var(--brand-maroon)` | A |
| `src/components/grit-fit/AcademicRigorScorecard.jsx` | 79, 92 | hero score numbers `color: '#8B3A3A'` (Athletic Fit + Academic Rigor scores) | `var(--brand-maroon)` | A |
| `src/components/grit-fit/GritFitExplainer.jsx` | 35 | `borderLeft: '4px solid #8B3A3A'` ("Why Grit Fit is recommending" left rule) | `var(--brand-maroon)` | A |
| `src/components/grit-fit/WhatIfSliders.jsx` | 89 | `backgroundColor: isDirty ? '#8B3A3A' : '#E8E8E8'` (Apply btn) | `var(--brand-maroon)` | A |
| `src/components/grit-fit/WhatIfSliders.jsx` | 120 | `color: changed ? '#8B3A3A' : '#6B6B6B'` (changed-value emphasis) | `var(--brand-maroon)` | A |
| `src/components/grit-fit/WhatIfSliders.jsx` | 132 | `accentColor: '#8B3A3A'` (slider thumb) | `var(--brand-maroon)` | A |
| `src/components/GritFitTableView.jsx` | 159 | `color: '#D4AF37'` (sort arrow) | `var(--brand-gold)` | A |
| `src/components/GritFitTableView.jsx` | 231, 235 | filter pill border + bg `#8B3A3A` | `var(--brand-maroon)` | A |
| `src/components/GritFitTableView.jsx` | 279 | school-name heading `color: '#8B3A3A'` | `var(--brand-maroon)` | A |
| `src/components/GritFitTableView.jsx` | 313, 314 | "Add" pill bg+color `#D4AF37` / `#8B3A3A` | `var(--brand-gold)` / `var(--brand-maroon)` | A |
| `src/components/GritFitTableView.jsx` | 412 | `color: '#8B3A3A'` (school name in row) | `var(--brand-maroon)` | A |
| `src/components/GritFitTableView.jsx` | 455, 456 | another "Add" pill | as above | A |
| `src/components/GritFitTableView.jsx` | 530 | pagination active bg `#8B3A3A` | `var(--brand-maroon)` | A |
| `src/components/GritFitTableView.jsx` | 54, 402, 408 | header bg + alt-row bg `#F5EFE0` | `var(--brand-cream)` | C |

---

### Student Shortlist — Title / Scoreboard / Pre-Read / alt rows / school name

| File | Line(s) | Current | Remediation | Cat |
|------|--------|---------|-------------|-----|
| `src/pages/ShortlistPage.jsx` | 857, 861 | error path — text + button bg `#8B3A3A` | `var(--brand-maroon)` | A |
| `src/pages/ShortlistPage.jsx` | 875 | `color: '#8B3A3A'` ("Your Shortlist" title) | `var(--brand-maroon)` | A |
| `src/pages/ShortlistPage.jsx` | 890, 891 | empty-state CTA border + text | `var(--brand-maroon)` | A |
| `src/pages/ShortlistPage.jsx` | 928 | header text `#8B3A3A` | `var(--brand-maroon)` | A |
| `src/pages/ShortlistPage.jsx` | 948, 951 | filter btn border + text `#8B3A3A` | `var(--brand-maroon)` | A |
| `src/pages/ShortlistPage.jsx` | 1054 | `backgroundColor: '#F5EFE0'` (likely school-card alt bg) | `var(--brand-cream)` | C |
| `src/pages/ShortlistPage.jsx` | 1101 | `color: '#8B3A3A'` (text-link) | `var(--brand-maroon)` | A |
| `src/components/RecruitingScoreboard.jsx` | 783 | `color: '#8B3A3A'` (school name in scoreboard) | `var(--brand-maroon)` | A |
| `src/components/CollapsibleTitleStrip.jsx` | 55 | `backgroundColor: '#8B3A3A'` (strip bg) | `var(--brand-maroon)` | A |
| `src/components/CollapsibleTitleStrip.jsx` | 56 | `color: '#D4AF37'` (strip text — illegible scarlet-on-blue if swapped) | `var(--scoreboard-strip-text)` (defaults to gold; BH = white per spec) | D |
| `src/components/PreReadLibrary.jsx` | 143, 146 | share-button border + text `#8B3A3A` | `var(--brand-maroon)` | A |
| `src/components/PreReadLibrary.jsx` | 219, 222 | empty-state border + text `#8B3A3A` | `var(--brand-maroon)` | A |
| `src/components/ShortlistRow.jsx` | 36 | `const ROW_BG_ODD = '#F5EFE0'` | Replace with `'var(--brand-cream)'` (note: this constant is consumed at lines 137/152 via `MAROON` — verify; alt-row bg readability is preserved as long as `--brand-cream` BH value contrasts with white) | C |
| `src/components/ShortlistRow.jsx` | 40 | `const MAROON = '#8B3A3A'` (used lines 137, 152) | `'var(--brand-maroon)'` | A |
| `src/components/ShortlistRow.jsx` | 198 | `'var(--brand-cream, #F5EFE0)'` — **already correct**, just needs the token defined | None (confirm token is added) | — |
| `src/components/ShortlistRow.jsx` | 211 | `'var(--brand-maroon, #8B3A3A)'` — already correct | None | — |
| `src/components/ShortlistSlideOut.jsx` | 49 | `const MAROON = '#8B3A3A'` | `'var(--brand-maroon)'` | A |
| `src/components/ShortlistSlideOut.jsx` | 453, 455 | step-checkmark bg + border `#8B3A3A` | `var(--brand-maroon)` | A |
| `src/components/ShortlistFilters.jsx` | 140 | `color: '#8B3A3A'` (filter label) | `var(--brand-maroon)` | A |

**Boundary check needed:** `src/components/DocumentsSection.jsx` lines 25/28/130/265/266/267 — the per-school upload UI rendered inside Shortlist school cards. Spec calls "Pre-Read Docs Library" by name (handled above), but DocumentsSection is the closely-related upload+share UI in the same surface. **Recommend including; flag for Chris confirmation.** Same direct A-category swaps apply.

---

### Student View Mobile — Dropdown sandwich menu

| File | Line(s) | Current | Remediation | Cat |
|------|--------|---------|-------------|-----|
| `src/components/Layout.jsx` | 40 | `backgroundColor: '#7A3232'` (AvatarBadge fallback bg, not strictly mobile-menu but same token family) | `var(--brand-mobile-menu-bg)` or `var(--brand-maroon)` | D |
| `src/components/Layout.jsx` | 276 | `backgroundColor: '#7A3232'` (mobile dropdown bg — primary spec target) | `var(--brand-mobile-menu-bg)` | D |
| `src/components/Layout.jsx` | 293 | `borderLeft: isActive ? '3px solid #D4AF37' : ...` | `var(--brand-gold)` | A |
| `src/components/Layout.jsx` | 294 | `backgroundColor: isActive ? 'rgba(212,175,55,0.1)' : 'transparent'` | `rgba(var(--brand-gold-rgb), 0.1)` | B |

---

### Coach Dashboard — Home / Dashboard tab / Recruiting Intelligence / Reports

#### Coach Dashboard Home + Dashboard tab (CoachDashboardPage.jsx)

| File | Line(s) | Current | Remediation | Cat |
|------|--------|---------|-------------|-----|
| `src/pages/CoachDashboardPage.jsx` | 194, 217, 235, 259 | heading + error text `color: '#8B3A3A'` | `var(--brand-maroon)` | A |
| `src/pages/CoachDashboardPage.jsx` | 221 | error CTA bg `#8B3A3A` | `var(--brand-maroon)` | A |
| `src/pages/CoachDashboardPage.jsx` | 271, 272 | secondary action btn border + text | `var(--brand-maroon)` | A |
| `src/pages/CoachDashboardPage.jsx` | 300, 301 | tab select underline + text `#8B3A3A` | `var(--brand-maroon)` | A |

#### Coach Students / Player Card / Slide-out

| File | Line(s) | Current | Remediation | Cat |
|------|--------|---------|-------------|-----|
| `src/pages/coach/CoachStudentsPage.jsx` | 162, 242 | text-button color `#8B3A3A` | `var(--brand-maroon)` | A |
| `src/pages/coach/CoachStudentsPage.jsx` | 255, 256 | hover bg `#F5EFE0` + accent border `#D4AF37` | `var(--brand-cream)` / `var(--brand-gold)` | C / A |
| `src/pages/coach/CoachStudentsPage.jsx` | 271, 326, 327, 358 | various `#8B3A3A` (badges, links, btns) | `var(--brand-maroon)` | A |
| `src/components/CoachStudentCard.jsx` | 111, 119 | metric numbers `#8B3A3A` | `var(--brand-maroon)` | A |
| `src/components/CoachStudentCard.jsx` | 197 | `background: 'linear-gradient(90deg, #8B3A3A, #6B2C2C)'` | `linear-gradient(90deg, var(--brand-maroon), var(--brand-maroon-darker))` | C |
| `src/components/CoachStudentCard.jsx` | 251, 258 | hover-row bg `#F5EFE0` | `var(--brand-cream)` | C |
| `src/components/CoachStudentCard.jsx` | 267, 275, 313 | various pill bg/border `#D4AF37` / `#8B3A3A` | `var(--brand-gold)` / `var(--brand-maroon)` | A |
| `src/components/PlayerCard.jsx` | 22 | hover boxShadow `rgba(139,58,58,0.12)` + borderColor `#8B3A3A` | `rgba(var(--brand-maroon-rgb), 0.12)` / `var(--brand-maroon)` | B / A |
| `src/components/PlayerCard.jsx` | 26, 45, 106, 131, 134, 149 | top-strip + name + progress bar `#8B3A3A` | `var(--brand-maroon)` | A |
| `src/components/PlayerCard.jsx` | 32, 84, 92, 112 | role-pill bg/text `#D4AF37` / `#8B3A3A` | `var(--brand-gold)` / `var(--brand-maroon)` | A |
| `src/components/PlayerCard.jsx` | 43, 148 | avatar bg + footer bg `#F5EFE0` | `var(--brand-cream)` | C |

#### Coach Recruiting Intelligence (slide-out) + RJ tracker

| File | Line(s) | Current | Remediation | Cat |
|------|--------|---------|-------------|-----|
| `src/components/CoachSchoolDetailPanel.jsx` | 21 | hardcoded color in JOURNEY_PHASES const (`'committable_offer', color: '#8B3A3A'`) — phase tag color | `var(--brand-maroon)` (note: phase colors may be intentionally semantic; flag) | A / flag |
| `src/components/CoachSchoolDetailPanel.jsx` | 181, 217, 435, 439 | various `#8B3A3A` (panel title, score, btn) | `var(--brand-maroon)` | A |
| `src/components/CoachSchoolDetailPanel.jsx` | 208, 332 | section bg `#F5EFE0` | `var(--brand-cream)` | C |
| `src/components/CoachSchoolDetailPanel.jsx` | 211 | accent border `#D4AF37` | `var(--brand-gold)` | A |
| `src/components/RecruitingJourney.jsx` | 18 | hardcoded phase color in PHASE const `'#8B3A3A'` | `var(--brand-maroon)` (or keep semantic — flag) | A / flag |
| `src/components/RecruitingJourney.jsx` | 72, 90 | step bubble bg `#8B3A3A` | `var(--brand-maroon)` | A |
| `src/components/RecruitingJourney.jsx` | 161 | gradient `#8B3A3A → #6B2C2C` | `var(--brand-maroon)` → `var(--brand-maroon-darker)` | C |
| `src/pages/coach/CoachRecruitingIntelPage.jsx` | 31 | `const CREAM = '#F5EFE0'` | `var(--brand-cream)` (verify usage sites) | C |
| `src/components/DeadlinePercentileTracker.jsx` | 25 | `const CREAM = '#F5EFE0'` | `var(--brand-cream)` | C |

**"Showing ___ [Conference Name] schools" text** — exact source not yet pinpointed in this scan; will surface during fix-pass file reads. Flag for confirmation that it lives in `CoachRecruitingIntelPage.jsx` or a child component.

#### Coach Reports tab

| File | Line(s) | Current | Remediation | Cat |
|------|--------|---------|-------------|-----|
| `src/pages/coach/CoachReportsPage.jsx` | 127 | `border: zeroMatchCount > 0 ? '2px solid #8B3A3A' : '1px solid #E8E8E8'` (alert state) | `var(--brand-maroon)` | A |
| `src/pages/coach/CoachReportsPage.jsx` | 143, 235, 252, 293, 323 | metric numbers + text `#8B3A3A` / `#D4AF37` | `var(--brand-maroon)` / `var(--brand-gold)` | A |
| `src/pages/coach/CoachReportsPage.jsx` | 155, 157 | tab tracker border + text `#8B3A3A` | `var(--brand-maroon)` | A |
| `src/pages/coach/CoachReportsPage.jsx` | 228 | bar bg `#D4AF37` | `var(--brand-gold)` | A |
| `src/pages/coach/CoachReportsPage.jsx` | 269, 317 | section bg `#F5EFE0` | `var(--brand-cream)` | C |
| `src/pages/coach/CoachReportsPage.jsx` | 270, 318 | accent border `#D4AF37` | `var(--brand-gold)` | A |
| `src/components/CoachActivitySummary.jsx` | 87, 93, 99 | metric numbers `#8B3A3A` | `var(--brand-maroon)` | A |
| `src/components/CoachActivitySummary.jsx` | 147, 196 | bar fills `#D4AF37` / `#8B3A3A` | `var(--brand-gold)` / `var(--brand-maroon)` | A |

---

## 4. Out-of-Scope Files (Confirmed)

These contain `#8B3A3A`/`#D4AF37` but are NOT in Goal 2 surfaces. **No changes proposed unless Chris extends scope:**

- `src/pages/AdminLoginPage.jsx`, `src/pages/AdminPage.jsx`, `src/components/AdminUsersTab.jsx`, `src/components/AdminTableEditor.jsx` — admin
- `src/pages/LoginPage.jsx`, `src/pages/RegisterPage.jsx`, `src/pages/LandingPage.jsx` — public/auth
- `src/components/DualAdminIndicator.jsx`, `src/components/ErrorBoundary.jsx`, `src/components/PORTooltip.jsx` — shared infra (some of these may surface inside in-scope views; flag during fix-pass)
- `src/components/MoneyMap.jsx` — verify whether this is rendered inside Grit Fit; if yes, add to scope
- `src/pages/coach/CoachCalendarPage.jsx` — calendar tab not listed in Goal 2
- `src/components/scheduler/CoachSchedulerSection.jsx`, `src/components/styleguide/PlayerCardReference.jsx` — scheduler / styleguide
- `src/components/OfferBadge.jsx` — already uses `var(--brand-* , #fallback)` correctly

---

## 5. Open Questions Before Code Work

1. **Token values** — confirm BH values for `--brand-cream`, `--brand-maroon-darker`, `--brand-mobile-menu-bg` (Q1–Q3 above). These are aesthetic; need Chris's eye.
2. **Scoreboard strip text → white on Belmont Hill** — confirm Q4. The CSS comment in `CollapsibleTitleStrip.jsx:9-11` says "Color tokens sourced from src/index.css" but the file does NOT use `var()` — the comment is aspirational. Fix should both convert to vars AND add the `--scoreboard-strip-text` token.
3. **Phase-semantic colors** in `CoachSchoolDetailPanel.jsx:21` and `RecruitingJourney.jsx:18` — the `'committable_offer'` phase uses `#8B3A3A` as a semantic indicator, not a brand swap target. **Decision needed**: brand-swap (loses semantic uniqueness) or keep maroon (consistent across schools). Recommend: keep maroon for the offer-phase indicator since it's a fixed status color, not a brand decoration.
4. **Pin-color fallback in GritFitMapView.jsx:293** — `TIER_COLORS[school.type] || '#8B3A3A'` is a category-tier color, not brand. Recommend leave as-is.
5. **NextStepsDashboard text on maroon strip** (lines 183/380/382/387) — currently `#F5EFE0` text on maroon bg. On Belmont Hill, scarlet-tinted text on deep blue may fail contrast. Recommend `#FFFFFF` for those four call sites specifically (Category D), keep `--brand-cream` for surface backgrounds elsewhere.
6. **DocumentsSection inclusion** — explicit Chris confirmation for whether the per-school document share UI is in Goal 2 scope (it lives inside Shortlist school cards).
7. **`MoneyMap.jsx` inclusion** — verify whether MoneyMap surfaces inside Student Grit Fit (line 39 has `color: '#8B3A3A'` in `droi` config).

---

## 6. Implementation Order (Once Approved)

Suggested fix-pass sequence (to minimize regression risk):

1. **Stage 1 — Token additions**: edit `src/index.css` only. Add the six new tokens to `:root` (BC High defaults) and `body.school-belmont-hill` (Belmont Hill values). Move the `.marker-cluster-*` rules to use `rgba(var(--brand-maroon-rgb), α)`. Visual diff target: zero change on BC High; alt-row/cluster/etc. brand-swap on Belmont Hill.
2. **Stage 2 — Direct A-category swaps** (file-by-file): replace `'#8B3A3A'` → `'var(--brand-maroon)'`, `'#D4AF37'` → `'var(--brand-gold)'`, `'#7A3232'` → `'var(--brand-mobile-menu-bg)'`. Pure mechanical pass.
3. **Stage 3 — B-category** (rgba): replace `rgba(139,58,58,α)` → `rgba(var(--brand-maroon-rgb),α)` etc.
4. **Stage 4 — C-category** (cream/darker-maroon): replace `'#F5EFE0'` → `'var(--brand-cream)'`, gradient endpoints to `var(--brand-maroon-darker)`.
5. **Stage 5 — D/F-category**: scoreboard text override token, JourneyStepper SVG-attr → style conversion.
6. **Stage 6 — index.css cluster rule** moved to use rgb-channel token.

After each stage: visual sanity check on both `body.school-bc-high` and `body.school-belmont-hill` for any in-scope surface. Hold Playwright suite for stage 6 completion.

---

**END OF AUDIT — pending operator review before any code work begins.**
