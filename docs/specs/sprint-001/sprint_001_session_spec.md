# Sprint 001 Session Spec: Admin View Schema Remediations

**Repo:** gritty-recruit-hub-rebuild
**Mode:** Sprint
**Source spec:** Gritty_OS_Recruit_Hub_-_Development_Sprint_Spec_Outline_-_Admin_Schema_Corrections.pdf
**Reference docs:**
- Sprint 001 spec PDF: `C:\Users\chris\dev\gritty-recruit-hub-rebuild\docs\specs\sprint-001\spec.pdf`
- ERD current state: `C:\Users\chris\dev\gritty-recruit-hub-rebuild\docs\superpowers\specs\erd-current-state.md`
- Asset Infrastructure Plan (Part 1 asset taxonomy only): `C:\Users\chris\.knowing\wiki\Asset-Infrastructure-Strategic-Plan.md`

---

## Skills in Use

### Sprint-native (default invocation)
- **task-open** (SKILL-001) — session start
- **writing-plans** — sprint plan authoring
- **executing-plans** — step-by-step execution with checkpoints
- **test-driven-development** — acceptance criteria before code
- **verification-before-completion** — punch list check before close
- **task-close** (SKILL-002) — session end

### Sprint-adjacent (invoke only if scope surfaces the need)
- **systematic-debugging** — for POR tooltip root cause work specifically
- **dispatching-parallel-agents** / **subagent-driven-development** — if deliverables truly parallelize
- **using-git-worktrees** — if parallel work requires isolated staging
- **requesting-code-review** / **receiving-code-review** — end of sprint before merge

### Sprint-peripheral (do not invoke this sprint)
- brainstorming (requirements discovery already complete)
- finishing-a-development-branch (end-of-sprint only)
- writing-skills, using-superpowers (not applicable to build work)
- All third-party Obsidian skills (obsidian-markdown, obsidian-bases, json-canvas, obsidian-cli) — these belong to governance mode and should not operate against the product repo during sprint sessions

---

## Scope (4 deliverables)

1. **Tab Remediation** — Remove Schools tab. Retain Institutions, Users, Recruiting Events, Audit Log.
2. **Users Tab Toggle Remediation** — Restructure field headers across all six toggles per spec.
3. **POR Tooltip Fix** — Debug and fix "Athletes Interested" data not populating on Institutions tooltip.
4. **Global Admin Page Formatting** — Apply row limiters (25/50/100, default 25), sortable sticky headers across all remaining tabs.

---

## Done State Checklist

### Deliverable 1: Tab Remediation
- [ ] Schools tab removed from Admin navigation
- [ ] Remaining tab order: Users, Institutions, Recruiting Events, Audit Log
- [ ] No regression in Institutions tab data display
- [ ] Any Schools-tab-specific code/components removed or cleanly deprecated

### Deliverable 2: Users Tab Toggle Remediation

**Accounts toggle:**
- [ ] Field headers in order: ID, Created, User Type, Full Name, Email, Password, Email Verified, Status
- [ ] User Type field derived from existing joins (junction tables) — no schema migration
- [ ] All six user categories represented in User Type values

**Student Athletes toggle:**
- [ ] Field headers unchanged in content, "First Name" + "Last Name" collapsed to "Full Name"
- [ ] Final order: ID, Full Name, Position, Recruiting Status, Grad Year, Height, Weight, 40yd, AGI, Captain, All-Conf, All-State, Starter, GPA, SAT

**College Coaches toggle:**
- [ ] Displays "No college coaches found" message
- [ ] No field headers rendered (data pipeline not yet complete — intentional)

**HS Coaches toggle:**
- [ ] Field headers: ID, Full Name, Phone, Head Coach, School, Created
- [ ] "First Name" / "Last Name" collapsed to "Full Name"

**Counselors toggle:**
- [ ] Field headers: ID, Full Name, Phone, Head Coach, School, Created
- [ ] "First Name" / "Last Name" collapsed to "Full Name"

**Parents toggle:**
- [ ] Field headers: Email, Associated Student Athlete
- [ ] Email derived from Student Athlete data
- [ ] Associated Student Athlete derived from Student Athlete data

