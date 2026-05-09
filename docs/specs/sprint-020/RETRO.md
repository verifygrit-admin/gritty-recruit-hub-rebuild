# Sprint 020 — /athletes auth-state contamination + grad_year cutoff — Retro

**Date closed:** 2026-05-09
**Operator:** Chris (verifygrit-admin)
**Owner agent on point:** Nova
**DB target:** Supabase project `xyudnajzhuwdauwkwsbh` (production)
**Live URL:** https://app.grittyfb.com/athletes

---

## 1. Scope

Fixed two issues on `/athletes`:

- **Auth-state contamination.** Authenticated visitors received only their
  own row under their own school's tab and zero rows under any other
  partner school's tab. Logged-out visitors had not been retested at
  sprint open but were predicted to render correctly (later confirmed).
- **Active recruiting class cutoff.** Athletes with `grad_year <= 2025`
  could in principle appear on the public roster. Predicate added at the
  RLS security boundary, mirrored at the hook payload layer.

Sprint also unblocked the GitHub Actions `Build and Deploy` workflow,
which had been failing for an unknown number of sprints due to missing
Actions secrets — surfaced as a precondition to delivering Sprint 020's
deploy. See carry-forward item 6.

---

## 2. Decisions on record

**(a) Fix at the RLS layer, not the client.** Step 1 root cause analysis
identified two candidate layers — `(a)` an RLS policy filtering SELECT to
the current `auth.uid()`, or `(b)` a route accidentally using a user-scoped
client where it should use anon. Live `pg_policies` inspection showed
`profiles_select_public_recruits` and `short_list_items_select_public_recruits`
were granted `TO anon` only. When a Supabase JWT is present the role
becomes `authenticated`, those policies fall out of the OR set, and only
the `auth.uid() = user_id` policies remain. The Supabase client and the
hook query were both correct. Fix belonged entirely in RLS.

**(b) Widen `TO anon, authenticated` rather than introduce a new policy.**
The two existing public-recruits policies were dropped and recreated with
`TO anon, authenticated`. No security regression: an authenticated user
could already see every public-recruit row by signing out, so widening the
policy reveals nothing new at the row level. PII column boundary remains
enforced by `PROFILES_WHITELIST_SELECT` in the hook (defense in depth).

**(c) Hardcoded `grad_year >= 2026` cutoff with annual-amendment note.**
Rejected the dynamic-predicate options (per-school
`recruiting_class_floor` column on `hs_programs`, or
`extract(year from now())` literal) for Sprint 020. Both are valid
follow-up sprint shapes; the migration body documents them and flags
the need for an annual bump. Rationale: smallest fix that satisfies the
acceptance test, defers the schema-or-temporal design call to a sprint
that can scope it properly.

**(d) Defense-in-depth on the grad_year predicate.** Cutoff added to both
the RLS policy USING clause AND the hook query (`.gte('grad_year', 2026)`).
RLS is the security boundary; the hook filter is the wire-payload
optimization. Both must move together when the class advances. Comment in
both files cross-references migration 0045's annual-amendment note.

**(e) Test scope split: clean drift fixed inline, non-drift carry-forwarded.**
Sprint 020 push was blocked by 5 pre-existing Vitest failures and 2
pre-existing Playwright Regression failures. After explicit operator
authorization (Path A on the Step-2 reclassification report), 2 of the 4
"Belmont Hill activation drift" files were found to be clean drift and
fixed inline (`recruits-hero.test.jsx`, `school-toggle.test.jsx`). The
other 2 (`recruits-top-nav.test.jsx`, `schema.test.js`) were
test-architecture issues unrelated to Belmont Hill — skipped with
grep-able `SPRINT-020-CARRY-FORWARD` markers and documented in
`docs/specs/sprint-020/KNOWN_FAILING_TESTS.md`.

**(f) Live-URL acceptance regression spec retained as permanent coverage.**
`tests/sprint-020-athletes-acceptance.spec.js` runs against the live URL
and would have caught the auth-state contamination bug pre-deploy. Kept
under `tests/` (project's flat Playwright spec convention — no
`tests/regression/` or `tests/e2e/` subdir exists) rather than deleted as
one-shot scaffolding. Quin owns it going forward.

