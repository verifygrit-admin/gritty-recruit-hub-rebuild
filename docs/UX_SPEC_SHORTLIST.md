# UX SPEC: STUDENT SHORTLIST WITH RECRUITING JOURNEY

**Status:** Draft for review
**Date:** 2026-03-24
**Authority:** Quill (UX/UI Design)
**Related Decision:** RB-006 (Shortlist is persistent), RB-007 (Does not auto-reset), RB-008 (16-step recruiting journey), RB-009 (JSON structure)

---

## OVERVIEW

The Shortlist is the student's persistent, curated collection of schools. Unlike the GRIT FIT list (which recalculates dynamically), the Shortlist represents schools the student has actively selected and intends to track. For each school, students track their recruiting journey through 15 steps, manage documents, and see status indicators that tell them if the school is still in their current GRIT FIT range.

---

## DESIGN INTENT

The Shortlist is the student's personal tracking dashboard. The BC High maroon and gold palette conveys confidence and control — the student owns their journey. The interface should feel organized, actionable, and scannable. Each school card is its own unit of progress.

---

## SHORTLIST VIEW LAYOUT

```
┌─────────────────────────────────────────────────────────┐
│                    HEADER (Maroon)                      │
│  [Logo] Gritty Recruit Hub  [Shortlist (3)] [Settings] │
└─────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                                                          │
│  Your Shortlist (3 schools)                              │
│  Filter: [Status ▼] [Division ▼] [Distance ▼]           │
│  [Clear all filters] | Sort: [Name ▼]                   │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │                                                     │ │
│  │  1. Alabama Crimson Tide                            │ │
│  │  SEC | Power 4 | 450 miles                          │ │
│  │  Status: 🟢 Currently Recommended                   │ │
│  │                                                     │ │
│  │  ▾ Recruiting Journey Progress (10 of 15 steps)     │ │
│  │  ├─ [✓] Step 1: Added to shortlist                 │ │
│  │  ├─ [✓] Step 2: Completed recruiting questionnaire │ │
│  │  ├─ [✓] Step 3: Completed admissions info form     │ │
│  │  ├─ [✓] Step 4: Contacted coach via email          │ │
│  │  ├─ [✓] Step 5: Contacted coach via social media   │ │
│  │  ├─ [✓] Step 6: Received junior day invite         │ │
│  │  ├─ [ ] Step 7: Received visit invite               │ │
│  │  ├─ [ ] Step 8: Received prospect camp invite      │ │
│  │  ├─ [✓] Step 9: School contacted via text          │ │
│  │  ├─ [✓] Step 10: Head coach contacted student     │ │
│  │  ├─ [ ] Step 11: Assistant coach contacted student │ │
│  │  ├─ [ ] Step 12: School requested transcript       │ │
│  │  ├─ [ ] Step 13: School requested financial info   │ │
│  │  ├─ [ ] Step 14: Received verbal offer             │ │
│  │  └─ [ ] Step 15: Received written offer            │ │
│  │                                                     │ │
│  │  📄 Documents (0 uploaded)                           │ │
│  │  [+ Upload Transcript] [+ Upload Course List]       │ │
│  │  [+ Upload Writing Sample] [+ Upload Resume]        │ │
│  │  [+ Upload School Profile] [+ Upload Test Scores]   │ │
│  │                                                     │ │
│  │  [✎ Edit] [📍 View on Map] [🗑 Remove from List]  │ │
│  │                                                     │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ 2. Georgia Bulldogs                                  │ │
│  │    [Similar layout as above]                        │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ 3. Texas Longhorns                                   │ │
│  │    [Similar layout as above]                        │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│                    FOOTER                              │
│            Documentation  Privacy  Help  Contact       │
└────────────────────────────────────────────────────────┘
```

---

## DETAILED COMPONENT SPECIFICATIONS

### Page Header Section

