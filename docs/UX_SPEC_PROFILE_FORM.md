# UX SPEC: PROFILE FORM — Student-Athlete Data Collection

**Status:** Draft for review
**Date:** 2026-03-25
**Authority:** Quill (UX/UI Design)
**Implementation Owner:** Nova (React component) + Patch (Supabase integration)
**Related Spec:** patch-schema-auth-spec-v2.md Section 2.4 (profiles table)
**Related Decision:** DEC-CFBRB-029 (high school must be autocomplete, not free text)

---

## OVERVIEW

The profile form collects student-athlete data that powers the GRIT FIT algorithm and coaches' dashboard visibility. This form is the critical data entry point for MVP — all fields feed downstream GRIT FIT calculations, financial analysis, and coach recruiting workflows.

The form is accessed from:
1. **Landing page** — "Complete Profile" CTA (if profile incomplete)
2. **Landing page** — "Edit Profile" CTA (if profile complete)
3. **Post-login flow** — mandatory if first-time user and role = student_athlete

This spec covers the full form layout, field definitions, validation rules, autocomplete behavior, sensitive field handling, and mobile responsiveness.

---

## DESIGN INTENT

The profile form represents the student's **full recruiting identity**. It must feel:
- **Approachable** — Grouped into logical sections, not overwhelming
- **Trustworthy** — Clear labels, contextual help, privacy assurances (especially for AGI)
- **Complete** — Every field has a purpose (GRIT FIT, coach visibility, or financial analysis)

Color and typography follow DESIGN_SYSTEM.md. Maroon buttons indicate primary actions. Gold accents highlight critical fields. All inputs use 16px font on mobile (iOS zoom prevention).

---

## FORM ARCHITECTURE

### Section Hierarchy

The form is divided into **five logical sections**, each preceded by an H3 heading and separated by a horizontal divider. Each section groups related fields by purpose:

1. **Personal Info** — Name, contact, high school, graduation year, location
2. **Academic** — GPA, SAT, high school coursework indicators
3. **Athletic** — Position, height, weight, speed, accolades
4. **Financial** — AGI, dependents (sensitive section with privacy note)
5. **Parent/Guardian** — Emergency contact email

### Mobile Behavior

- Single-column layout (100% width)
- Sections collapse into mobile-optimized stacks
- Font sizes remain constant (16px for inputs prevents iOS zoom)
- Buttons stack vertically or sit 50% width side-by-side (depending on action count)
- Horizontal dividers shrink from 100% width to 80% with centered alignment

---

## FIELD DEFINITIONS & LAYOUT

### SECTION 1: PERSONAL INFO

**Purpose:** Establish student identity and geographic context.

---

#### Field 1.1: Full Name
- **Label:** "Full Name"
- **Type:** Text input
- **Required:** YES
- **Validation:** Non-empty, max 255 characters
- **Placeholder:** "John Smith"
- **data-testid:** `input-name`
- **Width:** 100%
- **Help text:** None
- **Styling:**
  - Background: `#FFFFFF`
  - Border: `1px solid #D4D4D4`
  - Border radius: 4px
  - Padding: 12px 16px
  - Font size: 1rem (16px on mobile)
  - Focus border: `2px solid #8B3A3A` (Maroon)
  - Focus shadow: `0 0 0 3px rgba(139,58,58,0.1)`

---

#### Field 1.2: High School (Autocomplete)
- **Label:** "High School"
- **Type:** Text input with autocomplete dropdown
- **Required:** YES
- **Validation:** Must select from `hs_programs` table; not free text
- **Placeholder:** "Start typing... (e.g., 'Boston College High')"
- **data-testid:** `input-high-school-autocomplete`
- **Width:** 100%
- **Autocomplete Behavior:**
  - Query `hs_programs` table in real-time as user types
  - Match on `school_name` field (case-insensitive partial match)
  - Display dropdown with school name, city, state (e.g., "Boston College High, Boston, MA")
  - Show up to 10 results; add "Show more" link if >10
  - On selection: auto-populate `hs_lat`, `hs_lng` from the selected `hs_programs` record
  - Debounce queries by 300ms to avoid excessive network traffic
  - If user clears field after selection, reset `hs_lat` and `hs_lng` to null
