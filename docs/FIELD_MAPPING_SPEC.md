# Field Mapping Spec — Jesse Bargar Workbook Import
**Status:** DRAFT — spec only. No data has moved. Import is HELD pending migration 0014 confirmation.
**Decisions confirmed:** 2026-03-26
**Authored by:** David (Data Steward)

---

## Source and Target

| Item | Value |
|------|-------|
| Source workbook | Jesse Bargar — GritOS - CFB Recruiting Center - Jesse Bargar 2027 |
| Workbook ID | 1uCbOSTVwnlR1mDa5ZzcuUeHAfe25qmtlSNqut-A7B-U |
| Target Supabase project | xyudnajzhuwdauwkwsbh |
| Import hold condition | Migration 0014 (coach_contact JSONB column on short_list_items) must be confirmed live before any data movement |

---

## Header Row Offsets

| Tab | Header row | First data row | Notes |
|-----|-----------|---------------|-------|
| GRIT FIT Profile | TBD — confirm before import | TBD | Contains student identity + AGI fields |
| GRIT FIT Results | Row 9 | Row 10 | Confirmed from prior session |
| Short List Results | Row 8 | Row 9 | Confirmed via GWS extraction 2026-03-26 |
| Pre-Offer Tracking | TBD — confirm before import | TBD | Boolean step columns |
| Recruiting Scoreboard | TBD — confirm before import | TBD | Boolean step columns |

---

## Table: profiles

**Source tab:** GRIT FIT Profile
**Target table:** `profiles`
**Decision reference:** Decision 4 (AGI + dependents are student-level profile fields, not import metadata)

| Sheet Label | Supabase Column | Type | Transform | Notes |
|-------------|----------------|------|-----------|-------|
| Student-Athlete (name) | `full_name` | text | Trim whitespace | |
| High School | `high_school` | text | Trim whitespace | |
| Class (graduation year) | `graduation_year` | integer | Parse 4-digit year | e.g., "2027" -> 2027 |
| Primary Position | `primary_position` | text | Trim whitespace | |
| SAID | DISCARD | — | Do not import | DEC-CFBRB-002 — SAID removed from rebuild entirely |
| AGI (Adjusted Gross Income) | `agi` | numeric | Strip "$" and commas, cast to numeric | Decision 4 — student-level profile field |
| Number of Dependents | `dependents` | integer | Cast to integer | Decision 4 — student-level profile field |
| Email | `email` | text | Normalize to lowercase | Also the auth identifier — must match auth.users record |

**Import note:** The `profiles` row must be inserted first. All `short_list_items` and `recruiting_journey_steps` rows reference this profile via `user_id`. If the auth user does not yet exist, a seeded user record must be created before profile insert.

---

## Table: short_list_items

**Source tabs:** GRIT FIT Results (primary scoring data) + Short List Results (camp links, display metadata)
**Target table:** `short_list_items`
**Join key between tabs:** School Name / unitid — confirm join logic before import; the workbook may not carry unitid in all tabs
**Decision references:** Decision 1 (coach_contact JSONB), Decision 3 (net_cost = four-year post-EFC estimate), Decision 5 (camp_link via includeGridData)

| Sheet Label | Tab | Col | Supabase Column | Type | Transform | Notes |
|-------------|-----|-----|----------------|------|-----------|-------|
| School Name | Short List Results | A | `school_name` | text | Trim whitespace | Also use to join to GrittyOS DB for unitid lookup |
| UNITID | Short List Results | B | `unitid` | integer | Cast to integer | Confirm col B is UNITID — verified 2026-03-26 (e.g., row 9 = "166683" for Franklin & Marshall) |
| Division/Conference | Short List Results | C | — | — | Do not import as column | Used for display only; canonical source is GrittyOS DB via unitid |
| Col D (boolean) | Short List Results | D | TBD | boolean | "TRUE"/"FALSE" string to boolean | Column header label TBD — confirm in workbook |
| Col E (boolean) | Short List Results | E | TBD | boolean | "TRUE"/"FALSE" string to boolean | Column header label TBD — confirm in workbook |
| Col F (boolean) | Short List Results | F | TBD | boolean | "TRUE"/"FALSE" string to boolean | Column header label TBD — confirm in workbook |
| Tier label | Short List Results | G | `tier` | text | Store as-is | e.g., "3-Div III" |
| Camp Link (col H) | Short List Results | H | `camp_link` | text | Extract hyperlink URL via includeGridData — NOT formattedValue | Decision 5. Display text is unreliable; URL is the target value. See Camp Link extraction results below. |
| Net Cost (est. 4-yr) | GRIT FIT Results | C | `net_cost` | numeric | Strip "$" and commas, cast to numeric | Decision 3 — confirmed as estimated four-year net cost post-EFC |
| GRIT FIT Score | GRIT FIT Results | TBD | `grit_fit_score` | numeric | Cast to numeric | Confirm column in tab |
| College Coach Name | GRIT FIT Results | TBD | `coach_contact` (JSONB) | jsonb | Build JSON object: {"name": "...", "title": "...", "email": "...", "phone": "..."} | Decision 1 — migration 0014. IMPORT BLOCKED until 0014 confirmed live. |
| College Coach Title | GRIT FIT Results | TBD | coach_contact JSONB key | — | Fold into coach_contact object | |
| College Coach Email | GRIT FIT Results | TBD | coach_contact JSONB key | — | Fold into coach_contact object | |
| College Coach Phone | GRIT FIT Results | TBD | coach_contact JSONB key | — | Fold into coach_contact object | |
| (row source tag) | — | — | `source` | text | Set literal value 'grit_fit' for all rows | Not in workbook — set at import time |

