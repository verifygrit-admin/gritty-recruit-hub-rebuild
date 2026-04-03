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