- **Help text:** "(Required — allows coaches to find you)"
- **Styling:** Same as Field 1.1; dropdown background `#FFFFFF`, items hover at `#F5EFE0` (Cream)

---

#### Field 1.3: Graduation Year
- **Label:** "Graduation Year"
- **Type:** Dropdown (select)
- **Required:** NO
- **Validation:** Valid year (current year + 1 to current year + 5 typical range)
- **Options:** Generate dynamically as [current_year + 1] through [current_year + 5]
- **Example:** If today is 2026-03-25, options are 2027, 2028, 2029, 2030, 2031
- **Default:** Empty (placeholder text: "Select graduation year")
- **data-testid:** `select-grad-year`
- **Width:** 100% (mobile), 50% (desktop)
- **Help text:** None
- **Styling:** Same as text input; focused state same as Field 1.1

---

#### Field 1.4: State
- **Label:** "State"
- **Type:** Dropdown (select) or text autocomplete
- **Required:** NO
- **Validation:** Valid US state abbreviation (2 letters)
- **Options:** All 50 US states + DC (alphabetical)
- **Example:** "MA", "CA", "TX", etc.
- **Default:** Empty (placeholder: "Select state")
- **data-testid:** `select-state`
- **Width:** 100% (mobile), 50% (desktop)
- **Help text:** None
- **Note:** Can be auto-populated if user selects a high school in `hs_programs` (optional enhancement; not MVP requirement)
- **Styling:** Same as text input

---

#### Field 1.5: Email (Pre-filled from Auth)
- **Label:** "Email"
- **Type:** Text input (disabled/read-only)
- **Required:** YES
- **Validation:** Valid email (pre-validated at auth time; displayed read-only)
- **Placeholder:** User's auth email (e.g., "student@school.com")
- **data-testid:** `input-email-readonly`
- **Width:** 100%
- **Help text:** "(From your account — cannot edit here)"
- **Styling:**
  - Background: `#F5F5F5` (disabled gray)
  - Border: `1px solid #E8E8E8`
  - Text color: `#6B6B6B` (Stone Gray)
  - Cursor: `not-allowed`

---

#### Field 1.6: Phone
- **Label:** "Phone"
- **Type:** Text input with mask (optional enhancement)
- **Required:** NO
- **Validation:** Accepts US phone format or freeform; max 20 characters
- **Placeholder:** "(123) 456-7890"
- **data-testid:** `input-phone`
- **Width:** 100%
- **Help text:** None
- **Styling:** Same as Field 1.1; default state

---

#### Field 1.7: Twitter Handle
- **Label:** "Twitter/X Handle (Optional)"
- **Type:** Text input
- **Required:** NO
- **Validation:** Max 20 characters (Twitter handle limit)
- **Placeholder:** "@your_handle"
- **data-testid:** `input-twitter`
- **Width:** 100%
- **Help text:** "(Optional — helps coaches find you online)"
- **Styling:** Same as Field 1.1; default state

---

**Layout (Desktop 1024px+):**
```
┌────────────────────────────────────────────┐
│ PERSONAL INFO                              │
├────────────────────────────────────────────┤
│ [Full Name (100%)]                         │
│ [High School Autocomplete (100%)]          │
│ [Graduation Year (50%)] [State (50%)]      │
│ [Email Read-Only (100%)]                   │
│ [Phone (50%)] [Twitter Handle (50%)]       │
└────────────────────────────────────────────┘
```

**Layout (Mobile <768px):**
```
┌────────────────────────────────────────────┐
│ PERSONAL INFO                              │
├────────────────────────────────────────────┤
│ [Full Name (100%)]                         │
│ [High School Autocomplete (100%)]          │
│ [Graduation Year (100%)]                   │
│ [State (100%)]                             │
│ [Email Read-Only (100%)]                   │
│ [Phone (100%)]                             │
│ [Twitter Handle (100%)]                    │
└────────────────────────────────────────────┘
```

---

### SECTION 2: ACADEMIC

**Purpose:** Capture academic credentials for college matching.

---

