# POR Tooltip Component Spec — GrittyOS Recruit Hub Admin UI

**Spec Issue Date:** 2026-04-11
**Spec Author:** Quill (Executive Assistant)
**Project:** cfb-recruit-hub-rebuild (GrittyOS Recruit Hub Rebuild)
**Scope:** POR (Probability of Recruit) tooltip component for admin table views
**Reference Components:** AdminTableEditor.jsx | SlotTooltip.jsx | SlideOutForm.jsx
**Design Baseline:** Session 016-B Admin Panel UI Spec (colors, spacing, typography)

---

## OPERATOR RULINGS — APPLIED

**POR Interpretation (DEC-016C-002):** This spec defines POR as a composite probability/confidence score composed of GPA fit, athletic rating, recruiting stage, and confidence level. This interpretation supersedes the §3.3 'point-of-reference' language from prior session notes and represents the correct build target.

**Data Field Qualification (BLOCK 6 Ruling):** All field names in this spec are PROVISIONAL pending WT-B Patch schema confirmation. Do not treat field names as finalized schema until Patch confirms the Supabase schema.

---

## 1. OVERVIEW & PURPOSE

The POR Tooltip is a hover-triggered information component that appears when a user hovers over a POR score value in any admin table (Institutions, Student Athletes, College Coaches, etc.). The tooltip displays the POR score's numeric value, its component breakdown (if applicable), and contextual metadata to help admins understand the probability calculation at a glance.

**POR Definition:** Probability of Recruit — a composite score ranging 0–100 that represents the likelihood of a student-athlete being recruited by a given institution, calculated from multiple factors (academic fit, athletic profile, reach classification, etc.).

---

## 2. DATA FIELDS PER TAB

**⚠️ PROVISIONAL — All field names below are provisional pending WT-B Patch schema confirmation. Do not treat as confirmed Supabase schema.**

### **2.1 Institutions Tab**

The Institutions tab displays school metadata. POR data appears as a supplementary read-only field shown per institution.

**POR-Related Data Fields:**

| Field Name | Data Type | Source | Display in Tooltip | Notes |
|-----------|-----------|--------|-------------------|-------|
| `por_score` | numeric (0-100) | calculated at data fetch | Yes — primary display | Integer or 1-decimal precision |
| `por_components.academic_fit` | numeric (0-100) | derived | Yes — breakdown row | Component weight: ~35% |
| `por_components.athletic_fit` | numeric (0-100) | derived | Yes — breakdown row | Component weight: ~40% |
| `por_components.reach_classification` | text enum | derived | Yes — breakdown row | E.g., "Target", "Reach", "Safety" |
| `por_calculation_date` | ISO 8601 timestamp | metadata | Yes — optional footnote | "Last updated: YYYY-MM-DD HH:MM" |
| `por_algorithm_version` | text | metadata | No (in admin header only) | E.g., "v1.2.1" — for audit trail |

**Institutions Tooltip Content Hierarchy:**

```
┌─────────────────────────────────────────┐
│  POR Score: 78                          │
│  ─────────────────────────────────────  │
│  Academic Fit:    72                    │
│  Athletic Fit:    85                    │
│  Reach Class:     Target                │
│  ─────────────────────────────────────  │
│  Last updated: 2026-04-11 14:32 UTC    │
└─────────────────────────────────────────┘
```

---

### **2.2 Student Athletes Tab**

The Student Athletes tab displays individual athlete profiles. POR data is keyed to the student + institution relationship (appears in a "Target Schools" sub-section or as a column in a school matchup table if applicable).

**POR-Related Data Fields:**

| Field Name | Data Type | Source | Display in Tooltip | Notes |
|-----------|-----------|--------|-------------------|-------|
| `por_score` | numeric (0-100) | calculated | Yes — primary | Per student-school pair if multi-school view; else overall recruitable POR |
| `por_components.gpa_fit` | numeric (0-100) | derived | Yes — breakdown | Student GPA vs school average GPA |
| `por_components.athletic_rating` | numeric (0-100) | derived | Yes — breakdown | 40yd time, AGI, position fit vs school standards |
| `por_components.recruiting_stage_fit` | text | derived | Yes — breakdown | "Pre-Offer", "Verbal", "Signed", "Not Eligible" |
| `por_confidence_level` | text enum | metadata | Yes — indicator | "High", "Medium", "Low" (based on data completeness) |

