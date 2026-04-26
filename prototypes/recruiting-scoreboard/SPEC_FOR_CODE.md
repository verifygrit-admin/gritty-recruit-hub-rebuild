# Spec for Code — Recruiting Scoreboard

This is the build-time spec for the Recruiting Scoreboard sprint. Patch and Scribe execute against this document. The visual ground truth is `recruiting-scoreboard.html` in this folder; this spec describes how to wire that visual to the live Recruit Hub.

## Build sequence

The sprint must execute in this order. Steps are gated — UI work blocks on data validation, integration testing blocks on UI completion.

### Step 1 — Supabase data sanity check (Patch leads, blocks all UI work)

Before any visual implementation begins, validate the seven boolean journey-step fields exist in the schema in the expected shape. Required outputs from this step:

1. **Field-name mapping table.** For each of the seven Key Recruiting Journey Steps, identify the actual Supabase column name and table. Expected mapping (to be confirmed):

| Scoreboard column | Likely table | Likely column | Notes |
|---|---|---|---|
| HC Contact | `student_school_journey` | `hc_contact_completed` | Boolean |
| AC Contact | `student_school_journey` | `ac_contact_completed` | Boolean |
| Jr Day Invite | `student_school_journey` | `jr_day_invite_received` | Boolean |
| FB Camp Invite | `student_school_journey` | `fb_camp_invite_received` | Boolean |
| Tour / Visit Confirmed | `student_school_journey` | `tour_visit_confirmed` | Boolean |
| Admissions Pre-Read Requested | `student_school_journey` | `admissions_preread_requested` | Boolean |
| Financial Aid Pre-Read Submitted | `student_school_journey` | `finaid_preread_submitted` | Boolean |

The names above are *placeholders* matching the prototype labels. The actual schema may differ. Patch confirms or corrects each mapping by inspecting the schema directly. If any field is missing, that step is currently untracked in the database and the Quality Offer Score formula needs the team's input on how to handle it (treat as `false`, exclude from the score, or block the build).

2. **Test-student validation.** Pull the seven journey-step booleans for at least one real test student (recommended: Ayden Watkins, since prototype data references his profile). Confirm the data shape matches what the Scoreboard expects: one row per (student, school) pair, with seven boolean fields each. Note: The prototype's data for Ayden is illustrative — it was reconstructed from Image 1 and may not match Ayden's current actual database state. Don't treat the prototype's specific Yes/No values as authoritative; treat the column structure and the formula as authoritative.

3. **Athletic Fit Score field validation.** Confirm the Grit Fit Engine exposes the five-tier Athletic Fit Scores per student via a queryable interface. The Scoreboard needs to read: `athletic_fit_p4`, `athletic_fit_g6`, `athletic_fit_fcs`, `athletic_fit_d2`, `athletic_fit_d3` (or whatever the actual field/method names are).

4. **School-to-level mapping.** Confirm each shortlisted school has a known competition level in the schema (Power 4 / G6 / FCS / D2 / D3). Locate the field that holds this. Confirm UConn (FBS Independent) is mapped to G6 per the locked decision; if the schema currently maps it to FBS without a tier qualifier, add the tier mapping at this step.

**Exit criterion:** A confirmed mapping document for the four items above, signed off by Patch, before any UI work begins.

### Step 2 — Component implementation (Scribe leads)

Build the Scoreboard as a single React component (or Vue, matching repo convention — check `src/` first) with the following structure:

```
<RecruitingScoreboard
  studentId={currentStudentId}
  shortlistSchools={shortlistFromExistingShortlistData}
  onCollapseChange={persistOpenState}
/>
```

**Inputs:**
- `studentId`: identifies the student for Athletic Fit Score lookup
- `shortlistSchools`: array of schools currently in the student's shortlist (passed in from the parent component; the Scoreboard does not query the shortlist independently)
- `onCollapseChange` (optional): persistence callback so collapse state survives navigation

**Internal data fetching:**
- Fetch the seven journey-step booleans for each `(studentId, schoolId)` pair via Supabase
- Fetch the student's five-tier Athletic Fit Scores once
- Compute Quality Offer Score and Offer Profile per school in JS

**Render:**
- Match the visual ground truth in `recruiting-scoreboard.html` 1:1 for layout, color, typography, spacing
- Use the existing component primitives from the Shortlist page where they exist (status pills, button styles, etc.)
- Sort descending by Offer Profile
- Insert the boundary marker row at the threshold (35% in v1, single constant)

**Interactions:**
- Collapse/expand toggle on the burgundy header bar
- Optional column sort on Rank, College, Quality Offer Score (clicking a sortable column changes sort axis; default sort axis is Offer Profile descending)
- Hover state on rows (subtle warm-tint highlight as in prototype)

**No interactions:**
- No editable cells. The booleans are display-only.
- No row-click navigation in v1. Future enhancement: clicking a school row navigates to that school's card on the Shortlist below.

### Step 3 — Page integration (Scribe + Patch)

Mount the Scoreboard component on the existing Shortlist page above the Pre-Read Docs Library. Page hierarchy after integration:

```
Shortlist Page (existing)
├── Page header (existing — H1, subtitle, Refresh Status button)
├── School count (existing)
├── RecruitingScoreboard (NEW — collapsible, expanded by default)
├── Pre-Read Docs Library (existing — unchanged)
├── Filter bar (existing — unchanged)
└── School cards (existing — unchanged)
```

**Integration constraints:**
- Do not modify any existing component on the Shortlist page
- The Scoreboard's filter awareness is OPTIONAL in v1: it can render the full shortlist regardless of the filter bar's state. v2 may wire the filter bar to also filter the Scoreboard rows.
- Persist Scoreboard open/closed state in user preferences (localStorage, user settings table, or wherever per-user UI state currently lives)
- The Scoreboard's burgundy header should match the existing Pre-Read Docs Library's burgundy header treatment for visual consistency