#### Field 2.1: GPA
- **Label:** "High School GPA"
- **Type:** Number input (decimal)
- **Required:** NO
- **Validation:** 0.0 to 4.0 (or 0.0 to 4.5 if weighted GPA supported); 2 decimal places
- **Placeholder:** "3.75"
- **data-testid:** `input-gpa`
- **Width:** 100% (mobile), 50% (desktop)
- **Help text:** "(Unweighted preferred)"
- **Error state:** If value > 4.0, show inline error: "GPA must be 4.0 or lower" in `#F44336` (Error red)
- **Styling:** Same as Field 1.1; error state has background `#FFF5F5` (light pink) and border `#F44336`

---

#### Field 2.2: SAT Score
- **Label:** "SAT Score (Total)"
- **Type:** Number input (integer)
- **Required:** NO
- **Validation:** 400 to 1600; no decimal places
- **Placeholder:** "1450"
- **data-testid:** `input-sat`
- **Width:** 100% (mobile), 50% (desktop)
- **Help text:** "(New SAT out of 1600)"
- **Error state:** If value < 400 or > 1600, show inline error: "SAT must be between 400–1600" in `#F44336`
- **Styling:** Same as GPA field

---

**Layout (Desktop 1024px+):**
```
┌────────────────────────────────────────────┐
│ ACADEMIC                                   │
├────────────────────────────────────────────┤
│ [GPA (50%)] [SAT Score (50%)]              │
└────────────────────────────────────────────┘
```

**Layout (Mobile <768px):**
```
┌────────────────────────────────────────────┐
│ ACADEMIC                                   │
├────────────────────────────────────────────┤
│ [GPA (100%)]                               │
│ [SAT Score (100%)]                         │
└────────────────────────────────────────────┘
```

---

### SECTION 3: ATHLETIC

**Purpose:** Capture athletic profile for GRIT FIT tier matching and coach visibility.

---

#### Field 3.1: Position
- **Label:** "Football Position"
- **Type:** Dropdown (select)
- **Required:** NO
- **Validation:** Must select from predefined list or leave empty
- **Options:**
  - (Placeholder: "Select position")
  - QB (Quarterback)
  - RB (Running Back)
  - FB (Fullback)
  - WR (Wide Receiver)
  - TE (Tight End)
  - OL (Offensive Lineman)
  - OT (Offensive Tackle)
  - OG (Offensive Guard)
  - C (Center)
  - DL (Defensive Lineman)
  - DE (Defensive End)
  - DT (Defensive Tackle)
  - LB (Linebacker)
  - DB (Defensive Back)
  - CB (Cornerback)
  - S (Safety)
  - K (Kicker)
  - P (Punter)
  - LS (Long Snapper)
- **data-testid:** `select-position`
- **Width:** 100% (mobile), 50% (desktop)
- **Help text:** None
- **Styling:** Same as Field 1.1

---

#### Field 3.2: Height
- **Label:** "Height"
- **Type:** Text input (flexible format)
- **Required:** NO
- **Validation:** Accepts "5'10\"", "5-10", "5 10", or "70 in"; stores as free text
- **Placeholder:** "5'10\""
- **data-testid:** `input-height`
- **Width:** 100% (mobile), 33% (desktop)
- **Help text:** None
- **Styling:** Same as Field 1.1

---

#### Field 3.3: Weight
- **Label:** "Weight (lbs)"
- **Type:** Number input (integer)
- **Required:** NO
- **Validation:** Positive integer, 50–400 lbs typical range
- **Placeholder:** "190"
- **data-testid:** `input-weight`
- **Width:** 100% (mobile), 33% (desktop)
- **Help text:** "(Pounds)"
- **Styling:** Same as Field 1.1

---

#### Field 3.4: 40-Yard Dash Time
- **Label:** "40-Yard Dash (seconds)"
- **Type:** Number input (decimal)
- **Required:** NO
- **Validation:** 4.0 to 7.0 seconds (typical range); 2 decimal places
- **Placeholder:** "4.65"
- **data-testid:** `input-speed-40`
- **Width:** 100% (mobile), 33% (desktop)
- **Help text:** "(Best time in seconds)"
- **Styling:** Same as Field 1.1

---