**JSONB coach_contact shape (Decision 1):**
```json
{
  "name": "Coach Full Name",
  "title": "Recruiting Coordinator",
  "email": "coach@school.edu",
  "phone": "555-000-0000"
}
```
Keys with no data in the workbook should be set to null, not omitted. This preserves consistent shape for downstream queries.

---

## Table: recruiting_journey_steps

**Source tabs:** Pre-Offer Tracking + Recruiting Scoreboard
**Target table:** `recruiting_journey_steps`
**Decision reference:** Decision 2 (Pre-Read Invite and FA Info Submit are DISTINCT steps; Followed on X and X DM Sent are DISTINCT steps — do not fold)

| Sheet Label | Tab | Step ID | Supabase Column | Notes |
|-------------|-----|---------|----------------|-------|
| Pre-Read Invite | Pre-Offer Tracking | 12 | `completed` = true/false | Decision 2 — distinct from all other steps |
| FA Info Submit | Pre-Offer Tracking | 13 | `completed` = true/false | Decision 2 — distinct from Pre-Read Invite |
| Followed on X | Recruiting Scoreboard | TBD | `completed` = true/false | Decision 2 — distinct step, do not fold with X DM Sent |
| X DM Sent | Recruiting Scoreboard | TBD | `completed` = true/false | Decision 2 — distinct step, do not fold with Followed on X |
| (all other boolean columns) | Pre-Offer Tracking / Scoreboard | TBD | `completed` = true/false | Map each boolean column to its step_id — full column-to-step_id map TBD; requires tab audit before import |

**Step_id assignment note:** Step IDs 12 and 13 are confirmed for Pre-Read Invite and FA Info Submit respectively (Decision 2). All other step IDs must be confirmed against the `journey_step_definitions` table (or equivalent) in Supabase before import. Do not assign step IDs without that confirmation.

**Future automation candidates (noted, not scoped):**
- Followed on X: candidate for future automation via communications layer
- X DM Sent: candidate for future automation via communications layer
Neither is in Phase 1 import scope.

---

## Camp Link Extraction Results

**Source:** Short List Results tab, column H, rows 9-41
**Method:** GWS CLI with `includeGridData=true`, 2026-03-26
**Source artifact:** Sheet ID 1uCbOSTVwnlR1mDa5ZzcuUeHAfe25qmtlSNqut-A7B-U (not the GrittyOS Master DB)

### Rows with hyperlink URL populated (23 rows)

