---
sprint: 017
artifact: session-2-entry-brief
status: pending operator
parent_spec: docs/specs/sprint-017-belmont-hill-onboarding-session-spec.md
session_1_retro: docs/specs/sprint-017-belmont-hill-onboarding-retro.md
operator: Chris
---

# Sprint 017 — Session 2 Entry Brief

## 1. Sprint identity

Sprint 017, Session 2 of a multi-session sprint declared at Session 1's
Phase 2 close. Session 1 shipped Phases 0, 1, and 2 clean. Session 2 ships
Phase 3 (D5 + D6 + two absorbed scope items) and Phase 4 (verification +
retro finalization).

References:
- Session spec: `docs/specs/sprint-017-belmont-hill-onboarding-session-spec.md`
- Session 1 retro (close state): `docs/specs/sprint-017-belmont-hill-onboarding-retro.md`
- Phase 0 audit report: `docs/specs/sprint-017-phase-0-audit-report.md`

## 2. Session 1 ship state (terse)

- Migrations `0043` (predicate generalization) + `0044` (Belmont Hill
  identity) applied live and committed.
- `src/data/recruits-schools.js` Belmont Hill row activated.
- 5 Belmont Hill auth.users + public.users + role-link rows + 3 student
  profiles seeded.
- BC High visibility regression-clean (26 → 26 anon-visible).
- Phase 3 + Phase 4 to ship in Session 2.

## 3. Pinned UUIDs for Session 2 reference

```
hs_programs.id              = 4ce4c5e4-2efe-4927-b0d2-4c727d244b33
partner_high_schools.id     = 91994089-4274-435f-bf42-3c2aadecea4f

students:
  copelandul@belmonthill.org    = 799b483a-97ed-49e2-8f4d-aac8c803c8ad
  monteiroky@belmonthill.org    = d892c717-214a-4117-9c54-2ba8aebca533
  kromahaj@belmonthill.org      = 99942a06-44ff-4f78-ba6c-2f31edfa9c6a

coach:
  roche@belmonthill.org         = 4c1e43c4-3bf7-49ef-b5c9-17b7be94bfeb

counselor:
  schmunk@belmonthill.org       = 4a48c09f-5f5c-411b-9d00-8aa7213e4eef
```

Default password for all 5 accounts: `sextants2027`. Communicate to Belmont
Hill admin out-of-band.

## 4. Phase 3 deliverables

### D5 — Token generalization

School-conditional design-token resolution driven dynamically by
`hs_programs` identity. No hardcoded school branches in components.

Per Phase 0 audit (Section 2):
- **Single seam:** `src/index.css:7-9` (`--brand-maroon`, `--brand-gold`,
  `--brand-gold-dark` declarations).
- **6 consumer files** use the variable name (not literal hex):
  `RecruitingScoreboard.jsx`, `OfferBadge.jsx`, `ShortlistRow.jsx`,
  `LandingPage.jsx`, `CollapsibleTitleStrip.jsx`, plus `index.css` itself.
- **Cleanest pattern:** body-class-driven `--brand-*` value swap, plus an
  auth-time class-toggle hook that reads the user's `hs_programs.school_name`.
  No per-component refactor required.

Belmont Hill hex values **approved** by operator:
- Deep Blue (Primary): `#1B3D8F`
- Scarlet (Secondary): `#B41F2E`
- White (Tertiary): `#FFFFFF`
- Background underlay: `src/assets/Belmont Hill background.jpg`

Note on `AdminLoginPage.jsx` inline `#8B3A3A` hardcodes (lines 92, 232):
admin surface is school-neutral by design. Out of scope for D5; carry-forward
cleanup if desired.

### D6 — Banner dynamism

Per Phase 0 audit (Section 3): single seam at `src/lib/schoolShortName.js:15`.
Add Belmont Hill entry to the existing map. Lookup is already centralized.

### Absorbed scope items (operator approved before Phase 1)

**ProfilePage.jsx** static BC High coach + counselor hardcodes
(`src/pages/ProfilePage.jsx:59-65, 136, 172, 477, 516`). Comment line 172
explicitly says "Dynamic fetch useEffects removed — coach and counselor are
now static BC High hardcodes." Generalize via `hs_programs` join keyed on
the user's program identity. Without this, Belmont Hill students see Paul
Zukauskas as their head coach in the profile form.

**NextStepsDashboard.jsx** BC-High-specific S&C tip
(`src/components/NextStepsDashboard.jsx:393-397`). Generalize via
school-conditional tip variant pattern keyed on the same identity.

## 5. Phase 4 deliverables

End-to-end verification per spec Section 5 D7:

1. Anon `/athletes` page renders Belmont Hill toggle and roster.
2. Sign-in for each of the 5 Belmont Hill accounts works (password
   `sextants2027`).
3. Belmont Hill head coach dashboard returns all 3 Belmont Hill students.
4. Belmont Hill counselor dashboard returns all 3 Belmont Hill students.
5. One Belmont Hill student runs GRIT FIT and produces an outcome.
6. Theme + banner switch correctly between BC High account login and
   Belmont Hill account login.
7. Admin login dashboard returns all 5 new accounts plus existing.
8. No regressions on BC High user flows (one BC High coach login + one
   BC High student login spot-check).

Manual verification with Claude in Chrome. Screenshots in retro.

## 6. DOR carryover

DOR-1 through DOR-5 still binding. Plus the Session 1 amendment:

- **DOR-amendment.** Belmont Hill student count is **3, not 5**.
  Acceptance criteria D7 step 1 + step 2 read as 3 students.

## 7. Operating constraints carried forward

- All DORs binding.
- Four-artifact configuration: Sprint Mode Primer + session spec + Session 1
  retro + this entry brief. No separate Operator's Guide (acknowledged
  thinning per Phase 0 audit).
- 20-exchange ceiling for Session 2.
- All standing protocols (PROTO-GLOBAL-004 push gates, PROTO-GLOBAL-013
  session close, etc.).

## 8. Session 2 budget shape

| Phase | Estimate |
|---|---|
| Phase 3 (D5 + D6 + ProfilePage + NextStepsDashboard) | 5-6 exchanges |
| Phase 4 (verification + screenshot capture) | 2-3 exchanges |
| Retro finalization (Session 2 close, sprint close) | 1-2 exchanges |
| **Total** | **~8-11 exchanges** of 20-ceiling |

Headroom for Phase 3 surprises (e.g., the design-token consumption pattern
diverges from the audit's seam-only finding, or ProfilePage refactor
surfaces unexpected dependencies).

## 9. Carry-forward dependencies that DO NOT block Session 2 ship

- **F-23 GoTrue admin API fault** — external. Escalation in flight. Phase 3
  and Phase 4 are UI/theming/verification work, not auth-lookup. Does not
  affect Session 2.
- **Sprint 018 `get_user_id_by_email()` hygiene migration** — separate
  sprint. Phase 3 and Phase 4 do not depend on it.
- **`bulk_import_students.js` resolver alignment** — separate sprint. No
  re-running this script in Session 2.

## 10. Session 2 first prompt should

1. Re-load `_org/primers/sprint-mode-primer.md` and
   `_org/primers/production-optimized-sprints-primer.md`.
2. Confirm operating contract carryover.
3. Re-load this entry brief.
4. Fire Phase 3 recon prompt covering D5 + D6 + the two absorbed scope
   items. Recon shape similar to Phase 0 audit pattern: identify the seam
   and the consumer surface for each, propose the implementation shape per
   deliverable, surface any pre-Phase-3 operator decisions before code is
   written.