### Step 4 — Quality Offer Score and Offer Profile formulas

```javascript
function qualityOfferScore(journeyStepBools) {
  // journeyStepBools: 7-element boolean array in this order:
  // [hc_contact, ac_contact, jr_day_invite, fb_camp_invite, tour_visit_confirmed,
  //  admissions_preread_requested, finaid_preread_submitted]
  const yesCount = journeyStepBools.filter(Boolean).length;
  return (yesCount / 7) * 100;  // returns 0-100
}

function athleticFitForSchool(studentAthleticFitScores, schoolLevel) {
  // schoolLevel: one of 'P4', 'G6', 'FCS', 'D2', 'D3'
  // studentAthleticFitScores: { p4, g6, fcs, d2, d3 } each 0-100
  const map = {
    'P4':  studentAthleticFitScores.p4,
    'G6':  studentAthleticFitScores.g6,
    'FCS': studentAthleticFitScores.fcs,
    'D2':  studentAthleticFitScores.d2,
    'D3':  studentAthleticFitScores.d3,
  };
  return map[schoolLevel];  // returns 0-100
}

function offerProfile(qualityScore, athleticFit) {
  // Multiplicative model. Both inputs are 0-100; result is 0-100.
  return (qualityScore * athleticFit) / 100;
}

const PROFILE_THRESHOLD = 35;  // tunable; see DESIGN_NOTES.md D3.1
```

**Edge cases:**
- A school with no journey-step data → all booleans treated as `false`, Quality = 0%, Profile = 0%
- A school whose level cannot be mapped to a Grit Fit tier → Athletic Fit = 0%, Profile = 0%, log a warning
- A student whose Grit Fit Score has not been computed → render the Scoreboard with a "Grit Fit not yet computed" placeholder; Quality column still renders, Profile column shows "—"

### Step 5 — Acceptance criteria

The sprint is complete when all of the following are true.

**Visual fidelity:**
- The Scoreboard renders 1:1 with the prototype HTML at desktop widths
- The burgundy/parchment chrome matches the existing Shortlist page exactly
- Boolean Yes/No cells use the tuned green/red from the prototype
- The Compound Profile column shows three stacked bars per school (Quality, Athletic Fit, Profile)
- The boundary marker row inserts at the 35% threshold

**Data fidelity:**
- All seven journey-step booleans pull live from Supabase per (student, school) pair
- Quality Offer Score computes correctly: matches the prototype values for the test student's exact data
- Athletic Fit Score pulls from the Grit Fit Engine, mapped per school's level
- UConn (FBS Independent) maps to G6 in the Athletic Fit lookup
- Offer Profile = Quality × Athletic Fit, expressed as a percentage

**Behavioral fidelity:**
- Booleans are not editable in the Scoreboard
- The Scoreboard contains only schools currently in the student's shortlist
- Adding a school to the shortlist (via existing flow) makes it appear on the Scoreboard within one render cycle
- Removing a school from the shortlist removes it from the Scoreboard within one render cycle
- Marking a journey step complete on a school card (via existing flow) updates the corresponding Scoreboard cell within one render cycle
- The Scoreboard's collapsed/expanded state persists across navigation and sessions

**Integration fidelity:**
- The Pre-Read Docs Library is byte-identical to its pre-sprint state
- The filter bar is byte-identical to its pre-sprint state
- The school card list is byte-identical to its pre-sprint state
- No existing Shortlist functionality regresses

## Out of scope for this sprint

- Weighted Quality Offer Score
- Inline "mark complete" actions on the Scoreboard itself
- Filter-bar wiring (v2)
- Scoreboard column-sort interactions beyond what's specified
- Threshold tuning UI (the constant is hardcoded; future versions may expose it)
- Cross-student aggregations
- Mobile-specific Scoreboard layout (the existing 960px breakpoint is sufficient for v1)
- Performance optimization for very large shortlists (v1 assumes typical shortlist ≤ 50 schools)

## Things that need a `DEC-CFBRB` before sprint kickoff

1. **Lock the prototype as canonical for this sprint.** Reference: `prototypes/recruiting-scoreboard/recruiting-scoreboard.html`. Deviations require a follow-on `DEC`.
2. **Lock the Offer Profile formula.** Quality × Athletic Fit (multiplicative). Reference: `DESIGN_NOTES.md` D2.1.
3. **Lock the UConn FBS Independent → G6 mapping rule.** Generalizable to any future FBS Independent school: map to G6 unless the program is clearly P4-tier. Reference: `DESIGN_NOTES.md` D2.3.

These three decisions can ship as a single batched `DEC` if convenient, or as three separate ones for granular traceability.

## Things that need follow-up after sprint completion

1. **Threshold tuning.** Validate `PROFILE_THRESHOLD = 35` against several student profiles (D3-leaning, D2-leaning, FCS-leaning). Adjust if real student data shows the 35% cutoff produces consistently misleading boundaries.
2. **Status pill rules.** The prototype's Shortlist card status pills use illustrative rules. The actual production rules may differ; if the existing Shortlist code's rules diverge from the prototype's rules, that's expected and not a bug.
3. **Filter integration.** v2 should wire the existing filter bar to also filter the Scoreboard rows. v1 renders the full shortlist regardless of filter state.

## Reference files

- `recruiting-scoreboard.html` — visual ground truth
- `DESIGN_NOTES.md` — every locked decision and rationale
- `README.md` — sprint orientation and folder index
