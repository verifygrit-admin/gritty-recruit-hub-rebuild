# UX SPECS SUMMARY — PHASE 1 MVP

**Status:** Complete — Ready for review
**Date:** 2026-03-24
**Authority:** Quill (UX/UI Design)
**Scope:** Student experience, coach dashboard (partial), authentication, admin flow (TBD)

---

## COMPLETED SPECS

All specifications follow the BC High Eagles design system (maroon + gold palette, clear hierarchy, confident branding).

### 1. Design System (DESIGN_SYSTEM.md)

**What it covers:**
- Primary palette (Maroon #8B3A3A, Gold #D4AF37, Cream #F5EFE0)
- Neutrals (Charcoal, Stone Gray, Light Gray, White)
- Semantic colors (Success, Warning, Error, Info)
- Status flag colors (GRIT FIT fit indicators)
- Typography scale (H1–H4, Body, etc.)
- Spacing & rhythm (4px base unit, xs–2xl)
- Component tokens (buttons, cards, forms, nav)
- Accessibility requirements (contrast ratios, focus states, touch targets)
- Responsive breakpoints (Mobile < 768px, Tablet 768–1023px, Desktop ≥ 1024px)

**Design authority:** Quill
**Sign-off required:** Nova (for Tailwind config), Scout (compliance check)

---

### 2. Landing Page (UX_SPEC_LANDING.md)

**What it covers:**
- Post-login entry point for students
- Two equal-weight paths: Browse (full 662-school map) vs GRIT FIT (personalized 30-school results)
- Welcome section with profile status indicator
- Conditional states (profile incomplete, GRIT FIT stale, etc.)
- Help section (collapsible links to FAQ)
- Responsive design (stacks cards on mobile)

**Key decisions:**
- Browse Map and GRIT FIT cards are equally prominent (no primary/secondary weighting)
- Help links are collapsible, not external pages
- Profile edit button always visible

**Design authority:** Quill
**Sign-off required:** Nova, Chris (product confirmation)

---

### 3. GRIT FIT Map View (UX_SPEC_GRITFIT_MAP.md)

**What it covers:**
- Interactive Leaflet.js map showing 30 personalized schools
- School markers colored by athletic tier (Power 4, G5, FCS, D2, D3, FBS Ind)
- Marker clusters at low zoom levels
- Layer control (Schools by Tier, State boundaries, School name labels)
- Search/filter interface (Conference, Division, State dropdowns)
- Click → Detail popup with school info + "Add to Shortlist" button
- Recalculate button (re-runs GRIT FIT, updates shortlist status flags)
- Toggle to Table View

**Reuse from CFB-mapping:**
- Leaflet.js map initialization
- School markers and color-coding by tier
- Layer controls
- Zoom controls

**Design authority:** Quill
**Sign-off required:** Nova (Leaflet integration), Chris (product)

---

### 4. GRIT FIT Table View (UX_SPEC_GRITFIT_TABLE.md)

**What it covers:**
- Data table showing up to 30 schools, ranked by match score
- Sortable columns: Rank, School, Division, Distance, Score, Cost
- Filterable by Conference, Division, State
- Pagination (10, 25, 50 per page)
- Mobile: Collapses to card layout
- "Add to Shortlist" button per row
- Toggle to Map View

**Key decisions:**
- Server-side or client-side filtering? → Client-side for MVP (30 schools is small)
- Expand detail row? → Not in MVP (basic 7-column table only)
- Sort persistence? → Yes, persists across navigation

**Design authority:** Quill
**Sign-off required:** Nova (table component architecture), Chris (product)

---

### 5. Student Shortlist (UX_SPEC_SHORTLIST.md)

**What it covers:**
- Persistent, student-curated collection of schools
- Per-school card layout with:
  - Status badge (Currently Recommended, Out of Academic Reach, etc.)
  - 15-step recruiting journey (expandable accordion)
  - File upload section (7 document types, coach visibility rules)
  - Action buttons (Edit, View on Map, Remove)
- Filter by status, division, conference
- Sort by name, added date, distance
- Empty state (if no schools yet)

**Key decisions:**
- Journey steps are JSON in DB (not separate DB columns)
- Status flags update automatically when GRIT FIT recalculates
- Coach cannot see Financial Aid Info documents
- File upload via Supabase Storage

**Design authority:** Quill
**Sign-off required:** Nova, Patch (file upload scope), Chris (product)

---

### 6. GRIT FIT Profile Form (UX_SPEC_PROFILE_FORM.md)

**What it covers:**
- Data collection for GRIT FIT algorithm (4 gates)
- Section 1: Athletic Stats (Position, Height, Weight, 40-time, Accolades)
- Section 2: Academic Stats (GPA, SAT, Grad Year)
- Section 3: Location (Home City/State for distance calculation)
- Section 4: Financial (AGI, Dependents)
- Section 5: Social (Twitter, Phone, Parent Email — optional)
- Progress bar (optional)
- Form validation with inline error messages
- Edit mode (pre-populates current values, re-runs GRIT FIT on submit)

**Key decisions:**
- Parent email is informational only in MVP (Phase 2 implements notifications)
- SAT only (no ACT conversion in MVP)
- Height/Weight are free-text with validation (not pre-computed lists)
- All required fields marked with "*"

**Design authority:** Quill
**Sign-off required:** Nova, Patch (data storage), Chris (product)

---

### 7. Authentication Flows (UX_SPEC_AUTH_FLOWS.md)

**What it covers:**
- Student signup flow: Email/Password → School Selection → Coach Auto-Link → Profile Form → GRIT FIT Results
- Student login flow: Email/Password → Dashboard (with session restore)
- Coach signup flow: Email/Password → School Selection → Coach Dashboard
- Coach login flow: Email/Password → Coach Dashboard
- Password reset flow: Email request → Reset link → New password form
- Logout flow: Confirmation modal → Clear session
- Session management (restore on app load)
- Guidance counselor flow (MVP scope TBD)

**Key decisions:**
- Auth-first architecture: User created in auth.users before any app data
- getSession() used (not getUser()) to avoid network calls in CI
- Generic error messages (don't reveal if email is registered)
- No email verification required for MVP
- No MFA or social login in MVP
- Guidance counselor scope: Awaiting Chris decision (Option A: included, Option B: Phase 2)

**Design authority:** Quill
**Sign-off required:** Morty (implementation), Chris (scope confirmation)

---

## PENDING SPECS (NOT YET STARTED)

### 8. Coach Dashboard (Task #7)

**Planned scope:**
- Student roster (all students at coach's school)
- For each student: Shortlist schools + recruiting journey progress
- Recruiting activity summary (aggregated by conference/division, not individual school names)
- Filter/sort by student name, activity level, grad year

**Design authority:** Quill
**Sign-off required:** Nova, David (aggregation query logic), Chris (product)

**Status:** Pending (Task #7)

---

### 9. Guidance Counselor Dashboard (Task #8)

**Status:** PENDING CHRIS DECISION

**Option A (Include in MVP):**
- Counselors sign up like coaches (email, password, school selection)
- Dashboard shows all students at school (read-only)
- Can upload files on behalf of students
- Can view shortlists and recruiting progress

**Option B (Phase 2 Only):**
- No counselor features in MVP
- Deferring to Phase 2

**Awaiting:** Chris decision on scope
**Status:** Blocked until Chris answers

---

### 10. File Upload/Download Interface (Task #9)

**Planned scope:**
- Per-school file uploads (7 document types)
- Coach visibility constraint (cannot see Financial Aid Info)
- Upload/download/delete actions
- File metadata display (date, size, type)

**Note:** File upload UI is partially covered in UX_SPEC_SHORTLIST.md. This task would create a detailed standalone spec if needed, or could be merged into Shortlist spec.

**Status:** Can be merged into Shortlist spec (already detailed) or stand-alone as Task #9

---

### 11. Admin Activation Flow (Task #11)

**Planned scope:**
- How does Chris activate seeded MVP accounts (2 coaches, 3 counselors, students)?
- Does admin UI exist in the app, or is it dashboard-only?
- Screen design: email list, select users, activate button, confirm

**Status:** Pending (Task #11)

---

### 12. UX Spec Review & Sign-Off (Task #12)

**Scope:**
- Cross-check all specs for consistency with DESIGN_SYSTEM.md
- Verify color usage, typography, spacing rules
- Check for missing interactive states (hover, focus, disabled, loading, error)
- Verify file upload constraints are consistent across specs
- Verify GRIT FIT status flag display is consistent

**Status:** Pending until all specs are complete

---

## CRITICAL QUESTIONS FOR CHRIS

These questions must be answered before implementation can proceed:

### 1. Guidance Counselor Scope (Task #8)

**Question:** Should guidance counselors be included in Phase 1 MVP, or deferred to Phase 2?

**Option A (MVP):** Counselors sign up like coaches, see student roster (read-only), can upload files
**Option B (Phase 2):** No counselor features in MVP

**Impact:** Affects authentication, dashboard design, permissions model

---

### 2. Admin Account Activation

**Question:** How should seeded MVP accounts be activated?

**Option A (In-App Admin UI):** Chris uses a special admin screen in the app to select and activate users
**Option B (Dashboard-Only):** Chris activates users via Supabase dashboard (no in-app UI needed)
**Option C (Automatic on First Login):** Users self-activate by signing up with seeded email addresses

**Impact:** Affects scope of admin-related features, Task #11

---

### 3. Coach Visibility of Student Progress

**Question:** Should coaches see individual school-by-school recruiting journey progress, or only aggregated summaries?

**Current Assumption:** Coaches see:
- Student roster (names, grad year, position)
- For each student: Their shortlisted schools
- For each shortlisted school: Progress through 15-step recruiting journey
- Recruiting activity aggregated by conference/division (e.g., "Engaged with 3 ACC schools")

**Alternative:** Coaches see only aggregated view (no individual school progress)

**Impact:** Affects Coach Dashboard design (Task #7)

---

### 4. File Upload Constraints (Coach Visibility)

**Question:** Should the constraint "Coach cannot see Financial Aid Info" be enforced at the UI level (button hidden), the database level (RLS policy), or both?

**Current Assumption:** Both — UI hides the document type for coaches, RLS policies prevent access

**Impact:** Affects Supabase Storage permissions, Shortlist UI design

---

### 5. Profile Edit Flow (First-Time Users)

**Question:** If a student completes signup but doesn't fill their profile form, what should happen on their next login?

**Option A (Forced Completion):** Route directly to `/profile/form` until profile is complete
**Option B (Optional):** Show landing page, let them choose (Browse or complete profile first)
**Option C (Reminder Toast):** Show landing page with prominent reminder toast

**Current Assumption:** Option B (optional, student choice)

**Impact:** Affects session restore logic in auth flows

---

### 6. GRIT FIT Recalculation Timing

**Question:** When should GRIT FIT results be recalculated?

**Option A (On Every Profile Edit):** Auto-recalculate immediately when student edits profile
**Option B (On-Demand Only):** Student clicks "[⟲ Recalculate]" button manually
**Option C (Both):** Auto-calculate in background, but also allow manual recalculate

**Current Assumption:** Option A (auto-recalculate, with status flags updating in shortlist)

**Impact:** Affects UX in Shortlist and Map View

---

### 7. Browse Map (Anonymous Access)

**Question:** Should the full 662-school Browse Map be accessible to anonymous (logged-out) users?

**Current Assumption:** Yes — Browse Map is a hook for new visitors, no account required

**Alternative:** Require login to access any map view

**Impact:** Affects landing page design and overall product strategy

---

### 8. Shortlist Sorting Defaults

**Question:** What should be the default sort order when students first view their shortlist?

**Options:** Name (A–Z), Added (newest first), Distance (closest), or no default (show in insertion order)

**Current Assumption:** Name (A–Z)

**Impact:** Affects Shortlist UX (Task #5)

---

## OPEN DECISIONS

| Item | Current Assumption | Awaiting | Impact |
|---|---|---|---|
| Guidance Counselor MVP Scope | Phase 2 deferred | Chris | Auth, Dashboard design |
| Admin Activation Method | Dashboard-only or in-app UI? | Chris | Task #11 scope |
| Coach Visibility of Individual School Progress | Yes, coaches see full journey | Chris | Coach Dashboard design |
| Financial Aid File Visibility Enforcement | Both UI + RLS | Chris | Shortlist + Supabase scope |
| Profile Edit (Forced vs Optional) | Optional | Chris | Auth flow logic |
| GRIT FIT Recalculation | Auto-recalculate on edit | Chris | Map/Shortlist interaction |
| Browse Map (Anonymous Access) | Yes, available to all | Chris | Landing page + product strategy |
| Shortlist Sort Default | Name (A–Z) | Chris | Shortlist UX |

---

## SPECIFICATIONS NOT YET ADDRESSED

### Out of Scope (Phase 2)

Per Directive Part 5:
- Parent accounts and parent-student linking
- College coach accounts and permission-gated access
- College admissions officer accounts
- Batch upload of student profiles by coaches
- Payment/billing/subscription enforcement
- Email notifications (beyond existing Supabase Edge Functions)
- Historical profile versioning and audit log
- Advanced reporting and analytics dashboard
- Multi-school coach accounts
- Mobile app, desktop app, integrations

### Skipped for MVP (MVP Clarification Needed)

- Guidance counselor features (tentative Phase 2, awaiting Chris)
- Email verification on signup
- MFA / Two-factor authentication
- Social login (Google, GitHub, etc.)
- ACT score support (SAT only in MVP)
- Profile draft-saving (form only saves on submit)
- Email notifications to parents/coaches
- Student-to-student messaging
- College coach access to student profiles
- Recruiting workflow automation

---

## FILE LOCATIONS

All UX specs are in: `C:\Users\chris\dev\gritty-recruit-hub-rebuild\docs\`

| File | Size | Date |
|---|---|---|
| `DESIGN_SYSTEM.md` | ~8 KB | 2026-03-24 |
| `UX_SPEC_LANDING.md` | ~12 KB | 2026-03-24 |
| `UX_SPEC_GRITFIT_MAP.md` | ~18 KB | 2026-03-24 |
| `UX_SPEC_GRITFIT_TABLE.md` | ~16 KB | 2026-03-24 |
| `UX_SPEC_SHORTLIST.md` | ~22 KB | 2026-03-24 |
| `UX_SPEC_PROFILE_FORM.md` | ~20 KB | 2026-03-24 |
| `UX_SPEC_AUTH_FLOWS.md` | ~24 KB | 2026-03-24 |
| **Total** | **~120 KB** | **Comprehensive MVP specs** |

---

## NEXT STEPS

**For Chris (Approval):**
1. Review all 7 specs (DESIGN_SYSTEM + 6 UX specs)
2. Answer the 8 critical questions above
3. Approve or request revisions

**For Quill (After Chris Approval):**
1. Incorporate feedback into specs
2. Create Coach Dashboard spec (Task #7)
3. Clarify Guidance Counselor scope (Task #8)
4. Create Admin Activation spec if needed (Task #11)
5. Final consistency review (Task #12)

**For Nova & Team (After Quill Sign-Off):**
1. Design System → Tailwind config / CSS modules
2. Auth Flows → Morty implementation (Supabase auth)
3. Landing, GRIT FIT, Shortlist → Nova component builds
4. Profile Form → Nova + validation
5. Coach Dashboard → Nova (once spec complete)

---

## DESIGN PRINCIPLES APPLIED

**Across All Specs:**

1. **BC High Eagles branding** — Maroon + Gold palette conveys confidence and official authority
2. **Clear hierarchy** — Primary actions (GRIT FIT) are visually distinct from secondary (Browse)
3. **Progress indication** — Users always know where they are (landing → profile → results)
4. **Mobile-first responsive** — All specs designed for 3 breakpoints (mobile, tablet, desktop)
5. **Accessibility-first** — All specs include WCAG AA contrast, focus states, screen reader support
6. **Data transparency** — Status flags and progress indicators keep users informed
7. **Minimal friction** — Forms are short, optional fields are clearly marked, errors are specific
8. **Component reuse** — Design system defines buttons, cards, inputs once; specs reference them consistently

---

*UX Specs Summary v1.0 — Complete and ready for Chris review*
