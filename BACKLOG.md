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
- **UX Vectors:** [UX-COACH]

---

## BACKLOG-UI-002 — Wire document_shares data to Pre-Read Document status badge in CoachSchoolDetailPanel.jsx
- **File:** src/pages/coach/CoachSchoolDetailPanel.jsx
- **What:** Wire document_shares table data to the Pre-Read Document status badge. Badge is currently hardcoded with "Not Submitted" label. Conditional logic required to surface actual status from document_shares records.
- **Spec:** Quill (UX conditional logic) / Nova (implementation to spec only)
- **Implementation:** Fetch document_shares records for the current user_id + school_id pair. Map status field to badge display. Fallback to "Not Submitted" if no record found. Include loading state during fetch.
- **Urgency:** Session 016 Objective 5 (Coach Dashboard refinement phase)
- **Owner:** Quill (spec) / Nova (execution)
- **Deadline:** Session 016
- **Source:** Session 016 coach dashboard objective
- **UX Vectors:** [UX-COACH]
- **Status:** Open
- **Blocked by:** None

---

## BACKLOG-DATA-001 — Re-import correct coach_link and prospect_camp_link for 5 contaminated schools
- **What:** Re-import coach_link and prospect_camp_link values for the 5 schools identified as contaminated during the 2026-04-02 data enhancement session. These schools currently hold string sentinels ('NOT_FOUND', 'Football Camp Link') or cross-contaminated URL values in one or both columns. Correct values must be sourced from the original Google Sheet and written as proper URLs or NULL.
- **Source:** Original Google Sheet (canonical per DEC-CFBRB-063). unitids: 130624, 173902, 191630, 168546, 165574.
- **Blocked by:** DEC-CFBRB-079 (dedup manual-over-auto fix) AND DEC-CFBRB-080 (NULL-not-string-sentinel fix) — both must be implemented and confirmed in import_ready_to_production.py before any re-import runs.
- **Owner:** Patch
- **Date:** 2026-04-03
- **Status:** Open
- **UX Vectors:** (infrastructure — no vector)

---

## BACKLOG-DATA-002 — Audit 296 schools with prospect_camp_link for cross-contamination
- **What:** Run a targeted audit of all 296 schools currently holding a prospect_camp_link value in the production DB. Compare link domains against expected school domains to identify any cross-contamination introduced during the 2026-04-02 data enhancement import. This audit must complete before the scraper session begins — the scraper will read existing values as a baseline and contaminated rows will propagate errors downstream.
- **Source:** Production Supabase DB — schools table, prospect_camp_link column. 296 rows populated as of 2026-04-02.
- **Blocked by:** None — can begin independently. Does not require DEC-CFBRB-079 or DEC-CFBRB-080 to be resolved first (this is a read-only audit).
- **Owner:** David (audit query) / Patch (any remediation)
- **Date:** 2026-04-03
- **Status:** Open
- **UX Vectors:** [UX-COACH], [UX-ATHLETE]

---

## BACKLOG-DATA-003 — Schema gap — no confirmation_status column for coach_link/prospect_camp_link source tracking
- **What:** DEC-CFBRB-082 Condition 3 remediation revealed no mechanism exists in the schools table to distinguish manually_confirmed vs auto_confirmed link values. If future data pipelines need overwrite protection, add coach_link_source and camp_link_source columns (enum: auto, manual, null). This capability is carry-forward infrastructure — no schema addition required before Objective 4.
- **Description:** Future enhancement for data governance. When data pipelines source links from different providers (Serper scraper, manual verification, import batch), the system currently has no way to record or enforce that a manually-verified link should not be overwritten by an auto-sourced value. This backlog item is reserved for Phase 2+ when governance controls become necessary.
- **Owner:** Patch (schema) / David (data governance)
- **Priority:** LOW
- **Date:** 2026-04-07
- **Status:** Open
- **UX Vectors:** [UX-COACH], [UX-ATHLETE]
- **Blocked by:** None
- **Blocks:** None

---

## BACKLOG-DATA-004 — Vermont State University prospect_camp_link recency review
- **What:** Vermont State University (unitid 231165) prospect_camp_link points to castletonsports.com — a legacy domain from Castleton University (merged into Vermont State in 2023). This URL is a known exception per DEC-CFBRB-095 and represents legitimate legacy branding, not cross-contamination. However, Vermont State may transition camp branding to a unified Vermont State domain at some future date. This backlog item is reserved for periodic freshness review to confirm the URL remains current.
- **Source:** DEC-CFBRB-095 (Vermont State Castleton Legacy Exception)
- **Owner:** David
- **Priority:** LOW
- **Date:** 2026-04-07
- **Status:** Open
- **UX Vectors:** [UX-COACH], [UX-ATHLETE]
- **Blocked by:** None
- **Blocks:** None
- **Review trigger:** If Vermont State announces a migration of prospect camp infrastructure to a unified Vermont State domain, revisit this URL and update if necessary.
