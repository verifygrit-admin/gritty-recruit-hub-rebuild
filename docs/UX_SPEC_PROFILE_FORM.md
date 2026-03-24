# UX SPEC: GRIT FIT PROFILE FORM

**Status:** Draft for review
**Date:** 2026-03-24
**Authority:** Quill (UX/UI Design)
**Related Decision:** RB-005 (QuickListForm structure, add school dropdown + parent email)
**Component Reuse:** QuickListForm from existing cfb-recruit-hub codebase

---

## OVERVIEW

The GRIT FIT Profile Form is the core data collection interface for student-athletes. It captures the four gates of the GRIT FIT algorithm: athletic tier, geographic reach, academic rigor, and financial fit. The form appears both at signup (after high school selection and coach auto-link) and on the student dashboard for editing.

---

## DESIGN INTENT

The BC High Eagles logo conveys confidence and clear hierarchy. Applied to this form: The sections are clearly labeled and organized. Heavy fields (athletic stats, academic stats) come first. Optional fields (social, parent email) come last. The form should feel quick, not overwhelming. Progress indication reassures the student.

---

## FORM LAYOUT

```
┌─────────────────────────────────────────────────────────┐
│                    HEADER (Maroon)                      │
└─────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                                                          │
│  Complete Your GRIT FIT Profile                          │
│  We'll use this to find your best college matches.       │
│                                                          │
│  Progress: ████████░░░░ 60%                              │
│                                                          │
│  SECTION 1: ATHLETIC STATS                              │
│  ─────────────────────────────────────────────────────   │
│                                                          │
│  Position *                                              │
│  [Football Position Dropdown ▼]                          │
│                                                          │
│  Height                                                  │
│  [5'11"]                                                 │
│                                                          │
│  Weight                                                  │
│  [215 lbs]                                               │
│                                                          │
│  40-Yard Dash Time                                       │
│  [4.75 seconds]                                          │
│                                                          │
│  Accolades                                               │
│  ☐ Expected Starter      ☐ Captain                       │
│  ☐ All-Conference        ☐ All-State                    │
│                                                          │
│  SECTION 2: ACADEMIC STATS                              │
│  ─────────────────────────────────────────────────────   │
│                                                          │
│  GPA *                                                   │
│  [3.85]                                                  │
│                                                          │
│  SAT Score (Optional)                                    │
│  [1480]                                                  │
│                                                          │
│  Graduation Year *                                       │
│  [2024 ▼]                                                │
│                                                          │
│  SECTION 3: LOCATION & HOME INFO                        │
│  ─────────────────────────────────────────────────────   │
│                                                          │
│  Your Home Address (City, State)                         │
│  [City] [State ▼]                                        │
│                                                          │
│  (Used to calculate distance to colleges)               │
│                                                          │
│  SECTION 4: HOUSEHOLD FINANCIAL INFO                    │
│  ─────────────────────────────────────────────────────   │
│                                                          │
│  Estimated Family Income (AGI) *                         │
│  [< $40k ▼]                                              │
│                                                          │
│  Number of Dependents                                    │
│  [2]                                                     │
│                                                          │
│  (Used to estimate net cost and EFC)                    │
│                                                          │
│  SECTION 5: SOCIAL & CONTACT (Optional)                │
│  ─────────────────────────────────────────────────────   │
│                                                          │
│  Twitter Handle                                          │
│  [@]                                                     │
│                                                          │
│  Phone Number                                            │
│  [(XXX) XXX-XXXX]                                        │
│                                                          │
│  Parent/Guardian Email (Optional)                        │
│  [parent@example.com]                                    │
│                                                          │
│  ─────────────────────────────────────────────────────   │
│                                                          │
│  [← Back] [Submit & Calculate Matches ➜]                │
│                                                          │
│  * Required fields                                       │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│                    FOOTER                              │
│            Documentation  Privacy  Help  Contact       │
└────────────────────────────────────────────────────────┘
```

---

## DETAILED FIELD SPECIFICATIONS

### Form Header