---

## 3. What shipped

**Migration:** `supabase/migrations/0045_athletes_public_select_authenticated_and_grad_year.sql`
applied to live Supabase (`xyudnajzhuwdauwkwsbh`). Migration history
recorded `version=0045`. Live `pg_policies` post-apply confirms both
`*_public_recruits` policies on `roles: {anon, authenticated}` and
`grad_year >= 2026` in the profiles policy `qual`.

**Hook:** `src/hooks/useRecruitsRoster.js` adds `.gte('grad_year', 2026)`
to the profiles query. Inline comment cross-references migration 0045.

**Test fixes (clean drift, fixed inline):**
- `tests/unit/recruits-hero.test.jsx` — partner-indicator assertion
  generalized to confirm both schools as active partners (May 2026
  coming-soon copy gone since Sprint 017).
- `tests/unit/school-toggle.test.jsx` — three Belmont-Hill-disabled
  assumptions generalized to invariants over `RECRUIT_SCHOOLS`. Today
  every entry is `active: true`, so the loops are no-op-but-honest and
  will catch a regression if a future school is added with `active: false`.

**Test skips (non-drift, carry-forward):**
- `tests/unit/recruits-top-nav.test.jsx` — five `describe.skip` blocks,
  two module-time component invocations stubbed (`const el = null`)
  because `describe.skip`'s callback still executes at test collection.
- `tests/unit/schema.test.js` — single `it.skip` on the
  `journey steps 2-15 default false` test.
- `docs/specs/sprint-020/KNOWN_FAILING_TESTS.md` — full carry-forward doc
  with skip markers, root causes, fix-shape sketches, and out-of-scope
  rationale.

**CI unblock:**
- `.github/workflows/deploy.yml` Vitest gate step now has the
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` env block matching the
  Build step (the original gap was missing env propagation to the gate
  step).
- GitHub Actions secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
  added to repo secrets store. Project ref verified to match the Sprint
  020 migration target (`xyudnajzhuwdauwkwsbh`) before set.

**Live-URL regression spec:** `tests/sprint-020-athletes-acceptance.spec.js`
— Playwright spec covering acceptance tests 1, 2, 5 plus a
header-counter sanity check. Hardened twice during the close-out: first
to wait for `aria-pressed` tab transition + loading skeleton clear, then
to batch per-card text reads into a single `evaluate()` call (Test 5 went
from 30s CI timeout to 549ms).

---

## 4. Verification

**RLS layer (SQL via Supabase MCP).** Five acceptance scenarios verified
under role simulation (`SET LOCAL ROLE` + `request.jwt.claims` for
authenticated cases):

| # | Scenario | Observed |
|---|---|---|
| 1 | anon, BC High | 26 rows |
| 2 | anon, Belmont Hill | 3 rows |
| 3 | auth'd Ricky (Belmont Hill, class 2027), Belmont Hill tab | 3 rows, includes Ricky |
| 4 | auth'd Ricky, BC High tab | 26 rows (no auth contamination) |
| 5 | grad_year ≤ 2025 visible to either role | 0 rows |

**Live URL (Playwright + REST API).** Tests 1, 2, 5 verified end-to-end
against `https://app.grittyfb.com/athletes` after deploy. Direct REST
probe as anon confirmed 26 BC High (grad_year 2027–2029) and 3 Belmont
Hill (grad_year 2027–2027). Live-URL spec passes 4/4 in CI Playwright
Regression workflow at run 25592695602 (Test 1: 1.7s, Test 2: 700ms,
Test 5: 549ms, header counter: 455ms).

Tests 3 and 4 verified at the SQL/RLS layer only; browser-side
verification would require Ricky's auth credentials, which are not in
the test suite. The RLS layer is the security boundary that the bug
lived at, so SQL-layer verification under role simulation is the
definitive proof.

---

## 5. Carry-forward to Sprint 021+

