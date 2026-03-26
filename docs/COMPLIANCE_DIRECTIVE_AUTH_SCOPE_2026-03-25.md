# COMPLIANCE DIRECTIVE — AUTH SCOPE CHANGE + MORTY CONDITION RULINGS
**Issued by:** Scout (Compliance Authority)
**Date:** 2026-03-25
**Authority:** Chris Conroy (TPM/CEO) — verbal rulings, 2026-03-25 session
**Binding on:** Patch, Nova, Quin, Morty
**Status:** BINDING — effective immediately

---

## STANDING ORDER

NO AGENT WRITES AUTH CODE UNTIL THIS DIRECTIVE IS ACKNOWLEDGED.

This directive records three operator rulings on Morty's migration audit conditions and one scope change to Phase 1 auth architecture. Both categories carry the same weight: they are operator decisions, not suggestions. Any agent proceeding with auth implementation, auth test authoring, or auth-related Edge Function wiring before acknowledging this directive is operating outside authorized scope.

---

## PART 1 — MORTY CONDITION RULINGS

Chris has issued binding rulings on all three conditions from Morty's PASS WITH CONDITIONS verdict (`MORTY_MIGRATION_AUDIT_2026-03-25.md`).

### Condition 1 — verify-email Edge Function: service role key required
**Ruling: ACCEPTED**

The verify-email Edge Function must use the service role key (not the anon key) to call `updateUser()`. Patch corrects this in the Edge Function code before the migration deployment gate opens. Morty's condition is satisfied when the correction is in place. The Edge Function is not invoked in MVP flows, but the code must be correct before Phase 2 activation.

**Impact on Patch:** Correct the service role key usage in verify-email Edge Function code before any other WG-3 work proceeds. This is the only pre-migration code correction required.

### Condition 2 — high_school field: autocomplete against hs_programs, not free text
**Ruling: ACCEPTED**

The profile form `high_school` field must autocomplete against the `hs_programs` table. Free text entry is not acceptable in MVP. The field is not a plain text input.

**Impact on Nova:** Profile form implementation must wire the high_school field as an autocomplete/select against `hs_programs`. Free text is explicitly out of scope.

**Impact on Quin:** TC-PROFILE regression suite must include a test confirming the autocomplete behavior — that the field presents options from `hs_programs` and does not accept arbitrary free text.

### Condition 3 — financial fields (agi, dependents) visible to coaches in MVP
**Ruling: ACCEPTED — documented debt, not a bug**

Fields `agi` and `dependents` on the profiles table are visible to coaches in MVP. The column-level exclusion pattern (restricting these fields from coach SELECT on `profiles`) is a Phase 2 item. This is documented technical debt. Agents do not flag this as a bug in Phase 1 QA. It is a known, accepted limitation with a planned Phase 2 resolution path.

**Impact on Morty:** Auth flow audit scope in Phase 1 does not flag financial field visibility as a compliance failure. Log it as accepted debt in the audit record.

**Impact on Quin:** Do not write a failing test for coach financial field visibility in Phase 1. This is accepted behavior for MVP. A Phase 2 test can be scaffolded but must not be in the Phase 1 regression gate.

---

## PART 2 — PHASE 1 AUTH SCOPE CHANGE

This is a scope change. The prior assumption that email verification would be part of Phase 1 MVP auth flow is superseded by this directive.

### The new Phase 1 auth model

**Account activation:** Email verification and account activation flows are suspended for MVP. All test accounts (50+ users) will be bulk-loaded directly into Supabase Auth and `public.users` by Chris. Bulk accounts are seeded with `account_status = 'active'` and `email_verified = true`. No email verification is required or triggered in Phase 1.

**Sign-in flow (Phase 1):**
```
email + password
  → supabase.auth.signInWithPassword()
  → query public.users for user_type
  → route by role (student → landing | coach/counselor → dashboard)
```

No `email_verified` check in the sign-in path.
No `account_status = 'pending'` gate in the sign-in path.
No verification screen in the MVP routing.
No pending activation screen in the MVP routing.

**Phase 2 activation path:** Edge Functions for email verification (`verify-email`, `send-verification`, `check-account-status`) are written, correct, and live in the repo. They are NOT wired into any MVP auth flow. In Phase 2, Chris sends a bulk password reset to all seeded accounts. At that point the verification chain activates.

---