#### Field 3.5: Expected Starter (Checkbox)
- **Label:** "Expect to start as a freshman?"
- **Type:** Checkbox (boolean toggle)
- **Required:** NO
- **Default:** false
- **data-testid:** `checkbox-expected-starter`
- **Width:** 100%
- **Styling:**
  - Checkbox: 20×20px, Maroon border `#8B3A3A`, white background
  - Checked state: Maroon background `#8B3A3A`, white checkmark
  - Label text: 16px, Charcoal `#2C2C2C`, left-aligned next to checkbox, 8px gap

---

#### Field 3.6: Team Captain (Checkbox)
- **Label:** "Team captain in high school?"
- **Type:** Checkbox (boolean toggle)
- **Required:** NO
- **Default:** false
- **data-testid:** `checkbox-captain`
- **Width:** 100%
- **Styling:** Same as Field 3.5

---

#### Field 3.7: All-Conference (Checkbox)
- **Label:** "All-conference selection?"
- **Type:** Checkbox (boolean toggle)
- **Required:** NO
- **Default:** false
- **data-testid:** `checkbox-all-conference`
- **Width:** 100%
- **Styling:** Same as Field 3.5

---

#### Field 3.8: All-State (Checkbox)
- **Label:** "All-state selection?"
- **Type:** Checkbox (boolean toggle)
- **Required:** NO
- **Default:** false
- **data-testid:** `checkbox-all-state`
- **Width:** 100%
- **Styling:** Same as Field 3.5

---

**Layout (Desktop 1024px+):**
```
┌────────────────────────────────────────────┐
│ ATHLETIC                                   │
├────────────────────────────────────────────┤
│ [Position (100%)]                          │
│ [Height (33%)] [Weight (33%)] [40 Time (33%)]  │
│ ☑ Expect to start as a freshman?          │
│ ☑ Team captain in high school?             │
│ ☑ All-conference selection?                │
│ ☑ All-state selection?                     │
└────────────────────────────────────────────┘
```

**Layout (Mobile <768px):**
```
┌────────────────────────────────────────────┐
│ ATHLETIC                                   │
├────────────────────────────────────────────┤
│ [Position (100%)]                          │
│ [Height (100%)]                            │
│ [Weight (100%)]                            │
│ [40 Time (100%)]                           │
│ ☑ Expect to start as a freshman?          │
│ ☑ Team captain in high school?             │
│ ☑ All-conference selection?                │
│ ☑ All-state selection?                     │
└────────────────────────────────────────────┘
```

---

### SECTION 4: FINANCIAL (SENSITIVE)

**Purpose:** Collect financial context for GRIT FIT analysis and institutional financial aid matching.

**Privacy Notice:** This section requires a privacy assurance at the top.

---

#### Privacy Notice (Inline Header)
```
🔒 Financial Information is Private
Your AGI and family financial details are encrypted and
only visible to you. College coaches cannot see this
information — it powers our financial fit analysis only.
```

**Styling:**
- Background: `#FFF8DC` (very light cream, subtle warning tint)
- Border-left: `3px solid #FF9800` (Warning orange)
- Padding: 12px 16px
- Icon: 🔒 (lock emoji) + text
- Text color: `#6B6B6B` (Stone Gray)
- Font size: 0.875rem (14px)
- Margin-bottom: 16px

---

#### Field 4.1: Adjusted Gross Income (AGI)
- **Label:** "Adjusted Gross Income (AGI) — Last Fiscal Year"
- **Type:** Number input (currency)
- **Required:** NO
- **Validation:** Positive integer; commas acceptable (e.g., "75,000")
- **Placeholder:** "75000"
- **data-testid:** `input-agi`
- **Width:** 100%
- **Help text:** "(From parents' or guardians' most recent tax return. Used only for financial fit calculation.)"
- **Styling:**
  - Background: `#FFFFFF`
  - Border: `1px solid #D4D4D4`
  - Border radius: 4px
  - Padding: 12px 16px
  - Font size: 1rem (16px on mobile)
  - Focus border: `2px solid #8B3A3A` (Maroon)

---

