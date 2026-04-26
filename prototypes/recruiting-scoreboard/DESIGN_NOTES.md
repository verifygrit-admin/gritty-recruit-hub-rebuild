# Design Notes — Recruiting Scoreboard

This document captures every decision locked during prototyping, with the rationale for each. When questions arise during the sprint about why something was designed a particular way, this is the answer.

Decisions are organized by the AskUserQuestions round that surfaced them, plus downstream decisions made during construction.

---

## Decisions from Round 1 — initial scoping

### D1.1 — Mount pattern: collapsible section above the school list

**Decision:** The Scoreboard mounts as a collapsible panel above the Pre-Read Docs Library on the existing Shortlist page. It is expanded by default on first render. The user can collapse it to recover vertical space; the school list below stays untouched whether the Scoreboard is open or closed.

**Rationale:** Three options were considered: a tab toggle (Scoreboard or Shortlist), a separate page, or a collapsible section. The collapsible won because it preserves the existing Shortlist mental model — the Scoreboard is a *lens* onto the same shortlist, not a competing view. It also lets students see both progress (Scoreboard) and fit context (cards) on a single page without navigation.

The placement *above* Pre-Read Docs Library — rather than below it — was chosen because the Scoreboard becomes the first thing the student sees on the Shortlist page. The Scoreboard signals progress and active prospects; the Pre-Read Docs Library is procedural infrastructure that supports that progress. Sequence matters: progress first, infrastructure second.

### D1.2 — School set: matches the student's current shortlist

**Decision:** The Scoreboard contains only schools currently in the student's shortlist. The 27 schools shown in the prototype reflect Ayden Watkins's actual shortlist as a worked example. For other students, the count and the school set differ.

**Rationale:** Earlier scoping considered showing a 22-school filtered subset (the offer-strategy filter from the Gritty Guide work) or a curated demo set. Both were rejected. The Scoreboard tracks relationship work *regardless* of offer-strategy gating; the journey work matters even for "May Not Offer" schools because relationship building is its own value. The shortlist is the student's curated set of schools they're actively pursuing, which is the right scope for this lens.

This also resolves a subtle data-source question: if the Scoreboard could contain schools outside the shortlist, we'd need a separate schools-of-interest table. Constraining it to the shortlist means the existing shortlist relationship table is the source of truth, full stop.

### D1.3 — Quality Offer Score formula: simple N/7

**Decision:** Quality Offer Score = (count of "Yes" booleans across seven Key Recruiting Journey Steps) ÷ 7 × 100%. Each step contributes equally (~14.286%).

**Rationale:** The screenshot in Image 1 showed values of 14.29%, 28.57%, 42.86%, 57.14%, 71.43%, 85.71% — exactly the increments of 1/7. Confirming this formula made the design auditable and matches the existing data presentation. Weighted formulas were considered (e.g., FB Camp Invite worth more than HC Contact) but rejected for v1 — the value of weighting is real, but it requires a coaching judgment call per step that the team hasn't yet made. Simple N/7 is honest and matches what the existing Recruit Hub already shows.

### D1.4 — Color palette: burgundy/parchment from existing Shortlist View