| Row | School Name | Display Text | URL |
|-----|-------------|-------------|-----|
| 9 | Franklin and Marshall College | Link | https://www.blueandwhitefootballcamps.com/ |
| 10 | Dickinson College | Link | https://dickinsonathletics.com/sports/2022/7/25/camps-and-clinics.aspx |
| 11 | Muhlenberg College | Link | https://www.muhlenbergfootballcamp.com/ |
| 16 | Ithaca College | Empire Elite | https://newenglandelitefootballclinic.com/one-day-clinics/ |
| 18 | Utica University | TNT Football Camps | at Utica University | https://www.tntfootballcamps.com/ |
| 20 | University of Rochester | Link | https://rochesterfootball.totalcamps.com/shop |
| 22 | Chapman University | West Coast Elite Football Clinic: Home | https://westcoastelitefootballclinic.com/home/ |
| 23 | University of Redlands | West Coast Elite Football Clinic: Home | https://westcoastelitefootballclinic.com/home/ |
| 24 | Middlebury College | Link | https://middleburycollegefootballcamps.totalcamps.com/ |
| 26 | Williams College | Link | https://www.purpleandgoldfootballcamps.com/ |
| 27 | Amherst College | Link | https://amherstfootball.totalcamps.com/ |
| 28 | Trinity College | Link | https://trinityuniversityfootballcamps.totalcamps.com/ |
| 29 | Hamilton College | Link | https://www.continentalfootballcamp.com/ |
| 30 | Tufts University | Link | https://newenglandelitefootballclinic.com/home/ |
| 31 | Bates College | Bates College Football | Lewiston, Maine | https://www.bobcatfootballclinics.com/ |
| 32 | Bowdoin College | Link | https://www.polarbearfootballcamps.com/ |
| 34 | Lawrence University | Lawrence University Football Camps | https://www.lawrencefootballcamps.com/ |
| 36 | Kenyon College | Link | https://athletics.kenyon.edu/sb_output.aspx?form=18 |
| 37 | Denison University | Link | https://www.denisonfootballcamps.com/ |
| 38 | Worcester Polytechnic Institute | WPI Football Camps & Clinics | https://wpifootballcampsandclinics.totalcamps.com/ |
| 39 | St Olaf College | 2025 St. Olaf Football Prospect Camp Registration | https://athletics.stolaf.edu/sb_output.aspx?form=91 |
| 40 | William Paterson University of New Jersey | college coaches showcase camp | metuchen, nj | https://www.collegefootballprospects.com/metuchen-newjersey.cfm |
| 41 | Carleton College | *** WORKBOOK ERROR — RESOLVED 2026-03-26 — see correction note below *** | https://wesleyanfootballcamps.ryzerevents.com/ (belongs to Wesleyan, not Carleton) |

### Rows with display text only — no hyperlink (10 rows)

These rows have text content in col H but no extractable hyperlink URL. The display text appears to reference shared camp aggregators (Red & Black, NE Elite, Empire Elite) rather than school-specific pages. Camp URL for these schools cannot be imported from col H as-is.

| Row | School Name | Display Text | Disposition |
|-----|-------------|-------------|-------------|
| 12 | Johns Hopkins University | Red & Black, NE Elite | No URL — defer to Phase 2 or manual lookup |
| 13 | Carnegie Mellon University | Red & Black, NE Elite | No URL — defer to Phase 2 or manual lookup |
| 14 | Gettysburg College | Red & Black, NE Elite | No URL — defer to Phase 2 or manual lookup |
| 15 | Union College | Red & Black, NE Elite | No URL — defer to Phase 2 or manual lookup |
| 17 | Hobart William Smith Colleges | Empire Elite, NE Elite | No URL — defer to Phase 2 or manual lookup |
| 19 | St Lawrence University | Empire Elite, NE Elite | No URL — defer to Phase 2 or manual lookup |
| 21 | The Catholic University of America | Red & Black, NE Elite | No URL — defer to Phase 2 or manual lookup |
| 25 | Colby College | Red & Black, NE Elite | No URL — defer to Phase 2 or manual lookup |
| 33 | Wesleyan University | Red & Black, NE Elite | No URL — defer to Phase 2 or manual lookup |
| 35 | Oberlin College | Red & Black, NE Elite | No URL — defer to Phase 2 or manual lookup |

### DATA QUALITY CORRECTION — Row 41, Carleton College — RESOLVED 2026-03-26

**Finding:** Col H row 41 has a hyperlink URL of `https://wesleyanfootballcamps.ryzerevents.com/` with display text "Wesleyan University Football Camps | Middletown, CT". Col A row 41 = Carleton College.

**Root cause:** Workbook copy-paste error. The Wesleyan camp link was entered in Carleton's row (H41). Wesleyan (row 33) has "Red & Black, NE Elite" display text with no hyperlink — the actual Wesleyan camp URL was misplaced into H41 instead.

**Confirmed by Chris: 2026-03-26.** This is a workbook error.

**Corrected import mapping:**
- Row 33 — Wesleyan University: `camp_link` = `https://wesleyanfootballcamps.ryzerevents.com/`
- Row 41 — Carleton College: `camp_link` = null (correct URL TBD — do not import H41 value)

**Status:** RESOLVED — no further confirmation required before import.

---

## Unmapped Fields