## PART 3 — AGENT-SPECIFIC DIRECTIVES

### PATCH — WG-3 Scope Change

1. Correct the service role key usage in `verify-email` Edge Function (Condition 1) before any other work.
2. Edge Functions (`verify-email`, `send-verification`, `check-account-status`) stay in the repo. They are NOT wired into MVP auth flows.
3. The `check-account-status` Edge Function simplifies for MVP: return `user_type` for routing only. No `account_status` or `email_verified` logic in the MVP call path.
4. Schema is Phase 2-ready: `email_verify_tokens` table and all RLS policies remain in migrations as written. The schema does not change. The flow changes.
5. Migration deployment gate is now OPEN (see Part 4).

### NOVA — Auth Screen Implementation

1. Implement Login screen per `UX_SPEC_LOGIN_REGISTER.md` — email + password only. No verification flow.
2. Implement Register screen as information-only: "Account activation is by invitation only." No form that creates an account. No verification trigger.
3. The verification and activation screens documented in Quill's UX spec are to be built as components — but NOT wired into MVP routing. They are shelf-ready for Phase 2.
4. Sign-in success path: check `user_type` from `public.users` → route to landing (student) or dashboard (coach/counselor).
5. No `email_verified` check. No `account_status` gate. These are Phase 2 wire-ups.

### QUIN — Auth Test Scope

1. Phase 1 auth regression suite covers:
   - TC-AUTH-001: sign-in (email + password → success)
   - TC-AUTH-002: coach login → role-based routing to dashboard confirmed
   - TC-AUTH-003: sign-out + session restore
2. No verification flow tests in Phase 1 regression gate.
3. Add a test for Condition 2: high_school autocomplete presents options from `hs_programs`, does not accept free text.
4. Do not write a failing test for coach financial field visibility (Condition 3 — accepted debt).
5. A Phase 2 verification flow test can be scaffolded but must be excluded from the Phase 1 gate.

### MORTY — Audit Scope Adjustment

1. Condition 1 (service role key) still applies — Patch corrects the Edge Function code. Morty confirms correction before declaring Condition 1 closed.
2. Phase 1 auth audit covers: sign-in flow + role routing only. Verification chain is not in Phase 1 audit scope.
3. Financial field visibility (Condition 3) is logged as accepted debt in the audit record. It is not a compliance failure in Phase 1.

---

## PART 4 — MIGRATION DEPLOYMENT GATE

The three Morty conditions are resolved by operator ruling. Condition 1 requires a code correction by Patch before migrations are applied. When Patch confirms the `verify-email` service role key correction is complete, the migration deployment gate is OPEN.

**Patch is authorized to apply migrations to Supabase immediately after confirming the Condition 1 correction.**

No further Scout or operator approval is required for the migration apply step. This is a delegated execution authorization under the Morty PASS WITH CONDITIONS verdict, now fully resolved.

---

## DECISION RECORD

| # | Decision | Owner | Status |
|---|----------|-------|--------|
| DEC-CFBRB-028 | Condition 1 ACCEPTED: verify-email uses service role key | Chris | CLOSED |
| DEC-CFBRB-029 | Condition 2 ACCEPTED: high_school autocomplete against hs_programs | Chris | CLOSED |
| DEC-CFBRB-030 | Condition 3 ACCEPTED: financial fields visible to coaches in MVP — documented debt | Chris | CLOSED |
| DEC-CFBRB-031 | Phase 1 auth scope change: email verification suspended; bulk seeding model | Chris | CLOSED |
| DEC-CFBRB-032 | Migration deployment gate: OPEN after Patch Condition 1 correction confirmed | Scout (delegated) | OPEN PENDING PATCH CONFIRM |

---

## ACKNOWLEDGMENT REQUIRED

Each named agent must acknowledge this directive before executing any auth-related work. Acknowledgment format:

```
[AGENT NAME] ACKNOWLEDGED — COMPLIANCE DIRECTIVE AUTH SCOPE 2026-03-25
Understood: [one sentence confirming what changes for that agent]
```

Scout records acknowledgments as they arrive. Work authorized to begin when all four agents (Patch, Nova, Quin, Morty) have acknowledged.

---

**Scout — Compliance Authority**
`C:\Users\chris\dev\gritty-recruit-hub-rebuild\docs\COMPLIANCE_DIRECTIVE_AUTH_SCOPE_2026-03-25.md`