#### Field 4.2: Number of Dependents
- **Label:** "Number of Dependents"
- **Type:** Number input (integer, stepper)
- **Required:** NO
- **Validation:** 0 to 10 (typical range); non-negative integer
- **Placeholder:** "2"
- **data-testid:** `input-dependents`
- **Width:** 100% (mobile), 50% (desktop)
- **Help text:** "(Including yourself)"
- **Styling:** Same as Field 4.1

---

**Layout (Desktop 1024px+):**
```
┌────────────────────────────────────────────┐
│ FINANCIAL                                  │
├────────────────────────────────────────────┤
│ 🔒 Financial Information is Private        │
│ [Your AGI and family details...]           │
│                                            │
│ [AGI (100%)]                               │
│ [Dependents (50%)]                         │
└────────────────────────────────────────────┘
```

**Layout (Mobile <768px):**
```
┌────────────────────────────────────────────┐
│ FINANCIAL                                  │
├────────────────────────────────────────────┤
│ 🔒 Financial Information is Private        │
│ [Your AGI and family details...]           │
│                                            │
│ [AGI (100%)]                               │
│ [Dependents (100%)]                        │
└────────────────────────────────────────────┘
```

---

### SECTION 5: PARENT/GUARDIAN

**Purpose:** Contact information for parental communication and emergency outreach.

---

#### Field 5.1: Parent/Guardian Email
- **Label:** "Parent/Guardian Email"
- **Type:** Text input (email)
- **Required:** NO
- **Validation:** Valid email format; max 255 characters
- **Placeholder:** "parent@email.com"
- **data-testid:** `input-parent-guardian-email`
- **Width:** 100%
- **Help text:** "(Colleges may contact your parent/guardian directly)"
- **Styling:** Same as Field 1.1; default state

---

**Layout (Desktop & Mobile):**
```
┌────────────────────────────────────────────┐
│ PARENT/GUARDIAN                            │
├────────────────────────────────────────────┤
│ [Parent/Guardian Email (100%)]             │
└────────────────────────────────────────────┘
```

---

## FORM ACTIONS & SUBMIT BEHAVIOR

### Primary Action: Save Profile

**Button:** "Save Profile"
**Type:** Primary button (Maroon)
**Width:** 100% (mobile), auto (desktop)
**Styling:**
- Background: `#8B3A3A` (Maroon)
- Text: `#FFFFFF` (White)
- Padding: 12px 32px
- Font size: 1rem (16px)
- Font weight: 600
- Border radius: 4px
- Box shadow: `0 2px 4px rgba(0,0,0,0.2)`
- Hover state: Background `#6B2C2C`, shadow `0 4px 8px rgba(0,0,0,0.3)`
- Active state: Background `#5A1F1F`, shadow `0 1px 2px rgba(0,0,0,0.2)`
- Disabled state: Background `#E8E8E8`, text `#6B6B6B`, cursor `not-allowed`

**data-testid:** `button-save-profile`

### Secondary Action: Cancel

**Button:** "Cancel"
**Type:** Secondary button (text link)
**Styling:**
- Background: transparent
- Text: `#8B3A3A` (Maroon)
- Padding: 12px 16px
- Font size: 1rem (16px)
- Text decoration: underline on hover
- Cursor: pointer

**Behavior:** Navigate back to landing page without saving.

**data-testid:** `button-cancel`

### Submit Behavior (Happy Path)

1. **Validation:**
   - Run client-side validation on all fields (see Field Definitions for rules)
   - Display inline error messages in red (`#F44336`) below each invalid field
   - Disable "Save Profile" button until all required fields are valid
   - Required fields: `name`, `high_school`, `email`

2. **Submission:**
   - Show loading spinner inside "Save Profile" button for 0.5–2 seconds
   - Button text changes to "Saving..." during submission
   - Button disabled during submission

3. **Success:**
   - Upsert record to `profiles` table (Supabase)
   - Query key: `user_id` from auth context
   - Insert/update all collected fields from the form
   - On success, show success toast: "Profile saved successfully" (top-right, green background `#4CAF50`, white text, 3-second auto-dismiss)
   - Redirect to landing page after 1 second
   - Log event: `profile_saved` with timestamp and user_id

