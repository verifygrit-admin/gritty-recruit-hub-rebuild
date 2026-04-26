# R4 Mailto Template Review — Sprint 007 B.2

**Status:** Revised for final confirmation. Operator review pass complete; revisions A, B, §5 decisions, and T1–T4 applied. No mailto button is wired until this revised document is signed off.
**Scope:** 14 templates (7 Pre-Read doc types × 2 recipients) for the Shortlist slide-out's per-doc Email buttons.
**Source:** R4 + R5 from the Sprint 007 open exchange. Supersedes the placeholder `COACH_MAILTO_TEMPLATE` and `COUNSELOR_MAILTO_TEMPLATE` constants in `src/lib/copy/shortlistMailtoCopy.js`.

---

## 1. Recipient & wiring rules (R5 + existing convention)

### Email Coach button — College head coach (R5 redirect)

- **Recipient:** the **college** head coach for the shortlisted school. Selected via:
  ```sql
  SELECT name, email
  FROM college_coaches
  WHERE unitid = $1 AND is_head_coach = true
  ORDER BY id
  LIMIT 1;
  ```
- **Disabled-button rules per R5:**
  1. No row matches → button disabled, tooltip: `"No head coach on file for {schoolName} — flag this to your HS coach or counselor."`
  2. Row matches but `email IS NULL` → button disabled, tooltip: `"Head coach record on file for {schoolName} has no email — flag this so we can update it."`
  3. **No silent fallback to a non-head-coach record.** If the head coach record is missing or incomplete, the gap is surfaced — never papered over by emailing an assistant.
- **Voice:** the student is reaching out directly to the college head coach.

### Email Counselor button — HS guidance counselor (unchanged from existing wiring)

- **Recipient:** the student's HS guidance counselor, via the existing chain:
  ```sql
  -- Pseudocode; current contacts shape already plumbs this through ShortlistPage.
  SELECT p.name, p.email
  FROM hs_counselor_students hcs
  JOIN profiles p ON p.user_id = hcs.counselor_user_id
  WHERE hcs.student_user_id = $current_student_user_id
  LIMIT 1;
  ```
- **Disabled-button rules:** existing — if `hs_guidance_counselor_email` is null on the contacts shape, button disabled with the existing tooltip "No counselor email on file — add to your Student Profile".
- **Voice:** the student is asking their HS counselor to take an action (send a doc, confirm something) on the student's behalf.

---

## 2. Token substitution scheme

All 14 templates resolve through the existing `applyTokens()` helper in `src/lib/copy/shortlistMailtoCopy.js` (line 49–57). Tokens are interpolated by the slide-out's `tokens` object before `mailto:` href construction.

### Token table

| Token | Source | Used in | Fallback if missing |
|---|---|---|---|
| `{studentFirstName}` | Split from `profiles.name` (first whitespace-delimited token) | All 14 | Empty string |
| `{studentLastName}` | Split from `profiles.name` (last token) | All 14 | Empty string |
| `{studentClassYear}` | Derived from `profiles.grad_year` via `getClassLabel()` in `src/lib/scoring.js` → `"Senior"` / `"Junior"` / `"Soph"` / `"Freshman"` | All 14 (where natural; appears in 4.1, 4.2, 4.3) | `"high school"` |
| `{studentPosition}` | `profiles.position` | All 14 (coach side leans on it; counselor side keeps it light) | `"football player"` |
| `{studentHighSchool}` | `profiles.high_school` | All 14 | `"my high school"` |
| `{schoolName}` | `short_list_items.school_name` (or fallback `schools.school_name`) | All 14 | (button disabled if missing) |
| `{documentType}` | Doc row label from `PRE_READ_DOC_TYPES` in `ShortlistSlideOut.jsx` | All 14 | (per-template fallback noted below) |
| `{documentStatus}` | `"SUBMITTED"` / `"NOT SUBMITTED"` from existing slideout aggregate | Counselor templates only | `"NOT SUBMITTED"` |
| `{coachName}` | `college_coaches.name` for the head-coach row | Coach side only (7 templates) | `"Coach"` |
| `{counselorName}` | `profiles.name` of the linked HS counselor (full name with prefix if present, else first name) | Counselor side only (7 templates) | `"Hello"` (drops the leading name line) |

**Implementation note for the wiring step (T2 confirmed):** the existing `applyTokens()` function leaves unknown tokens as-is (`"{token}"` literal in output). Fallback resolution happens at the slide-out call site where data context is local — `applyTokens()` stays pure. No code change to `shortlistMailtoCopy.js` is needed beyond the new template constants.

### Two new contact fields the slide-out needs

The current `contacts` prop shape is `{ hs_head_coach_email, hs_guidance_counselor_email }`. To support these templates the shape extends to:

```js
contacts = {
  // Existing
  hs_head_coach_email:         string | null,  // DEPRECATED post-Sprint 007 R5; Email Coach now targets college head coach via college_head_coach_email.
  hs_guidance_counselor_email: string | null,
  hs_guidance_counselor_name:  string | null,  // NEW — for {counselorName}

  // R5 redirect — replaces hs_head_coach_email's role on Email Coach button
  college_head_coach_email: string | null,     // NEW — keyed per slide-out item's unitid
  college_head_coach_name:  string | null,     // NEW — for {coachName}
};
```

Per T1 decision: `hs_head_coach_email` stays on the shape with a deprecated comment. Future cleanup pass can remove it.

---

## 3. Subject line convention

Standardized across all 14 to make inbox triage easy on both sides. Colons used as the separator (T5.9 decision — em-dash renders inconsistently across mobile mail clients).

- **Coach side:** `{schoolName} pre-read: {documentType}`
- **Counselor side:** `{schoolName} pre-read: {documentType} request`

The `pre-read` framing is shared across all docs because every Pre-Read doc row in the slide-out is part of the same admissions pre-read packet. The "request" word on the counselor side does real work — it tells the counselor at-glance that this email is asking them for something, which materially helps inbox triage (T3 confirmed).

---

## 4. The 14 templates — grouped by doc type, side-by-side

Each template's body is 3–4 short lines plus a sign-off, matching the existing mobile-friendly compose-window guidance. Token substitution is inline. Plain text only — no Markdown in the rendered email since `mailto:` body is interpreted as plain text by mail clients.

---

### 4.1 Transcript

| **Email (Head) Coach** | **Email Counselor** |
|---|---|
| **Subject:** `{schoolName} pre-read: Transcript` | **Subject:** `{schoolName} pre-read: Transcript request` |
| **Body:** | **Body:** |
| `{coachName},` | `{counselorName},` |
| | |
| `I'm a {studentClassYear} {studentPosition} at {studentHighSchool} working through the pre-read process with {schoolName}. I wanted to make sure your admissions team has my official transcript on file for the academic review.` | `I'm working through the recruiting pre-read process with {schoolName} and their admissions team needs my official transcript. Current status on my end: {documentStatus}. Could you send it directly to them when you have a moment?` |
| | |
| `Happy to provide anything else your staff needs to move forward — please let me know.` | `Let me know if you need anything from me to get it out.` |
| | |
| `Thanks,` | `Thank you,` |
| `{studentFirstName} {studentLastName}` | `{studentFirstName} {studentLastName}` |

---

### 4.2 Senior Course List

| **Email (Head) Coach** | **Email Counselor** |
|---|---|
| **Subject:** `{schoolName} pre-read: Senior Course List` | **Subject:** `{schoolName} pre-read: Senior Course List request` |
| **Body:** | **Body:** |
| `{coachName},` | `{counselorName},` |
| | |
| `I wanted to share my senior year course list for {schoolName}'s admissions pre-read. {studentClassYear} at {studentHighSchool} — I can send the full course list and any teacher recommendations your team would want to see.` | `I'm doing the recruiting pre-read with {schoolName} and they're asking for my senior course list. Current status: {documentStatus}. Could you confirm or send the official version directly to their admissions team?` |
| | |
| `Let me know if your team would prefer a different format or any additional context.` | `Happy to fill in anything you need from my side.` |
| | |
| `Thanks,` | `Thank you,` |
| `{studentFirstName} {studentLastName}` | `{studentFirstName} {studentLastName}` |

---

### 4.3 Writing Example

| **Email (Head) Coach** | **Email Counselor** |
|---|---|
| **Subject:** `{schoolName} pre-read: Writing Example` | **Subject:** `{schoolName} pre-read: Writing Example request` |
| **Body:** | **Body:** |
| `{coachName},` | `{counselorName},` |
| | |
| `Sharing a writing example for {schoolName}'s admissions pre-read. I'm a {studentClassYear} {studentPosition} at {studentHighSchool} and wanted to make sure your team has everything they need on the academic side.` | `{schoolName} is asking for a writing sample as part of their pre-read. Current status: {documentStatus}. If you have one on file from a recent class, could you send it to their admissions team — or let me know which piece you'd recommend?` |
| | |
| `Let me know if a different sample would be more useful for your review.` | `Glad to send something specific if that's easier.` |
| | |
| `Thanks,` | `Thank you,` |
| `{studentFirstName} {studentLastName}` | `{studentFirstName} {studentLastName}` |

---

### 4.4 Student Resume

