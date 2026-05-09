# Sprint 019 — Belmont Hill Recruit Journey Seeding — Retro

**Date closed:** 2026-05-08
**Operator:** Chris (verifygrit-admin)
**Owner agent on point:** Nova
**DB target:** Supabase project `xyudnajzhuwdauwkwsbh` (production)

---

## 1. Scope

Seeded `public.short_list_items` for the three Belmont Hill student accounts
(Monteiro, Kromah, Copeland) from a flat operator-curated CSV with one row
per (student × school) and 14 boolean progression columns per row. 54 rows
total. Each row carries the full 15-step `recruiting_journey_steps` JSONB,
denormed school metadata (`school_name`, `div`, `conference`, `state`), and
`source = 'manual_add'`. GRIT-FIT-derived numeric columns left null. The
shortlists now render in each student's view and roll up correctly into
Steve Roche's Coach's View.

---

## 2. Decisions on record

**(a) Hybrid denorm pattern.** `school_name` came from the CSV's `college`
column (operator-curated authoritative display name). `div`, `conference`,
`state` came from a single bulk lookup against `public.schools` keyed by
`unitid`. GRIT-FIT-derived numerics (`coa`, `adltv`, `droi`, `break_even`,
`grad_rate`, `net_cost`, `dist`, `match_rank`, `match_tier`,
`q_link`, `coach_link`) left null. Rationale: the CSV is the operator's
source of truth for what the coach typed; `public.schools` is the universe
source of truth for division/conference/state; GRIT-FIT-derived numerics
are per-student computations that don't exist for these rows because no
GRIT FIT run produced them.

**(b) `source = 'manual_add'` matching BC High convention literally.**
`import_shortlist_bc_high.py` writes `'manual_add'` for its short-list
inserts (lines 473 and 541). Belmont Hill matches that. No third value
invented. The `source CHECK` constraint allows only `'grit_fit'` or
`'manual_add'`.

**(c) Step 10 ("Coach contacted student via text") intentionally absent
from the CSV.** Step 10 is a channel/medium step (SMS) and the CSV has no
column for that channel. `contact_head_coach` maps to step 11 (an actor
step), not step 10. All 54 rows have `step_id=10, completed=false`. Verified
post-write: 0/54 rows have step 10 marked complete.

**(d) UPSERT preserves GRIT-FIT-derived columns on conflict.** The
PostgREST upsert (`Prefer: resolution=merge-duplicates`) targeted only the
seven mutable columns plus `updated_at`. `id`, `added_at`, `grit_fit_status`,
and the 11 GRIT-FIT-derived numeric columns were intentionally absent from
the payload. On insert these get DEFAULT values (NULL or `'not_evaluated'`).
On conflict-update they are untouched, so a future GRIT FIT run that
populates `coa` / `droi` / `match_rank` etc. will not be blown away by a
subsequent re-run of this importer.

---

## 3. What shipped

- `scripts/import_shortlist_belmont_hill.py` — service-role bulk importer.
  Reads CSV via `csv.DictReader`, fetches `public.schools` denorm in a
  single GET, builds 15-step JSONB, validates each row, upserts via
  PostgREST. Supports `--dry-run`, `--student {monteiro,kromah,copeland,all}`,
  and `--detail-unitid <int>` for full-row dry-run inspection.
