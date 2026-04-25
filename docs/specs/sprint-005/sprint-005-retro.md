## Sprint 005 Retro

### Sprint Outcome
- Deliverables shipped: D1–D8
- Vitest count: 478 (Sprint 004 floor) → 523 close
  - Phase 1: +44 net new (after counting reconciliation)
  - Phase 2.5: +8 (D6 wire-up + warning demote)
  - Phase 2.7: +1 (write-path instrumentation, after D3b
    simplification removed deprecated co-selection tests)
- Build state: production, app.grittyfb.com, READY
- Smoke result: 9-bullet production smoke green

### Spec Deviations (Operator-Authored Mid-Sprint)

1. D3b simplification — original spec encoded multi-fit read-out
   in pill state via force-light co-applicable pills. Replaced
   with pure user-controlled multiselect pills + multi-fit
   read-out preserved in D3a's detail-card badges. Reason:
   original design failed visual smoke twice, produced
   architectural complexity (sticky-pill bug, three-branch
   toggle, coSelectedStatuses derivation layer) without
   proportionate user-facing benefit. The multi-fit intent was
   preserved — channel changed from pill state to detail card.
   coSelectedStatuses.js deleted. Sprint 006+ contributors should
   read D3a as the authoritative multi-fit signaling channel.

2. D6 visual revision — original implementation preserved status-
   indicator visual (green check / cream circle) with click
   handlers added. Replaced with interactive checkbox component
   for proper affordance. Reason: status indicators and
   interactive controls require different visual affordances;
   the original choice gave users no signal that steps were
   clickable.

3. D6 write-path scope expansion — Phase 2.7 authorized Supabase
   write-path investigation on short_list_items UPDATE writes
   when smoke surfaced D6 persistence not landing. Diagnosis:
   stale-snapshot bug on activeShortlistItem (items array
   updated, snapshot prop did not). Fix: dual state update
   (setItems + setActiveShortlistItem) plus .select()
   instrumentation forcing 0-row writes to surface as errors.
   Forward standard: all Supabase mutation calls in this
   codebase should use .select() to make silent permission
   denials visible.

### Carry-Forward Register

Items surfaced during Sprint 005, deferred to Sprint 006+ or
later. Items that overlap with Process Notes or Architectural
Observations are referenced rather than duplicated.

1. **`LandingPage.jsx:471` duplicate `padding` key** — pre-existing
   vite warning, predates Sprint 005, 1-line fix (split shorthand
   or remove the duplicate).

2. **Playwright visual-smoke harness** — dedicated Sprint 006+
   sprint deliverable on its own. Authoring a console-capture +
   visual-smoke harness mid-Sprint-005 was explicitly excluded as
   scope drift; the harness is a legitimate dedicated deliverable.

3. **`favicon.ico` 404** — 1-line `<link rel="icon">` add to
   `index.html`. Pre-existing browser default favicon fetch
   failure, not application code.

4. **Supabase 403 on `student-read-recruiting-contacts`** — pre-
   existing RLS / JWT / Edge Function permission issue. Manifests
   on `/shortlist` and (via ShortlistPage import) on `/gritfit`.
   Confirmed pre-existing via stash-baseline reproduction during
   Phase 2.5. Sprint 006+ RLS audit. Note: Sprint 005 D6
   persistence smoke confirmed write-path RLS is healthy on
   `short_list_items.recruiting_journey_steps`, so the read-path
   403 is the bounded scope — useful scoping signal for the
   Sprint 006 audit.

5. **Browser-extension `Uncaught (in promise) listener async-
   response`** — 2 console-error instances on `/profile` and
   `/gritfit`. Environmental artifact (React DevTools, Grammarly,
   password manager, etc.), not application code.

6. **`schema.test.js > recruiting_journey_steps default`** —
   pre-existing seed-data assertion failure. 107 of 108 production
   rows have step 2 `completed: true` by default; the test asserts
   `completed: false`. Seed-data clean-up item, separate from
   application code. Confirmed unchanged across all five Phase
   2.x test runs.

7. **React `textDecoration` vs `textDecorationColor` style
   warning** — Phase 2.5 close item, surfaces on the step label
   `<span>`. Cosmetic, predates Sprint 005. 1–2 line shorthand →
   longhand split (`textDecorationLine` + `textDecorationColor`
   as separate properties). The interactive toggle exercises the
   rerender path more often, making the warning louder, but the
   warning itself is pre-existing.

8. **Counting-discipline note for track agent reports** —
   addressed as Process Notes #1. See that section.

9. **Render-frequency observation on `/gritfit`** — addressed as
   Architectural Observations #1. See that section.

10. **`supabase/.temp/*` should be added to `.gitignore`** —
    addressed as Architectural Observations #3. See that section.

11. **Handler asymmetry from `performStepToggle` extraction** —
    addressed as Architectural Observations #2. See that section.

### Process Notes for Sprint 006+

1. Counting discipline — track agent reports must distinguish
   "new test added" from "existing test rewritten." Sprint 005
   trackers over-claimed +68 new on first pass; honest delta
   was +44 net new before Phase 2.5.
2. Persona-scaffolding restraint — sprint mode is flat by
   design. Late-sprint difficulty is not a signal to reach for
   named-agent infrastructure. Resistance on D6 was a Supabase
   write-path issue, not an agent-architecture issue.
3. Write-path instrumentation as forward standard — .select()
   on all mutation calls, error toasts on failure, console.error
   with diagnostic context (record IDs, user IDs). Test coverage
   on error and 0-rows paths to prevent silent regression.
4. .knowing/ + docs/specs/ commit pattern — code commit and
   docs commit are separate. Code commit is the auditable
   sprint-deliverable boundary. Docs commit captures session
   spec, retro, and wiki updates. Two-commit push, code first,
   docs second.
5. Mid-sprint operator-authored spec revisions are NOT scope
   drift — they are deliberate design corrections when
   implementation reveals the spec was overcomplicated. Sprint
   005 had two such revisions (D3b, D6 visual) and both
   improved the shipped product. Document in retro as
   deviations, not failures.

### Architectural Observations (Defer to Sprint 006+)

1. Render-frequency observation — post-Sprint-005 /gritfit
   shows ~5x the read-path call frequency of baseline (5 → 25
   visible 403s, 162 → 742 warnings on the same call paths).
   Derivation chain through D3a's statusKeys consumption may
   warrant memoization review.
2. Handler asymmetry — performStepToggle extraction in
   ShortlistPage produces a one-handler asymmetry vs. inline
   handlers elsewhere in the file. Sprint 006 should pick a
   side-wide pattern (DI for all handlers OR inline+mock for
   all) and align.
3. supabase/.temp/* should be added to .gitignore.

### Closing
Sprint 005 is the first sprint of the six-sprint MVP release
plan (005–010, ending 4/29/2026). On schedule for external
stakeholder demo readiness.