### Deliverable 3: POR Tooltip — Athletes Interested

- [ ] Root cause identified for why tooltip shows "Not Available" when data exists
- [ ] Fix applied at the query/join layer, not hard-coded to specific schools
- [ ] Bates College tooltip displays Ayden Watkins and Jesse Bargar
- [ ] Thomas Girmay's short-list schools all show Thomas Girmay in their Athletes Interested tooltip
- [ ] At least one additional school (not Bates) verified to display its correct interested athletes
- [ ] No school with zero short-list entries shows false-positive data

### Deliverable 4: Global Admin Page Formatting

- [ ] Row limiter dropdown on all remaining tabs: 25, 50, 100
- [ ] Default row count: 25
- [ ] Pagination controls functional on all tabs (Previous / Next / page indicator)
- [ ] Field headers sortable on all tabs (click to sort ascending, click again for descending)
- [ ] Field headers sticky to top of viewport during scroll on all tabs

---

## Acceptance Tests

### Tab Remediation
- Load Admin View. Confirm 4 tabs visible in correct order. Click each — no errors, data renders.

### Users Tab Toggles
- Click each of 6 toggles. Confirm field headers match spec exactly.
- Accounts toggle: verify User Type column populates correctly by spot-checking one known user from each category.
- Parents toggle: verify at least one parent email renders with correct Associated Student Athlete link.

### POR Tooltip
- Hover/click Bates College row. Confirm Ayden Watkins and Jesse Bargar appear under Athletes Interested.
- Hover/click each school on Thomas Girmay's short list. Confirm Thomas Girmay appears in each.
- Hover/click one additional school with known interest data. Confirm correct athletes appear.
- Hover/click a school with zero interest data. Confirm "Not Available" or empty state, not error.

### Global Formatting
- On each tab, change row limiter from 25 to 50 to 100. Confirm correct row count renders.
- On each tab, scroll past initial rows. Confirm headers stay visible.
- On each tab, click a sortable header. Confirm data sorts. Click again. Confirm reverse sort.

---

## Known Assumptions and Carry-Forward Triggers

**Assumption (Deliverable 2, Accounts User Type):** User Type is derivable from existing junction tables (hs_coach_students, hs_counselor_students, hs_coach_schools, hs_counselor_schools, and student_athlete / college_coach membership). If during implementation this proves insufficient and a schema column is required, stop work on the Accounts toggle User Type field, complete the other deliverables, and record as carry-forward: *"Accounts toggle User Type field requires schema migration — defer to Sprint 002."*

**Assumption (Deliverable 3, POR Tooltip):** The issue is a join or query problem, not a data problem. If during debugging it becomes clear that the Athletes Interested data is missing at the database level (not just failing to render), stop and record as carry-forward: *"POR tooltip data gap at DB layer, not render layer — requires data investigation in next session."*

**Out of scope for Sprint 001:**
- College Coaches scraping/staging/migration pipeline
- Additional Institutions tab fields beyond current rendered state
- Any schema migrations

---

## Session Opening Prompt (first paste to Claude Code)

```
Working in gritty-recruit-hub-rebuild on Admin View remediations.

Before any code changes, read:
1. C:\Users\chris\dev\gritty-recruit-hub-rebuild\docs\superpowers\specs\erd-current-state.md
2. The current Admin view component(s) — locate them and confirm the file paths

Then report back:
- Current file paths for Admin view components (by tab and toggle)
- Which Supabase tables/joins currently feed each tab and toggle
- Any discrepancies between the ERD doc and the actual Supabase schema you can detect from the codebase

Do not make any changes yet. This is a read-and-report step to confirm ground truth before we execute four deliverables.
```

---

## Session Close (done-state artifact)

One-line entry when sprint completes:

```
Sprint 001: Admin View schema remediations complete. Tabs reduced to 4. Users toggles restructured per spec. POR tooltip fixed at join layer. Row limiters + sticky sortable headers global. Tests: pass. Blockers: [none / list].
```