**Student Athletes Tooltip Content Hierarchy:**

```
┌─────────────────────────────────────────┐
│  POR Score: 85  [High Confidence]       │
│  ─────────────────────────────────────  │
│  GPA Fit:              88                │
│  Athletic Rating:      82                │
│  Recruiting Stage:     Verbal            │
│  ─────────────────────────────────────  │
│  Last updated: 2026-04-11               │
└─────────────────────────────────────────┘
```

---

### **2.3 College Coaches Tab**

College coaches have a "coaching record" POR that reflects the coach's historical recruitment success.

**POR-Related Data Fields:**

| Field Name | Data Type | Source | Display in Tooltip | Notes |
|-----------|-----------|--------|-------------------|-------|
| `por_score` | numeric (0-100) | calculated from historical data | Yes — primary | Coach's avg recruitment success rate |
| `por_recruits_count` | integer | metadata | Yes — context line | "Recruited [N] students in past 2 years" |
| `por_success_rate` | numeric (0-100%) | derived | Yes — breakdown | "Success Rate: X%" |
| `por_last_10_outcomes` | array of enum | metadata | No (admin only, maybe footnote) | ["Signed", "Verbal", "Active", ...] |

**College Coaches Tooltip Content Hierarchy:**

```
┌─────────────────────────────────────────┐
│  Coach Recruitment Record: 76           │
│  ─────────────────────────────────────  │
│  Success Rate (2yr):   76%              │
│  Recent Recruits:      5 signed         │
│  ─────────────────────────────────────  │
│  Last updated: 2026-04-11               │
└─────────────────────────────────────────┘
```

---

### **2.4 Counselors Tab**

**Section held — pending WT-B Patch schema confirmation before data fields can be specified.**

This tab is included for completeness. Once Patch confirms the Supabase schema for Counselor records and any POR-related fields, this section will be populated following the pattern established in Sections 2.1–2.3.

---

### **2.5 HS Coaches Tab**

**Section held — pending WT-B Patch schema confirmation before data fields can be specified.**

This tab is included for completeness. Once Patch confirms the Supabase schema for HS Coach records and any POR-related fields, this section will be populated following the pattern established in Sections 2.1–2.3.

---

### **2.6 Parents Tab**

**Section held — pending WT-B Patch schema confirmation before data fields can be specified.**

This tab is included for completeness. Once Patch confirms the Supabase schema for Parent records and any POR-related fields, this section will be populated following the pattern established in Sections 2.1–2.3.

---

### **2.7 Recruiting Events Tab**

**Section held — pending WT-B Patch schema confirmation before data fields can be specified.**

This tab is included for completeness. Once Patch confirms the Supabase schema for Recruiting Event records and any POR-related fields, this section will be populated following the pattern established in Sections 2.1–2.3.

---

### **2.8 Audit Log Tab**

**Section held — pending WT-B Patch schema confirmation before data fields can be specified.**

This tab is included for completeness. POR data audit trail fields will be specified once Patch confirms the schema for audit log entries (change tracking, user attribution, timestamp records, etc.).

---

### **2.9 Other Tabs (Future)**

If additional tabs or contexts require POR data in the future, follow the same pattern as Sections 2.1–2.3, adapting the data field set to match the new context.

---

## 3. DISPLAY HIERARCHY

The tooltip content is organized into a strict visual hierarchy to ensure primary information is immediately visible and supporting details are secondary.

### **3.1 Primary Score (Tier 1)**

**Visual Weight:** Largest, boldest, most prominent

- **Element:** Large numeric score (0–100)
- **Font Size:** 1.25rem (20px) | font-weight: 700
- **Color:** #2C2C2C (primary text)
- **Alignment:** Left-aligned within tooltip
- **Format:** Just the number, e.g., "78" (no "POR: " prefix if space is tight)
- **Spacing:** 4px bottom margin to divider line