**1. `tests/unit/recruits-top-nav.test.jsx` rewrite.** RecruitsTopNav was
refactored to a stateful component (useState/useRef/useEffect for mobile
dropdown). Original test file uses Sprint 011's "call as function, walk
children tree" pattern, which throws on hook-using components. Fix is a
test architecture migration to `@testing-library/react` `render()` + DOM
queries. `@testing-library/react` and `jsdom` are already in
`devDependencies`. Bundle with similar migrations for any other
components that grew hooks since Sprint 011 if a sweep is run. ~30-60
lines changed across the seven describe blocks. See
`docs/specs/sprint-020/KNOWN_FAILING_TESTS.md` for full sketch.

**2. `tests/unit/schema.test.js` `journey steps 2-15 default false`
rewrite.** Test reads `.limit(1)` from `short_list_items` to validate a
column DEFAULT, but Sprint 019's recruit-journey seeding inserted rows
where multiple steps are intentionally completed. Fix is either an
INSERT-fresh-row-and-read pattern (with cleanup) or a `pg_attribute` /
`information_schema.columns` query against the column's `column_default`.
Two adjacent passing tests (`step 1 completed: true`, `all 15 steps have
required fields`) share the same `.limit(1)` fragility and should be
revisited in the same session.

**3. Playwright Regression workflow TC-MAP-001 / TC-MAP-002.** Pre-existing
failures testing map functionality unrelated to Sprint 020. Workflow is
separate from `Build and Deploy` and does not gate production deploy,
but should be returned to green as part of QA hygiene. Quin owns
diagnosis.

**4. `grad_year >= 2026` literal in migration 0045 + hook.** Annual
amendment required at the recruiting-class transition (typically July,
post-NLI). Two candidate dynamic-predicate sprint shapes documented in
the migration header: (a) `hs_programs.recruiting_class_floor SMALLINT`
column joined in the policy USING clause (per-school flexibility), or
(b) `extract(year from now())::int` literal (single source, no per-school
override). Pick one in a follow-up sprint; for Sprint 020 the literal
was intentional and called out in the migration body so the next
maintainer sees it.

**5. CI env-var hygiene.** Sprint 020 added `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` to the GitHub Actions secrets store and
propagated them to the Vitest gate step. If any other test or build
step references additional `VITE_*` vars (or any env vars not currently
in the secrets store), they will fail the same way. A scan of all
`process.env.*` and `import.meta.env.VITE_*` references across the
codebase against the current Actions secrets list would surface any
remaining gaps before they bite a future sprint.

**6. META — the `Build and Deploy` Actions workflow has been a Potemkin
gate for an unknown number of sprints.** The two Supabase secrets it
references (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) were not
set in the repo's Actions secrets store. The `Build` step has referenced
them since at least 2026-04-21 (the Vercel CLI bump commit). Every
`Build and Deploy` workflow run since whenever the secrets were last
present has either failed or built with empty values; production at
app.grittyfb.com has been receiving deploys via a separate path. The
most likely path is **Vercel's direct GitHub integration** — Vercel
Project ID is in the repo's secrets, and Vercel's GitHub app
auto-deploys on push to default branches independent of any Actions
workflow.

This means:

- Recent sprints that "passed CI" likely never had their Vitest gate
  actually run against their own commits — Vitest was failing at module
  import on the Supabase client instantiation, not on test logic. Test
  regressions have been masked.
- The 5 pre-existing Vitest failures Sprint 020 triaged
  (recruits-top-nav, recruits-hero, school-toggle ×3, schema) likely
  all landed unnoticed because the gate was already red for an unrelated
  reason — first failure short-circuited the diagnostic.
- The Playwright Regression workflow is a separate file and runs
  independently; its TC-MAP failures appear to be the exception that
  proves the rule: it doesn't touch the broken Supabase-client import
  chain, so its red state has been visible (and tolerated as
  pre-existing).

The next infrastructure sprint should answer not just "fix the
secrets" but **"what is the actual deploy path, and does the Actions
workflow earn its existence?"** Specifically:

- Audit the Vercel project: is the GitHub integration enabled? What
  branch does it auto-deploy from? What env vars does it inject (these
  are the ones serving production today)?
- Decide: is the Actions workflow the canonical deploy path, or is
  Vercel's GitHub integration? Two paths fighting for the same
  responsibility produces drift like this. One of them should be
  authoritative; the other should either be deleted or repurposed
  (e.g., Actions handles tests-and-build-validation, Vercel
  integration handles deploy).
- Re-baseline CI: with the Supabase secrets now in place, is
  `Build and Deploy` actually green for Sprint 020-and-prior commit
  shapes? If yes, has it been silently broken for so long that we have
  hidden test regressions in the prior commits' codebases? A retro
  sweep of the Vitest gate against last N tagged releases would
  surface the answer.
- Restore the gate's contract: if Actions is canonical, Vitest gate
  failures must block deploy. Today's Sprint 020 push is the first
  gate-clearing push in an unknown window; treat that as a baseline,
  not a victory.

Severity: this is a process-level finding. Sprint 020's deliverables
are sound; the surrounding CI pipeline is not. Recommend prioritizing
infra sprint before the next functional sprint.

---

## 6. What worked

**Two-layer verification on the auth-state fix.** RLS-layer SQL probes
under role simulation gave definitive proof that the policy widening
worked across all five acceptance scenarios — including the two
authenticated cases that browser-side testing couldn't reach without
Ricky's credentials. End-to-end Playwright against the live URL then
confirmed the page actually renders the rows the policies allow. Two
independent channels reaching the same conclusion eliminates ambiguity.

**Step 1 — Step 2 split with explicit halt.** Operator's two-step sprint
shape (locate the filter, then fix it) prevented the predictable
mistake of fixing the client when the bug was at RLS. The Step 1 report
named the source artifact at every layer (live `pg_policies` qual,
migration file paths, hook source line numbers) and proposed the fix
shape before any code was written. Approval came against a fully
specified change.

**Stop-and-report discipline at every blocker.** Five distinct stop
points in the session — the schema-test scoping check, the reclassified
top-nav-not-drift finding, the CI red status pre-push, the
empty-Actions-secrets discovery, and the Playwright CI flake on Test 5.
Each stop preserved operator authority over a scope-or-scoping decision
that Nova should not have made unilaterally. Zero unauthorized scope
expansion across the sprint.

**Grep-able skip markers.** `SPRINT-020-CARRY-FORWARD` in every skip
inline comment plus a documented index file means the carry-forward
work is one shell command away from being recovered, not buried in a
retro that future-Chris has to remember exists. Convention is
generalizable to any sprint that needs to defer test debt cleanly.

**Live-URL acceptance spec earning its keep within the sprint.** The
spec was first proposed as one-shot scaffolding to verify the deploy.
It immediately surfaced two real bugs in itself (tab-switch race
locally, then per-locator auto-wait latency in CI). Both were caught
and hardened during the close-out window, not after. The shipped spec
is more robust than what initially passed, and the same two failure
modes would have bitten any follow-up sprint that touched `/athletes`
without the spec to catch them.

---

## 7. Process observations

**Carry-forward is a first-class deliverable.** Sprint 020 delivered
two things: the RLS fix and a documented carry-forward register that
includes a meta-finding (item 6) reframing the entire CI deploy path.
The meta-finding is arguably more valuable than the RLS fix — it
explains why test regressions have been silently landing and gives the
next infra sprint a tractable problem statement. Treating carry-forward
as scaffolding for future sprints (rather than as an admission of
incompleteness) is what made it possible to ship Sprint 020 without
expanding scope into infra cleanup.

**Operator-set boundaries beat Nova-inferred boundaries.** Every time
Nova proposed an option set ("Path A / B / C") and asked the operator
to choose, the resulting work stayed in scope. Every time Nova
considered making the call alone (the schema test classification, the
top-nav reclassification, the CI env-var fix authorization, the secrets
set authorization), surfacing it instead produced a cleaner outcome.
The Nova-Scout boundary held without Scout being live in the session
because the boundary was operationalized as the stop-and-report
discipline.