| **Email (Head) Coach** | **Email Counselor** |
|---|---|
| **Subject:** `{schoolName} pre-read: Student Resume` | **Subject:** `{schoolName} pre-read: Student Resume request` |
| **Body:** | **Body:** |
| `{coachName},` | `{counselorName},` |
| | |
| `Sending my student resume for {schoolName}'s pre-read. Covers academics, athletics, leadership, and service in one place — should give your team the full picture without bouncing between docs.` | `I'm in the pre-read process with {schoolName} and they're looking for my student resume. Current status: {documentStatus}. Could you send the latest version on file directly to them?` |
| | |
| `Happy to walk through anything specific your staff wants more detail on.` | `Let me know if you'd like me to send you an updated copy first.` |
| | |
| `Thanks,` | `Thank you,` |
| `{studentFirstName} {studentLastName}` | `{studentFirstName} {studentLastName}` |

---

### 4.5 School Profile PDF

| **Email (Head) Coach** | **Email Counselor** |
|---|---|
| **Subject:** `{schoolName} pre-read: {studentHighSchool} School Profile` | **Subject:** `{schoolName} pre-read: School Profile request` |
| **Body:** | **Body:** |
| `{coachName},` | `{counselorName},` |
| | |
| `Sharing {studentHighSchool}'s school profile PDF for {schoolName}'s pre-read review. Wanted to make sure your admissions team has the grading scale and curriculum context they need to evaluate my transcript fairly.` | `{schoolName}'s admissions office is asking for {studentHighSchool}'s school profile PDF as part of the pre-read. Current status: {documentStatus}. Could you send the most recent version directly to them?` |
| | |
| `Let me know if your team needs anything else from {studentHighSchool}.` | `Thanks for handling — let me know if anything's needed from my side.` |
| | |
| `Thanks,` | `Thank you,` |
| `{studentFirstName} {studentLastName}` | `{studentFirstName} {studentLastName}` |

---

### 4.6 SAT/ACT Scores

| **Email (Head) Coach** | **Email Counselor** |
|---|---|
| **Subject:** `{schoolName} pre-read: SAT/ACT Scores` | **Subject:** `{schoolName} pre-read: SAT/ACT Score Report request` |
| **Body:** | **Body:** |
| `{coachName},` | `{counselorName},` |
| | |
| `Sharing my official SAT/ACT scores for {schoolName}'s academic pre-read. Want to make sure your admissions team has the report they need to run the eligibility check on their side.` | `I'm releasing my official SAT/ACT scores to {schoolName}'s admissions office through College Board / ACT for the pre-read. Current status on my end: {documentStatus}. Could you confirm with their admissions office that the scores arrive on their side, or coordinate timing if they have a preferred window?` |
| | |
| `Let me know if there's a preferred format or specific contact for the report.` | `Let me know if you need anything from me first.` |
| | |
| `Thanks,` | `Thank you,` |
| `{studentFirstName} {studentLastName}` | `{studentFirstName} {studentLastName}` |

---

### 4.7 Financial Aid Info

| **Email (Head) Coach** | **Email Counselor** |
|---|---|
| **Subject:** `{schoolName} pre-read: Financial Aid Info` | **Subject:** `{schoolName} pre-read: Financial Aid Info request` |
| **Body:** | **Body:** |
| `{coachName},` | `{counselorName},` |
| | |
| `I'm working through the financial aid pre-read with {schoolName} and figured you may not be the right contact for that piece — could you point me to the staffer or admissions officer who handles FA pre-read? Happy to take it from there once I know where to send it.` | `I'm doing the financial aid pre-read with {schoolName}. Current status: {documentStatus}. Could you walk me through what they need from my family and where to send it — or send what's on file directly to their financial aid office if that's the right path?` |
| | |
| `Thanks for the assist.` | `Appreciate the help making sure this goes to the right place.` |
| | |
| `Thanks,` | `Thank you,` |
| `{studentFirstName} {studentLastName}` | `{studentFirstName} {studentLastName}` |

---

## 5. Resolved review decisions

The ten review items surfaced in the draft pass have been resolved per the operator review. Each item below records the locked decision, with rationale where it carries forward into implementation.

1. **Coach-side voice register — confirmed.** Coach templates address the college head coach as "Coach" via `{coachName}` (e.g., "Coach Smith,"). Student is the sender. No HS-coach-forwarding framing — that pattern was dropped per R5 + operator direction. Coach templates share information directly or open the door for next steps.

2. **Counselor-side voice register and `{documentStatus}` signal — confirmed.** Counselor is being asked to take action; `{documentStatus}` named in each counselor template gives the counselor at-glance signal on whether the doc is already on file. Operationally useful for the counselor.

3. **Tone parity per doc type — confirmed.** Consistent length and warmth across the 14 with deliberate differences where the doc type genuinely changes the ask (Financial Aid Info softer; SAT/ACT counselor-side asks for confirmation rather than release because the student releases scores directly).