- **Title (H2):** "Complete Your GRIT FIT Profile"
- **Subtitle (Body Regular):** "We'll use this to find your best college matches."
- **Progress Bar (optional):** Horizontal bar showing % completion
  - **Background:** Light gray `#E8E8E8`
  - **Filled:** Maroon gradient `#8B3A3A` to `#6B2C2C`
  - **Height:** 6px
  - **Label (Body Tiny):** "Progress: [X]%" (updates in real-time as user fills fields)

---

## SECTION 1: ATHLETIC STATS

### Position Field

**Label:** "Position *" (required)
**Input Type:** Dropdown (select)
**Options:**
- Select Position...
- Quarterback
- Running Back
- Wide Receiver
- Tight End
- Offensive Lineman
- Defensive Lineman
- Linebacker
- Defensive Back
- Kicker
- Punter
- Other

**Styling:**
- Width: 100% (full width on all breakpoints)
- Padding: 12px 16px
- Border: `1px solid #D4D4D4`
- Border-radius: 4px
- Font: 1rem, Charcoal
- Focus state: `2px solid #8B3A3A` border outline

**Validation:**
- Required: Show error if empty on submit
- Error message: "Please select a position"

---

### Height Field

**Label:** "Height"
**Input Type:** Text input with unit selector
**Format:** Height in feet-inches, e.g., "5'11""

**Styling:**
- Two inputs side-by-side (narrow)
  - First input: Feet (e.g., "5") — 40px wide
  - Second input: Inches (e.g., "11") — 40px wide
  - Visual divider: " ' " between them
- Font: 1rem, Charcoal
- Border: `1px solid #D4D4D4`
- Focus state: `2px solid #8B3A3A`

**Placeholder:** "5" and "11" (examples)

**Validation:**
- Optional field
- If provided, must be numeric and between 4'0" and 7'0"
- Error message: "Please enter a valid height (e.g., 5'11"")"

---

### Weight Field

**Label:** "Weight"
**Input Type:** Number input with unit
**Format:** Weight in pounds, e.g., "215 lbs"

**Styling:**
- Width: 120px
- Padding: 12px 16px
- Border: `1px solid #D4D4D4`
- Border-radius: 4px
- Unit label (Body Small): "lbs" inside input or to the right
- Font: 1rem, Charcoal
- Focus state: `2px solid #8B3A3A`

**Placeholder:** "215"

**Validation:**
- Optional field
- If provided, must be numeric and between 150–350 lbs
- Error message: "Please enter a valid weight (150–350 lbs)"

---

### 40-Yard Dash Field

**Label:** "40-Yard Dash Time"
**Input Type:** Decimal number input
**Format:** Time in seconds, e.g., "4.75"

**Styling:**
- Width: 120px
- Padding: 12px 16px
- Border: `1px solid #D4D4D4`
- Border-radius: 4px
- Unit label (Body Small): "seconds" to the right
- Font: 1rem, Charcoal
- Focus state: `2px solid #8B3A3A`

**Placeholder:** "4.75"

**Validation:**
- Optional field
- If provided, must be numeric and between 4.0–6.0 seconds
- Error message: "Please enter a valid 40 time (4.0–6.0 seconds)"

---

### Accolades Checkboxes

**Label:** "Accolades" (optional, Body Small)

**Checkbox Options (Grid, 2 columns):**
```
☐ Expected Starter      ☐ Captain
☐ All-Conference        ☐ All-State
```

**Styling:**
- Checkbox: 20px × 20px, rounded 4px
- Unchecked: Light gray border, white background
- Checked: Maroon background, white checkmark
- Label text (Body Regular): "Expected Starter", "Captain", etc.
- Spacing: 16px between checkbox pairs (horizontal), 8px vertical

**Validation:**
- Optional field
- Multiple selections allowed

---

## SECTION 2: ACADEMIC STATS

### GPA Field

**Label:** "GPA *" (required)
**Input Type:** Decimal number input
**Format:** Unweighted GPA on 4.0 scale, e.g., "3.85"

**Styling:**
- Width: 120px
- Padding: 12px 16px
- Border: `1px solid #D4D4D4`
- Border-radius: 4px
- Font: 1rem, Charcoal
- Focus state: `2px solid #8B3A3A`