**Decision:** Use the burgundy/parchment palette established in the existing Recruit Hub Shortlist View (Image 2). Deep burgundy (#5C1620) for headers, parchment cream (#F4ECD8) for the page background, Cormorant Garamond for display headings, Inter for body and table text. Boolean Yes/No cells deviate to keep their semantic green/red meaning, but the green and red are tuned to harmonize with the warm palette rather than fight it.

**Rationale:** Image 1 used a dark-green data-table aesthetic; Image 2 used burgundy/parchment chrome. The Scoreboard mounts on the Shortlist page where Image 2's palette is established. The Scoreboard is *additive* to that page — it must visually belong there, not import a competing palette. Three deviations earned their place: (a) tuned green/red booleans for semantic clarity, (b) a single dark-green band on the "Key Recruiting Journey Steps" group header to visually distinguish the Events group from the burgundy "Offers" and "Profile" groups, (c) the saturated green from Image 2's "Currently Recommended" status pill, kept as-is for fidelity.

### D1.5 — Compound Offer Profile visualization: stacked bars in a dedicated column

**Decision:** Render a three-row visualization per school in a dedicated "Compound Profile" column: Quality Offer Score bar, Athletic Fit Score bar, and a bottom Profile bar (Quality × Athletic Fit). All three bars use the same parchment-tinted track, with Quality in solid burgundy, Athletic Fit in a striped lighter burgundy, and Profile in solid burgundy at slightly reduced opacity. Each row shows its numeric value to the right.

**Rationale:** The compound visualization was chosen over alternatives (a single sort column, a 2D bubble plot, separate columns for each metric) because it keeps the table scannable while showing how the two metrics combine. The stacked-bar treatment lets the eye compare relative magnitudes and see why a school sorts where it does. The 220px column width is wide but the readability gain justifies it. If the column proves too wide during the build, the fallback is dropping the third "Profile" row from the viz and computing the sort/boundary from the formula without rendering the composite explicitly. The composite row is informative but not strictly required.

### D1.6 — Boundary at Offer Profile threshold

**Decision:** Sort descending by Offer Profile. Insert a horizontal boundary marker at the threshold cutoff, separating active prospects (above) from lower-priority outreach (below). Threshold is 35% in v1.

**Rationale:** The original Image 1 horizontal line under Wesleyan was an artifact of incorrect sorting, not a deliberate boundary. The replacement design uses a deliberate threshold tied to Offer Profile, which is the metric that actually determines priority. The 50% threshold initially proposed was tuned against the additive formula (Quality + Likelihood) ÷ 2; under the multiplicative formula adopted in D2.1 below, 50% is too tight (only ~5 schools clear it). 35% was chosen as a defensible starting point that lets the meaningfully-engaged D3 cluster sit above the line for a typical D3-leaning student. The threshold is a single constant in the JS (`PROFILE_THRESHOLD`) and may need tuning during the build against real student data.

---

## Decisions from Round 2 — clarifications and corrections

### D2.1 — Offer Profile formula: Quality × Athletic Fit (multiplicative)

**Decision:** Offer Profile per school = Quality Offer Score × Athletic Fit Score, expressed as a percentage. Both inputs are 0–100; the product is divided by 100 to remain in percentage units.

**Rationale:** The original spec proposed an average of Quality and a separate Offer Likelihood metric. That was rejected on two grounds. First, the multiplicative model is more honest: a student with 100% relationship work but zero athletic fit at the FCS level should not have a 50% Offer Profile at an FCS school. They should have ~0%. Multiplication captures that truth; the average does not. Second, the multiplicative model lets us drop the separate Offer Likelihood field entirely — the Athletic Fit Score from the Grit Fit Engine is already in the database, already keyed by competition level, and already reflects the student's match against schools at that level. No schema migration required.

The semantic shift matters for product framing: Offer Profile under multiplication says *"you need both relationship work and athletic fit; strength in one cannot substitute for absence in the other."* That's the right message for students and families.

### D2.2 — Athletic Fit Score sources from the Grit Fit Engine, mapped by level

**Decision:** Each school's Athletic Fit = the student's Athletic Fit Score for that school's level of competition. The mapping uses the five tiers in the Grit Fit Engine: Power 4, G6, FCS, D2, D3. For Ayden Watkins specifically (used for the prototype): P4 = 13.9%, G6 = 30.2%, FCS = 47.8%, D2 = 67.6%, D3 = 84.5%.

**Rationale:** The Grit Fit Engine already computes this score per student per level. The Scoreboard joins each shortlisted school to its level, then looks up the student's score at that level. This avoids any new database column or calculation. The values vary per student; Ayden's are used in the prototype as a worked example.

### D2.3 — UConn FBS Independent → G6 mapping

**Decision:** UConn (FBS Independent, post-conference-realignment-of-the-week) maps to G6 (Group of 6) for Athletic Fit Score lookup, not Power 4.

**Rationale:** UConn is FBS but it is not a Power 4 program. Historically and currently it operates at the G6 tier. Mapping to P4 would underestimate Ayden's fit at UConn (13.9% vs. 30.2%) — both are low, but G6 is more honest. This is the only school in the 27-school prototype that doesn't have a clean conference-to-tier mapping; all other FCS, D3, D2 schools map directly. The mapping rule for future students with FBS Independent schools: use G6 unless the program is clearly P4-tier (rare). A formal `DEC-CFBRB` should lock this rule.

### D2.4 — "Recruiting Events" → "Key Recruiting Journey Steps" rename

**Decision:** The middle column group header in the Scoreboard table is "Key Recruiting Journey Steps," not "Recruiting Events" as shown in Image 1.

**Rationale:** "Events" implied things that happen *to* the student. "Steps" reflects the actual semantic — these are workflow steps the student is progressing through in their own recruiting journey. The 15-step Recruiting Journey schema in Supabase already uses "step" terminology; the Scoreboard column header should match that vocabulary.

### D2.5 — Read-only data flow

**Decision:** Boolean cells in the Scoreboard are read-only. They reflect database state and update only when the student marks a step complete on the school card itself, downstream in the existing Shortlist UI. The Scoreboard never has its own checkbox or edit affordance.

**Rationale:** Two reasons. First, the school card is already where students do journey-step work; the existing UX flow is the right place for that interaction. Adding a second editable surface would create write conflicts and confuse data ownership. Second, a read-only Scoreboard frames the panel as an *overview lens*, not a workspace — which is what students actually need at the top of the Shortlist page. They need to see status, then drill into the appropriate school card to act. v2 may introduce an inline "mark complete" action in the Scoreboard that round-trips through the same journey-step API, but v1 is read-only.

### D2.6 — Additive integration: do not modify existing Shortlist page components

**Decision:** The sprint must not modify the Pre-Read Docs Library, the filter bar, the sort dropdown, the school cards, the status pills, or the burgundy/parchment chrome. The Scoreboard mounts as a new collapsible above Pre-Read Docs Library; everything else stays byte-identical.

**Rationale:** The existing Shortlist page works. The Scoreboard is additive to it. Refactoring existing components during a feature-add sprint is the canonical way to introduce regression bugs. The prototype was designed specifically to be droppable above the existing components without touching them.

### D2.7 — Supabase data sanity check before UI work

**Decision:** Before any visual implementation work begins in the sprint, Patch validates the seven journey-step boolean fields against the actual Supabase schema. Specifically: confirm field names, confirm the student-school relationship table that holds per-school journey state, confirm at least one test student's data is current and queryable in the expected shape.

**Rationale:** The prototype assumes seven specific journey steps drive the Quality Offer Score, named based on Image 1. If those exact field names or the data structure differ from the schema, the UI cannot wire correctly. Catching this at the data layer first is much cheaper than catching it after the table is built. This is a sequence constraint, not just a checklist item — UI work blocks on data validation.

---

## Downstream construction decisions

### D3.1 — Threshold of 35% (under multiplication)

**Decision:** The Offer Profile threshold for the boundary marker is 35%, not 50%.

**Rationale:** Under the multiplicative formula, Offer Profile values run lower than they did under the average formula. The 50% threshold (designed against averages) leaves only about 5 schools above the line on Ayden's data — too tight to be useful. 35% lets the meaningfully-engaged D3 cluster sit above the line and pushes the lower-engagement and lower-fit schools below. The threshold is a single tunable constant; the build sprint should validate it against more student profiles and adjust if needed.

### D3.2 — Status pill mapping in the example shortlist cards

**Decision:** The representative Shortlist cards rendered below the Scoreboard (for visual context) map status pills from athletic fit and division, not from offer likelihood. D2 with Athletic Fit ≥ 60% and Profile ≥ 35% → "Currently Recommended." D3 with Athletic Fit ≥ 80% → "Academic Stretch." FCS with Athletic Fit ≥ 40% → "Athletic Stretch." FBS → "Below Athletic Fit."

**Rationale:** This logic is illustrative — the actual status-pill rules in the existing Shortlist View are owned by the existing Shortlist code and should not be modified by this sprint. The prototype shows reasonable mappings so reviewers can see the cards in context. Code does not implement these mappings; they're prototype scaffolding only.

### D3.3 — Hybrid color treatment for the Key Recruiting Journey Steps group header

**Decision:** The middle column group header ("Key Recruiting Journey Steps") uses dark green (#2D5C3A); the left and right group headers ("Recruiting Scoreboard," "Offers," "Compound Profile") use burgundy.

**Rationale:** Image 1 established a dark-green visual convention for the events/steps data group. Importing a single restrained instance of that convention preserves the data hierarchy reading — students see the seven event columns as a coherent unit, distinct from the two Offer columns and the Compound Profile column. All other chrome stays burgundy. This is the only intentional palette mixing in the design.

### D3.4 — Threshold visual treatment

**Decision:** The boundary marker is a single italic caption row with a horizontal rule, styled in muted burgundy. Text reads: "— Active prospects (Offer Profile ≥ 35%) above. Below: lower-priority outreach."

**Rationale:** Quiet enough not to dominate the table, clear enough to read as a deliberate boundary. The italic Cormorant Garamond styling matches the page's display typography and signals editorial commentary rather than data. Schools below the line are not hidden — they remain visible and sortable; the line is a priority marker, not a filter.

---

## Decisions explicitly deferred

The following were considered and intentionally left for a later iteration.

- **Weighted Quality Offer Score.** Weights per journey step (e.g., FB Camp Invite > HC Contact). Real value, but requires coaching judgment per step. v2.
- **Inline "mark complete" action on Scoreboard.** Would let a student check off a step directly from the Scoreboard. v2; v1 is read-only.
- **Threshold tuning by student profile.** Different students may need different thresholds (an FCS-leaning student vs. a D2/D3-leaning student). v2 or v3.
- **Quality Offer Score sort toggle.** Currently sort is locked to Offer Profile. A future toggle could let users sort by Quality alone, Athletic Fit alone, or Profile. v2.
- **Mobile-specific table treatment.** v2; v1 inherits the existing media query at 960px and assumes horizontal scroll on narrow viewports.
- **Cross-student rollups for coaches/counselors.** Out of scope for this product surface.
