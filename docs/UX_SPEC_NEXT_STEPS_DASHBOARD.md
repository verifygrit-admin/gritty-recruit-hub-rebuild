# UX SPEC: NEXT STEPS DASHBOARD — ZERO-MATCH EMPTY STATE

**Status:** Final for implementation
**Date:** 2026-03-28
**Authority:** Quill (UX/UI Design)
**Related Decisions:** RB-003 (GRIT FIT scoring intact), RB-006 (Dynamic GRIT FIT list)
**Component Reference:** Replaces StayGrittyModal from cfb-recruit-hub

---

## OVERVIEW

The NextStepsDashboard is a persistent inline page element that appears on GritFitPage when a student-athlete has zero GRIT FIT matches. Rather than a dismissible modal, it serves as the primary content of the page, providing:

1. **Zero-match diagnosis** — Why the student didn't qualify (academic gap, athletic gap, or combined)
2. **Actionable gap analysis** — Closest qualifying tier, per-metric breakdowns, and required improvements
3. **"WOW" callouts** — Highlighting metrics in the 75th percentile and above
4. **Training & study tips** — Targeted strategies for the student's weakest metric
5. **Alternative qualifying positions** — Positions where they already qualify at their closest tier
6. **Aspirational schools** — Schools that pass some gates but not all, as targets to work toward
7. **Coach visibility tie-in** — Signals which students have zero matches (for Item 3 coach dashboard feature)

The NextStepsDashboard uses the **light theme from the rebuild design system** (BC High maroon, cream, gold), NOT the dark theme from the original StayGrittyModal. It feels **encouraging and aspirational**, not punitive. The student should understand their situation in 10 seconds and have a clear sense of what to work on next.

---

## DESIGN INTENT

Athletes won't turn things around in days. They're working toward something over weeks and months. The NextStepsDashboard is a persistent reminder of that journey — not a one-time popup they can dismiss and forget. Every time they return to `/gritfit`, they see this page, they see their closest tier and the gap to close, and they're reminded of what they're building toward.

The tone is: **You're closer than you think. Here's what matters most. Come back when you've made progress.**

---

## PLACEMENT & VISIBILITY

### When It Appears

The NextStepsDashboard **replaces the primary content area** of GritFitPage when `scoringResult.top30.length === 0` (zero GRIT FIT matches).

