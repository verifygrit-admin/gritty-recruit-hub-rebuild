# Decision Filing Manifest — Phase 1 Spec Session

**Date:** 2026-03-24
**Project:** gritty-recruit-hub-rebuild
**Decision Series:** DEC-CFBRB-001 through DEC-CFBRB-027+
**Filing Responsibility:** Scribe (write), Vault (index)

---

## Decision List

All 27 decisions from the Phase 1 Spec Session. Each decision is reserved (ID assigned by Scout before filing). File one entry per decision ID per the DECISION_LOG_ENTRY template.

### Architecture & Identity (DEC-CFBRB-001 to -003)

| ID | Topic | Reason | Alternatives Rejected |
|----|-------|--------|---------------------|
| DEC-CFBRB-001 | New repo gritty-recruit-hub-rebuild confirmed | Fresh start required; complete SAID removal incompatible with existing cfb-recruit-hub schema | Migrating old repo (would require complex feature-flag logic) |
| DEC-CFBRB-002 | SAID removed entirely (no said column, no auth_said(), no SAID sequence) | Simplify identity model; user_id (Supabase Auth UUID) is sole identity key | Keep SAID as alternate identity (adds complexity without benefit) |
| DEC-CFBRB-003 | Four user roles: students, coaches, guidance_counselors, admins | Matches recruiting workflow: students choose schools, coaches see recruiting interest, GCs add financial aid context, admins manage all | Three roles (omit GC) would require admin to handle FA scores; five roles (separate student types) adds unnecessary branching |

### Auth & Account Model (DEC-CFBRB-004 to -006)

| ID | Topic | Reason | Alternatives Rejected |
|----|-------|--------|---------------------|
| DEC-CFBRB-004 | Seeded account activation model: admin creates account by email, student activates at first login | Reduces public registration complexity; integrates with school enrollment process (BC High students list → admin seeds) | Open registration (increases phishing risk, requires email verification gating); magic link (adds session state complexity) |
| DEC-CFBRB-005 | Email verification required for account activation | Confirm email ownership; prevent typos; gate shortlist + recruiting journey features | Optional email verification (loses ownership guarantee; breaks password reset flow) |
| DEC-CFBRB-006 | Password reset flow via email + verification code (Resend transactional email) | Secure, standard UX; uses existing Resend setup (API key + domain already verified) | SMS reset (adds Twilio cost + phone number requirement); username hint-based reset (less secure) |

### Schema & Junction Tables (DEC-CFBRB-007 to -009)

| ID | Topic | Reason | Alternatives Rejected |
|----|-------|--------|---------------------|
| DEC-CFBRB-007 | Junction table schema: users (1) → student_profiles / coach_profiles / gc_profiles / admin_profiles (N, one per role) | Role-specific data (coach bio ≠ student interests); RLS policy per junction table; clean permission model | Single users + roles column (requires CASE logic in RLS; harder to audit permissions) |
| DEC-CFBRB-008 | Coach viewing permissions: recruiting journey + location + academic rigor ONLY; no test scores, contact info, family data | Coaches need to understand student interests (recruiting journey = explicit intent signal) and academic fit (rigor score); rest is privacy-sensitive | Coaches see full profile (violates student privacy; sharing family/contact info without consent); coaches see nothing (defeats purpose of platform) |
| DEC-CFBRB-009 | GC-exclusive Financial Aid scores: only GCs add/see FA scores; coaches blocked from FA column | GCs advise on college affordability; coaches need athletic fit, not FA context. Prevents coaches from using FA as recruitment gating tool. | Open FA to coaches (violates confidentiality; coaches might stratify recruiting by financial aid); hide FA from GCs (defeats college affordability advising) |

### Feature Scope — UX (DEC-CFBRB-010 to -013)

| ID | Topic | Reason | Alternatives Rejected |
|----|-------|--------|---------------------|
| DEC-CFBRB-010 | Recruiting journey = 15-step student-facing feature (pre-contact, contact initiated, campus visit, offer, committed, etc.) | Explicit student intent signal; helps coaches prioritize; validates recruiting process fidelity | No journey (coaches blind to student interest level); generic 3-step journey (loses nuance; misses recruiting reality) |
| DEC-CFBRB-011 | GRIT FIT map + table views for school discovery | Students want spatial + spreadsheet views; map shows conference clusters; table shows sortable scoring dimensions | Only map (harder to compare many schools); only table (loses geographic context); no visualization (forces manual review of 600+ schools) |
| DEC-CFBRB-012 | Student shortlist + recruiting journey save/filter | Students want to bookmark schools of interest; recruiting journey filters (e.g., "show me schools where I'm in pre-contact stage") | No shortlist (requires re-filtering every session); recruiting journey not tied to shortlist (separate workflows; more UI work) |
| DEC-CFBRB-013 | Profile form for GRIT FIT input (academics + sports + extracurricular) | Scores feed GRIT FIT algorithm; form gates entry to map view (must complete profile first); integrates with school academic rigor / athletic recruitment standards | No profile step (scores hardcoded; no personalization); long form (too much friction; defers to Phase 2) |