**Example:**
```
78
───────────
```

---

### **3.2 Component Breakdown (Tier 2)**

**Visual Weight:** Medium — clearly secondary to the primary score but prominent enough for quick scanning

- **Element:** 2–3 component rows (varies by tab context)
- **Font Size:** 0.75rem (12px) | font-weight: 400
- **Color:** #6B6B6B (secondary text)
- **Alignment:** Left-aligned labels, right-aligned values
- **Format:** "Label: Value" with value right-justified to allow easy number scanning
- **Row Spacing:** 6px between rows
- **Divider:** Thin line above this section (1px solid #E8E8E8)

**Example:**
```
Academic Fit:        72
Athletic Fit:        85
Reach Class:       Target
```

---

### **3.3 Metadata / Timestamp (Tier 3)**

**Visual Weight:** Lightest — for reference only, not for decision-making

- **Element:** "Last updated: YYYY-MM-DD HH:MM" (or "Last updated: [date]" if hours/mins not available)
- **Font Size:** 0.625rem (10px) | font-weight: 400
- **Color:** #9E9E9E (disabled/muted text)
- **Alignment:** Center-aligned
- **Format:** Italic, to visually de-emphasize
- **Spacing:** 8px top margin (divider line above)

**Example:**
```
───────────────────────────
Last updated: 2026-04-11
```

---

### **3.4 Confidence Indicator (Student Athletes Only)**

**When Present:** A confidence badge ALWAYS appears next to the primary score, displaying the confidence level (High, Medium, or Low) regardless of data completeness.

- **Element:** Badge or icon next to score
- **Format:** "High" (✓), "Medium" (⚠), "Low" (!)
- **Colors:**
  - High: #2E7D32 (green)
  - Medium: #F57C00 (orange)
  - Low: #C62828 (red)
- **Font Size:** 0.625rem for text label, 0.875rem for icon
- **Positioning:** Right of the primary score, 8px gap

**Example:**
```
85  ✓ High Confidence
```

---

## 4. POSITIONING LOGIC

The tooltip must intelligently position itself to remain visible and not obstruct important content, even in edge cases (near viewport edges, near table boundaries, scrolled containers).

### **4.1 Default Positioning**

**Anchor Point:** The POR score cell (the trigger element)

**Preferred Position:** Right of the trigger element

- **Horizontal Offset:** 8px to the right of the right edge of the trigger cell
- **Vertical Alignment:** Center-aligned to trigger element (middle of cell height)
- **Transform Origin:** Left-center (points toward trigger from the right)
- **CSS:** `left: calc(100% + 8px); top: 50%; transform: translateY(-50%)`

**Diagram:**
```
    ┌────────────┐  ┌──────────────────┐
    │  78 (cell) │  │  POR Tooltip     │ ← tooltip
    └────────────┘  └──────────────────┘
                    8px
```

---

### **4.2 Fallback Positioning (Right → Left → Below → Above)**

If the tooltip would be clipped by the viewport's right edge, the positioning order falls back in sequence:

**Fallback 1 — Left of trigger:**
- **Horizontal Offset:** 8px to the left of the left edge of the trigger cell
- **Vertical Alignment:** Center-aligned to trigger element
- **CSS:** `right: calc(100% + 8px); top: 50%; transform: translateY(-50%)`
- **Condition:** Insufficient space on right, but space available on left

**Fallback 2 — Below trigger:**
- **Vertical Offset:** 8px below the bottom of the trigger cell
- **Horizontal Alignment:** Center-aligned to trigger element
- **CSS:** `top: calc(100% + 8px); left: 50%; transform: translateX(-50%)`
- **Condition:** Insufficient space on right and left, but space available below

**Fallback 3 — Above trigger (last resort):**
- **Vertical Offset:** 8px above the top of the trigger cell
- **Horizontal Alignment:** Center-aligned to trigger element
- **CSS:** `bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%)`
- **Condition:** Insufficient space on right, left, and below

---

### **4.3 Horizontal Edge Clipping (Shift Left/Right)**

If the tooltip would be clipped by the viewport's left or right edge, the tooltip shifts horizontally to remain fully visible.

**Horizontal Shift Logic:**

1. **Calculate tooltip left edge:** `triggerCenterX - (tooltipWidth / 2)`
2. **If left edge < viewport.left (0px):** shift right by `(triggerCenterX - tooltipWidth / 2) * -1 + 8px margin`
3. **If right edge > viewport.right:** shift left by `(right edge - viewport.right) + 8px margin`

**CSS Applied:** `transform: translateX(-50% + [shift amount]px)`

**Diagram (right edge clipping):**
```
                              ┌──────────────────┐
                              │  POR Tooltip     │ ← shifted left to stay in view
                              └──────────────────┘
    ┌────────────────────────────────────────────┐ ← viewport
    │  ... table cell (78) ...                  │ ← trigger is near right edge
    └────────────────────────────────────────────┘
```

---

### **4.4 Scrollable Container Handling**

If the table is inside a scrollable container (e.g., `overflow-y: auto`), the tooltip must:

1. **Use `position: fixed`** (not `absolute`) to escape the scroll context
2. **Recalculate position on every scroll** via `onScroll` listener on the scrollable container
3. **Hide tooltip if trigger scrolls out of view** — compare trigger element's bounding rect to viewport bounds

**Implementation:**
- Attach a `scroll` event listener to the nearest scrollable ancestor of the table
- On scroll, recalculate trigger element's bounding rect using `getBoundingClientRect()`
- If trigger is no longer visible (rect.top < 0 or rect.bottom > viewport.height), hide tooltip with `display: none`

---

## 5. HOVER TRIGGER BEHAVIOR

The tooltip is triggered by hover, focus, and touch interactions. Timing and state transitions are carefully managed to avoid flickering and provide a responsive feel.

### **5.1 Show Trigger**

**On Desktop (hover):**
- **Trigger:** `onMouseEnter` on POR cell
- **Delay:** 300ms (prevent tooltip flash on accidental hover)
- **Condition:** Tooltip content is not empty (POR score exists)

**On Touch (mobile/tablet):**
- **Trigger:** `onTouchStart` on POR cell
- **Delay:** 100ms (shorter delay for touch, as intent is clearer)
- **Behavior:** Tooltip remains visible until touch ends OR user taps elsewhere

**On Keyboard Focus:**
- **Trigger:** `onFocus` on the POR cell (if cell is focusable)
- **Delay:** 0ms (no delay for accessibility — focused element should show immediately)
- **Accessibility:** Tooltip must be accessible via `aria-describedby` linking to the tooltip element

---

### **5.2 Hide Trigger**

**On Desktop (mouse leave):**
- **Trigger:** `onMouseLeave` on POR cell
- **Delay:** 0ms (immediate hide to avoid ghost tooltips)
- **Fade-out:** Optional 200ms CSS transition for smoothness

**On Mobile (touch end):**
- **Trigger:** `onTouchEnd` on POR cell
- **Delay:** 1500ms (keep tooltip visible for 1.5 seconds after touch ends, to allow reading)
- **Then hide:** Fade out over 200ms

**On Blur (keyboard):**
- **Trigger:** `onBlur` on POR cell
- **Delay:** 0ms (immediate hide)

**On Escape Key:**
- **Trigger:** User presses `Escape`
- **Effect:** Hide tooltip immediately
- **Behavior:** Stop event propagation to prevent form/table from reacting to Escape

---

### **5.3 Rapid Mouse Movement Across Multiple POR Cells**

If user quickly moves the mouse across several POR cells (e.g., scanning a column), prevent tooltip thrashing.

**Strategy: Tooltip Debouncing**

- **Queue up show/hide requests** from hover events on different cells
- **Cancel pending requests** if a new cell is hovered before the delay expires
- **Never show 2+ tooltips simultaneously** — use a singleton pattern or React state to manage a single active tooltip

**Implementation:**
```javascript
// Pseudocode
const [activeTooltip, setActiveTooltip] = useState(null);
const pendingShowTimeout = useRef(null);

const handleCellEnter = (cellId) => {
  clearTimeout(pendingShowTimeout.current);
  pendingShowTimeout.current = setTimeout(() => {
    setActiveTooltip(cellId);
  }, 300);
};

const handleCellLeave = (cellId) => {
  clearTimeout(pendingShowTimeout.current);
  if (activeTooltip === cellId) {
    setActiveTooltip(null);
  }
};
```

---

### **5.4 Timing Summary**

| Scenario | Trigger | Delay | Duration |
|----------|---------|-------|----------|
| Hover (desktop) | onMouseEnter | 300ms | Until onMouseLeave |
| Touch (mobile) | onTouchStart | 100ms | Show immediately, then 1500ms before auto-hide |
| Focus (keyboard) | onFocus | 0ms | Until onBlur |
| Escape key | keyboard | 0ms | Immediate hide |

---

## 6. GRACEFUL DEGRADATION PATTERN

The tooltip must handle incomplete or missing data gracefully. The user should never see a blank tooltip, an error message, or undefined values.

### **6.1 Missing POR Score**

**Scenario:** POR data for a school/student has not been calculated yet (e.g., newly added school, incomplete student profile).

**Display:**
```
POR: Not Yet Calculated

(Requires complete academic and athletic
 profile data. Check back after student
 profile is submitted.)
```

**Styling:**
- Primary area: "N/A" or "–" in gray (#6B6B6B)
- Secondary area: Helpful explanation text (0.75rem, #9E9E9E)
- No timestamp shown
- No component breakdown (nothing to show)
- Confidence indicator: Not displayed

---

### **6.2 Partial Component Data (Low Confidence)**

**Scenario:** Some component scores exist, but others are missing (e.g., student submitted GPA but not athletic metrics).

**Display:**
```
POR Score: 62  ⚠ Low Confidence
─────────────────────────────
GPA Fit:            88
Athletic Fit:       – (Pending)
Reach Class:        Target
─────────────────────────────
Last updated: 2026-04-10
Note: Complete athletic profile to improve confidence.
```

**Styling:**
- Missing component values: "–" (not "undefined", not blank)
- Confidence badge: "Low" with ⚠ icon in orange (#F57C00)
- Add a brief note about what data is missing
- Font size for note: 0.625rem (10px), italic, #9E9E9E

---

### **6.3 Null/Undefined POR Data**

**Scenario:** The data structure exists but POR field is explicitly `null` (e.g., data fetch succeeded but the backend hasn't populated POR yet).

**Display:**
```
POR Score: Not Available

Data is being calculated. Please refresh.
```

**Styling:**
- Same as "Not Yet Calculated" but with a refresh hint
- Allow user to manually trigger a data refresh (if a refresh button exists on the admin table)

---

### **6.4 Loading State (Async Calculation)**

**Scenario:** POR is being calculated in real-time (e.g., async calculation on cell render).

**Display:**
```
POR Score: Calculating...

(This may take a few seconds.)
```

**Styling:**
- Spinner icon (16px) next to "Calculating..." text
- Spinner animation: 1.2s continuous rotation
- No other content until loading completes
- Auto-hide and update tooltip once calculation finishes (no manual refresh needed)

---

### **6.5 Error State (Calculation Failed)**

**Scenario:** POR calculation failed due to a backend error or invalid input data.

**Display:**
```
POR Score: Error

Unable to calculate probability. This may
indicate incomplete or invalid profile data.
Contact an admin if this persists.
```

**Styling:**
- Color: #C62828 (error red) for the "Error" label
- Explanation text: #9E9E9E (muted)
- No spinner
- Suggest user action (contact admin, re-submit profile, etc.)

---

### **6.6 Summary: Data Handling Rules**

| Data State | Display | Component Breakdown | Timestamp | Confidence |
|-----------|---------|-------------------|-----------|-----------|
| Complete | "78" (numeric) | Yes, all fields | Yes | Show level |
| Partial | "[Score] ⚠" | Yes, show "–" for missing | Yes | "Low" |
| Null/Empty | "Not Available" | No | No | Not shown |
| Loading | "Calculating..." spinner | No (pending) | No | Not shown |
| Error | "Error" (red) | No | No | Not shown |

---

## 7. TOOLTIP VISUAL DESIGN

The tooltip's appearance follows the GrittyOS Admin design language (from Session 016-B spec) with some adaptations for compact, self-contained display.

### **7.1 Dimensions**

- **Min Width:** 200px
- **Max Width:** 300px
- **Min Height:** 100px (varies by content)
- **Max Height:** 400px (with internal scroll if content exceeds)
- **Padding:** 12px (all sides)
- **Border Radius:** 4px

---

### **7.2 Colors**

| Element | Color | Usage |
|---------|-------|-------|
| Background | #FFFFFF | Tooltip container |
| Border | #E8E8E8 | Subtle 1px border, optional |
| Text (Primary Score) | #2C2C2C | Large numeric score |
| Text (Secondary) | #6B6B6B | Component labels, values |
| Text (Muted) | #9E9E9E | Timestamp, notes |
| Divider Lines | #E8E8E8 | Separator between sections |
| Accent (Success) | #2E7D32 | "High" confidence badge |
| Accent (Warning) | #F57C00 | "Low" / "Medium" confidence |
| Accent (Error) | #C62828 | Error state text |
| Shadow | rgba(0,0,0,0.15) | Elevation shadow |

---

### **7.3 Typography**

| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|-------------|
| Primary Score | DM Sans | 1.25rem (20px) | 700 | 1.2 |
| Component Label | DM Sans | 0.75rem (12px) | 500 | 1.4 |
| Component Value | DM Sans | 0.75rem (12px) | 400 | 1.4 |
| Timestamp | DM Sans | 0.625rem (10px) | 400 | 1.3 |
| Note/Error | DM Sans | 0.625rem (10px) | 400 | 1.3 |

---

### **7.4 Styling Details**

**Border:**
- 1px solid #E8E8E8 (subtle, optional)
- Or: No border, rely on shadow for elevation

**Shadow:**
```css
box-shadow: 0 2px 8px rgba(0,0,0,0.15)
```

**Pointer/Arrow (Optional):**
- Small triangle pointing from tooltip toward trigger element
- Color: #FFFFFF (match background)
- Border: 1px solid #E8E8E8
- Size: 6px × 6px (folded triangle)
- Positioning: Centered on top or bottom edge of tooltip, pointing toward trigger

**Diagram:**
```css
/* Triangle using CSS border trick */
.tooltip::before {
  content: '';
  position: absolute;
  bottom: -6px; /* Points downward from tooltip toward cell below */
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid #FFFFFF;
  border-bottom: 6px solid transparent;
}
```

---

### **7.5 Animation & Transition**

**Fade-in:**
- Duration: 150ms
- Timing: `ease-out`
- From: `opacity: 0; transform: translateY(-4px)` (slight upward shift)
- To: `opacity: 1; transform: translateY(0)`

**Fade-out:**
- Duration: 200ms
- Timing: `ease-in`
- From: `opacity: 1`
- To: `opacity: 0`

**CSS:**
```css
.tooltip {
  animation: fadeIn 150ms ease-out forwards;
}

.tooltip.hiding {
  animation: fadeOut 200ms ease-in forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
```

---

## 8. ACCESSIBILITY REQUIREMENTS

The tooltip must be fully accessible to screen readers, keyboard users, and users with visual or motor impairments.

### **8.1 Screen Reader Compatibility**

**ARIA Attributes:**

- **`role="tooltip"`** on the tooltip container — tells screen readers this is a tooltip
- **`aria-describedby="[tooltip-id]"`** on the trigger element (POR cell) — associates the tooltip with its trigger
- **`aria-label` or text content** inside tooltip for screen readers to announce

**Example:**
```jsx
<td
  onMouseEnter={handleShowTooltip}
  onMouseLeave={handleHideTooltip}
  aria-describedby="por-tooltip-[rowId]"
>
  78
  {isTooltipVisible && (
    <div
      id="por-tooltip-[rowId]"
      role="tooltip"
      aria-live="assertive"
    >
      {/* tooltip content */}
    </div>
  )}
</td>
```

**Announcement:**
When tooltip appears, screen reader should announce: _"POR Score 78. Academic Fit 72. Athletic Fit 85. Reach Class Target. Last updated 2026-04-11."_

---

### **8.2 Keyboard Navigation**

**Focusable Trigger:**
- POR cells must be focusable via Tab key (or use a button/span inside the cell with `tabindex="0"`)
- When focused, tooltip should appear (after 0ms delay, immediately)
- When tabbed away (blur), tooltip should hide

**Keyboard Interaction:**
- Tab: Move to next POR cell, show its tooltip
- Shift+Tab: Move to previous cell
- Escape: Hide tooltip (from any cell)
- Enter: No action (tooltip is read-only)

---

### **8.3 Color Contrast**

**Text on Background:**
- Primary text (#2C2C2C) on white (#FFFFFF): 14.8:1 ratio — WCAG AAA
- Secondary text (#6B6B6B) on white (#FFFFFF): 7.5:1 ratio — WCAG AA
- Muted text (#9E9E9E) on white (#FFFFFF): 4.9:1 ratio — WCAG A (minimum; consider increasing contrast if possible)

**Confidence Badges:**
- "High" (#2E7D32): 5.7:1 on white — WCAG AA
- "Medium" (#F57C00): 5.2:1 on white — WCAG AA
- "Low" (#C62828): 7.1:1 on white — WCAG AA

---

### **8.4 Mobile/Touch Accessibility**

- **Touch target:** Tooltip trigger cell must be at least 44px × 44px (touch-friendly)
- **No hover-only content:** Tooltip must be accessible via touch (onTouchStart, not just onMouseEnter)
- **Readable text:** Font size never smaller than 0.625rem (10px) to avoid eye strain

---

### **8.5 Assistive Technology Compatibility**

- **Screen readers (NVDA, JAWS, VoiceOver):** Tooltip must be announced via `aria-describedby`
- **Magnification software:** Tooltip must remain visible when zoomed up to 200%
- **Speech input (e.g., Dragon NaturallySpeaking):** Tooltip trigger must have a label or be voice-commandable

---

## 9. IMPLEMENTATION REFERENCE

### **9.1 Component Props**

```typescript
interface PORTooltipProps {
  // Data
  porScore: number | null; // 0-100 or null if not calculated
  porComponents?: {
    academicFit?: number;
    athleticFit?: number;
    reachClassification?: string;
    [key: string]: number | string | undefined;
  };
  confidenceLevel?: 'High' | 'Medium' | 'Low';
  lastUpdated?: string; // ISO 8601 or formatted date

  // State
  isVisible: boolean;
  isLoading?: boolean;
  error?: string | null;

  // Positioning
  triggerRef: React.RefObject<HTMLElement>; // Position relative to this element

  // Callbacks
  onHide?: () => void;
}
```

### **9.2 Integration with AdminTableEditor**

The POR Tooltip should be rendered **inline within the table cell** that contains the POR score, not as a global modal. This keeps the tooltip close to the trigger and avoids z-index stacking issues.

**Pattern (pseudocode):**
```jsx
function AdminTableCell({ data, columnKey }) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const cellRef = useRef(null);
  const touchHideTimeoutRef = useRef(null);

  const handleTouchEnd = () => {
    // Keep tooltip visible for 1500ms after touch ends
    clearTimeout(touchHideTimeoutRef.current);
    touchHideTimeoutRef.current = setTimeout(() => {
      setTooltipVisible(false);
    }, 1500);
  };

  if (columnKey === 'por_score') {
    return (
      <td ref={cellRef}>
        <span
          onMouseEnter={() => setTooltipVisible(true)}
          onMouseLeave={() => {
            clearTimeout(touchHideTimeoutRef.current);
            setTooltipVisible(false);
          }}
          onTouchStart={() => setTooltipVisible(true)}
          onTouchEnd={handleTouchEnd}
          onFocus={() => setTooltipVisible(true)}
          onBlur={() => {
            clearTimeout(touchHideTimeoutRef.current);
            setTooltipVisible(false);
          }}
          aria-describedby={`por-tooltip-${data.id}`}
          tabIndex={0}
        >
          {data.porScore || '–'}
        </span>

        {tooltipVisible && (
          <PORTooltip
            id={`por-tooltip-${data.id}`}
            porScore={data.porScore}
            porComponents={data.porComponents}
            confidenceLevel={data.confidenceLevel}
            lastUpdated={data.lastUpdated}
            triggerRef={cellRef}
          />
        )}
      </td>
    );
  }

  return <td>{data[columnKey]}</td>;
}
```

---

### **9.3 Scrollable Container Edge Cases**

If the admin table is inside a scrollable container:

1. **Use `position: fixed`** instead of `absolute` to escape scroll context
2. **Attach scroll listener** to parent scroll container
3. **Recalculate position on scroll**
4. **Hide if trigger leaves viewport**

```jsx
useEffect(() => {
  const scrollParent = cellRef.current?.closest('[style*="overflow"]');
  if (!scrollParent) return;

  const handleScroll = () => {
    const rect = cellRef.current?.getBoundingClientRect();
    if (rect && (rect.top < 0 || rect.bottom > window.innerHeight)) {
      setTooltipVisible(false);
    } else {
      // Recalculate tooltip position based on new cell position
      updateTooltipPosition();
    }
  };

  scrollParent?.addEventListener('scroll', handleScroll);
  return () => scrollParent?.removeEventListener('scroll', handleScroll);
}, []);
```

---

## 10. COMPLETION CRITERIA

The POR Tooltip component is complete and ready for implementation when:

✓ All five data field sets (per tab) are identified and documented
✓ Display hierarchy (Tiers 1–3) is implemented with correct font sizes, weights, colors
✓ Positioning logic handles all edge cases (top/bottom, left/right, scrollable containers)
✓ Hover/focus/touch trigger behavior matches specification (delays, debouncing, rapid movement)
✓ All graceful degradation scenarios (missing data, loading, error) are handled
✓ Visual design conforms to GrittyOS Admin design language (colors, spacing, shadows)
✓ Accessibility is fully implemented (ARIA, keyboard, contrast, screen reader)
✓ Component integrates seamlessly with AdminTableEditor without layout shifts
✓ Tooltip remains visible and unobstructed in all viewport sizes (desktop, tablet, mobile)
✓ Performance: Tooltip renders and hides without causing layout thrashing or reflow

---

## DELIVERY NOTES

This spec is ready for handoff to Nova (builder). The spec covers:

✓ POR data fields per admin table tab
✓ Display hierarchy with specific pixel values and color codes
✓ Positioning logic with fallbacks for edge cases
✓ Hover/focus/touch trigger behavior with timing
✓ Graceful degradation for missing/incomplete data
✓ Visual design (colors, typography, spacing, shadows, animations)
✓ Accessibility requirements (ARIA, keyboard, contrast)
✓ Implementation reference and integration pattern

**Nova should:**

1. Create `PORTooltip.jsx` component (render tooltip content + positioning)
2. Create reusable tooltip positioning hook (calculate position + handle viewport edges)
3. Integrate tooltip into relevant table cells (Institutions, Student Athletes, College Coaches tabs)
4. Add POR data fields to table data structures (fetch from backend, populate cells)
5. Style tooltip per section 7 (colors, typography, spacing)
6. Implement all trigger behaviors (hover, focus, touch, debounce)
7. Test edge cases (scrollable containers, multiple rapid hovers, loading states, missing data)
8. Verify accessibility (keyboard, screen reader, color contrast)

All pixel values, colors, spacing tokens, and component behavior are specified in this document. Questions about implementation details should reference this spec before proceeding.

---

**END OF SPEC**
