# Sprint 024 — Ricky Copeland Grit Guide: Section XI rewrite + hub verification

## 1. Sprint identity

- **Sprint number:** 024
- **Dates:** 2026-05-11 (single-session sprint)
- **Repos touched:**
  - REPO A — `grittos-guides` (Ricky Copeland guide source; deploy target)
  - REPO B — `gritty-recruit-hub-rebuild` (My Grit Guides surface; verification only)
- **Mode:** Working-team execution; two-goal scope (REPO A rewrite + deploy, then REPO B cross-role verification).

---

## 2. Done state

### Goal 1 — Ship the Section XI rewrite (REPO A)

**PASS.** Section XI (`<section id="s10">`) in `rcopeland/local/rcopeland/index.html` was replaced with the three coach-group dialog structure plus a new pre-group Target List. Deployment to Vercel project `grittyos-guide-copeland` returned `readyState: READY`. Production alias `https://grittyos-guide-copeland.vercel.app` resolved live. Section tag balance verified (13 opens / 13 closes; file +67 lines net).

### Goal 2 — Verify the wiring across three viewer roles (REPO B)

**PASS — all three roles.**
- **Student view (Ricky):** `findGuidesByEmail('copelandul@belmonthill.org')` matches the `rcopeland` entry in `src/data/grit-guides.js`. `auth.users` + `public.profiles` rows confirmed under user_id `799b483a-97ed-49e2-8f4d-aac8c803c8ad`, `user_type=student_athlete`.
- **Coach view (Frank Roche, Belmont Hill):** `auth.users` id `4c1e43c4-3bf7-49ef-b5c9-17b7be94bfeb`, `user_type=hs_coach`. `hs_coach_students` row id=30 links Roche → Ricky (confirmed_at 2026-05-07). `StaffView` (isCoach=true) chain resolves end-to-end.
- **Counselor view (June Schmunk, Belmont Hill):** `auth.users` id `4a48c09f-5f5c-411b-9d00-8aa7213e4eef`, `user_type=hs_guidance_counselor`. `hs_counselor_students` row id=29 links Schmunk → Ricky (linked_at 2026-05-07). `StaffView` (isCoach=false) chain resolves end-to-end.
- **Live surface:** `GET https://app.grittyfb.com/recruits/rcopeland` → `302` to `/recruits/login?slug=rcopeland&next=…` → `200` login HTML (8 KB, GrittyOS-branded). Auth wall intact in front of the freshly-deployed Section XI.

No GAPs surfaced. No SQL inserts required.

---

## 3. What shipped

### REPO A — `grittos-guides`

- **File:** `rcopeland/local/rcopeland/index.html` (lines 2898–2956 replaced; CSS rule added adjacent to `.section-title em` at the existing style block).
- **Content change:** Section XI "Talking to coaches at NEPSAC Showcase Day" rewritten from a single shared dialog into three coach-group templates:
  - **Group 1 — Top Recruiting Scoreboard Schools:** Carleton · MIT · Case Western · Colby · Hamilton · Fordham
  - **Group 2 — Mid-Tier Recruiting Scoreboard Schools:** Trinity · RPI · Wesleyan · Union · U. of Rochester · WashU · Howard
  - **Group 3 — A New Coach Interrupts You:** coach opens; introduces the "Sell Your Recruiting Journey" turn
- **New pre-group Target List** of 13 schools in priority order with framing copy ("Operate with a purpose. As soon as your last drill is finished…"). Middlebury removed from the previous speak-first list.
- **New CSS class:** `.coach-group-heading` for the three `<h3>` group dividers.
- **Deploy:** `vercel deploy --prod` from `rcopeland/local/rcopeland/`. Build machine `iad1`, 2 cores / 8 GB. Deploy ID `dpl_BofCGXPbCWmHPzF9auBw3udib1zG`. `readyState: READY`.

### REPO B — `gritty-recruit-hub-rebuild`

