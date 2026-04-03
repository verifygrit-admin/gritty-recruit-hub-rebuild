# gritty-recruit-hub-rebuild — Backlog

---

## BACKLOG-UI-001 — safeHref guard for DB-sourced href attributes
- **File:** src/pages/coach/CoachRecruitingIntelPage.jsx
- **What:** Add protocol validation guard to coach_link and prospect_camp_link href attributes. Block non-http(s) schemes (e.g., javascript:) at render time.
- **Fix:** ~2 lines — `const safeHref = (url) => /^https?:\/\//i.test(url) ? url : '#';`
- **Urgency:** Low — exploit requires a tampered schools table row
- **Owner:** Patch
- **Deadline:** None
- **Source:** Dexter credential scan, 2026-04-02 session
- **Status:** Open

---

## BACKLOG-DATA-001 — Re-import correct coach_link and prospect_camp_link for 5 contaminated schools
- **What:** Re-import coach_link and prospect_camp_link values for the 5 schools identified as contaminated during the 2026-04-02 data enhancement session. These schools currently hold string sentinels ('NOT_FOUND', 'Football Camp Link') or cross-contaminated URL values in one or both columns. Correct values must be sourced from the original Google Sheet and written as proper URLs or NULL.
- **Source:** Original Google Sheet (canonical per DEC-CFBRB-063). unitids: 130624, 173902, 191630, 168546, 165574.
- **Blocked by:** DEC-CFBRB-079 (dedup manual-over-auto fix) AND DEC-CFBRB-080 (NULL-not-string-sentinel fix) — both must be implemented and confirmed in import_ready_to_production.py before any re-import runs.
- **Owner:** Patch
- **Date:** 2026-04-03
- **Status:** Open

---

## BACKLOG-DATA-002 — Audit 296 schools with prospect_camp_link for cross-contamination
- **What:** Run a targeted audit of all 296 schools currently holding a prospect_camp_link value in the production DB. Compare link domains against expected school domains to identify any cross-contamination introduced during the 2026-04-02 data enhancement import. This audit must complete before the scraper session begins — the scraper will read existing values as a baseline and contaminated rows will propagate errors downstream.
- **Source:** Production Supabase DB — schools table, prospect_camp_link column. 296 rows populated as of 2026-04-02.
- **Blocked by:** None — can begin independently. Does not require DEC-CFBRB-079 or DEC-CFBRB-080 to be resolved first (this is a read-only audit).
- **Owner:** David (audit query) / Patch (any remediation)
- **Date:** 2026-04-03
- **Status:** Open