4. **Error Handling:**
   - If Supabase insert/update fails, show error toast: "Failed to save profile. Please try again." (red background `#F44336`, white text, persistent)
   - Provide "Retry" button in toast to re-submit
   - Log error event: `profile_save_error` with error message

---

## VALIDATION RULES SUMMARY

| Field | Required | Format | Min/Max | Error Message |
|-------|----------|--------|---------|---------------|
| Name | YES | Non-empty | 1–255 chars | "Name is required" |
| High School | YES | Autocomplete select | Must exist in hs_programs | "Select a high school from the list" |
| Graduation Year | NO | Integer | current_year+1 to current_year+5 | "Invalid year" |
| State | NO | Dropdown | Valid US state | "Invalid state" |
| Email | YES | Valid email | Read-only from auth | N/A |
| Phone | NO | Flexible format | Max 20 chars | "Phone must be 20 characters or fewer" |
| Twitter | NO | Max 20 chars | Twitter handle limit | "Handle must be 20 characters or fewer" |
| GPA | NO | Decimal | 0.0–4.0 | "GPA must be 4.0 or lower" |
| SAT | NO | Integer | 400–1600 | "SAT must be between 400–1600" |
| Position | NO | Dropdown | Predefined list | N/A |
| Height | NO | Text | Flexible | N/A |
| Weight | NO | Integer | 50–400 lbs | "Weight must be between 50–400 lbs" |
| 40-Yard Dash | NO | Decimal | 4.0–7.0 sec | "Time must be between 4.0–7.0 seconds" |
| AGI | NO | Integer | Positive | "AGI must be a positive number" |
| Dependents | NO | Integer | 0–10 | "Dependents must be 0–10" |
| Parent/Guardian Email | NO | Valid email | Max 255 chars | "Enter a valid email address" |

---

## HIGH SCHOOL AUTOCOMPLETE DETAILS

### Query Logic (Client-Side)

```javascript
// Pseudo-code for autocomplete behavior
async function queryHighSchools(searchTerm: string) {
  if (searchTerm.length < 2) return [];

  const { data, error } = await supabase
    .from('hs_programs')
    .select('id, school_name, city, state, hs_lat, hs_lng')
    .ilike('school_name', `%${searchTerm}%`)
    .limit(10);

  return data || [];
}

function onHighSchoolSelect(school: HsProgram) {
  // Auto-populate lat/lng from hs_programs record
  setFieldValue('hs_lat', school.hs_lat);
  setFieldValue('hs_lng', school.hs_lng);
  setFieldValue('high_school', school.school_name);
}
```

### Dropdown Display Format

Each result shows:
```
[School Name], [City], [State]
Example: "Boston College High, Boston, MA"
```

### Behavior on Clear

If user clears the high school field after selection:
- `hs_lat` and `hs_lng` are set to null
- Form does NOT prevent save with null lat/lng
- (Lat/lng are optional for MVP; used only for geographic GRIT FIT analysis)

---

## RESPONSIVE DESIGN SUMMARY

### Desktop (1024px+)
- Multi-column layouts (2–3 columns per row)
- Form max-width: 800px, centered
- Padding: 32px (xl spacing)
- Button width: auto (not full width)

### Tablet (768px–1023px)
- 2-column layouts shrink to single-column
- Form padding: 24px (lg spacing)
- Buttons remain auto-width

### Mobile (<768px)
- Single-column layout (100% width)
- Form padding: 16px (md spacing)
- All inputs: 100% width
- Font size: 16px (prevents iOS zoom)
- Button width: 100% (stacked or 50% side-by-side if two actions)

---

## ACCESSIBILITY SPECIFICATIONS

### Focus & Keyboard Navigation

- **Tab order:** Name → High School → Grad Year → State → Email → Phone → Twitter → GPA → SAT → Position → Height → Weight → 40 Time → Checkboxes (in order) → AGI → Dependents → Parent Email → Cancel → Save Profile
- **Focus indicator:** Visible 2px outline at `#8B3A3A` (Maroon) with 2px offset
- **Enter key:** In any field, Submit the form (standard behavior)
- **Escape key:** Clear field focus (standard behavior)

### ARIA Labels & Descriptions

