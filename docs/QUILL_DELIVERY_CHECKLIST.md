# QUILL DELIVERY — UX SPECS COMPLETE

**Date:** 2026-03-24
**Delivered by:** Quill (Executive Assistant)
**For:** Chris (Operator), Scout (Compliance Authority), Nova (Orchestrator)
**Status:** Complete — Ready for Phase 1 Implementation Gate

---

## DELIVERABLES CHECKLIST

All UX specifications for Phase 1 MVP student experience have been completed and are ready for review.

### Core Specs (7 Documents)

- [x] **DESIGN_SYSTEM.md** — Complete color palette, typography, component tokens, accessibility rules
  - BC High Eagles reference image analyzed
  - Maroon (#8B3A3A) + Gold (#D4AF37) primary palette defined
  - All semantic colors (Success, Warning, Error, Info) defined
  - Contrast ratios verified (all WCAG AA compliant)
  - Responsive breakpoints established (Mobile, Tablet, Desktop)

- [x] **UX_SPEC_LANDING.md** — Post-login entry point
  - Two equal-weight paths: Browse (full map) vs GRIT FIT (personalized 30)
  - Welcome section with profile status indicator
  - Conditional states for incomplete profiles and stale GRIT FIT
  - Help section with FAQ links
  - Responsive card layout

- [x] **UX_SPEC_GRITFIT_MAP.md** — Interactive Leaflet map showing 30 matches
  - Marker colors by athletic tier (Power 4, G5, FCS, D2, D3, FBS Ind)
  - Cluster handling at low zoom levels
  - Search/filter interface (Conference, Division, State)
  - Detail popups with "Add to Shortlist" action
  - Recalculate button for profile changes
  - Toggle to Table View

- [x] **UX_SPEC_GRITFIT_TABLE.md** — Data table with 30 ranked schools
  - Sortable columns (Rank, School, Division, Distance, Score, Cost)
  - Filterable by Conference, Division, State
  - Pagination (10, 25, 50 per page)
  - Mobile card layout fallback
  - "Add to Shortlist" action per row
  - Toggle to Map View

- [x] **UX_SPEC_SHORTLIST.md** — Persistent student-curated collection
  - Per-school cards with status badges (Currently Recommended, Out of Reach, etc.)
  - 15-step recruiting journey (expandable accordion with checkboxes)
  - File upload section (7 document types, coach visibility constraints)
  - Filter/sort controls (by status, division, distance)
  - Action buttons (Edit, View on Map, Remove)
  - Empty state messaging

- [x] **UX_SPEC_PROFILE_FORM.md** — GRIT FIT data collection form
  - 5 sections: Athletic Stats, Academic Stats, Location, Financial, Social
  - Progress bar showing completion %
  - Inline validation with specific error messages
  - Edit mode (pre-populates, recalculates on submit)
  - All required fields marked with "*"
  - Responsive single-column on mobile

- [x] **UX_SPEC_AUTH_FLOWS.md** — Complete authentication journey
  - Student signup: Email/Password → School Selection → Coach Auto-Link → Profile Form → Results
  - Student login: Email/Password → Dashboard (with session restore)
  - Coach signup: Email/Password → School Selection → Dashboard
  - Coach login: Email/Password → Dashboard
  - Password reset flow with email link
  - Logout with confirmation modal
  - Session management (getSession() not getUser())

### Summary Document (1 Document)

- [x] **UX_SPECS_SUMMARY.md** — Executive overview
  - One-paragraph description of each completed spec
  - Pending specs and blockers
  - Open decisions awaiting Chris input (8 critical questions)
  - File locations and sign-off requirements
  - Next steps for implementation teams

---

## SPECIFICATION QUALITY CHECKS

All specs include the following sections (where applicable):

- [x] **Overview & Design Intent** — Why this screen exists, design principles applied
- [x] **Layout Mockups** — ASCII mockups showing structure and hierarchy
- [x] **Detailed Component Specs** — Field-by-field, button-by-button descriptions
- [x] **Styling Specifications** — Colors, fonts, spacing, shadows (all tied to DESIGN_SYSTEM.md)
- [x] **Interaction Specifications** — What happens on click, hover, focus, error states
- [x] **Responsive Design** — Behavior on Mobile (< 768px), Tablet (768–1023px), Desktop (≥ 1024px)
- [x] **Accessibility Notes** — Screen reader support, keyboard navigation, focus indicators, color contrast
- [x] **State Management & Data Flow** — How data moves through the system
- [x] **Validation Rules** — Required fields, format rules, error messages
- [x] **Implementation Notes** — Owner, dependencies, key decisions for implementation teams
- [x] **Approval Gate** — Who must sign off before implementation can proceed

---

## DESIGN SYSTEM COMPLIANCE

All 6 UX specs (Landing, Map, Table, Shortlist, Profile, Auth) have been verified for consistency with DESIGN_SYSTEM.md:

- [x] **Colors:** All specs use primary palette (Maroon, Gold, Cream) + semantics (Success, Warning, Error, Info)
- [x] **Typography:** All headings follow H1–H4 scale; all body text uses defined font stacks
- [x] **Spacing:** All margins/padding use 4px base unit (xs=4, sm=8, md=16, lg=24, xl=32, 2xl=48)
- [x] **Components:** Buttons, cards, forms, inputs all styled per design system tokens
- [x] **Accessibility:** All color combinations meet 4.5:1 contrast minimum; focus indicators defined
- [x] **Responsive:** All specs address Mobile, Tablet, Desktop breakpoints explicitly

---

## COVERAGE BY USER TYPE

### Student-Athlete (Primary User)

**Covered:**
- [x] Landing page (post-login entry point)
- [x] GRIT FIT results (Map View + Table View)
- [x] Shortlist (persistent, with recruiting journey + file uploads)
- [x] Profile form (data input for GRIT FIT algorithm)
- [x] Signup flow (email/password → school → profile → results)
- [x] Login flow (email/password → dashboard)
- [x] Password reset
- [x] Session restore (on app load)

**Not Covered (Phase 2):**
- Parent notifications
- Email preferences
- Historical profile versioning
- Performance metrics dashboard

### High School Coach (Secondary User)

**Covered:**
- [x] Signup flow (email/password → school → dashboard)
- [x] Login flow (email/password → dashboard)
- [x] Coach dashboard (roster overview, student shortlist visibility)
  - **Note:** Detailed spec pending (Task #7) but architecture defined

**Not Covered (Phase 2):**
- Batch student uploads
- Student profile editing permissions
- Multi-school management
- Advanced recruiting analytics

### High School Guidance Counselor (Tertiary User — Scope TBD)

**Status:** MVP scope awaiting Chris decision

**Option A (Include in MVP):**
- [x] Signup flow (email/password → school → dashboard)
- [x] Login flow (email/password → dashboard)
- [x] Counselor dashboard (read-only student roster + file uploads)
  - **Note:** Spec pending (Task #8) pending scope confirmation

**Option B (Phase 2 Only):**
- No counselor features in MVP, fully deferred to Phase 2

---

## CRITICAL QUESTIONS FOR CHRIS

Before implementation can begin, please confirm your answers to these 8 questions:

### Question 1: Guidance Counselor Scope

**Current Assumption:** Phase 2 (deferred)

**Question:** Should guidance counselors be included in Phase 1 MVP?

- [ ] Yes, include in MVP (Option A) — Counselors sign up like coaches, see student roster (read-only), can upload files
- [ ] No, defer to Phase 2 (Option B)

**Impact if changed:** Auth flows, Dashboard design, permissions model

---

### Question 2: Admin Account Activation

**Current Assumption:** Dashboard-only (Chris activates seeded accounts via Supabase console, no in-app UI)

**Question:** How should seeded MVP accounts be activated?

- [ ] Option A: In-app admin UI (Chris uses app to select and activate users)
- [ ] Option B: Dashboard-only (Chris activates via Supabase, no in-app UI needed)
- [ ] Option C: Automatic on first login (users self-activate)

**Impact if changed:** Task #11 scope, implementation complexity

---

### Question 3: Coach Visibility of Student Progress

**Current Assumption:** Coaches see individual school-by-school recruiting journey progress + aggregated summaries

**Question:** What should coaches see in the dashboard?

- [ ] Full detail (roster + individual school progress + 15-step journey per school + aggregated summary)
- [ ] Aggregated only (roster + recruiting activity summary by conference/division, no individual school details)

**Impact if changed:** Coach Dashboard design complexity

---

### Question 4: Financial Aid Document Visibility

**Current Assumption:** Enforced at both UI and database levels (RLS policy + hidden button)

**Question:** How strictly should the "Coach cannot see Financial Aid Info" constraint be enforced?

- [ ] Strict: Both UI hidden (button) + RLS policy prevents access
- [ ] Loose: UI hides the button, but RLS policy is defensive only
- [ ] RLS only: Button is visible, but RLS policy prevents actual access

**Impact if changed:** Supabase Storage permissions, Shortlist UI design

---

### Question 5: Profile Edit Flow for First-Time Users

**Current Assumption:** Optional — If profile incomplete, show landing page with reminder, let student choose

**Question:** What should happen if a student completes signup but doesn't fill their profile?

- [ ] Option A: Forced completion (route to `/profile/form` until complete)
- [ ] Option B: Optional (show landing page, student chooses when to complete)
- [ ] Option C: Reminder toast (show landing page with prominent notification)

**Impact if changed:** Session restore logic, auth flow UX

---

### Question 6: GRIT FIT Recalculation Timing

**Current Assumption:** Auto-calculate on profile edit (student sees status flags update in shortlist)

**Question:** When should GRIT FIT results be recalculated?

- [ ] Option A: Auto-recalculate immediately on profile edit (status flags update in real-time)
- [ ] Option B: Manual only (student clicks "[⟲ Recalculate]" button)
- [ ] Option C: Auto in background, also allow manual recalculate

**Impact if changed:** Shortlist and Map View interaction logic

---

### Question 7: Browse Map Access (Anonymous Users)

**Current Assumption:** Yes — full 662-school map is accessible without login

**Question:** Should the Browse Map be available to anonymous (logged-out) users?

- [ ] Yes, open access (hook for new visitors, no account required)
- [ ] No, require login (limit map to authenticated users only)

**Impact if changed:** Landing page design, product strategy (discoverability)

---

### Question 8: Shortlist Sort Default

**Current Assumption:** Name (A–Z)

**Question:** What should be the default sort order when students first view their shortlist?

- [ ] Name (A–Z)
- [ ] Added (newest first)
- [ ] Distance (closest first)
- [ ] No default (show in insertion order)

**Impact if changed:** Shortlist UX behavior

---

## PENDING SPECS (BLOCKED ON DECISIONS)

The following specs are awaiting your decisions above:

1. **Coach Dashboard (Task #7)** — Blocked on Question 3 (what coaches should see)
2. **Guidance Counselor Dashboard (Task #8)** — Blocked on Question 1 (MVP scope)
3. **Admin Activation Flow (Task #11)** — Blocked on Question 2 (activation method)

Once you answer these questions, Quill will complete the pending specs and deliver them to Scout for implementation sequencing.

---

## NEXT STEPS (AFTER YOUR APPROVAL)

### For You (Chris)

1. Read all 7 specs (estimated 90 minutes)
2. Answer the 8 critical questions above
3. Approve or request revisions

### For Scout (After Your Approval)

1. Review all specs for compliance with PROJECT_BRIEF, AUTOMATION_ARCHITECTURE, and agent scope boundaries
2. Confirm spec authority assignments (Quill as design authority, Nova for implementation, Morty for auth, Patch for storage, etc.)
3. Create Phase 1 working groups based on Directive Part 6
4. Schedule spec sign-off sessions with implementation owners

### For Nova & Team (After Scout Gates the Specs)

1. Design System → Nova creates Tailwind config / CSS modules
2. Auth Flows → Morty implements Supabase auth (new project)
3. Landing, Map, Table, Shortlist, Profile → Nova builds components
4. Coach Dashboard, Counselor Dashboard → Nova builds (once specs finalized)
5. File uploads → Patch configures Supabase Storage + RLS policies
6. Testing → Quin designs test specs per PROTO-GLOBAL-015 (Task Open)

---

## SIGN-OFF AUTHORITY ASSIGNMENTS

Once you confirm the specs, here's who must sign off before implementation:

| Spec | Design Authority | Implementation Owner | Sign-Off Required |
|---|---|---|---|
| DESIGN_SYSTEM | Quill | Nova | Nova confirms Tailwind feasibility |
| Landing | Quill | Nova | Chris (product) |
| GRIT FIT Map | Quill | Nova | Nova (Leaflet integration) |
| GRIT FIT Table | Quill | Nova | Nova (table architecture) |
| Shortlist | Quill | Nova | Patch (file upload scope) |
| Profile Form | Quill | Nova | Patch (data storage) |
| Auth Flows | Quill | Morty | Morty (Supabase feasibility) |
| Coach Dashboard | Quill | Nova | David (aggregation queries) |
| Counselor Dashboard | Quill | Nova | Scope decision first |
| Admin Activation | Quill | Nova | Scope decision first |

---

## DOCUMENT LOCATIONS

All UX specs are in: `C:\Users\chris\dev\gritty-recruit-hub-rebuild\docs\`

```
gritty-recruit-hub-rebuild/
└── docs/
    ├── cfb-rebuild-phase1-directive.md (your original 565-line directive)
    ├── DESIGN_SYSTEM.md (NEW — color palette, typography, components)
    ├── UX_SPEC_LANDING.md (NEW — post-login entry point)
    ├── UX_SPEC_GRITFIT_MAP.md (NEW — interactive map with 30 schools)
    ├── UX_SPEC_GRITFIT_TABLE.md (NEW — ranked table with 30 schools)
    ├── UX_SPEC_SHORTLIST.md (NEW — persistent shortlist + recruiting journey)
    ├── UX_SPEC_PROFILE_FORM.md (NEW — GRIT FIT input form)
    ├── UX_SPEC_AUTH_FLOWS.md (NEW — signup, login, password reset)
    ├── UX_SPECS_SUMMARY.md (NEW — executive overview + open questions)
    └── QUILL_DELIVERY_CHECKLIST.md (THIS FILE)
```

---

## APPROVALS

### Quill (Design Authority)

- [x] All 7 specs completed
- [x] Design System applied consistently across all specs
- [x] Accessibility requirements met (WCAG AA compliant)
- [x] Responsive design verified (Mobile, Tablet, Desktop)
- [x] Ready for implementation

**Signature:** Quill, Executive Assistant
**Date:** 2026-03-24
**Status:** Complete and ready for Chris review

---

### Chris (Operator — Your Action Required)

Please confirm:

- [ ] I have read all 7 UX specs
- [ ] I have answered the 8 critical questions above
- [ ] I approve these specs to proceed to Scout for compliance review
- [ ] I have noted any revisions or changes needed

**Your signature:** ___________________
**Date:** _________________
**Status:** Awaiting your approval

---

### Scout (Compliance Authority — Next Gate)

Once Chris approves, Scout will:

- [ ] Review all specs for compliance with PROJECT_BRIEF, AUTOMATION_ARCHITECTURE, AGENT_ROSTER
- [ ] Confirm domain authority assignments (Quill as UX, Nova as implementation, etc.)
- [ ] Identify any scope conflicts or out-of-scope work
- [ ] Schedule spec sign-off sessions with implementation owners
- [ ] Clear implementation gate (PROTO-GLOBAL-015 Task Open)

**Status:** Blocked until Chris approval

---

## REVISION HISTORY

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-03-24 | Quill | Initial delivery — 7 complete specs + summary |

---

## CONTACT & ESCALATION

If you have questions about these specs before approving:

- **Design questions:** Ask Quill directly
- **Product/scope questions:** Ask Scout (routes to Chris)
- **Technical feasibility questions:** Ask Nova or relevant domain owner (Morty for auth, Patch for storage, etc.)
- **Compliance or governance questions:** Ask Scout

---

*Quill Delivery Complete — UX specifications ready for Phase 1 MVP implementation*

**Delivered:** 2026-03-24
**By:** Quill (Executive Assistant)
**For:** Scout (Compliance Authority), Nova (Orchestrator), Chris (Operator)