**Placeholder:** "3.85"

**Validation:**
- Required: Show error if empty
- Must be numeric and between 0.0–4.0
- Error messages:
  - "GPA is required"
  - "Please enter a valid GPA (0.0–4.0)"

---

### SAT Score Field

**Label:** "SAT Score (Optional)"
**Input Type:** Number input
**Format:** Total SAT score (out of 1600), e.g., "1480"

**Styling:**
- Width: 140px
- Padding: 12px 16px
- Border: `1px solid #D4D4D4`
- Border-radius: 4px
- Font: 1rem, Charcoal
- Focus state: `2px solid #8B3A3A`

**Placeholder:** "1480"

**Validation:**
- Optional field
- If provided, must be numeric and between 400–1600
- Error message: "Please enter a valid SAT score (400–1600)"

**Note:** If student has ACT instead, this field should accept ACT score with conversion. **For MVP: SAT only. ACT support = Phase 2.**

---

### Graduation Year Field

**Label:** "Graduation Year *" (required)
**Input Type:** Dropdown (select)
**Options:**
- Select Year...
- 2024
- 2025
- 2026
- 2027
- 2028
- Later

**Styling:**
- Width: 140px
- Padding: 12px 16px
- Border: `1px solid #D4D4D4`
- Border-radius: 4px
- Font: 1rem, Charcoal
- Focus state: `2px solid #8B3A3A`

**Validation:**
- Required: Show error if not selected
- Error message: "Please select your graduation year"

---

## SECTION 3: LOCATION & HOME INFO

### Home Location Fields

**Label:** "Your Home Address (City, State)"
**Input Type:** Two text inputs side-by-side
- **City input:** Text input, full width
- **State dropdown:** State selector (AL, AK, AZ, ..., WY)

**Styling (City):**
- Width: 60% (flex-grow on desktop)
- Padding: 12px 16px
- Border: `1px solid #D4D4D4`
- Border-radius: 4px
- Placeholder: "City"
- Focus state: `2px solid #8B3A3A`

**Styling (State):**
- Width: 35% (flex-grow on desktop)
- Padding: 12px 16px
- Border: `1px solid #D4D4D4`
- Border-radius: 4px
- Font: 1rem, Charcoal
- Focus state: `2px solid #8B3A3A`
- Margin-left: 8px (gap between inputs)

**Subtext (Body Tiny, Stone Gray):** "(Used to calculate distance to colleges)"

**Validation:**
- Optional fields
- If one is filled, both should be provided
- City: Text only (no numbers)
- State: Must be valid US state abbreviation
- Error message: "Please provide both city and state"

---

## SECTION 4: HOUSEHOLD FINANCIAL INFO

### Estimated Family Income (AGI) Field

**Label:** "Estimated Family Income (AGI) *" (required)
**Input Type:** Dropdown (select)
**Options:**
- Select Income Range...
- < $40,000
- $40,000–$60,000
- $60,000–$80,000
- $80,000–$100,000
- $100,000–$150,000
- $150,000–$200,000
- > $200,000
- Prefer not to say

**Styling:**
- Width: 100% (full width)
- Padding: 12px 16px
- Border: `1px solid #D4D4D4`
- Border-radius: 4px
- Font: 1rem, Charcoal
- Focus state: `2px solid #8B3A3A`

**Validation:**
- Required: Show error if not selected
- Error message: "Please select an income range"

**Subtext (Body Tiny, Stone Gray):** "(Used to estimate net cost and EFC)"

---

### Number of Dependents Field

**Label:** "Number of Dependents"
**Input Type:** Number input
**Format:** Integer, e.g., "2"

**Styling:**
- Width: 80px
- Padding: 12px 16px
- Border: `1px solid #D4D4D4`
- Border-radius: 4px
- Font: 1rem, Charcoal
- Focus state: `2px solid #8B3A3A`

**Placeholder:** "2"

**Validation:**
- Optional field
- If provided, must be numeric and 0–10
- Error message: "Please enter a valid number (0–10)"

---