| Field | Source Tab | Reason | Disposition |
|-------|-----------|--------|-------------|
| SAID | GRIT FIT Profile | DEC-CFBRB-002 — SAID removed from rebuild | DISCARD — do not import |
| Conference | Short List Results col C | Canonical source is GrittyOS DB, not workbook | Derive from GrittyOS DB via unitid after import |
| Boolean cols D, E, F (Short List Results) | Short List Results | Column labels not yet confirmed | Hold — confirm labels before mapping |
| All Pre-Offer Tracking columns except Pre-Read Invite + FA Info Submit | Pre-Offer Tracking | Step IDs not yet assigned | Hold — requires step_id confirmation against Supabase definitions |
| All Recruiting Scoreboard columns except Followed on X + X DM Sent | Recruiting Scoreboard | Step IDs not yet assigned | Hold — requires step_id confirmation against Supabase definitions |
| Any financial aid award letter data | Any | No schema column exists | Schema gap — defer to Phase 2 if needed |
| Visit notes / free text fields | Any | No schema column exists | Schema gap — defer to Phase 2 if needed |

---

## Import Hold Conditions

The following conditions must be confirmed TRUE before any data movement begins:

1. **Migration 0014 live** — `coach_contact` JSONB column must exist on `short_list_items` in the target Supabase project. David holds import until Patch confirms.
2. **Step ID map confirmed** — All boolean tracking columns must have confirmed step_id assignments before `recruiting_journey_steps` rows are inserted.
3. ~~**Row 41 data quality flag resolved**~~ — RESOLVED 2026-03-26. Carleton/Wesleyan camp link confirmed as workbook error by Chris. Corrected mapping: Wesleyan = https://wesleyanfootballcamps.ryzerevents.com/, Carleton = null. This hold condition is cleared.
4. **Auth user exists** — A seeded auth.users record for Jesse Bargar must exist before `profiles` insert is attempted.

---

## GrittyOS DB Data Quality Items (Pre-Seeding)

These items apply to the GrittyOS Master DB (Google Sheet ID: `1Pc4LOnD1fhQz-9pI_CUEDaAMDfTkUXcCRTVDfoDWvqo`) and the `schools` table seeding run. They are NOT blockers for the Jesse Bargar workbook import above. They must be resolved before the schools seeding run executes.

### DQ-001 — 3 Schools with Empty/Null Type Field

**Finding:** 3 schools in the GrittyOS DB CSV (source: local CSV — `C:\Users\chris\dev\recruitingq-url-extract\Gritty OS - CFB Recruiting Center - Example 2027 - GrittyOS DB.csv`) have an empty or null `Type` field.

**Impact:** These rows would seed into the `schools` table with `type = null`. A null `type` means:
- No tier classification rendered in the UI
- No tier color applied (TIER_COLORS lookup fails silently or falls through to a default)
- GRIT FIT Gate 1 division/tier logic may behave unexpectedly for these schools

**Required fix:** Correct the `Type` field for all 3 affected rows in the canonical Google Sheet before the seeding run. The CSV is a derivative artifact and must not be patched directly.

**Status:** OPEN — fix required in canonical Sheet. Route to Scout for authorization before Nova applies.

**Blocker status:** NOT a push blocker. Pre-seeding data quality item. The schools seeding run must not execute until this is resolved.

---

### DQ-002 — G5/G6 Normalization at Insert Time (Confirmed Decision 2026-03-26)

**Decision confirmed:** Source data in the GrittyOS DB stores division type as `'G5'`. The canonical key in `TIER_COLORS` is `'G6'`. These are not the same string.

**Resolution:** The seeding script will normalize `'G5'` -> `'G6'` at insert time. No change is required in the canonical Sheet. `TIER_COLORS` uses `'G6'` as the authoritative key and is not modified.

**Transform rule (to be implemented in seeding script):**
```
if source_type == 'G5':
    insert_type = 'G6'
else:
    insert_type = source_type
```

**Status:** DECIDED — 2026-03-26. Seeding script must implement this transform. Not yet implemented.

---

1. What are the column labels for Short List Results cols D, E, and F?
2. Does GRIT FIT Results tab carry unitid, or must the join to GrittyOS DB be done by school name match?
3. What is the full step_id assignment table for all Pre-Offer Tracking and Recruiting Scoreboard boolean columns?
4. ~~Confirm: Row 41 Carleton College has a Wesleyan camp URL in col H — is this a workbook error?~~ RESOLVED 2026-03-26 — confirmed workbook error by Chris. Wesleyan gets the URL; Carleton gets null.
5. Does the workbook contain a college coach email column, or only name/title/phone?
