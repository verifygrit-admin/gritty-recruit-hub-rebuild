# Recruiting Scoreboard Prototype

A read-only, sortable progress lens that mounts above the Pre-Read Docs Library on the existing Shortlist page. Tracks each shortlisted school's progress across seven Key Recruiting Journey Steps and combines that progress with the student's Athletic Fit Score (from the Grit Fit Engine) into a single Offer Profile metric.

This folder contains the visual ground truth for the upcoming sprint. Code builds against this prototype; the prototype is not a live build target.

## Status

**Prototype:** Locked. Ayden Watkins's data, 27 schools, all formulas final.
**Sprint:** Pending kickoff. Sprint number TBD.
**Owner WG:** Shortlist UI working group (proposed; confirm at session open).
**Decision logs to file before kickoff:**
- `DEC-CFBRB-XXX` locking the prototype as canonical for the sprint
- `DEC-CFBRB-XXX` locking the Offer Profile = Quality × Athletic Fit formula
- `DEC-CFBRB-XXX` locking the UConn FBS Independent → G6 mapping

## Files in this folder

| File | Purpose |
|---|---|
| `recruiting-scoreboard.html` | Visual ground truth. Single-file HTML prototype. Do not modify during the sprint. |
| `DESIGN_NOTES.md` | Locked decisions with rationale. The "why" document. |
| `SPEC_FOR_CODE.md` | Build-time spec. Database mapping, integration constraints, the contract. |
| `README.md` | This file. |

## What the Scoreboard does

The Scoreboard renders one row per school in the student's current shortlist. Each row shows:

1. Rank, UNITID, College, Division — identity columns
2. **Seven** read-only boolean "Yes/No" cells in total, split across two visual groups:
   - **Key Recruiting Journey Steps** (5 cells): HC Contact, AC Contact, Jr Day Invite, FB Camp Invite, Tour / Visit Confirmed
   - **Offers** (2 cells): Admissions Pre-Read Requested, Financial Aid Pre-Read Submitted
3. Quality Offer Score — count of completed booleans across all seven cells ÷ 7, expressed as a percentage
4. Compound Profile — three stacked bars: Quality, Athletic Fit, and Profile (Quality × Athletic Fit)

The table sorts descending by Offer Profile. A boundary marker row inserts at the 35% threshold, separating active prospects above from lower-priority outreach below. The threshold is tunable; it lives in one constant in the JS and may need adjustment during the build based on real student data.

## Critical constraints

**Read-only data flow.** The Scoreboard never edits journey-step state directly. Booleans update only when the student marks a step complete on the school card itself, downstream in the existing Shortlist UI. The Scoreboard is a lens onto database state, not an editor.

**Shortlist-bounded.** The Scoreboard only contains schools currently in the student's shortlist. Add a school to the shortlist → it appears on the Scoreboard. Remove → it disappears. Same source of truth, different rendering.

**Additive integration.** The Scoreboard mounts as a new collapsible above the Pre-Read Docs Library on the existing Shortlist page. Everything else on that page (Pre-Read Docs Library, filter bar, sort dropdown, school cards, status pills, burgundy/parchment chrome) stays byte-identical. The sprint must not refactor or modify any existing component on the Shortlist page.

**No "Offer Likelihood" column in the database.** The Scoreboard pulls Athletic Fit Score from the existing Grit Fit Scoring Engine — no schema migration required. Each school's Athletic Fit = the student's score for that school's level of competition (Power 4 / G6 / FCS / D2 / D3).

## Dependencies

**Resolved:**
- Athletic Fit Scores per level (P4 / G6 / FCS / D2 / D3): live in Grit Fit Engine, accessible from student profile
- Burgundy/parchment palette: established in existing Shortlist View (Image 2 reference)
- Boolean Yes/No semantic colors: tuned versions in prototype CSS
- UConn FBS Independent → G6 mapping: locked

**Unresolved — needs sanity check before build:**
- Which seven of the 15-step Recruiting Journey schema fields drive the Quality Offer Score? The prototype assumes the seven shown in the screenshot data. Patch must validate column names and confirm the student-school relationship structure supports per-school journey state.
- Threshold tuning: 35% is a defensible starting point under the multiplicative formula, but Scout/Patch should validate against real student data during the build. The constant lives in `renderScoreboard()` as `PROFILE_THRESHOLD`.

## Sprint scope (recommended)

In scope:
- Build the collapsible Scoreboard component matching the prototype
- Wire the seven journey-step booleans to live database state (read-only)
- Wire the Athletic Fit Score per school's level to the Grit Fit Engine
- Implement the multiplication formula and 35% boundary
- Mount above the Pre-Read Docs Library on the Shortlist page
- Sanity-check the seven field mappings against the Supabase schema before any UI work begins

Out of scope:
- Editable booleans on the Scoreboard itself
- Offer Likelihood as a separate database field
- Modifications to Pre-Read Docs Library, filter bar, sort dropdown, or school cards
- Cross-student rollups (this is per-student only)
- Mobile-specific Scoreboard treatment is IN SCOPE for Sprint 007 per Phase B Addition. Mobile pattern decision and verification at 375px and 414px are B.1 acceptance criteria.

## Template note

This is a template for use with all students in the GrittyOS Recruit Hub, not just Ayden Watkins. Ayden's data is in the prototype because he was the most recent student worked through the Gritty Guide pipeline. Once the Scoreboard is built and wired, every student's Shortlist page renders their own Scoreboard from their own data. No per-student variant is needed.

## How to view the prototype

Open `recruiting-scoreboard.html` in any modern browser. No build step, no dependencies. Single file.

## Related artifacts

- Ayden Watkins Gritty Guide: `grittyos-guides/recruits/watkins/index.html` (separate repo)
- Grit Fit Scoring Engine: existing module in this repo (path TBD per Code's discovery at sprint start)
- 15-step Recruiting Journey schema: existing Supabase schema (Patch to identify exact tables at sprint start)