4. **`{studentClassYear}` framing — switched to `"Junior"` / `"Senior"` form via `getClassLabel()`.** Reason: templates already include `{studentHighSchool}` and `{studentPosition}`; `"Junior {studentPosition} at {studentHighSchool}"` reads as natural recruiting voice. `"Class of 2027 {studentPosition}"` reads more like a database record than a person introducing themselves. Token resolver maps `grad_year` → class label using the existing `getClassLabel()` helper in `src/lib/scoring.js`.

5. **Senior Course List — head-coach body reworked.** No assumption of manual attachment. New opening: `"I wanted to share my senior year course list for {schoolName}'s admissions pre-read. {studentClassYear} at {studentHighSchool} — I can send the full course list and any teacher recommendations your team would want to see."`. Counselor 4.2 unchanged — already had no attachment dependency.

6. **Financial Aid templates — head-coach side rewritten and tightened.** Per Revision B, head-coach 4.7 acknowledges the head coach is likely the wrong contact and asks for redirection. Length now matches the 4.1–4.6 shape. Counselor 4.7 stays softer because the counselor genuinely walks students through this — parity in length, not parity in framing.

7. **Coach name fallback — `"Coach"` confirmed.** When `{coachName}` is null, fallback resolves to `"Coach"` so the greeting reads `"Coach,"`. No last-name parsing — the `college_coaches.name` field is inconsistent across imports (could be "Coach Smith" / "John Smith" / "Smith, John" / "John Smith Jr."), and the risk of getting the form wrong outweighs the upside of "Coach Smith" vs "Coach".

8. **Counselor name fallback — switched to `"Hello"`.** When `{counselorName}` is null, fallback now resolves to `"Hello"` (was `"Hi"`). Reason: the rest of the counselor templates land in a slightly more formal register than `"Hi"` implies; `"Hello"` sets the right tone when no name is on file.

9. **Subject line separator — switched to colons.** Format updated across all 14 templates and the §3 convention. Coach side: `"{schoolName} pre-read: {documentType}"`. Counselor side: `"{schoolName} pre-read: {documentType} request"`. Reason: em-dash renders inconsistently across mobile mail clients (Gmail mobile in particular degrades it to a hyphen and adds visible noise); colon is the most universally readable separator.

4.6 SAT/ACT Scores counselor — rewritten per Revision A. Counselor does not release scores (students release directly through College Board / ACT); template now asks the counselor to confirm receipt with the admissions office or coordinate timing. `{documentStatus}` signal preserved.

10. **Disabled-state tooltips — confirmed as drafted in §1.** Both R5-mandated tooltips surface the gap clearly without papering over.

---

## 6. What ships next, after final sign-off

1. Replace the two existing template constants in `src/lib/copy/shortlistMailtoCopy.js` (`COACH_MAILTO_TEMPLATE`, `COUNSELOR_MAILTO_TEMPLATE`) with a 14-template lookup keyed by `(recipient, documentType)`. Single source of truth, single import site.
2. Extend `contacts` prop shape on `ShortlistSlideOut` to include `college_head_coach_email`, `college_head_coach_name`, and `hs_guidance_counselor_name`. Mark `hs_head_coach_email` deprecated per T1. Update the parent (`ShortlistPage`) to populate the new fields via the new `college_coaches` query and the existing counselor-link query (extended to read counselor `name`).
3. Wire the slide-out's `MailtoButton` rendering to:
   - Read the new template constants by `(recipient, documentType)`.
   - Resolve token fallbacks at the call site before passing to `applyTokens()` (per T2). Class-label resolution uses `getClassLabel()` from `src/lib/scoring.js` per §5.4.
   - Surface the two new disabled-state tooltips per R5.
3.5. **Mobile mail client smoke test (per T4).** Open one rendered `mailto:` URL on iOS Mail and one on Gmail mobile. Confirm:
   - Line breaks render as expected (`mailto:` bodies use `%0A` newline encoding; not all clients honor identically — verify both).
   - Populated subject and body fit the compose window without truncation on iPhone-sized viewports.
   - Tokens are visibly resolved (no literal `"{tokenName}"` strings leaking through; class label, coach name, counselor name fallbacks all behave correctly when source fields are null).
   Capture screenshots from both clients and include them in the B.2 completion report.
4. Update the existing `tests/unit/s3-shortlist-slide-out.test.jsx` to assert against the new template constants and the new contacts shape.
5. Add a new unit test asserting all 14 templates exist as `(recipient, documentType)` lookups for every doc type in `PRE_READ_DOC_TYPES` and that disabled-state tooltips render correctly when contacts are missing.

None of step 1–5 ships until this revised document is signed off.