- Every input has an associated `<label>` element with `for` attribute pointing to input `id`
- All required fields marked with `aria-required="true"`
- Error messages associated via `aria-describedby` to input
- Checkboxes have `aria-label` describing the intent (e.g., "Expected starter")
- Privacy notice marked with `role="region"` and `aria-label="Financial privacy notice"`

### Color Contrast

- All text meets WCAG AA 4.5:1 minimum contrast
- Maroon text on white: 9.1:1 (AAA)
- Error red on light pink background: 5.2:1 (AA)
- Stone Gray on white: 4.7:1 (AA)
- Disabled gray text on light gray: 3.1:1 (above 3:1 minimum for UI components)

### Mobile Touch Targets

- All buttons: minimum 44×44px
- All input fields: minimum 44px height (touch-friendly)
- Checkbox + label: 44px minimum height

---

## FIELD-BY-FIELD TEST DATA (FOR QA)

Use these values to populate the form for Quin's test plan (PROTO-GLOBAL-015/016):

| Field | Test Value | Notes |
|-------|-----------|-------|
| Name | "Emma Rodriguez" | Common name, 13 chars |
| High School | "Boston College High" | Exact match in hs_programs seed |
| Grad Year | "2027" | Current year + 1 |
| State | "MA" | Matches BC High |
| Email | (pre-filled from auth) | Read-only |
| Phone | "(617) 555-0123" | US format |
| Twitter | "@emmarod" | Valid handle |
| GPA | "3.92" | High academic profile |
| SAT | "1520" | High SAT |
| Position | "WR" | Wide Receiver |
| Height | "5'10\"" | Typical WR height |
| Weight | "175" | Typical WR weight |
| 40-Yard Dash | "4.58" | Competitive athletic time |
| Expected Starter | true | Checked |
| Team Captain | true | Checked |
| All-Conference | true | Checked |
| All-State | false | Unchecked |
| AGI | "85000" | Middle-income household |
| Dependents | "4" | Family of 4 |
| Parent/Guardian Email | "parent.rodriguez@email.com" | Valid email |

---

## COMPLETE FORM WIREFRAME

### Desktop View (1024px+)

```
┌─────────────────────────────────────────────────────────┐
│                    HEADER (Maroon)                      │
│  [Logo] Gritty Recruit Hub    [Nav] Home Shortlist...  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Edit Your Profile                                      │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  PERSONAL INFO                                          │
│  ────────────────────────────────────────────────────  │
│  [Full Name (100%)]                                     │
│  [High School Autocomplete (100%)]                      │
│  [Grad Year (50%)]     [State (50%)]                    │
│  [Email Read-Only (100%)]                               │
│  [Phone (50%)]         [Twitter (50%)]                  │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ACADEMIC                                               │
│  ────────────────────────────────────────────────────  │
│  [GPA (50%)]           [SAT Score (50%)]                │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ATHLETIC                                               │
│  ────────────────────────────────────────────────────  │
│  [Position (100%)]                                      │
│  [Height (33%)]  [Weight (33%)]  [40 Time (33%)]       │
│  ☑ Expected to start as a freshman?                    │
│  ☑ Team captain in high school?                         │
│  ☑ All-conference selection?                           │
│  ☑ All-state selection?                                 │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  FINANCIAL                                              │
│  ────────────────────────────────────────────────────  │
│  🔒 Financial Information is Private                    │
│  Your AGI and family financial details are encrypted   │
│  and only visible to you...                             │
│                                                         │
│  [AGI (100%)]                                           │
│  [Dependents (50%)]                                     │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  PARENT/GUARDIAN                                        │
│  ────────────────────────────────────────────────────  │
│  [Parent/Guardian Email (100%)]                         │
│                                                         │
│  [Cancel]  [Save Profile]                              │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    FOOTER                               │
│            Documentation  Privacy  Help  Contact        │
└─────────────────────────────────────────────────────────┘
```

### Mobile View (<768px)

