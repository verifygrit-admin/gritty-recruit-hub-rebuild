# SPEC: Coach/Counselor Dashboard — Item 3 Full Feature
**Status:** AWAITING AUTHORIZATION — Nova holds, no code until Chris approves
**Date:** 2026-03-29
**Authority:** Scout (Chief of Staff) — authored from Chris's Q&A answers
**Answers received:** Q1–Q5 confirmed 2026-03-29
**Related decisions:** DEC-CFBRB series; see patch-schema-auth-spec-v2.md for base schema

---

## TABLE OF CONTENTS

1. Scope and Boundaries
2. Current State Baseline
3. Multi-Page Navigation Structure
4. Schema Changes
5. Zero-Match Student Visibility
6. Verbal / Written Offer Badges
7. Pipeline Analytics
8. Recruiter Engagement Tracking (Coming Soon)
9. Recruiting Calendar (Coming Soon)
10. RLS Policy Requirements
11. What Is Buildable Now vs. Placeholder
12. David Data Integrity Flags
13. Done Conditions
14. Build Sequence

---

## 1. SCOPE AND BOUNDARIES

### In Scope — This Spec

- Multi-page layout for coach and counselor view (Students / Calendar / Reports)
- Schema: two new columns on `profiles` (Q1 = Option A confirmed)
- Zero-match section: summary count on Reports page + per-card indicator on student cards (Q5 confirmed)
- Verbal offer badge and written offer badge on student cards (Q5 expanded scope)
- Pipeline analytics: most-stuck steps across the roster (Q3: both coaches and counselors see this)
- Recruiter engagement tracking: Coming Soon placeholder only (no data yet)
- Recruiting calendar: Coming Soon placeholder only (no data yet)
- "Check in" nudge CTA: interactive mailto link (Q4 confirmed)

### Out of Scope — This Spec

- The student-facing NextStepsDashboard (covered in UX_SPEC_NEXT_STEPS_DASHBOARD.md)
- Admin seeding of coach-student links
- College coach user model normalization (Phase 2)
- Calendar data ingestion or external calendar integration
- Recruiter engagement data pipeline

### Roles Affected

Both `hs_coach` and `hs_guidance_counselor` roles see all features specified here.
Behavioral difference where it exists is called out explicitly per section.
Counselors additionally see financial data per DEC-CFBRB-003 — no change to that policy.

---

## 2. CURRENT STATE BASELINE

### What Exists Today

`CoachDashboardPage.jsx` — single page, loads all linked students, renders:
- `CoachActivitySummary` — division/conference breakdowns + overall journey progress stats
- `PlayerCard` grid — one card per student, expandable
- `CoachStudentCard` — expanded detail view: academic stats, per-school shortlist breakdown with GRIT FIT status badges and mini progress bars

`short_list_items` — 15-step recruiting journey stored in `recruiting_journey_steps` JSONB.
Step 14 = "Received verbal offer", Step 15 = "Received written offer". These already exist in the data model.

`profiles` — no zero-match tracking columns exist. This spec adds them (Q1 = Option A).

`coach_contact` JSONB column exists on `short_list_items` (migration 0014). Stores external college coach contact data per school entry.

### What This Spec Adds

1. New columns on `profiles` for zero-match tracking
2. Multi-page layout replacing the current single-page dashboard
3. Offer badges derived from existing step 14/15 data (no new columns needed)
4. Pipeline analytics computed from existing `recruiting_journey_steps` data
5. Coming Soon placeholders for recruiter engagement and calendar

---

## 3. MULTI-PAGE NAVIGATION STRUCTURE

### Decision

The coach/counselor dashboard splits into three pages. This replaces the current single-page layout.

### Route Structure

```
/coach                    →  redirect to /coach/students
/coach/students           →  Student Roster (current dashboard, extended)
/coach/calendar           →  Recruiting Calendar (Coming Soon placeholder)
/coach/reports            →  Reporting & Analytics
```

Counselors use the same routes. Role label in the header changes ("Coach Dashboard" vs "Counselor Dashboard") but layout and routes are identical.

### Navigation Component

A horizontal tab bar renders below the page header and above the content area. Tabs:

| Tab Label | Route | Active State |
|---|---|---|
| Students | /coach/students | Maroon (#8B3A3A) bottom border, 2px |
| Calendar | /coach/calendar | Same |
| Reports | /coach/reports | Same |

Tab bar styling:
- Background: #FFFFFF
- Border bottom: 1px solid #E8E8E8
- Tab padding: 12px 24px
- Active tab text: #8B3A3A, weight 600
- Inactive tab text: #6B6B6B, weight 400
- No wrapping — horizontal scroll on mobile if needed

### Role Gate

Role gate (`hs_coach` or `hs_guidance_counselor`) applies at the top level. All three child pages inherit the gate. No separate gate per page.

### Data Loading Strategy

- **Student Roster page:** Loads profiles + short_list_items on mount (existing behavior, extended)
- **Reports page:** Receives student/shortlist data passed as props from parent state (no new queries — computed from same dataset)
- **Calendar page:** No data load in Phase 1 (placeholder only)

Data is loaded once at the `CoachDashboardPage` level and passed down. This avoids redundant queries when switching tabs.

### File Structure

```
src/pages/CoachDashboardPage.jsx       — Shell: data loader, tab nav, routes child pages
src/pages/coach/CoachStudentsPage.jsx  — Student Roster tab (extracted from current dashboard)
src/pages/coach/CoachReportsPage.jsx   — Reports & Analytics tab (new)
src/pages/coach/CoachCalendarPage.jsx  — Calendar tab (placeholder)
src/components/CoachStudentCard.jsx    — Extended (offer badges added)
src/components/CoachActivitySummary.jsx — Retired or absorbed into CoachReportsPage
```

Implementation note for Nova: React Router `<Routes>` with `<Outlet>` pattern inside `CoachDashboardPage`. Tab nav uses `<NavLink>` for active-state management. Data state (students, shortlistByStudent) lives in `CoachDashboardPage` and is passed as props to child pages.

---

## 4. SCHEMA CHANGES

### 4.1 New Columns on `profiles` (Migration 0021)

Chris confirmed Q1 = Option A: add columns directly to the `profiles` table.

```sql
-- Migration: 0021_profiles_zero_match_tracking
-- Adds zero-match scoring result tracking to profiles table.
-- Decision: Q1 confirmed 2026-03-29 — Option A (columns on profiles, no separate table)
-- Written on every scoring run (Q2 confirmed 2026-03-29 — write on every run, not just zero-match)

ALTER TABLE public.profiles
  ADD COLUMN last_grit_fit_run_at     timestamptz,
  ADD COLUMN last_grit_fit_zero_match boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.last_grit_fit_run_at IS
  'Timestamp of the most recent GRIT FIT scoring run for this student. Written on every run.';

COMMENT ON COLUMN public.profiles.last_grit_fit_zero_match IS
  'True if the most recent GRIT FIT scoring run produced zero matches. Written on every run. Reset to false when a run produces one or more matches.';
```

**Write logic (app layer — ShortlistPage.jsx / GRIT FIT scoring path):**

After every call to `runGritFitScoring()` — regardless of match count — the app writes:

```javascript
await supabase
  .from('profiles')
  .update({
    last_grit_fit_run_at:     new Date().toISOString(),
    last_grit_fit_zero_match: scoringResult.top30.length === 0,
    updated_at:               new Date().toISOString(),
  })
  .eq('user_id', userId);
```

This write occurs after the `backfillScoredFields` call in ShortlistPage.jsx, using the existing scoring result already in scope.

**Query update (CoachDashboardPage.jsx):**

Add the two new columns to the existing profiles SELECT:

```javascript
supabase
  .from('profiles')
  .select('user_id, name, position, grad_year, high_school, gpa, sat, state, last_grit_fit_run_at, last_grit_fit_zero_match')
  .in('user_id', studentUserIds)
```

### 4.2 Offer Badge Columns — Not Needed

Verbal and written offer status is already captured in `recruiting_journey_steps` JSONB:
- Step 14: `"label": "Received verbal offer"`
- Step 15: `"label": "Received written offer"`

The badge logic reads `step.completed` from these existing steps. No new columns required.

### 4.3 Recruiting Events Table (Calendar) — Deferred

The recruiting calendar requires a `recruiting_events` table. It is not built in this spec. The placeholder page notes the schema intent so the decision is documented for Phase 2.

**Intended schema (Phase 2, not built now):**

```sql
-- PHASE 2 ONLY — not in this spec's migration
CREATE TABLE public.recruiting_events (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  hs_program_id   uuid NOT NULL REFERENCES public.hs_programs(id) ON DELETE CASCADE,
  student_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  -- null = school-wide event; non-null = individual student event
  event_type      text NOT NULL,
  -- 'recruiter_visit' | 'junior_day' | 'official_visit' | 'game_day_visit' | 'prospect_camp' | 'other'
  title           text NOT NULL,
  event_date      date NOT NULL,
  notes           text,
  created_by      uuid NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
```

### 4.4 College Coach Engagement Table — Deferred

Recruiter engagement tracking requires a normalized college coach table and engagement log. Not built in this spec. Coming Soon placeholder only.

---

## 5. ZERO-MATCH STUDENT VISIBILITY

Chris confirmed Q3 (both coaches and counselors see this) and Q5 (summary count at top + per-card indicators).

### 5.1 Summary Count — Reports Page

On the Reports page (`CoachReportsPage.jsx`), the top summary band includes a zero-match count tile alongside the existing summary stats.

**Tile spec:**

```
┌─────────────────────────────────┐
│  ZERO GRIT FIT MATCHES          │
│                                 │
│  [N]  students                  │
│  need support                   │
│                                 │
│  [Check in with these students] │
└─────────────────────────────────┘
```

- N = count of students where `last_grit_fit_zero_match === true`
- If N === 0: tile renders in muted state, text reads "All students have GRIT FIT matches"
- If N > 0: tile renders with maroon border (#8B3A3A), gold accent on N (#D4AF37)
- "Check in with these students" — mailto CTA (see 5.3 below)

**Placement:** Insert as a fourth stat tile in the existing top-line stats band in `CoachActivitySummary` (or its replacement in `CoachReportsPage`). Sits after: Students / Schools Tracked / Avg Journey Progress / [Zero-Match tile].

### 5.2 Per-Card Indicator — Students Page

On the Students page student card grid, each `PlayerCard` or `CoachStudentCard` for a student with `last_grit_fit_zero_match === true` shows a badge.

**Badge spec:**

```
Location:  Top-right corner of the card header
Text:      "No GRIT FIT Matches"
Style:     Gold background (#D4AF37), dark text (#2C2C2C), 0.625rem font,
           uppercase, letter-spacing 0.5px, 4px 8px padding, border-radius 12px
```

Students who have never run GRIT FIT (i.e., `last_grit_fit_run_at` is null) do not show the badge. The badge is only for confirmed zero-match students. Null = unknown state; show no badge.

### 5.3 Zero-Match Section — Students Page

Below the student card grid on the Students page, when any linked students have `last_grit_fit_zero_match === true`, a collapsible section renders.

**Section spec:**

```
┌──────────────────────────────────────────────────────────────┐
│  STUDENTS NEEDING GRIT FIT SUPPORT  [N students]  [chevron]  │
├──────────────────────────────────────────────────────────────┤
│  These students ran GRIT FIT and found zero qualifying        │
│  schools. Their profiles may need updates to GPA, position,  │
│  or geographic preferences.                                   │
│                                                              │
│  [StudentMiniRow] x N                                        │
│                                                              │
│  [Email these students]   (mailto CTA — see 5.4)             │
└──────────────────────────────────────────────────────────────┘
```

Section header background: Cream (#F5EFE0)
Section border: 1px solid #D4AF37
Border-radius: 8px
Collapsed by default if N <= 3; expanded by default if N > 3

**StudentMiniRow spec (inside the zero-match section):**

| Element | Content |
|---|---|
| Student name | Bold, #2C2C2C |
| Class year | "Class of YYYY", #6B6B6B |
| Last run date | "Last run: Mar 15" or "Never run" if null |
| GPA | If populated on profile |
| CTA | mailto link (see 5.4) |

### 5.4 "Check In" CTA — Interactive mailto

Q4 confirmed: interactive mailto link, not static text.

**Behavior:** When the coach or counselor clicks "Email these students" or the per-student email icon, the browser opens a pre-composed mailto.

**mailto format — bulk (all zero-match students):**

```
mailto:[student_email_1],[student_email_2],...?subject=Your%20GRIT%20FIT%20Results&body=Hi%20there%2C%0A%0AI%20wanted%20to%20check%20in%20on%20your%20GRIT%20FIT%20recruiting%20profile.%20Let%27s%20talk%20about%20next%20steps.
```

**mailto format — individual student:**

```
mailto:[student_email]?subject=Your%20GRIT%20FIT%20Results&body=Hi%20[first_name]%2C%0A%0AI%20wanted%20to%20check%20in%20on%20your%20GRIT%20FIT%20recruiting%20profile.%20Let%27s%20talk%20about%20next%20steps.
```

First name is extracted from `student.name` (split on first space).

**Email source:** `profiles.email` — already in the profiles query. No new data needed.

**Fallback:** If `student.email` is null or empty, the mailto CTA for that student is disabled (greyed out, cursor: not-allowed, tooltip: "No email on file").

---

## 6. VERBAL / WRITTEN OFFER BADGES

Q5 expanded scope: coaches need to track verbal and written offers as milestone badges on student cards.

### 6.1 Data Source

Step 14 and 15 of `recruiting_journey_steps` JSONB already track these:
- Step 14: "Received verbal offer" — `completed: true/false`
- Step 15: "Received written offer" — `completed: true/false`

No new columns. Badges are derived from this existing data.

### 6.2 Badge Display — Per-Student Card Header

In the `PlayerCard` component (coach view) and `CoachStudentCard` header, after the name/position/class line, add a badge row that appears only when a student has at least one offer badge to show.

**Verbal Offer Badge:**
- Condition: ANY `short_list_items` entry for this student has step 14 completed
- Text: "Verbal Offer"
- Style: Gold background (#D4AF37), dark text (#2C2C2C), 0.75rem, weight 600, 4px 10px padding, border-radius 12px

**Written Offer Badge:**
- Condition: ANY `short_list_items` entry for this student has step 15 completed
- Text: "Written Offer"
- Style: Maroon background (#8B3A3A), white text (#FFFFFF), 0.75rem, weight 600, 4px 10px padding, border-radius 12px

**Multiple offers:** If a student has verbal offers from 2 schools and a written offer from 1 school, the card shows both badge types. Count is NOT shown on the badge — the school-level detail is in the expanded `CoachStudentCard` view.

**Badge row placement:** Directly below the name/position/class row in the card header. Hidden entirely if no offers exist (no blank space).

### 6.3 Offer Badge — Per-School Line (Expanded Card)

In the expanded `CoachStudentCard` per-school shortlist breakdown, each school row that has step 14 or step 15 completed gets an inline badge next to the school name.

**Format:**

```
[School Name]  [Verbal]  [Written]  [GRIT FIT status badge]  [progress bar]
```

- "Verbal" badge: Gold, compact (0.625rem), same style as above
- "Written" badge: Maroon, compact (0.625rem)
- Badges only appear for the step that is `completed: true`

### 6.4 Badge Logic (app layer)

```javascript
// Utility function — add to CoachStudentCard or a shared util
function getOfferStatus(shortlistItems) {
  let hasVerbal = false;
  let hasWritten = false;
  for (const item of shortlistItems) {
    const steps = item.recruiting_journey_steps || [];
    if (steps.find(s => s.step_id === 14 && s.completed)) hasVerbal = true;
    if (steps.find(s => s.step_id === 15 && s.completed)) hasWritten = true;
    if (hasVerbal && hasWritten) break;
  }
  return { hasVerbal, hasWritten };
}

// Per-school (expanded view)
function getSchoolOfferStatus(item) {
  const steps = item.recruiting_journey_steps || [];
  return {
    hasVerbal:  steps.some(s => s.step_id === 14 && s.completed),
    hasWritten: steps.some(s => s.step_id === 15 && s.completed),
  };
}
```

### 6.5 Sort Option — Extend Existing Sort

Add a new sort option to the Students page filter bar:

```javascript
<option value="offers_desc">Has Offers (first)</option>
```

Sort logic: students with any written offer sort first, then verbal offer only, then no offers.

---

## 7. PIPELINE ANALYTICS

Q3 confirmed: both coaches and counselors see this. Location: Reports page.

### 7.1 Purpose

Show the coach/counselor which recruiting steps are most often incomplete across their roster. Identifies where student-athletes are getting stuck — the most common "next step not taken" in the 15-step journey.

### 7.2 Data Source

`short_list_items.recruiting_journey_steps` — already loaded. No new queries.

### 7.3 Computation

For each of the 15 steps, count how many students have NOT yet completed it across all their shortlist items.

```javascript
// Compute pipeline blockage
function computePipelineBlockage(shortlistByStudent) {
  // stepStats[step_id] = { label, totalInstances, completedInstances, blockedInstances, blockedStudentCount }
  const stepStats = {};
  const stepLabels = {};
  const studentsBlockedAtStep = {}; // step_id -> Set of student user_ids

  for (const [userId, items] of Object.entries(shortlistByStudent)) {
    for (const item of items) {
      const steps = item.recruiting_journey_steps || [];
      for (const step of steps) {
        const sid = step.step_id;
        if (!stepStats[sid]) {
          stepStats[sid] = { totalInstances: 0, completedInstances: 0 };
          stepLabels[sid] = step.label;
          studentsBlockedAtStep[sid] = new Set();
        }
        stepStats[sid].totalInstances++;
        if (step.completed) {
          stepStats[sid].completedInstances++;
        } else {
          studentsBlockedAtStep[sid].add(userId);
        }
      }
    }
  }

  // Assemble result array
  return Object.entries(stepStats).map(([sidStr, stat]) => {
    const sid = parseInt(sidStr, 10);
    const blocked = stat.totalInstances - stat.completedInstances;
    const pct = stat.totalInstances > 0
      ? Math.round((blocked / stat.totalInstances) * 100)
      : 0;
    return {
      step_id: sid,
      label: stepLabels[sid],
      totalInstances: stat.totalInstances,
      completedInstances: stat.completedInstances,
      blockedInstances: blocked,
      blockedStudentCount: studentsBlockedAtStep[sid].size,
      blockageRate: pct,
    };
  }).sort((a, b) => b.blockageRate - a.blockageRate);
}
```

### 7.4 Display — Reports Page

**Section title:** "Pipeline Blockage — Where Athletes Are Stuck"

**Layout:** Vertical bar chart or horizontal ranked list. Horizontal ranked list is specified here (no D3 dependency, consistent with current app style).

Show top 8 steps by blockage rate. Remaining steps accessible via "Show all 15 steps" toggle.

**Row spec:**

```
┌──────────────────────────────────────────────────────────────────────┐
│  Step 4: Contacted coach via email        [blocked bar ████████ 78%] │
│  42 instances blocked • 18 students                                  │
├──────────────────────────────────────────────────────────────────────┤
│  Step 5: Contacted coach via social media [blocked bar ██████   65%] │
│  35 instances blocked • 15 students                                  │
└──────────────────────────────────────────────────────────────────────┘
```

**Row styling:**
- Step label: 0.875rem, #2C2C2C, weight 500
- Blockage bar: max-width 180px, height 8px, background #E8E8E8, fill #D4AF37 at blockage rate %
- Rate text: 0.875rem, #8B3A3A, weight 700, right-aligned
- Sub-line: "N instances blocked • M students", 0.75rem, #6B6B6B
- Row padding: 12px 16px
- Row border-bottom: 1px solid #E8E8E8
- Container: border 1px solid #E8E8E8, border-radius 8px, background #FFFFFF

**Interpretation callout (below chart):**

A gold-bordered callout box names the top stuck step explicitly:

```
Most Common Block: [Step label]
[N]% of school-shortlist pairs haven't reached this step.
This is the step your athletes most need help with right now.
```

Styling: background #F5EFE0, border 1px solid #D4AF37, padding 16px, border-radius 8px.

**Zero-data state:** If no students have any shortlist activity, section renders: "No shortlist activity yet. Pipeline data will appear once students start tracking their recruiting progress."

### 7.5 Contextual Coaching Tip (Per Top Stuck Step)

For the step with the highest blockage rate, display a one-line coaching tip below the callout box.

Tip map (hardcoded — no external data needed):

| Step ID | Tip |
|---|---|
| 2 | "Help them find and complete the recruiting questionnaire for each school." |
| 3 | "Walk them through the admissions info form during a free period or advisory." |
| 4 | "Draft a template coach email together — personalization matters." |
| 5 | "A follow on Instagram or Twitter can open doors — show them how to send a non-DM public post tag." |
| 6 | "Junior Day invites usually come after initial contact — check steps 4 and 5 first." |
| 7 | "Visit invites follow engagement — are they staying in regular contact with the program?" |
| 8 | "Camp invites signal serious interest — has the coach confirmed they've seen film?" |
| 9 | "If coaches aren't texting, the relationship may need a restart. Review steps 4-5." |
| 10 | "A head coach call is a strong signal — make sure film and grades are current." |
| 11 | "Assistant coach contact often precedes the head coach — encourage follow-ups." |
| 12 | "Transcript requests are a buying signal. Help them get it to the school quickly." |
| 13 | "Financial info requests are late-stage — this is positive progress." |
| 14 | "Verbal offers are milestone moments. Celebrate and document it." |
| 15 | "Written offers are the final step — congratulations are in order." |
| 1 | "Students have schools on their shortlist but nothing beyond that yet." |

---

## 8. RECRUITER ENGAGEMENT TRACKING — COMING SOON

**Section Title (on Reports page):** "Recruiter Engagement"

**Placement:** Below Pipeline Blockage section.

**Coming Soon placeholder spec:**

```
┌──────────────────────────────────────────────────────────────┐
│  RECRUITER ENGAGEMENT                          Coming Soon   │
│                                                              │
│  Track which college coaching staff are most engaged with    │
│  your athletes — and identify programs that are on shortlists │
│  but haven't initiated contact yet.                          │
│                                                              │
│  This feature tracks engagement across email, social media,  │
│  text, and progress through the 15-step recruiting journey.  │
│                                                              │
│  College coach contact data will power this view once the    │
│  full recruiter model is available.                          │
└──────────────────────────────────────────────────────────────┘
```

**Placeholder styling:**
- Container: background #FFFFFF, border 1px dashed #D4D4D4, border-radius 8px, padding 24px
- "Coming Soon" badge: top-right corner, background #F5EFE0, border 1px solid #D4AF37, 0.75rem, #8B3A3A
- Body text: 0.875rem, #6B6B6B, line-height 1.6

**What "full recruiter model" means (for Phase 2 planning):**

The college coach contact data is currently stored in `short_list_items.coach_contact` as unstructured JSONB per school entry (migration 0014). For the engagement tracking feature to work, Phase 2 will need:
1. A normalized `college_coaches` table (name, institution, role, contact channels)
2. An `engagement_log` table tracking timestamped interactions (email sent, social follow, text received, etc.)
3. Linkage from `short_list_items` to `college_coaches`

The placeholder exists so the coach understands what is coming without the app appearing broken.

---

## 9. RECRUITING CALENDAR — COMING SOON

**Route:** `/coach/calendar`

**Page Title:** "Recruiting Calendar"

**Coming Soon placeholder spec:**

```
┌──────────────────────────────────────────────────────────────┐
│  RECRUITING CALENDAR                           Coming Soon   │
│                                                              │
│  Track upcoming recruiting events in one place:             │
│  • College recruiter visits to your school                   │
│  • Junior Days, Official Visits, and Game Day Visits         │
│  • Prospect camps individual athletes are attending          │
│  • External recruiting events and deadlines                  │
│                                                              │
│  Head coaches and counselors will receive notifications      │
│  for upcoming events. Student-athletes will see their        │
│  individual event schedule.                                  │
│                                                              │
│  [Notify me when this launches]                              │
└──────────────────────────────────────────────────────────────┘
```

**Placeholder styling:** Same as Recruiter Engagement placeholder above.

**"Notify me when this launches" CTA:** CONFIRMED — interactive mailto link. Chris confirmed 2026-03-29. Rationale: this CTA is groundwork for notification infrastructure — it must be interactive now so the pattern exists when notifications are wired later. Render as a clickable mailto link (maroon outline button style: #8B3A3A border, transparent background). Confirm target address with Chris before build — this is the only CTA on this page that requires a real destination. Do not render as non-interactive text; the interactive pattern is required.

**Calendar feature intent (Phase 2 planning — not built now):**

Event types to support:
- `recruiter_visit` — college coach visiting the high school
- `junior_day` — JD at a college campus
- `official_visit` — OV at a college campus
- `game_day_visit` — GDV at a college campus
- `prospect_camp` — prospect camp on a college campus
- `other` — general recruiting event

Events may be school-wide (visible to all coaches/counselors at the school) or student-specific (tied to one student's `user_id`). The schema intent is documented in Section 4.3.

---

## 10. RLS POLICY REQUIREMENTS

### 10.1 Profiles — New Columns

The two new columns (`last_grit_fit_run_at`, `last_grit_fit_zero_match`) are on the `profiles` table. Existing RLS policies on `profiles` already grant coaches and counselors SELECT on their linked students' profiles. No new SELECT policies are needed — the new columns are returned by the existing policies automatically.

The student-only write (UPDATE `profiles_update_own`) already covers the new columns. No new UPDATE policy needed.

**Write path for the new columns:** The GRIT FIT scoring write fires from the student's session (ShortlistPage.jsx). The student is updating their own profile row, which `profiles_update_own` permits. No coach/counselor write access is required for these columns.

### 10.2 Recruiting Events Table (Phase 2 — not built now)

When `recruiting_events` is built, the following policies will be needed:
- Coaches at the linked school: SELECT all events for their `hs_program_id`
- Counselors at the linked school: SELECT all events for their `hs_program_id`
- Coach: INSERT / UPDATE / DELETE events they created (`created_by = auth.uid()`)
- Students: SELECT events where `student_user_id = auth.uid()` OR school-wide events at their school

Not implementing now. Documented here so it is not forgotten in Phase 2.

### 10.3 No New Policies for This Spec's Buildable Scope

Summary: everything in the "buildable now" scope reads from `profiles` and `short_list_items`, both of which already have correct coach/counselor SELECT policies. No new migration entries required for RLS in this spec.

---

## 11. WHAT IS BUILDABLE NOW vs. PLACEHOLDER

### Buildable Now — Phase 1

| Feature | Status |
|---|---|
| Multi-page tab navigation (3 tabs) | Build now |
| Migration 0021 — two new columns on profiles | Build now |
| GRIT FIT scoring write to new columns (ShortlistPage.jsx) | Build now |
| Per-card zero-match badge on student cards | Build now |
| Zero-match collapsible section on Students page | Build now |
| Zero-match summary count tile on Reports page | Build now |
| "Check in" mailto CTA (individual + bulk) | Build now |
| Verbal offer badge on student cards | Build now |
| Written offer badge on student cards | Build now |
| Offer badge on per-school rows (expanded card) | Build now |
| "Has Offers" sort option | Build now |
| Pipeline blockage analytics (Reports page) | Build now |
| Pipeline coaching tip (top stuck step) | Build now |

### Coming Soon Placeholder — Phase 1

| Feature | Status |
|---|---|
| Recruiter engagement section | Placeholder only |
| Recruiting calendar page | Placeholder only |

### Phase 2 (Out of Scope Now)

| Feature | Notes |
|---|---|
| Recruiter engagement data (live) | Requires normalized college_coaches + engagement_log tables |
| Calendar data ingestion | Requires recruiting_events table + UI for event creation |
| Calendar notifications | Requires notification infrastructure |

---

## 12. DAVID DATA INTEGRITY FLAGS

The following items require David's review or are flagged for data integrity awareness. David should confirm before the build session opens.

### FLAG D-01 — Zero-Match Column Write Race Condition (Medium)

The write to `profiles.last_grit_fit_zero_match` fires from the student's ShortlistPage scoring path. If a student is loading the page at the same time a coach is reading their profile, the coach may see a stale `last_grit_fit_zero_match = false` while the student's new run is writing `true` (or vice versa).

This is an eventual-consistency issue, not a data corruption issue. The column is eventually correct after the student's write completes. This is acceptable for MVP. No action required at Phase 1, but David should document it as a known eventual-consistency point.

### FLAG D-02 — Email Field Availability for mailto (Low)

The mailto CTA relies on `profiles.email`. The current CoachDashboardPage query does NOT include `email` in the SELECT (it selects: `user_id, name, position, grad_year, high_school, gpa, sat, state`). The query must be updated to include `email` in the profiles SELECT.

David should confirm: is `profiles.email` guaranteed non-null for all student rows? The profiles table definition shows `email text NOT NULL` — so yes, this is a hard constraint. No issue, but confirm.

### FLAG D-03 — Scoring Run Write Failure Handling (Medium)

If the GRIT FIT scoring write to `profiles` fails (Supabase error), the student's zero-match state will be stale on the profiles table even though the scoring run executed. The current `backfillScoredFields` function does not write to `profiles` at all (that is the new behavior in this spec). Nova must add error handling: if the profiles update fails, log the error but do not block the student's view. The next successful scoring run will correct it.

### FLAG D-04 — Orphaned Short List Items and Step Data (Low)

Pipeline blockage computation iterates over all `recruiting_journey_steps` for all students. If any JSONB row has malformed step data (missing `step_id` or `completed` fields), the computation will silently skip those steps. Nova must add a null-guard: `if (!step.step_id || step.completed === undefined) continue;` inside the pipeline blockage loop.

**STATUS: APPROVED AND ROUTED — 2026-03-29.** Chris approved. D-04 has been routed to David. David is running the DB check now (`SELECT COUNT(*) FROM short_list_items WHERE recruiting_journey_steps IS NULL OR jsonb_array_length(recruiting_journey_steps) != 15;`). D-04 must PASS before build begins. Build is blocked on D-04 confirmation.

### FLAG D-05 — Source of `grit_fit_labels` vs. `last_grit_fit_zero_match` (Informational)

Both `grit_fit_labels` (on `short_list_items`) and `last_grit_fit_zero_match` (new column on `profiles`) track aspects of the GRIT FIT outcome. They are written from different places:
- `grit_fit_labels`: written per shortlist item in `backfillScoredFields`
- `last_grit_fit_zero_match`: written to profiles after the full scoring run

These are complementary, not redundant. A student can have `last_grit_fit_zero_match = true` (no matches in the top 30) while still having shortlist items with their own individual labels. This is by design — the profile-level flag is a coach-visibility signal; the item-level labels are per-school status. David should document this in the data dictionary.

---

## 13. DONE CONDITIONS

The spec is complete when all of the following are true and verified:

### Schema
- [ ] Migration 0021 applied cleanly
- [ ] `profiles.last_grit_fit_run_at` and `profiles.last_grit_fit_zero_match` present in live DB
- [ ] No new RLS policies required (confirmed above)

### Students Page
- [ ] Three-tab navigation renders: Students / Calendar / Reports
- [ ] Active tab is highlighted in maroon, inactive tabs in stone gray
- [ ] Zero-match badge appears on student cards for confirmed zero-match students only
- [ ] Zero-match badge does NOT appear for students with null `last_grit_fit_run_at`
- [ ] Zero-match collapsible section renders below card grid when N > 0
- [ ] Section is collapsed by default for N <= 3, expanded by default for N > 3
- [ ] "Email these students" mailto opens pre-composed email in browser mail client
- [ ] Individual student mailto opens with first name in greeting
- [ ] Disabled mailto state renders correctly for students with no email on file
- [ ] Verbal offer badge appears on cards for students with step 14 completed on any shortlist item
- [ ] Written offer badge appears on cards for students with step 15 completed on any shortlist item
- [ ] Offer badges appear on per-school rows in expanded CoachStudentCard view
- [ ] "Has Offers (first)" sort option works correctly
- [ ] No offer badges appear when no steps 14/15 are completed

### Reports Page
- [ ] Zero-match summary count tile renders in top stats band
- [ ] Zero-match tile shows maroon border and gold N when N > 0
- [ ] Zero-match tile shows muted state when N === 0
- [ ] Pipeline blockage section renders with top 8 steps by default
- [ ] "Show all 15 steps" toggle reveals remaining steps
- [ ] Each step row shows: label, blockage rate bar, rate %, blocked instances count, blocked student count
- [ ] Coaching tip renders for the top stuck step
- [ ] Zero-data state renders correctly when no shortlist activity exists
- [ ] Recruiter Engagement "Coming Soon" placeholder renders with badge and body text
- [ ] "Coming Soon" placeholder does NOT render any live data or loading states

### Calendar Page
- [ ] Calendar tab navigates to /coach/calendar
- [ ] Coming Soon placeholder renders with event type list
- [ ] "Notify me when this launches" CTA is interactive mailto (confirmed 2026-03-29 — non-interactive rendering is not acceptable)

### GRIT FIT Scoring Write
- [ ] After every scoring run, `profiles.last_grit_fit_run_at` is updated to current timestamp
- [ ] `profiles.last_grit_fit_zero_match` is set to `true` when `top30.length === 0`
- [ ] `profiles.last_grit_fit_zero_match` is set to `false` when `top30.length > 0`
- [ ] Write failure is caught and logged but does not block student view

### Data Integrity
- [ ] David's FLAG D-04 DB check PASSED (build is blocked until David confirms — routed 2026-03-29)
- [ ] Profiles SELECT in CoachDashboardPage updated to include `email`
- [ ] David's FLAGS D-01, D-02, D-03, D-05 documented (action or acceptance)

---

## 14. BUILD SEQUENCE

Nova builds in this order. Each step is a task-open / task-close gate before the next begins.

**Step 1 — Migration**
Write migration 0021. Apply to local Supabase. Confirm columns present.

**Step 2 — GRIT FIT Scoring Write**
Update ShortlistPage.jsx to write `last_grit_fit_run_at` and `last_grit_fit_zero_match` after every scoring run. Update profiles SELECT in CoachDashboardPage to include `email`. Unit test: scoring run with zero matches sets flag to true; scoring run with matches sets flag to false.

**Step 3 — Multi-Page Shell**
Refactor CoachDashboardPage.jsx into the tab-nav shell. Extract current content into CoachStudentsPage.jsx. Add CoachReportsPage.jsx stub. Add CoachCalendarPage.jsx placeholder. Confirm tab navigation works. No feature content yet.

**Step 4 — Offer Badges**
Add `getOfferStatus` and `getSchoolOfferStatus` utilities. Update PlayerCard and CoachStudentCard to render offer badges. Update sort options. Test with known step 14/15 data.

**Step 5 — Zero-Match Visibility**
Add zero-match badge to student cards. Add zero-match collapsible section to Students page. Add zero-match summary tile to Reports page. Add mailto CTA logic. Test badge appears/absent correctly based on flag state.

**Step 6 — Pipeline Analytics**
Add `computePipelineBlockage` to CoachReportsPage. Render ranked list with bars, step rows, coaching tip, and zero-data state.

**Step 7 — Coming Soon Placeholders**
Confirm Recruiter Engagement and Calendar placeholders are complete and styled.

**Step 8 — QA Gate (Quin)**
Quin runs test coverage for: tab navigation, offer badge logic, zero-match badge conditions, pipeline blockage computation, mailto CTA construction. All new paths covered before sign-off.

---

## APPENDIX — 15-STEP REFERENCE (from migration 0009)

| Step ID | Label | Offer-related |
|---|---|---|
| 1 | Added to shortlist | |
| 2 | Completed recruiting questionnaire | |
| 3 | Completed admissions info form | |
| 4 | Contacted coach via email | |
| 5 | Contacted coach via social media | |
| 6 | Received junior day invite | |
| 7 | Received visit invite | |
| 8 | Received prospect camp invite | |
| 9 | School contacted student via text | |
| 10 | Head coach contacted student | |
| 11 | Assistant coach contacted student | |
| 12 | School requested transcript | |
| 13 | School requested financial info | |
| 14 | Received verbal offer | YES — Verbal badge |
| 15 | Received written offer | YES — Written badge |

---

*End of spec. Nova holds. No code until Chris authorizes.*