## SECTION 5: SOCIAL & CONTACT (OPTIONAL)

### Twitter Handle Field

**Label:** "Twitter Handle"
**Input Type:** Text input
**Format:** Twitter handle without @, e.g., "johnsmith"

**Styling:**
- Width: 100% (full width)
- Padding: 12px 16px
- Border: `1px solid #D4D4D4`
- Border-radius: 4px
- Placeholder: "johnsmith"
- Prefix icon: "@" (grayed out)
- Font: 1rem, Charcoal
- Focus state: `2px solid #8B3A3A`

**Validation:**
- Optional field
- If provided, must be valid Twitter handle (alphanumeric, underscores, hyphens)
- Error message: "Please enter a valid Twitter handle"

---

### Phone Number Field

**Label:** "Phone Number"
**Input Type:** Text input with auto-formatting
**Format:** US phone number, e.g., "(555) 123-4567"

**Styling:**
- Width: 100% (full width)
- Padding: 12px 16px
- Border: `1px solid #D4D4D4`
- Border-radius: 4px
- Placeholder: "(XXX) XXX-XXXX"
- Font: 1rem, Charcoal, monospace
- Focus state: `2px solid #8B3A3A`

**Auto-formatting:**
- As user types, format into (XXX) XXX-XXXX pattern
- Example: User types "5551234567" → displays "(555) 123-4567"

**Validation:**
- Optional field
- If provided, must be valid US phone number
- Error message: "Please enter a valid phone number"

---

### Parent/Guardian Email Field

**Label:** "Parent/Guardian Email (Optional)" (new field, per RB-005)
**Input Type:** Email input
**Format:** Valid email address, e.g., "parent@example.com"

**Styling:**
- Width: 100% (full width)
- Padding: 12px 16px
- Border: `1px solid #D4D4D4`
- Border-radius: 4px
- Placeholder: "parent@example.com"
- Font: 1rem, Charcoal
- Focus state: `2px solid #8B3A3A`

**Subtext (Body Tiny, Stone Gray):** "(Optional. This allows your parent/guardian to receive recruiting updates.)"

**Validation:**
- Optional field
- If provided, must be valid email format
- Error message: "Please enter a valid email address"

**Note:** For MVP, this field is **informational only** — no emails are actually sent. Phase 2 will implement parent notifications.

---

## FORM ACTIONS

### Buttons (Bottom of Form)

**Layout:**
```
[← Back]  [Submit & Calculate Matches ➜]
```

**Left Button: [← Back]**
- **Label:** "← Back"
- **Style:** Secondary button (outlined Maroon, Maroon text)
- **Action:** Returns to previous step (landing page or dashboard)
- **Width:** 120px
- **Mobile:** Full-width button at bottom

**Right Button: [Submit & Calculate Matches ➜]**
- **Label:** "Submit & Calculate Matches ➜"
- **Style:** Primary button (Maroon background, white text)
- **Action:** Submit form and trigger GRIT FIT calculation
- **Width:** Auto (min 200px)
- **Mobile:** Full-width button, stacks below Back button

### Button Behavior

**On Submit Click:**
1. Form validation runs (all required fields checked)
2. If errors exist: Show error messages inline (red text below field)
3. If valid:
   - Button shows spinner + text changes to "Calculating..." (disabled state)
   - Form becomes read-only (all inputs disabled)
   - Request sent to server to:
     - Save profile to `profiles` table
     - Run GRIT FIT algorithm
     - Return up to 30 matching schools
   - On success: Navigate to `/grit-fit/results` (Map View)
   - On error: Show error message (e.g., "Something went wrong. Please try again.")

---

## FORM VALIDATION SUMMARY