#### Title Row
- **Left:** "Your Shortlist" (H2, Maroon) + count "(3 schools)" (Body Small, Stone Gray)
- **Right (Desktop):** [⟲ Refresh Status] button (optional, recalculates GRIT FIT status flags)
- **Mobile:** Title stack vertically, button below

#### Filter Bar
```
Filter: [Status ▼] [Division ▼] [Conference ▼]  [Clear all]  |  Sort by: [Name ▼]
```

**Filters:**
1. **Status Filter**
   - **Options:**
     - All Status
     - 🟢 Currently Recommended (in current GRIT FIT results)
     - 🟡 Below Academic Fit (school's rigor below student potential)
     - 🟠 Out of Academic Reach (school's rigor exceeds student profile)
     - 🔴 Out of Athletic Reach (athletic tier above student)
     - 🔵 Outside Geographic Reach (distance exceeds preference)
   - **Default:** "All Status"

2. **Division Filter**
   - **Options:** All, Power 4, G5, FCS, FBS Ind, D2, D3
   - **Default:** "All"

3. **Conference Filter**
   - **Options:** All unique conferences in shortlist (auto-populated)
   - **Default:** "All"

**Sort Dropdown:**
- **Options:** Name (A–Z), Name (Z–A), Added (newest first), Added (oldest first), Distance (closest), Distance (farthest)
- **Default:** "Name (A–Z)"

**Clear Action:**
- **Link:** "[Clear all filters]" (text link, Maroon, underline on hover)
- **Visibility:** Only shows if at least one filter is active

---

## SHORTLIST CARD (Per School)

### Card Layout

```
┌─────────────────────────────────────────────────────────┐
│ [School Name Header]                                    │
│                                                         │
│ [Status Badge]  [Metadata Line]                         │
│                                                         │
│ [Recruiting Journey Section] — Collapsible              │
│                                                         │
│ [Documents Section] — Collapsible                       │
│                                                         │
│ [Action Buttons]                                        │
└─────────────────────────────────────────────────────────┘
```

### School Header

**Layout:**
```
Alabama Crimson Tide
SEC | Power 4 | 450 miles | Added May 15, 2024
```

**Styling:**
- **School Name (H3):** 1.5rem, Maroon, bold
- **Conference/Division/Distance/Date (Body Small):** 0.875rem, Stone Gray, inline with separators (|)
- **Full row height:** 64px (two lines of text + padding)

### Status Badge

**Position:** Below school name, left side

**Badge Styling:**
- **Background:** Color-coded by status (see Status Indicator Colors section)
- **Text:** White, Body Small, bold
- **Padding:** 4px 12px
- **Border-radius:** 16px (pill shape)
- **Examples:**
  - 🟢 "Currently Recommended" on green background
  - 🟡 "Below Academic Fit" on orange background
  - 🔴 "Out of Athletic Reach" on red background

**Badge Logic:**
- Status updates automatically when GRIT FIT is recalculated
- If school is still in current GRIT FIT 30: "🟢 Currently Recommended"
- If removed from GRIT FIT due to academic reason: Show reason badge + explanation: "(Your updated profile places this school outside your academic range.)"

### Recruiting Journey Section

#### Collapsed State
```
▾ Recruiting Journey Progress (10 of 15 steps completed)
```

- **Icon:** [▾] pointing down (indicates expandable)
- **Title (H4):** "Recruiting Journey Progress"
- **Progress indicator (Body Small, Stone Gray):** "(10 of 15 steps completed)"
- **Progress bar (optional):** Horizontal bar, 10/15 filled (green), 5/15 empty (light gray)
- **Bar styling:**
  - Height: 8px
  - Background: Light gray `#E8E8E8`
  - Filled: Maroon gradient `#8B3A3A` to `#6B2C2C`
  - Border-radius: 4px
  - Full width of card

#### Expanded State
```
▸ Recruiting Journey Progress (10 of 15 steps completed)

Step Timeline (Vertical, Collapsible Per-Step):

✓ Step 1: Added to shortlist
  Completed: May 15, 2024

✓ Step 2: Completed recruiting questionnaire
  Completed: May 18, 2024

✓ Step 3: Completed admissions info form
  Completed: May 20, 2024

✓ Step 4: Contacted coach via email
  Completed: May 25, 2024

✓ Step 5: Contacted coach via social media
  Completed: May 26, 2024

✓ Step 6: Received junior day invite
  Completed: June 1, 2024

[ ] Step 7: Received visit invite
  Not yet completed

[ ] Step 8: Received prospect camp invite
  Not yet completed

✓ Step 9: School contacted via text
  Completed: June 10, 2024

✓ Step 10: Head coach contacted student
  Completed: June 12, 2024

[ ] Step 11: Assistant coach contacted student
  Not yet completed

[ ] Step 12: School requested transcript
  Not yet completed

[ ] Step 13: School requested financial info
  Not yet completed

[ ] Step 14: Received verbal offer
  Not yet completed

[ ] Step 15: Received written offer
  Not yet completed
```

**Step Styling (Individual):**

Each step is a row with:
- **Checkbox:** `[ ]` (unchecked) or `[✓]` (checked), clickable
  - **Unchecked:** Light gray border, white fill
  - **Checked:** Maroon fill, white checkmark
- **Step Number & Label:** "Step 1: Added to shortlist" (Body Regular, Charcoal)
- **Completion Date:** "Completed: May 15, 2024" (Body Small, Stone Gray) — shows only if completed
- **Timestamp:** "Not yet completed" (Body Small, Stone Gray) — shows only if unchecked

**Per-Step Interaction:**
- Click checkbox to toggle completion state
- On toggle, update `recruiting_journey_steps[step_id].completed = true/false`
- Update `completed_at` timestamp if completing (now), or null if unchecking
- Show brief spinner while updating (0.3s)

**Step Spacing:**
- 8px gap between each step row
- 16px left padding (vertical line-like alignment)
- Optional visual connector line (thin gray line on left, connects all steps)

### Documents Section

#### Collapsed State
```
📄 Documents (0 uploaded)
```

- **Icon:** 📄 (file folder icon)
- **Title (H4):** "Documents"
- **Count (Body Small, Stone Gray):** "(0 uploaded)" or "(3 uploaded)"

#### Expanded State
```
📄 Documents (3 uploaded)

Transcript — Submitted June 15, 2024 [View] [Delete]
Course List — Submitted June 16, 2024 [View] [Delete]
SAT Scores — Submitted June 18, 2024 [View] [Delete]

Upload a new document:
[+ Upload Transcript] [+ Upload Course List]
[+ Upload Writing Sample] [+ Upload Resume]
[+ Upload School Profile] [+ Upload Test Scores]
[Note: Coach cannot see Financial Aid Info documents]
```

**Uploaded Document Styling:**

Each uploaded file is a row:
```
[📄] Transcript — Submitted June 15, 2024 — 2.3 MB  [View] [Delete]
```

- **File icon:** 📄
- **File label:** "Transcript" (Body Regular, Maroon, bold)
- **Date submitted:** "Submitted June 15, 2024" (Body Small, Stone Gray)
- **File size:** "2.3 MB" (Body Small, Stone Gray)
- **[View] button:** Text link, Maroon, opens file in new tab
- **[Delete] button:** Text link, red, removes file (with confirmation modal)

**Upload Button Layout:**

Multiple upload buttons arranged in a 2-column grid (or full-width on mobile):

```
[+ Upload Transcript]     [+ Upload Course List]
[+ Upload Writing Sample] [+ Upload Resume]
[+ Upload School Profile] [+ Upload Test Scores]
```

**Button Styling:**
- Secondary button (outlined Maroon, Maroon text)
- 160px wide on desktop, full-width on mobile
- 8px gap between buttons

**Upload Interaction:**
1. User clicks [+ Upload Transcript]
2. File picker opens (or modal with file upload form)
3. User selects file
4. File uploads to Supabase Storage
5. Metadata saved to `file_uploads` table
6. File appears in the list above with [View] and [Delete] options
7. Toast notification: "Transcript uploaded successfully"

**File Type Mapping (7 document types):**
| Button Label | `file_label` Value | Coach Visibility |
|---|---|---|
| Transcript | Transcript | Yes |
| Course List | Senior Course List | Yes |
| Writing Sample | Writing Example 1 (or 2) | Yes |
| Resume | Student Resume | Yes |
| School Profile | School Profile PDF | Yes |
| Test Scores | SAT/ACT Scores | Yes |
| Financial Info | Financial Aid Info | **No** (Coach cannot see) |

**Coach Visibility Note:**
- **Text (Body Tiny, Stone Gray):** "(Coach cannot see Financial Aid Info documents)"
- **Position:** Below upload buttons
- **Styling:** Subtle, non-intrusive

---

## ACTION BUTTONS (Bottom of Card)

Three action buttons at the bottom of each card:

```
[✎ Edit School Info]  [📍 View on Map]  [🗑 Remove from Shortlist]
```

**Button Styling:**
- **Edit School Info:** Secondary button (outlined Maroon), left
- **View on Map:** Text link (Maroon), center
- **Remove from Shortlist:** Tertiary button (text link, red), right
- **Spacing:** 8px between buttons

**Edit School Info Click:**
- Opens a modal to edit school details (coach contact email, notes, etc.)
- **For MVP scope:** Likely disabled/hidden — may be Phase 2 feature

**View on Map Click:**
- Navigates to Map View, centers map on the clicked school marker
- Marker pulses (3-second animation) to draw attention

**Remove from Shortlist Click:**
- Shows confirmation modal: "Remove [School Name] from your shortlist? This cannot be undone."
- [Cancel] [Remove] buttons
- On confirm: Delete from `short_list_items` table
- Toast notification: "Removed from your shortlist"
- Card slides out (200ms animation)

---

## CARD STYLING

| Property | Value |
|---|---|
| **Background** | `#FFFFFF` (white) |
| **Border** | `1px solid #E8E8E8` |
| **Border-radius** | 8px |
| **Padding** | 24px (lg) |
| **Margin (between cards)** | 16px (md) bottom |
| **Shadow (resting)** | `0 2px 8px rgba(0,0,0,0.1)` |
| **Shadow (hover)** | `0 4px 12px rgba(0,0,0,0.15)` |
| **Max-width** | 800px per card |

---

## STATUS INDICATOR COLORS

| Status | Badge Color | Text | Icon |
|---|---|---|---|
| **Currently Recommended** | `#4CAF50` (Green) | White | 🟢 |
| **Below Academic Fit** | `#FF9800` (Orange) | White | 🟡 |
| **Out of Academic Reach** | `#F44336` (Red) | White | 🔴 |
| **Out of Athletic Reach** | `#F44336` (Red) | White | 🔴 |
| **Below Athletic Fit** | `#FF9800` (Orange) | White | 🟡 |
| **Outside Geographic Reach** | `#9C27B0` (Purple) | White | 🔵 |

---

## RESPONSIVE DESIGN

### Desktop (1024px+)
- **Card width:** Up to 800px, centered
- **Documents section:** 3-column button grid
- **All elements visible:** Journey steps, documents, action buttons
- **Padding:** 24px (lg)

### Tablet (768px–1023px)
- **Card width:** 90vw (max 750px)
- **Documents section:** 2-column button grid
- **Font sizes:** Slight reduction (H3 → 1.25rem)
- **Padding:** 20px (reduced)

### Mobile (< 768px)
- **Card width:** 100vw minus 16px padding
- **Documents section:** 1-column button grid (full width per button)
- **Journey section:** Steps displayed with smaller font (Body Small, 0.875rem)
- **Padding:** 16px (md)
- **Progress bar:** Remains 8px tall
- **Spacing (between cards):** 12px (sm) instead of 16px

---

## EMPTY SHORTLIST STATE

If student has no schools on their shortlist:

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  Your Shortlist (0 schools)                              │
│                                                          │
│  You haven't added any schools yet.                      │
│                                                          │
│  [→ View GRIT FIT Matches]  [→ Browse All Schools]       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- **Message (H3, Charcoal):** "You haven't added any schools yet."
- **Subtext (Body Regular, Stone Gray):** "Get started by viewing your personalized GRIT FIT matches or exploring the full map."
- **Buttons:** Two primary CTAs (secondary style)
  - [→ View GRIT FIT Matches] — navigates to GRIT FIT Map View
  - [→ Browse All Schools] — navigates to Browse (full 662-school map)

---

## FILTERING & SORTING BEHAVIOR

### Filter Interaction
When user applies filters (e.g., Status=Currently Recommended, Division=Power 4):
1. Cards update to show only matching schools
2. Others hidden (not deleted)
3. Count updates: "Your Shortlist (3 of 5 schools)"
4. If no results match: Show message "No schools match your filters. [Clear all] to reset."

### Sort Interaction
When user selects sort option (e.g., "Distance (closest)"):
1. Cards reorder immediately
2. Animation: Cards fade out and reorder (100ms), then fade in
3. Sort persists across page navigation and back

---

## REFRESH STATUS FLOWS

### Manual Refresh
When user clicks [⟲ Refresh Status] button:
1. Button shows spinner
2. App re-runs GRIT FIT algorithm with current profile
3. Shortlist `grit_fit_status` flags update in batch
4. Cards with changed status animate a brief highlight (yellow glow, 500ms)
5. Status badges update in cards
6. Toast notification: "Status updated based on your latest profile"

### Automatic Refresh (After Profile Edit)
When student edits their profile:
1. System recalculates GRIT FIT
2. Shortlist flags update automatically (no user action needed)
3. On return to Shortlist view: Cards show updated status badges
4. Toast notification (optional): "Your shortlist statuses have been updated"

---

## ACCESSIBILITY NOTES

- **Screen readers:**
  - Card aria-label: "[School Name], [Status], [X of 15 journey steps completed]"
  - Journey steps: Each step is a checkbox with aria-label: "Step 1: Added to shortlist, completed"
  - File upload buttons: aria-label: "Upload [Document Type]"
- **Keyboard navigation:**
  - Tab through sections (header, filters, cards, buttons)
  - Enter to expand/collapse sections
  - Space to toggle checkboxes
  - Escape to close any open modals
- **Color contrast:** All text meets 4.5:1 minimum
- **Focus indicators:** 2px Maroon outline on focused elements
- **Touch targets:** Checkboxes and action buttons minimum 44px × 44px (mobile)

---

## IMPLEMENTATION NOTES

**Owner:** Nova (card component integration), Quill (design sign-off)

**Dependencies:**
- [ ] Card component (with expandable sections)
- [ ] Checkbox component
- [ ] Progress bar component
- [ ] Badge component (status indicators)
- [ ] File upload widget
- [ ] Filter/sort controls
- [ ] Confirmation modal component
- [ ] Toast notification component

**Key decisions for Nova:**
1. Should journey steps and documents use `<details>/<summary>` HTML or custom accordion? **Recommendation:** Custom accordion for better control and animation
2. Should file upload be client-side only or use Supabase Storage API? **Recommendation:** Supabase Storage (already integrated in project)
3. Should status badges update in real-time, or require page refresh? **Recommendation:** Real-time via React state update

---

## APPROVAL GATE

This spec requires sign-off from:
- [ ] Quill (design consistency, layout, responsive behavior)
- [ ] Nova (component architecture and feasibility)
- [ ] Chris (product confirmation of 15-step journey structure and file upload scope)
- [ ] Patch (file upload Supabase Storage integration scope)

Once signed off, Nova proceeds to implementation.

---

*Shortlist Spec v1.0 — subject to revision based on stakeholder feedback and usability testing.*