**Trigger:** After GRIT FIT algorithm executes, if no schools pass all four gates:
- Academic gate failure (GPA below minimum for athlete's class year)
- Athletic gate failure (student doesn't qualify for any tier at their position)
- Combined failure (topTier exists but all schools in that tier filtered out by distance/academic/financial gates)

### Page Structure

```
┌──────────────────────────────────────────────────────────┐
│              HEADER (standard nav)                       │
│  [Logo] Gritty Recruit Hub  [Shortlist] [Settings]       │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                                                          │
│  NEXT STEPS DASHBOARD (full-width content area)          │
│                                                          │
│  [Header + Diagnosis]                                    │
│  [Sections: Academic/Athletic/Aspirational/Tips]         │
│  [Action buttons]                                        │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│              FOOTER (standard)                           │
└──────────────────────────────────────────────────────────┘
```

---

## COMPONENT PROPS INTERFACE

```javascript
NextStepsDashboard.propTypes = {
  // Scoring result from runGritFitScoring()
  scoringResult: PropTypes.shape({
    reason: PropTypes.oneOf(['academic', 'athletic', 'combined']).isRequired,
    top30: PropTypes.array.isRequired,
    topTier: PropTypes.string,         // Closest tier (e.g. "D3")
    athFit: PropTypes.object,          // Tier scores: { "Power 4": 0.42, "G6": 0.38, ... }
    acadRigorScore: PropTypes.number,  // 0–1
    classLabel: PropTypes.string,      // "Senior", "Junior", "Soph", "Freshman"
    requiredGpa: PropTypes.number,     // NCAA minimum GPA for this class
    scored: PropTypes.array,           // All schools with scores (for aspirational)
    gates: PropTypes.object,           // Pass/fail counts per gate
  }).isRequired,

  // Student athlete profile
  profile: PropTypes.shape({
    name: PropTypes.string,
    position: PropTypes.string,
    height: PropTypes.number,
    weight: PropTypes.number,
    speed_40: PropTypes.number,
    gpa: PropTypes.number,
    sat: PropTypes.number,
  }).isRequired,

  // Callbacks
  onEditProfile: PropTypes.func.isRequired,    // Navigate to /profile
  onBrowseAllSchools: PropTypes.func.isRequired, // Navigate to home or full map
};
```

---

## CONTENT SECTIONS & LAYOUT

### 1. HEADER + DIAGNOSIS

**Purpose:** Immediately tell the student why they have no matches and set the tone (encouraging, not punitive).

**Content:**

```
Stay Gritty, [First Name]!

We couldn't find qualifying schools for you right now — but you're
closer than you think. Here's what the data shows and where to focus next.
```

**Styling:**
- **Title:** H2, Maroon (#8B3A3A), 2rem, 700 weight
- **Subtitle:** Body Large, Stone Gray (#6B6B6B), line-height 1.6, max 560px width
- **Layout:** Stack vertically on mobile, no side-by-side at any breakpoint
- **Margin below:** 24px

**Conditional Diagnosis Text (appears below subtitle):**

#### If `reason === 'academic'`:
```
Your current GPA is [current GPA] but the NCAA requires a minimum of [required GPA]
for a [class year] to be eligible. This is fixable — and the steps to get there don't
cost anything.
```
- **Styling:** Body Large, slightly darker tone (Charcoal #2C2C2C)
- **Emphasis:** Required GPA and class year in **bold gold** (#D4AF37)

#### If `reason === 'athletic'`:
```
As a [position], you scored [closest score]% at the [closest tier] level —
[gap]% from qualifying. You're closer than you think. Here's where to focus.
```
- **Closest tier:** Links to `TIER_LABELS` (Power 4, G6, FCS, D2, D3)
- **Emphasis:** Gap percentage in **bold gold** (#D4AF37)

#### If `reason === 'combined'`:
```
As a [position], your closest fit is [closest tier] — but no schools in that tier
fall within your geographic reach or match your academic profile right now.
Both are improvable.
```

---

### 2. ACADEMIC SNAPSHOT (All Scenarios)

**Purpose:** Show the student where they stand academically and what needs to close the gap.

**Visibility:**
- Always shown (all three reason types)
- Appears after diagnosis text

**Content:**

```
┌─────────────────────────────────────┐
│ ACADEMIC ELIGIBILITY SNAPSHOT       │
│                                     │
│ Your GPA: [current]                 │
│ [Class] Minimum: [required]          │
│ Gap to Close: +[gap]                │
└─────────────────────────────────────┘
```

**Styling:**
- **Outer Container:** Background Cream (#F5EFE0), padding 24px, border-radius 12px, border 1px solid #E8E8E8 (solid modal frame)
- **Internal sections:** Background #FFFFFF, border 1px Light Gray (#E8E8E8), border-radius 8px, padding 16px
- **Label row:** "ACADEMIC ELIGIBILITY SNAPSHOT" — Body Tiny (12px), Stone Gray, uppercase, letter-spacing 2px, 10px margin-bottom
- **Content grid:** 3 columns (mobile: stack), gap 24px
  - **Your GPA:** Current GPA left, value right in **bold Maroon** (#8B3A3A), 28px font size
  - **[Class] Minimum:** (e.g. "Senior Minimum") left, value right in **bold Gold** (#D4AF37), 28px font size
  - **Gap to Close:** Left-aligned, value right in **bold Gold** (#D4AF37), 28px, with **+** prefix if positive

**Conditional explanatory box (if academic reason):**
```
┌──────────────────────────────────────────────┐
│ WHY IT MATTERS                               │
│                                              │
│ The NCAA requires a minimum GPA to certify   │
│ initial academic eligibility — without it,   │
│ no program can offer you a spot. The good    │
│ news: GPA is one of the most improvable      │
│ metrics, and the best strategies are free.   │
└──────────────────────────────────────────────┘
```

- **Styling:** Background #FFFFFF, border 1px Light Gray, padding 12px 16px, border-radius 4px, margin-top 12px
- **Label:** "WHY IT MATTERS" — Body Tiny, Stone Gray, uppercase, letter-spacing 2px, 6px margin-bottom
- **Text:** Body Small (14px), Stone Gray (#6B6B6B), line-height 1.6

---

### 3. CLOSEST ATHLETIC TIER & METRIC BREAKDOWN

**Purpose:** Show the student how close they are athletically and where to focus training effort.

**Visibility:** All scenarios (even when academic is the blocker, students need athletic direction)

**Content:**

```
┌─────────────────────────────────────┐
│ CLOSEST FIT: [TIER]                 │
│                                     │
│ You scored [X]% as [position] at    │
│ [Tier] level — just [Y]% from       │
│ qualifying.                         │
│                                     │
│ [Per-metric breakdown bars]         │
└─────────────────────────────────────┘
```

**Styling:**
- **Container:** Background #FFFFFF, border 1px Light Gray, padding 14px 16px, border-radius 4px
- **Label:** "CLOSEST FIT: [TIER]" — Body Tiny, Orange (#F5A623), uppercase, letter-spacing 2px, margin-bottom 8px
- **Descriptive text:** Body Regular (16px), Stone Gray, margin-bottom 14px
  - **[X]%** score emphasized in **bold Maroon** (#8B3A3A)
  - **[Y]% from qualifying** emphasized in **bold Gold** (#D4AF37) if gap ≤ 15%, otherwise neutral

#### Per-Metric Breakdown (Three bars)

For each metric (Height, Weight, 40-Yard Dash):

```
Height                  ████░░░░  82%
Yours: 74 in · Tier median: 72 in

Weight                  ███░░░░░  58%
Yours: 198 lbs · Tier median: 225 lbs

40-Yard Dash            ██░░░░░░  45%
Yours: 4.62s · Tier median: 4.55s
```

**Styling per metric:**
- **Metric name (left):** Body Small (14px), Stone Gray, 88px width, or **Maroon + ↓** if it's the weakest metric (marked with red indicator)
- **Progress bar:** 1px solid #E8E8E8 background, height 5px, border-radius 2px
  - **Filled:** Green (#4CAF50) if score ≥ 50%, Red (#F44336) if < 50%
  - **Width:** `Math.min(100, score * 100)%`
- **Percentage (right):** Body Small, bold, 36px width, color matches bar (green or red), right-aligned
- **Footnote line:** Body Tiny (12px), Dark Gray (#4A4A4A), below each metric — "Yours: [measurement] · [Tier] median: [measurement]"
- **Margin bottom:** 8px between metrics

---

### 4. "WOW" CALLOUTS (Metrics ≥ 75th Percentile)

**Purpose:** Celebrate strengths and reinforce that the student has real recruiting assets.

**Visibility:** Only if any metric or academic rigor score ≥ 0.75

**Content per WOW metric:**

```
┌──────────────────────────────────────────────┐
│ 🔥 WOW!  [Metric Name]                       │
│                                              │
│ You're performing better than [X]% of        │
│ student-athletes in this area.               │
│                                              │
│ [Coach-perspective callout text]             │
│ [Emphasis: "Lock in your focus on this and  │
│  it becomes a headline on your profile."]    │
└──────────────────────────────────────────────┘
```

**Styling:**
- **Container:** Gradient background from #0E1F10 to #0A1A0C (light green tint), border 1px Gold (#D4AF37), padding 14px 16px, border-radius 4px, margin-bottom 10px
- **Header line:** 🔥 emoji (20px) + "WOW!" (18px, bold, Gold) + metric name (12px, Cream text)
- **Percentage:** Body Regular, **bold Cream** (#F5EFE0), margin-bottom 6px
- **Callout text:** Body Small (12px), Stone Gray (#6B8C72), line-height 1.6
  - **Emphasis:** "Lock in..." text in **bold Cream** (#F5EFE0)

**Callouts per metric (from StayGrittyModal):**

- **Height WOW:** "Height is one of the first things coaches evaluate at your position. Standing above the positional median signals natural physical upside that can't be developed in a weight room — and it separates your profile from the crowd before you ever step on a field."

- **Weight WOW:** "Playing at or above the positional weight median signals physical readiness and the ability to compete from day one. Coaches don't want to wait years for a recruit to develop the frame to handle contact. Your weight tells them you're ready now."

- **40-Yard Dash WOW:** "Elite speed is one of the rarest and most coveted traits in college football recruiting. Coaches can develop strength and technique — they cannot coach speed. A top-tier 40 time travels fast through recruiting networks and is the single most attention-grabbing number on a recruiting profile."

- **Academic WOW:** "Academic strength directly affects a program's ability to admit you. Coaches don't just want talent — they need recruits who clear the admissions bar and stay eligible. A strong academic profile gives a coach confidence that offering you won't fall apart in the admissions office."

---

### 5. STAY GRITTY FOCUS + TRAINING TIPS

**Purpose:** Give the student actionable, free strategies to improve their weakest metric.

**Visibility:** All scenarios (always identify weakest metric among H, W, S)

**Content:**

```
┌──────────────────────────────────────────────┐
│ STAY GRITTY FOCUS: [WEAKEST METRIC]         │
│                                              │
│ Your [metric name] is the primary metric     │
│ holding you back. Close the gap between your │
│ current number and the [tier] median and     │
│ your qualifying score will follow.           │
│ Update your profile when you've made         │
│ progress — your results will refresh         │
│ automatically.                               │
└──────────────────────────────────────────────┘

HOW TO IMPROVE YOUR [METRIC NAME]

• [Tip 1 Title] — [description]
• [Tip 2 Title] — [description]
  [... up to 5 tips per metric]
```

**Styling:**
- **Container:** Background #FFFFFF, border 1px Light Gray, padding 12px 16px, border-radius 4px, margin-bottom 12px
- **Label:** "STAY GRITTY FOCUS: [METRIC]" — Body Tiny, Orange (#F5A623), uppercase, letter-spacing 2px, margin-bottom 6px
- **Text:** Body Small (14px), Stone Gray, line-height 1.6

- **Tips header:** "HOW TO IMPROVE YOUR [METRIC]" — Body Tiny, Gold (#D4AF37), uppercase, margin-bottom 10px
- **Tips list:**
  - Each tip is a bullet point (•)
  - **Tip title:** Bold, Body Small (12px), Charcoal (#2C2C2C), margin-bottom 2px
  - **Tip description:** Body Small (12px), Dark Gray (#4A4A4A), line-height 1.5
  - **Margin between tips:** 10px
  - **Left padding:** 12px with 2px solid left border (#2E6B18 dark green)

**Metrics-specific training tips:**

#### Weight (wScore) Tips:
1. **Eat in a daily caloric surplus** — Add 300–500 calories above your maintenance level. Focus on lean protein (chicken, eggs, tuna, beans), complex carbs (rice, oats, sweet potato), and healthy fats (peanut butter, avocado, whole eggs). Aim for 0.8–1g of protein per lb of bodyweight every day.

2. **Compound lifts 3–4x per week** — Squat, deadlift, bench press, and power clean recruit the most muscle mass in the least time. Start with a 5x5 program (free at stronglifts.com) and add weight to the bar each session. Consistency beats intensity.

3. **Eat within 30 minutes post-workout** — Protein + carbs immediately after lifting accelerates muscle synthesis. Two eggs and a banana, a glass of chocolate milk, or Greek yogurt with fruit are cheap and highly effective options.

4. **Prioritize sleep — 8 to 9 hours** — The majority of muscle growth happens during sleep, not in the gym. Cutting sleep short limits the gains from every workout. This is the highest-ROI, zero-cost training variable most athletes underuse.

5. **Track your food for two weeks** — Most athletes significantly underestimate their daily intake. Use a free app like Cronometer or MyFitnessPal for two weeks to confirm you are actually eating above maintenance — not just thinking you are.

#### Speed (sScore) Tips:
1. **Fix your sprint mechanics first** — Most speed gains come from technique, not fitness. Focus on a powerful drive phase, tall hips, and straight arm drive. Film yourself or ask a coach to review one session. Bad mechanics permanently cap your ceiling regardless of conditioning.

2. **Hill sprints or resistance sprints 2x per week** — Find a moderate incline and sprint up it at 100% effort with full recovery between reps. Uphill and resistance sprinting builds the explosive acceleration phase that most directly reduces 40 time. 6–8 reps per session is enough.

3. **Plyometrics 2x per week** — Box jumps, broad jumps, and bounding drills train your fast-twitch muscle fibers — the same fibers that drive sprint speed. Three sets of 5 reps twice weekly is sufficient stimulus. Quality of effort matters more than volume.

4. **Power cleans and trap bar deadlifts** — Research consistently shows hip-dominant explosive lifts have the strongest correlation with sprint speed. If these are not in your program, add them. Even one day per week produces measurable speed improvements over 8–12 weeks.

5. **Sprint at full speed every rep in practice** — Speed is a skill trained at the speed you practice. Jogging through reps teaches your nervous system to jog. Sprint every drill that calls for it — your nervous system adapts to the stimulus you give it.

#### Height (hScore) Tips:
1. **Height is genetic — focus on what you can control** — The height score reflects the position median, not a hard cutoff. Meaningful improvements to your speed or weight scores can raise your overall athletic score enough to qualify even with the same height. Those are your levers.

2. **Posture and core work can maximize your measured height** — Dead hangs (hang from a bar 30–60 seconds daily), thoracic mobility drills, and plank progressions correct forward lean over time. Athletes with poor posture can gain 0.5–1 inch in measured standing height through consistent postural work.

3. **Consider positions with a lower height median** — The alternative positions shown below were selected partly because their height medians are closer to yours. Your overall score is naturally stronger there with identical measurables — and those are real options, not consolation prizes.

4. **Technique closes the gap that inches can't** — Route precision, hand fighting, leverage, and positional IQ are things coaches weigh heavily but pre-recruit metrics don't capture. Developing elite technique at your position makes height a smaller factor than it appears on paper.

---

### 6. ACADEMIC IMPROVEMENT STRATEGIES (If academic reason)

**Purpose:** If the student is blocked by GPA, give them specific, free steps to improve.

**Visibility:** Only if `reason === 'academic'` OR academic is a contributing factor

**Content:**

```
FREE STRATEGIES TO MOVE THE NEEDLE

• [Strategy 1 Title] — [description]
• [Strategy 2 Title] — [description]
  [... up to 8 strategies]
```

**Styling:**
- **Container:** No container — standalone section
- **Header:** Body Tiny, Gold (#D4AF37), uppercase, letter-spacing 2px, margin-bottom 10px
- **Strategies:** Same layout as training tips (bullets, bold titles, descriptions, left border)

**Academic strategies (from StayGrittyModal):**
1. **Ask your teachers directly** — Go to each teacher and ask: "What is the single most impactful thing I can do to improve my grade?" Teachers respect athletes who take initiative — and they often have options that aren't advertised.

2. **Prioritize your lowest-grade classes first** — A point gained in a D has far more GPA impact than a point gained in a B. Focus energy where the math works in your favor.

3. **Ask about late work and extra credit** — Many teachers allow late or redone assignments for partial credit. Just ask. The worst they can say is no — and most say yes.

4. **Use Khan Academy (free)** — khanacademy.org covers math, science, and SAT prep at every level. Free, self-paced, and used by millions of students. 20 minutes a day adds up fast.

5. **Find your school's free tutoring** — Most schools offer peer tutoring or teacher-led help sessions at lunch or after school. Your counselor can point you to them.

6. **Study in short focused blocks** — 30 minutes of focused, phone-free study beats 2 hours of distracted work. Remove distractions first — then open the books.

7. **Review notes within 24 hours** — The forgetting curve is real. Reviewing your notes the same day you take them dramatically improves retention without extra time.

8. **Talk to your school counselor** — Ask specifically about grade forgiveness policies, course retakes, or summer school options. Counselors can open doors you don't know exist.

---

### 7. ALTERNATIVE QUALIFYING POSITIONS (If athletic reason)

**Purpose:** Show the student other positions where they already qualify at their closest tier.

**Visibility:** If closest tier exists AND student scores > 50% in one or more analogous positions

**Content:**

```
POSITIONS YOU ALREADY QUALIFY FOR

Based on your current measurables, you score above 50% at the
[Division III / Division II / FCS] level in these positions:

[Position Badge 1] [Position Badge 2] [Position Badge 3]
```

**Styling:**
- **Container:** No container
- **Header:** Body Tiny, Gold, uppercase, margin-bottom 6px
- **Descriptive text:** Body Regular (16px), Stone Gray, margin-bottom 10px
- **Position badges:** Flex row, gap 8px, flex-wrap wrap
  - Each badge: padding 5px 12px, background #F5EFE0 (cream), border 1px #D4AF37 (gold), border-radius 3px
  - Text: Body Regular, Maroon (#8B3A3A), bold, letter-spacing 1px
  - Max 4 positions shown

**Position selection logic (from StayGrittyModal):**
- Use `SUGGESTION_POOLS` to find analogous positions by position group
- Filter to positions where `calcAthleticFit(position, h, w, s, closestTier) + boost > 0.5`
- Sort by fit score, take top 4

---

### 8. ASPIRATIONAL SCHOOLS — SCHOOLS TO WORK TOWARD

**Purpose:** Show schools that pass some gates but not all, as tangible targets to work toward.

**Visibility:** If schools exist in closest tier that pass distance + academic gates but fail athletic gate

**Content:**

```
┌────────────────────────────────────────────────────────┐
│ SCHOOLS TO WORK TOWARD                                 │
│                                                        │
│ These [Tier] programs already match your academic      │
│ profile and location. Hit the qualifying athletic      │
│ threshold and they move straight into your Top         │
│ Matches.                                               │
│                                                        │
│ ┌─────┬──────────────┬────────┬────────────┬──────┐   │
│ │School│ State│ADLTV │ADLTV Rank│Dist (mi)│   │
│ ├─────┼──────────────┼────────┼────────────┼──────┤   │
│ │School 1 │ ST │$XX,XXX │ #X  │ XX mi│   │
│ │School 2 │ ST │$XX,XXX │ #X  │ XX mi│   │
│ │School 3 │ ST │$XX,XXX │ #X  │ XX mi│   │
│ │School 4 │ ST │$XX,XXX │ #X  │ XX mi│   │
│ │School 5 │ ST │$XX,XXX │ #X  │ XX mi│   │
│ └─────┴──────────────┴────────┴────────────┴──────┘   │
└────────────────────────────────────────────────────────┘
```

**Styling:**
- **Container:** Background #FFFFFF, border 1px Light Gray, border-radius 4px, padding 16px
- **Header:** Body Tiny, Gold, uppercase, letter-spacing 2px, margin-bottom 6px
- **Description:** Body Small, Stone Gray, margin-bottom 10px
- **Table:**
  - **Columns:** School, State, ADLTV, ADLTV Rank, Distance (mi)
  - **Header row:** Background #F5F5F5, border-bottom 1px Light Gray, padding 6px 10px
    - **Text:** Body Tiny (10px), Stone Gray, uppercase, letter-spacing 1.5px, font-weight 600
  - **Data rows:** Padding 6px 10px, alternating background (transparent / #F5F5F5)
    - **School name:** Body Regular, Charcoal (#2C2C2C)
    - **Other columns:** Body Small, Stone Gray
  - **Overflow:** Horizontal scroll on mobile if needed
  - **Max schools shown:** 5

**School selection logic:**
- Filter `scoringResult.scored` to schools where:
  - `school.Type === closestTier`
  - `school.dist <= RECRUIT_BUDGETS[closestTier]`
  - `school.acadScore > 0` (passes academic gate)
  - `school.athleticFit < 0.5` (fails athletic gate — this is why they're aspirational)
- Sort by `school.adltv` descending
- Take top 5
- If fewer than 3 found, relax criteria: remove academic gate filter, take top 5 by ADLTV anyway

---

### 9. ENCOURAGEMENT CLOSING

**Purpose:** Reinforce that progress is achievable and remind the student to come back.

**Content:**

```
┌──────────────────────────────────────────────┐
│ When your [GPA/athletic metrics] improve,    │
│ come back and update your profile. The       │
│ GRIT FIT Formula will run immediately and    │
│ show you every program you qualify for.      │
│                                              │
│ One semester of focused work can change      │
│ your entire recruiting picture.              │
└──────────────────────────────────────────────┘
```

**Styling:**
- **Container:** Background #F5EFE0 (cream), border 1px Light Gray, padding 12px 16px, border-radius 4px
- **Text:** Body Small (14px), Stone Gray, line-height 1.6
- **Emphasis:** "One semester of focused work..." in **bold Cream** (#F5EFE0)

---

### 10. SUPPORT FOOTER

**Content:**

```
Support: verifygrit@gmail.com
```

**Styling:**
- **Text:** Body Tiny (11px), Stone Gray (#3A5A3E), centered, margin 16px 0
- **Email link:** Color (#3A5A3E), no underline by default, underline on hover

---

### 11. ACTION BUTTONS

**Purpose:** Route the student to profile edit or home/all-schools browse.

**Content:**

```
[Update My Profile →]  [Home]
```

**Styling:**
- **Container:** Flex row, gap 10px, margin-top 20px
- **Primary button (Update My Profile →):**
  - **Flex:** 1 (full width on mobile, auto on desktop)
  - **Background:** Maroon (#8B3A3A)
  - **Text:** Cream (#F5EFE0), Body Regular (16px), bold, letter-spacing 1px
  - **Padding:** 10px 20px
  - **Border:** 1px solid Gold (#D4AF37)
  - **Border-radius:** 3px
  - **Cursor:** pointer
  - **Hover:** Background darkens to #6B2C2C, shadow increases
  - **Arrow:** Right-pointing arrow (→) after text

- **Secondary button (Home):**
  - **Flex:** none (auto width)
  - **Background:** transparent
  - **Text:** Stone Gray (#6B6B6B), Body Regular (16px), bold, letter-spacing 1px
  - **Border:** 1px solid Light Gray (#E8E8E8)
  - **Border-radius:** 3px
  - **Cursor:** pointer
  - **Hover:** Border becomes Maroon, text becomes Maroon

---

## RESPONSIVE BEHAVIOR

### Mobile (≤ 768px)

- **Page width:** Full viewport minus 12px padding left/right
- **Font sizes:** Reduce body text by 2px (Body Regular becomes 14px, Body Small becomes 12px)
- **Spacing:** Use `sm` (8px) instead of `md` (16px) for tighter layouts
- **Cards/containers:** Stack vertically, full width
- **Buttons:** Full width on mobile (Primary), Secondary wraps below or appears as text link
- **Progress bars:** Full width within containers
- **Tables (aspirational schools):** Horizontal scroll if needed; collapse non-essential columns (ADLTV Rank) on very small screens

### Tablet (768px – 1023px)

- **Similar to desktop but with slightly reduced margins**
- **2-column layouts become 1-column**

### Desktop (≥ 1024px)

- **Max content width:** 800px (centered)
- **Standard spacing:** 16px (md)
- **All layout refinements as specified above**

---

## STATE HANDLING: WHICH SECTIONS APPEAR WHEN

### Scenario 1: Academic Reason (GPA below minimum)

**Sections that appear:**
1. Header + Diagnosis (academic-specific text)
2. Academic Snapshot (with "Why It Matters" box)
3. Closest Athletic Tier & Metric Breakdown (shows what to build toward athletically)
4. WOW callouts (if any metrics ≥ 75th percentile)
5. Training Tips (for weakest athletic metric)
6. Academic Improvement Strategies (full 8 tips)
7. Alternative Qualifying Positions (show paths to other positions)
8. Aspirational Schools (optional — D3 schools in reach)
9. Encouragement Closing (frame around GPA improvement)
10. Support Footer
11. Action Buttons

### Scenario 2: Athletic Reason (no qualifying tier, or all schools filtered out)

**Sections that appear:**
1. Header + Diagnosis (athletic-specific text)
2. Academic Snapshot (show they're above academic bar)
3. Closest Athletic Tier & Metric Breakdown (show closest fit and per-metric gaps)
4. WOW callouts (if any ≥ 75th percentile)
5. Training Tips (for weakest metric)
6. Alternative Qualifying Positions (show positions they already qualify for)
7. Aspirational Schools (mandatory — show reachable targets)
8. Encouragement Closing (frame around athletic improvement)
9. Support Footer
10. Action Buttons

### Scenario 3: Combined Reason (topTier exists but all schools filtered)

**Sections that appear:**
1. Header + Diagnosis (combined-specific text)
2. Academic Snapshot (show where they stand)
3. Closest Athletic Tier & Metric Breakdown
4. WOW callouts (if any ≥ 75th percentile)
5. Training Tips (for weakest metric)
6. Academic Improvement Strategies (abbreviated — 2–3 key tips only)
7. Alternative Qualifying Positions (if applicable)
8. Aspirational Schools (mandatory)
9. Encouragement Closing (multi-pronged: work on both academics and athletics)
10. Support Footer
11. Action Buttons

---

## ACCESSIBILITY NOTES

### Keyboard Navigation
- All buttons (Update My Profile, Home) are focusable via Tab
- No focus traps — focus order follows reading order top-to-bottom
- Focus indicators: 2px outline at Maroon (#8B3A3A), 2px offset

### Color & Contrast
- All text meets **WCAG AA minimum 4.5:1 contrast ratio**
- Progress bars: Green (#4CAF50) vs. Light Gray background = 4.8:1
- Red metrics (#F44336) vs. White = 3.9:1 (acceptable for UI components per WCAG)
- Status badges use both color AND text (not color alone) for status indication

### Screen Readers
- Progress bars: `aria-valuenow`, `aria-valuemin`, `aria-valuemax` attributes
- WOW callouts: 🔥 emoji is decorative (`role="presentation"` or aria-hidden)
- "Stay Gritty Focus:" labels explicitly associate with the metric they describe
- Action buttons have clear, descriptive text ("Update My Profile" not just "Update")

### Touch Targets (Mobile)
- All buttons: Minimum 44px × 44px touch target (padding expanded on mobile)
- Badges and interactive elements: Minimum 40px × 40px

---

## INTEGRATION POINT IN GritFitPage

### Current GritFitPage Flow

```javascript
if (loading) {
  return <Loading />;
}

if (error) {
  return <ErrorState />;
}

if (scoringResult?.top30?.length === 0) {
  return <NextStepsDashboard
    scoringResult={scoringResult}
    profile={profile}
    onEditProfile={() => navigate('/profile')}
    onBrowseAllSchools={() => navigate('/')}
  />;
}

// Normal GRIT FIT results (30 schools)
return (
  <>
    <ViewToggle ... />
    <GritFitMapView ... />
    <GritFitTableView ... />
  </>
);
```

### Props Passed from GritFitPage to NextStepsDashboard

- `scoringResult` — Full output from `runGritFitScoring(profile, schools)`
- `profile` — User's profiles table row (name, position, height, weight, speed_40, gpa, etc.)
- `onEditProfile` — Callback to navigate to `/profile` page
- `onBrowseAllSchools` — Callback to navigate home or full school map

### Coach Visibility Integration (Future: Item 3)

When the coach dashboard is built (Phase 1 Item 3), it will surface:

```
Students with zero GRIT FIT matches (zero-match count by name)
├─ [Student Name] — [Reason: Academic / Athletic / Combined]
├─ [Closest tier or GPA gap for context]
└─ [Encouraging note: "Check in with them about updated profile"]
```

This ties directly to the `scoringResult.reason` and `scoringResult.topTier` fields exposed by this component.

---

## FINAL NOTES

### Tone & Voice

The NextStepsDashboard is **never punitive**. Every section starts with data (the gap) and immediately pivots to actionable steps. The copy uses:

- **"You're closer than you think"** — Repeated theme
- **"Focus on..."** — Directive language (coach-like)
- **"Free strategies"** — Empowerment (no paywalls)
- **"One semester of focused work can change your entire recruiting picture"** — Hope and realistic timeline

### Color Scheme Consistency

- **Maroon (#8B3A3A):** Primary headings, primary button, strongest emphasis
- **Gold (#D4AF37):** Section labels, gap numbers, accents
- **Cream (#F5EFE0):** Card backgrounds, button text, highlighted text on dark
- **Stone Gray (#6B6B6B):** Body text, secondary labels
- **Green (#4CAF50):** Progress bars (passing scores)
- **Red (#F44336):** Progress bars (failing scores)

### Implementation Priority

1. **Core sections** (header, academic snapshot, closest tier, tips)
2. **WOW callouts** (if metrics exist above threshold)
3. **Alternative positions** (logic for position filtering)
4. **Aspirational schools** (table with school data)
5. **Responsive behavior** (mobile-first testing)
6. **Accessibility** (ARIA labels, keyboard nav, contrast validation)

---

---

**Version 1.1 — Readability fixes applied 2026-03-29.** Cream container frame (24px padding, 12px radius, 1px border), darkened tip titles/descriptions (#2C2C2C Charcoal for titles, #4A4A4A Dark Gray for descriptions), aspirational school names, and metric footnotes for improved contrast on light backgrounds.

*NextStepsDashboard spec — Ready for Nova implementation. Questions to Quill.*