### Hosting & Deployment (DEC-CFBRB-014 to -015)

| ID | Topic | Reason | Alternatives Rejected |
|----|-------|--------|---------------------|
| DEC-CFBRB-014 | Vercel deployment target (frontend only) | Faster builds than GitHub Pages; native Vite integration; env var secrets (VITE_* + runtime secrets); global CDN | GitHub Pages (no runtime secrets; slower builds; static only); AWS (over-spec for MVP; adds deployment complexity) |
| DEC-CFBRB-015 | grittyfb.com custom domain (DNS not yet pointed) | Brand consistency (gritty.fb → app.grittyfb.com); Resend sender already verified on domain; prepared for post-MVP move to Vercel+custom | Subdomain on different domain (less branded); app.github.io (temporary; planned move to grittyfb.com anyway) |

### Phase Scope & Deferral (DEC-CFBRB-016 to -018)

| ID | Topic | Reason | Alternatives Rejected |
|----|-------|--------|---------------------|
| DEC-CFBRB-016 | Phase 1 scope: auth, schema, 5 core screens (landing, GRIT FIT map/table, profile form, shortlist, auth flows), API layer | Students can discover schools + find recruiting interest; coaches can view recruiting signals; GCs can advise on affordability; admins can manage accounts. Minimum viable product. | Scope creep (add coach/GC dashboards to Phase 1 = slips Phase 1 delivery by 2+ weeks); minimal scope (omit recruiting journey = student feature incomplete) |
| DEC-CFBRB-017 | Coach + GC dashboards DEFERRED to Phase 2 (post-Phase-1 release) | Phase 1 focuses on student UX (core value prop); dashboards are admin/professional features (can come after MVP student launch). Reduces Phase 1 complexity. | Include dashboards in Phase 1 (delays student launch; unfocused spec); exclude dashboards entirely (less useful platform for coaches; reduces adoption) |
| DEC-CFBRB-018 | File upload/download (student transcripts, coach job applications, etc.) DEFERRED to Phase 3 (post-Phase-2) | Phase 1 focuses on discovery + recruiting interest signal. File handling adds virus scanning + storage + audit trail complexity. | Include in Phase 1 (adds S3/Virustotal integration; delays release); exclude entirely (limits document sharing; less useful for coaches in Phase 2) |

### Testing & Quality (DEC-CFBRB-019 to -020)

| ID | Topic | Reason | Alternatives Rejected |
|----|-------|--------|---------------------|
| DEC-CFBRB-019 | Playwright post-deploy regression tests (4+ tests): auth flow, map render, shortlist save, admin account creation | Catch production regressions fast; gate before Phase 1 release | Manual testing only (slow; error-prone); no E2E tests (risk of silent failures) |
| DEC-CFBRB-020 | Vitest unit tests (schema migrations, auth logic, GRIT FIT scoring). Pre-deploy gate: must be 100% green before deploy | Catch logic bugs before deployment; schema safety | No unit tests (slower CI iteration; risk of data corruption); optional gate (allows broken code to deploy) |

### Infrastructure & Stack (DEC-CFBRB-021 to -026)