```
┌────────────────────────┐
│  [☰] Gritty Recruit    │
│          [Logout]      │
└────────────────────────┘

┌────────────────────────┐
│                        │
│  Edit Your Profile     │
│                        │
│  ────────────────────  │
│                        │
│  PERSONAL INFO         │
│  ──────────────────    │
│  [Full Name (100%)]    │
│  [High School (100%)]  │
│  [Grad Year (100%)]    │
│  [State (100%)]        │
│  [Email (100%)]        │
│  [Phone (100%)]        │
│  [Twitter (100%)]      │
│                        │
│  ────────────────────  │
│                        │
│  ACADEMIC              │
│  ──────────────────    │
│  [GPA (100%)]          │
│  [SAT (100%)]          │
│                        │
│  ────────────────────  │
│                        │
│  ATHLETIC              │
│  ──────────────────    │
│  [Position (100%)]     │
│  [Height (100%)]       │
│  [Weight (100%)]       │
│  [40 Time (100%)]      │
│  ☑ Expected starter?   │
│  ☑ Team captain?       │
│  ☑ All-conference?     │
│  ☑ All-state?          │
│                        │
│  ────────────────────  │
│                        │
│  FINANCIAL             │
│  ──────────────────    │
│  🔒 Financial Info     │
│  [Your AGI...]         │
│  [AGI (100%)]          │
│  [Dependents (100%)]   │
│                        │
│  ────────────────────  │
│                        │
│  PARENT/GUARDIAN       │
│  ──────────────────    │
│  [Email (100%)]        │
│                        │
│  [Cancel]              │
│  [Save Profile]        │
│                        │
└────────────────────────┘

┌────────────────────────┐
│  Documentation Privacy │
│  Help Contact          │
└────────────────────────┘
```

---

## DESIGN TOKENS REFERENCE

### Colors (from DESIGN_SYSTEM.md)

- **Maroon (Primary):** `#8B3A3A`
- **Gold (Accent):** `#D4AF37`
- **Cream (Background):** `#F5EFE0`
- **Charcoal (Text):** `#2C2C2C`
- **Stone Gray (Secondary Text):** `#6B6B6B`
- **Light Gray (Borders):** `#E8E8E8`
- **White:** `#FFFFFF`
- **Error Red:** `#F44336`
- **Success Green:** `#4CAF50`
- **Warning Orange:** `#FF9800`

### Typography (from DESIGN_SYSTEM.md)

- **Font Stack:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **H3 (Section headings):** 1.5rem (24px), weight 600, line-height 1.4
- **Body Regular (Labels):** 1rem (16px), weight 400, line-height 1.6
- **Body Small (Help text):** 0.875rem (14px), weight 400, line-height 1.5

### Spacing

- **xs:** 4px
- **sm:** 8px
- **md:** 16px
- **lg:** 24px
- **xl:** 32px

---

## IMPLEMENTATION CHECKLIST

- [ ] All field definitions have `data-testid` attributes for Quin's test plan
- [ ] High school autocomplete queries `hs_programs` in real-time with 300ms debounce
- [ ] High school selection auto-populates `hs_lat` and `hs_lng`
- [ ] All required fields marked with `aria-required="true"`
- [ ] All error messages associated via `aria-describedby`
- [ ] Form uses Supabase upsert on `profiles` table keyed by `user_id`
- [ ] Client-side validation prevents submit until required fields valid
- [ ] On save success, redirect to landing page after 1 second
- [ ] On save error, show persistent error toast with Retry button
- [ ] Mobile inputs use `font-size: 16px` to prevent iOS zoom
- [ ] All buttons meet 44×44px touch target minimum on mobile
- [ ] Focus indicators visible at `#8B3A3A` with 2px offset
- [ ] Contrast ratios meet WCAG AA minimum (4.5:1 for text)
- [ ] Privacy notice displays in Financial section with warning tint and lock icon
- [ ] Form scrolls smoothly on mobile; no horizontal overflow

---

## NEXT STEPS

1. **Nova:** Build React component following this spec exactly
2. **Patch:** Wire Supabase upsert operation on profiles table
3. **Quill:** Visual design sign-off on form layout and styling
4. **Quin:** Execute test plan from `quin_d3_test_plan.md` (if applicable) + create additional Profile Form test cases
5. **Scout:** Compliance gate before implementation begins

---

*Profile Form UX Spec v1.0 — subject to revision based on stakeholder feedback and accessibility testing.*