| Field | Required | Type | Rules |
|---|---|---|---|
| Position | Yes | Select | Must be selected |
| Height | No | Text | If provided: valid height format 4'0"–7'0" |
| Weight | No | Number | If provided: 150–350 lbs |
| 40-Yard Dash | No | Decimal | If provided: 4.0–6.0 seconds |
| Accolades | No | Checkboxes | Any combination allowed |
| GPA | Yes | Decimal | 0.0–4.0 |
| SAT Score | No | Number | If provided: 400–1600 |
| Graduation Year | Yes | Select | Must be selected |
| Home City | No | Text | Alphabetic only |
| Home State | No | Select | Valid US state |
| AGI | Yes | Select | Must be selected |
| Dependents | No | Number | If provided: 0–10 |
| Twitter Handle | No | Text | Valid Twitter format |
| Phone Number | No | Text | Valid US phone format |
| Parent Email | No | Email | Valid email format |

---

## RESPONSIVE DESIGN

### Desktop (1024px+)
- **Form width:** 600px max, centered
- **Sections:** Full width
- **Field layout:** Single column per field
- **City/State:** Side-by-side (60% / 35%)
- **Buttons:** Side-by-side (Back left, Submit right)
- **Padding:** 32px (xl) around form

### Tablet (768px–1023px)
- **Form width:** 90vw
- **Sections:** Full width
- **Field layout:** Single column
- **City/State:** Side-by-side (55% / 40%)
- **Buttons:** Stack vertically (Back on top, Submit below) **OR** side-by-side if space allows
- **Padding:** 24px (lg)

### Mobile (< 768px)
- **Form width:** 100vw minus 16px padding
- **Sections:** Full width
- **Field layout:** Single column, full width per field
- **City/State:** Stack vertically (100% each)
- **Buttons:** Stack vertically, full width each (44px height for touch)
- **Padding:** 16px (md)
- **Progress bar:** Smaller text (Body Tiny)

---

## EDITING THE PROFILE

**Route:** `/profile/edit` (from student dashboard)

**Behavior:**
- Form pre-populates with current profile values
- Header changes: "Update Your GRIT FIT Profile"
- Submit button changes: "Update & Recalculate Matches"
- On submit: Profile updated in database, GRIT FIT re-runs, shortlist flags update
- After update: Return to student dashboard with success toast: "Profile updated and matches recalculated"

---

## ACCESSIBILITY NOTES

- **Screen readers:**
  - Form fieldset with legend: "GRIT FIT Profile Form"
  - Section headings: h3 role for each section
  - Required indicator: aria-required="true" on required fields
  - Error messages: aria-live="polite" and associated with field via aria-describedby
- **Keyboard navigation:**
  - Tab through all fields in logical order
  - Enter or Space to check/uncheck checkboxes
  - Arrow keys to navigate dropdowns
  - Tab to reach Submit and Back buttons
  - Escape to close any dropdowns
- **Color contrast:** All labels and error text meet 4.5:1 minimum
- **Focus indicators:** 2px Maroon outline on focused fields
- **Error handling:** Errors displayed in red text below field with aria-live region for screen reader announcement

---

## IMPLEMENTATION NOTES

**Owner:** Nova (form component integration), Quill (design sign-off)

**Dependencies:**
- [ ] Form component (with validation)
- [ ] Dropdown/select component
- [ ] Text input component
- [ ] Number input component
- [ ] Checkbox component
- [ ] Progress bar component
- [ ] Error message handling
- [ ] Auto-formatting for phone number

**Reuse from existing codebase:**
- [x] QuickListForm structure and fields (existing cfb-recruit-hub)
- [x] GRIT FIT calculation logic (battle-tested)
- [x] Validation rules

**Key decisions for Nova:**
1. Should form save draft as user fills fields, or only on submit? **Recommendation:** Only on submit for MVP
2. Should all sections be collapsible, or always expanded? **Recommendation:** Always expanded for first-time users, but collapsible for editing
3. Should height/weight have specific dropdown lists instead of free-text? **Recommendation:** Free-text with validation is simpler for MVP

---

## APPROVAL GATE

This spec requires sign-off from:
- [ ] Quill (design consistency, layout, responsive behavior)
- [ ] Nova (form component architecture and feasibility)
- [ ] Chris (product confirmation of required fields and MVP scope)
- [ ] Patch (data storage for AGI, dependents, parent email fields)

Once signed off, Nova proceeds to implementation.

---

*Profile Form Spec v1.0 — subject to revision based on stakeholder feedback and usability testing.*