- 54 `short_list_items` rows: Monteiro 15, Kromah 11, Copeland 28.
- Verification: pre-write mapping verification against three sources
  (migrations `0009`/`0024`/`0037`, live column DEFAULT, label semantics)
  plus dry-run on Monteiro before live execution. Post-write DB sweep:
  per-student row counts match expected (28/11/15), JSONB integrity
  checks all 54/54, denorm coverage 54/54, `source='manual_add'` 54/54,
  step 10 completed 0/54, step 1 completed 54/54. Operator manual UI
  verification across four sign-in passes (Monteiro, Kromah, Copeland
  student views; Roche Coach's View). Spot-checked sparse-trail rows
  (Brown 4/15, Penn 3/15, Yale 3/15) and dense-trail rows (Carleton
  Copeland 12/15 with verbal-offer chip rendering correctly).

---

## 4. Data quality findings

**Bryant University (unitid 366139).** Predicted as a watch because it's
an unusually high unitid. Resolved cleanly in `public.schools` with no
denorm gaps. Non-issue.

**CSV `profile_id` column unreliable.** Kromah's 11 rows have incrementing
fake-looking UUIDs in the `profile_id` column (`...c279`, `...c280`, …,
`...c290`). Importer ignores `profile_id` entirely (not a column on
`short_list_items`; PK is `(user_id, unitid)`), so no impact on this
sprint. Operator-data smell that may bite a downstream sprint that
trusts the CSV's `profile_id`. Flagged for future awareness only.

**Completion timestamps absent.** CSV has booleans only — no
`completed_at` dates per step. All seeded `recruiting_journey_steps`
elements have `completed_at: null` even where `completed: true`. Any
downstream "recent activity" view in Coach's View will treat all 54
rows as undated. Worth flagging to Belmont Hill if they care about
activity recency in `CoachActivitySummary`. Not a sprint blocker.

**`public.schools` column-name divergence.** The table uses
`ncaa_division`, not `div`. Importer reads `ncaa_division` from
`public.schools` and writes it into the `div` column on
`short_list_items` — matching the BC High convention.

---

## 5. Carry-forward to Sprint 020+

**1. GRIT FIT Map universe vs render filter (Finding A). — RESOLVED in
close window (2026-05-08).** Resolved by operator filter correction in
GRIT FIT Map render path. Diagnostic confirmed Carleton present in
`public.schools` (`unitid=173258`, `type='D3'`, `conference='MIAC'`,
`state='MN'`); fix was filter-side, not data-side. Diagnostic trail
preserved below.

  Original finding: Carleton College did not appear on the GRIT FIT Map
  render despite the map being intended to display all schools in
  `public.schools`. Diagnostic SELECT result: Carleton **is** in
  `public.schools` (`unitid=173258`, `type='D3'`, `conference='MIAC'`,
  `state='MN'`). Root cause was **not** universe-completeness — it was
  render-side filter logic in `src/pages/GritFitPage.jsx` or its data
  hook applying a `type` / `ncaa_division` / state / region filter that
  excluded Carleton.

**2. Slide-out denorm display gap (Finding B). — RESOLVED in close window
(2026-05-08).** Resolved by shortlist refresh — denorm fields surface
correctly on slide-out detail cards once cache invalidates. Sprint 019
design decision (a) to leave GRIT-FIT-derived numerics null on
`manual_add` source rows holds; the em-dash display was a stale-cache
artifact, not a structural gap. Diagnostic trail preserved below.

  Original finding: Schools on a student's shortlist surfaced em-dashes
  for COA / Annual Net Cost / DROI / Fastest Payback on the slide-out
  detail card. Initially read as a structural consequence of Sprint 019
  decision (a) to leave GRIT-FIT-derived numerics null on `manual_add`
  source rows. Operator triage showed the em-dashes cleared on shortlist
  refresh, confirming the display was a cache artifact and the seeded
  data was rendering correctly once cache invalidated. Two follow-up
  paths originally proposed (universe-backfill of static fields;
  re-architect slide-out to read from `public.schools` at render time)
  are no longer required for this finding. They remain valid as future
  refactor options if the slide-out's data-source coupling becomes a
  concern in another sprint.

**3. BC High vs Belmont Hill denorm divergence.** Belmont Hill rows now
carry richer denorm (CSV `school_name` + universe `div` / `conference` /
`state`) than BC High rows (which left `state` and `conference` null per
`import_shortlist_bc_high.py`'s convention). Worth a parity backfill
sprint to bring BC High up to Belmont Hill's denorm completeness before
any cross-school comparative views ship.

**4. Completion-timestamp gap.** All 54 Belmont Hill rows have
`completed_at = null` on every completed step (CSV had no dates). Any
future "recent activity" view in Coach's View treats these as undated.
If Roche or future coaches request activity-recency rollups, need a
backfill mechanism — operator re-export from BH-side activity log, or
explicit acceptance that pre-Sprint-019 completions are timestamp-free.

**5. Two-importer DRY consolidation.** With Belmont Hill importer now
sibling to BC High importer (both write the same table with the same
upsert pattern, differing only in input shape), parameterize into one
`scripts/import_shortlist_partner_school.py` before onboarding partner
school #3. Don't act on N=2; revisit at N=3 calendared.

**6. Verification-surface mismatch (process learning).** Sprint 019 close
prompts initially scoped UI verification to Claude Code, which doesn't
have a browser-control surface in this session configuration. When the
gate hit, Nova surfaced three options: (1) operator runs UI passes
manually in Chrome, (2) Nova writes a headless data-shape parity check
as a complement to manual UI, (3) commit without UI verification (not
recommended, violated the explicit gate). Operator chose option 1; the
parity-check script was discussed but not built. **Future sprints with
UI verification scope should either:**
  - **(a) Explicitly route the UI passes to operator with a tight
    checklist up front** (avoids the late surface); or
  - **(b) Ask Claude Code at sprint-open what verification surfaces are
    available before scoping UI verification to it.**

  The headless parity-check script remains a future option as a cheap
  complement to manual UI verification on subsequent partner-school
  sprints. It would narrow the manual surface to "render correctness"
  only, with data-shape parity already proven headlessly.

---

## 6. What worked

**Pre-flight mapping verification against three sources.** Before writing
any code, the CSV → `step_id` mapping was cross-checked against migrations
`0009` / `0024` / `0037` and against the live `public.short_list_items`
column DEFAULT (queried via Supabase MCP at sprint-open). Every proposed
binding matched the live label semantics byte-for-byte. Result: zero
mapping bugs surfaced at write time. The diff between proposed mapping
and reality was zero.

**Dry-run on Monteiro before live execution.** The `--dry-run` /
`--detail-unitid` path printed the full resolved JSONB for Trinity (8/15,
dense trail) and Brown (4/15, sparse trail) before any DB write. Both
matched the CSV byte-for-byte. Live run was a foregone conclusion.

**Halt-and-surface discipline at each step.** Step 1+2 (script ID +
mapping verification) halted to surface the denorm-source ambiguity
(Option 1 / 2 / 3) before code was written. Step 4 (dry-run) halted
before live write to surface the dry-run output. Step 5 (live run)
halted before UI verification to surface the DB-side proof. Step 6 (UI
verification) halted to surface that Claude Code couldn't run the
browser passes — operator took it from there. No silent scope creep,
no premature commits, no fabricated verification.

**Single bulk schools lookup.** 37 unique unitids across 54 rows resolved
in one GET against `public.schools`. No N+1 query pattern, no
per-row latency.

**Idempotent upsert design.** `Prefer: resolution=merge-duplicates` plus
omitting GRIT-FIT-derived columns from the payload means the importer
can be re-run safely without nuking any future GRIT FIT enrichment. The
test of this design shipped today (zero conflicts because the table was
empty for these `(user_id, unitid)` pairs); the value will surface the
first time a partner school re-runs after a GRIT FIT pass has populated
`coa` / `droi` / etc.

---

## 7. Same-session resolution of Findings A & B (process observation)

Both production findings surfaced during operator UI verification were
resolved by operator within the sprint close window — Finding A by a
filter correction in the GRIT FIT Map render path, Finding B by a
shortlist refresh that invalidated stale cache. Neither required a
follow-up sprint.

Surfacing this as a process observation: the verification pass
functioning as both **gate** and **triage layer** is what the
sprint-mode design intends. Operator-side fixes during verification are
not failures; they're the production gate doing its job. Sprint 019
thesis — that DB write + manual UI verification + immediate operator
triage is a complete close path — is empirically supported.

The active carry-forward list reduces from six items to four. Items 3,
4, 5, and 6 remain open for Sprint 020+ scoping. Items 1 and 2 stay in
the document with `RESOLVED` markers and full diagnostic trails for
historical reference.