| ID | Topic | Reason | Alternatives Rejected |
|----|-------|--------|---------------------|
| DEC-CFBRB-021 | CI/CD via GitHub Actions: lint + unit test gate, then Vercel deploy, then Playwright smoke | Automated quality gates; zero-click deployment; audit trail | GitLab CI (vendor lock-in; learning curve); Jenkins (self-hosted; more ops burden) |
| DEC-CFBRB-022 | Supabase authentication backend (JWT + session management via Supabase Auth) | Handles JWT issuing, refresh, revocation; RLS policies tied to Auth schema; integrated with Edge Functions | Firebase (less RLS control; more vendor lock-in); Okta (overkill for MVP; adds cost) |
| DEC-CFBRB-023 | RLS policies per role (row-level security on all tables: schools, profiles, short_list_items, etc.) | Enforce permissions at DB level (can't be bypassed); auditable policy changes | App-level authorization only (slower; easier to bypass); stored procedures (less portable) |
| DEC-CFBRB-024 | Seeded admin account: chris@grittyfb.com (or equivalent domain admin) + Supabase admin role | Bootstrap platform for admin tasks (user creation, data corrections, debugging); not exposed to public | Manual SQL inserts (error-prone); public registration + role upgrade flow (adds complexity; security risk) |
| DEC-CFBRB-025 | Logging + error reporting: Sentry.io or equivalent (catch runtime errors, track issues, alert on deploy) | Zero-touch error alerting; post-mortems are data-driven; Sentry integrates with Vercel | Console.error only (slow discovery; manual log review); custom logging (ops burden; slower alerting) |
| DEC-CFBRB-026 | API rate limiting per role: coaches < students < admins (prevent scraping; protect GC data) | GC financial aid data is sensitive; coaches might scrape recruiting signals; students less at risk | No rate limiting (allows scraping; DoS risk); uniform rate limiting (unfair to coaches; too strict for admins) |

### Versioning & Process (DEC-CFBRB-027)

| ID | Topic | Reason | Alternatives Rejected |
|----|-------|--------|---------------------|
| DEC-CFBRB-027 | Version tagging: v1.0.0 at Phase 1 close, v1.1.0 at Phase 2 start, v2.0.0 at Stage 2 close | Semver clarity; aligns with Rio version convention; snapshot checkpoints for rollback | Continuous versioning (no release boundaries; harder to track stages); skip Phase 1 tag (lose baseline for Phase 2 diffs) |

---

## Filing Instructions (for Scribe)

**Process:**
1. For each DEC-CFBRB-ID in the above list, create one decision log file in `C:\Users\chris\dev\_org\decisions\gritty-recruit-hub-rebuild\`
2. **Filename format:** `YYYY-MM-DD_decision_[slug].txt` (e.g., `2026-03-24_decision_new-repo-confirmed.txt`)
3. Use the DECISION_LOG_ENTRY template: https://github.com/verifygrit-admin/grittos-org/blob/master/templates/decisions/DECISION_LOG_TEMPLATE.txt
4. **Required fields per template:**
   - DECISION ID: (from list above)
   - DATE: 2026-03-24
   - PROJECT: gritty-recruit-hub-rebuild
   - DECISION OWNER: Chris Conroy
   - STATUS: Made
   - WHAT WAS DECIDED: (one-liner from Topic column above)
   - WHY: (from Reason column above)
   - ALTERNATIVES REJECTED: (from table above)
   - DEPENDENCIES: (what this decision unlocks; see roadmap)
   - REVIEW TRIGGER: (when should this decision be revisited? e.g., DEC-CFBRB-017 = revisit if Phase 2 kickoff reveals missing GC feature)
5. After all files written, append to `C:\Users\chris\dev\_org\decisions\MASTER_DECISION_LOG.txt` with a summary line per decision (see MASTER_DECISION_LOG format)

**Total files to create:** 27 decision log entries + 1 MASTER_DECISION_LOG append

---

## Review Triggers (Post-Filing Reference)

These are suggested review triggers for each decision. Scribe includes these in the REVIEW_TRIGGER field of each decision entry.

- **DEC-CFBRB-001 to -003**: Revisit if scope changes to include SAID or multi-repo strategy
- **DEC-CFBRB-004 to -006**: Revisit if seeded model breaks (e.g., admins report slow activation); if email verification fails in live testing
- **DEC-CFBRB-007 to -009**: Revisit if RLS policies cause permission bugs; if coaches request additional data (e.g., test scores)
- **DEC-CFBRB-010 to -013**: Revisit at Phase 2 kickoff (may inform coach/GC dashboard design)
- **DEC-CFBRB-014 to -015**: Revisit post-Phase-1 if Vercel cold starts are slow or grittyfb.com DNS issues surface
- **DEC-CFBRB-016 to -018**: Revisit at Phase 2 kickoff before designing dashboards
- **DEC-CFBRB-019 to -020**: Revisit if tests become burden (suggest reducing scope) or if coverage gaps emerge
- **DEC-CFBRB-021 to -026**: Revisit at Stage 2 gate if infrastructure costs spike or performance issues emerge
- **DEC-CFBRB-027**: Revisit if versioning causes confusion (e.g., hotfix numbering); otherwise stable

---

## Vault Indexing

After Scribe files all 27 decision log entries, Vault will:
1. Index all 27 files in `_org/MASTER_INDEX.txt` under the gritty-recruit-hub-rebuild project
2. Create a cross-project rollup entry linking all DEC-CFBRB-* to the new project
3. Tag as ARCH (architecture), SCHEMA (schema), UX (UX design), DELIVERY (hosting/deployment), QA (testing), PROCESS (versioning)

---

**Filing manifest created by Scribe — 2026-03-24**