- **No code edits.** Verification only.
- Confirmed `src/data/grit-guides.js` `rcopeland` entry is present and correctly keyed on `copelandul@belmonthill.org` → `https://app.grittyfb.com/recruits/rcopeland`.
- Confirmed both Belmont Hill staff records (`roche@belmonthill.org`, `schmunk@belmonthill.org`) have valid Supabase link rows to Ricky in `hs_coach_students` and `hs_counselor_students` respectively.
- Confirmed the `/recruits/rcopeland` proxy (Edge Function `api/recruits-auth.ts` using `RECRUIT_ORIGIN_RCOPELAND` + `RECRUIT_PASSWORD_RCOPELAND`) serves the GrittyOS-branded login page on unauthenticated GET.

---

## 4. Decisions on record

- **Honor REPO A gitignore policy.** Per-recruit guide content under `rcopeland/` is not committed to REPO A. Root `.gitignore` is explicit: *"Per-recruit guide content stays local only (deployed via Vercel from local; never committed)."* The Vercel deploy IS the artifact. This sprint did not force-add. If the policy is ever revisited, that is a separate CHECK WITH ME decision touching the source-of-truth ignore rule.
- **CSS adaptation — match guide's light-theme palette.** `.coach-group-heading` uses `var(--border-hairline)` (the guide's existing hairline token, `rgba(20,73,47,0.12)`) and `color: var(--ink)`, not the dark-theme `rgba(255,255,255,0.12)` originally drafted. Reason: the rcopeland guide is a light-theme document; the drafted rgba would have rendered nearly invisible.
- **Dialog markup adaptation — reuse existing taxonomy.** All three groups were rebuilt using the existing `coach-warning-callout` (with `coach-warning-glyph` + `coach-warning-body`) and `coach-dialog-script` / `dialog-turn` / `dialog-turn-speaker` / `dialog-turn-body` classes, plus `dialog-turn-keyquestion` and `dialog-turn-scenario` modifiers. No new dialog-related classes introduced; only one new class added (`.coach-group-heading`).
- **Middlebury removed from the Target List** per operator note: communication with Middlebury has lapsed; if Middlebury wants Ricky they will come to him. Source doc reflects this; the deployed Section XI reflects this.

---

## 5. Carry-forwards / hygiene notes

- **Discovery accuracy for grit-guide sprints.** The initial discovery subagent mis-described the existing Section XI markup taxonomy as simpler than it actually was (missed `coach-warning-glyph`/`coach-warning-body` and the `dialog-turn-*` modifier classes). Execution recovered by re-reading the target block before writing the Edit, but the lesson generalizes: **the executing prompt should always re-read the exact target block before writing, not rely solely on the discovery report.** For future grit-guide content sprints, build that re-read into the apply-edit step rather than treating discovery output as authoritative for structural markup.
- **REPO B schema observations** worth carrying into future verification SQL:
  - `public.profiles` has `name` (not `full_name`) and **does not** carry `user_type`.
  - `public.users` has `user_type` but **no email column**.
  - Joins from user_type → email go through `public.profiles` (or `auth.users`).
- **Retro home convention.** This is a REPO B retro because REPO B is the sprint workstream home for the rcopeland surface. REPO A's contribution (the HTML edit + Vercel deploy) is logged here, not in REPO A — consistent with REPO A's gitignore policy for per-recruit content.

---

## 6. Production URLs

| Surface | URL |
|---|---|
| Guide deploy (Vercel alias) | https://grittyos-guide-copeland.vercel.app |
| Family-facing (proxied) | https://app.grittyfb.com/recruits/rcopeland |
| Deploy ID | `dpl_BofCGXPbCWmHPzF9auBw3udib1zG` |
| Inspect | https://vercel.com/verifygrit-admins-projects/grittyos-guide-copeland/BofCGXPbCWmHPzF9auBw3udib1zG |
