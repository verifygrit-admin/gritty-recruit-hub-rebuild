# WORKPLAN — Session 6 War Room
**Date:** 2026-03-26
**Deadline:** Friday noon EST (2026-03-28)
**Reference:** Phase 1 MVP Review PDF (Chris, 2026-03-26)

---

## TIER 1 — FUNCTIONAL BLOCKERS (parallel)

### Nova-A: GRIT FIT Recalculation — COMPLETE
- **Problem:** Scoring engine does not recalculate after profile save/update
- **Fix:** profileUpdatedAt signal in AuthContext, auto-recalc effect in GritFitPage, navigate to /gritfit after save
- **Files:** useAuth.jsx, ProfilePage.jsx, GritFitPage.jsx

### Nova-B: Head Coach + Counselor Confirmation — COMPLETE
- **Problem:** No way for students to confirm head coach or guidance counselor
- **Fix:** Coach dropdown (query hs_coach_schools by hs_program_id), insert hs_coach_students + auto-associate assistants, counselor dropdown after coach confirmed
- **Files:** ProfilePage.jsx, new migration 0015_student_coach_counselor_select_policies.sql
- **Note:** Migration 0015 must be applied to live Supabase

### Nova-C: Document Upload Fix — COMPLETE
- **Problem:** Uploaded files not visible or downloadable
- **Fix:** createSignedUrl download path (60s expiry), Download button in DocumentsSection
- **Files:** ShortlistPage.jsx, ShortlistCard.jsx, DocumentsSection.jsx

### Nova-D: Browse Map Anonymous Routing — COMPLETE
- **Problem:** Browse Map sends anonymous users to login
- **Fix:** Standalone BrowseMapPage at /browse-map (no ProtectedRoute), 662 schools, search/filter, school detail popups, CTA banner
- **Files:** new BrowseMapPage.jsx, App.jsx, LandingPage.jsx

---

## TIER 2 — UI/UX (after Tier 1)

- **Vault:** Retrieve from cfb-recruit-hub + hs-fbcoach-dash — COMPLETE (VAULT_CFB_ASSET_RETRIEVAL.md)
- **Quill:** UX spec from Vault retrieval — Chris approves before Nova builds — PENDING
- **Nova:** Font modernization — Playfair Display + DM Sans pairing sitewide — PENDING

---

## TIER 3 — CONTENT/LABEL FIXES (after Tier 1)

1. Welcome header -> student first name not "Athlete"
2. Nav headers ALL CAPS, GRIT FIT -> MY GRIT FIT
3. GRITTY RECRUIT HUB -> [School Name] RECRUIT HUB using hs_programs school_name
4. Cost -> Your Annual Cost in table view
5. Score column -> ADTLV in table view
6. Documents -> Pre-Read Documents in shortlist
7. Net Cost -> Annual Net Cost on shortlist cards
8. Grad Rate -> Degree Payback Period (yrs) — confirm field mapping with Vault
9. School Profile button -> Contact Coaches on school detail cards
10. Shortlist sort buttons — add DROI, Annual Net Cost, Fastest Payback

---

## Gates

- Scout holds all push gates — no push without Scout confirmation
- No push without Dexter PASS
- Quill spec approved by Chris before any Tier 2 build
