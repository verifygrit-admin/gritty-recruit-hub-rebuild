# Coach Scheduler Sprints

**Location:** `C:\Users\chris\dev\gritty-recruit-hub-rebuild\docs\specs\.coach-scheduler-sprints`
**Parent:** `gritty-recruit-hub-rebuild`
**Purpose:** All session specs, supporting artifacts, and prototypes for the Coach Scheduler feature series (Sprints 010–016 plus the grittyfb.com hero-link marketing task).

---

## What lives here

| File | Status | Purpose |
|---|---|---|
| `EXECUTION_PLAN.md` | strategy artifact, v4 | Parent strategy document. 11 decisions on record, system topology diagram, sprint sequence rationale. |
| `sprint-010-session-spec.md` | **not_started** (definitive) | GrittyFB Design Token System. Foundation work. Has Prompt 0. Ready to open. |
| `sprint-011-session-spec.md` | draft | Gritty Recruits Public Page (Read-Only). Promote after Sprint 010 retro. |
| `sprint-012-session-spec.md` | draft | Schedule-a-Drop-In CTA + Modal (Date/Time + Coach Info). Promote after Sprint 011 retro + schema review. |
| `sprint-013-session-spec.md` | draft | Player Selection + ICS Multi-Recipient Invite. Highest-risk sprint. Promote after Sprint 012 retro + email provider setup + player consent verification. |
| `sprint-014-session-spec.md` | draft | Coach Dashboard "Visit Requests" Tab. Promote after Sprint 013 retro. |
| `sprint-015-session-spec.md` | draft | Admin Panel Repair. Promote after pre-sprint diagnostic. Sequencing flexible relative to Sprint 014 — see spec for sequencing notes. |
| `sprint-016-session-spec.md` | draft, deferred | College Coach Full Registration + Auth. Many open questions; promote only after substantial pre-work. |
| `marketing-task-grittyfb-hero-link.md` | draft | Reciprocal CTA on grittyfb.com hero. Parallelizes with Sprint 011. Lives in marketing site repo, not this one. |
| `prototype/index.html` | reference | Visual prototype of the public page + scheduler modal. Authoritative for token names + visual layout. |
| `prototype/logo.png` | reference | GrittyFB logo asset. To be added to web app's public asset path during Sprint 010. |

## Sprint sequence at a glance

```
010 Token System (definitive — open this first)
 │
 ├─→ 011 Public Page (Read-Only)
 │    │
 │    └─→ 012 CTA + Modal (Date/Time)
 │         │
 │         └─→ 013 Player Selection + ICS (highest risk)
 │              │
 │              └─→ 014 Coach Dashboard Tab
 │                   │
 │                   └─→ 015 Admin Panel Repair (or before 014 — see spec)
 │                        │
 │                        └─→ 016 Coach Auth (deferred future)
 │
 └─→ Marketing Task (grittyfb.com hero link, parallelizable with 011)
```

## Pre-promotion gates

Before promoting any draft spec to `not_started`:
- Resolve all open questions listed in the spec
- Run any pre-sprint diagnostic the spec calls for (Sprint 015 explicitly requires one; Sprint 013 strongly recommends one)
- Confirm prior sprint's retro is complete and deliverables are merged/deployed
- Add the literal "Prompt 0" block at the bottom of the spec (model after Sprint 010 or Sprint 005)
- Update `status` from `draft` to `not_started` in the frontmatter

## Active risks tracked across this sprint series

- **Admin panel persistence bug.** Active during Sprints 010–014. Mitigation: critical data edits via Supabase Studio, not the admin panel. See `EXECUTION_PLAN.md` "Active risk during Sprints 0–4" section.
- **Player email consent.** Hard gate before Sprint 013. Players already have emails in Supabase but consent for recruiting visit invites needs verification.
- **Cross-repo coordination.** The page lives in `gritty-recruit-hub-rebuild`; the marketing site is a separate repo. Visual consistency is achieved through tokens (010), not shared components.

## Related artifacts elsewhere

- Sprint mode primer: `_org/primers/sprint-mode-primer.md`
- Coach-me skill: `_org/skills/coach-me/SKILL.md`
- Sprint 005 reference spec: `C:\Users\chris\dev\gritty-recruit-hub-rebuild\docs\specs\sprint-005\sprint-005-session-spec.md`
- ERD current state: `docs/superpowers/specs/erd-current-state.md`

---

*This folder is a working area. Drafts evolve, specs get promoted, retros get added. Update this README when sprint statuses change.*
