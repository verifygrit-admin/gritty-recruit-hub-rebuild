# UX SPEC: GRIT FIT RESULTS — TABLE VIEW

**Status:** Draft for review
**Date:** 2026-03-24
**Authority:** Quill (UX/UI Design)
**Related Decision:** RB-006 (GRIT FIT list is dynamic, computed)

---

## OVERVIEW

The GRIT FIT Table View displays up to 30 personalized school matches in a sortable, filterable data table. This view complements the Map View, providing a different lens for users who prefer data-driven browsing (ranked by fit, side-by-side comparison) over geographic exploration.

---

## TABLE VIEW LAYOUT

```
┌─────────────────────────────────────────────────────────┐
│                    HEADER (Maroon)                      │
│  [Logo] Gritty Recruit Hub  [Shortlist (3)] [Settings] │
└─────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                                                          │
│  Your 30 GRIT FIT Matches  [⟲ Recalculate] [Map View]   │
│                                                          │
│  Filter: [Conference ▼] [Division ▼] [State ▼]          │
│  [Clear all filters]                                     │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Rank │ School           │ Div  │ Dist  │ Score    │ │
│  │      │ Name             │      │ miles │ / 100    │ │
│  ├──────┼──────────────────┼──────┼───────┼──────────┤ │
│  │ 1.   │ Alabama ⭐       │ P4   │ 450   │ 95%      │ │
│  │      │ SEC | Roll Tide  │      │       │ [+List]  │ │
│  ├──────┼──────────────────┼──────┼───────┼──────────┤ │
│  │ 2.   │ Georgia          │ P4   │ 380   │ 93%      │ │
│  │      │ SEC | Bulldogs   │      │       │ [+List]  │ │
│  ├──────┼──────────────────┼──────┼───────┼──────────┤ │
│  │ 3.   │ Texas            │ P4   │ 920   │ 91%      │ │
│  │      │ Big 12 | Longhorn│      │       │ [+List]  │ │
│  │ ...  │ ...              │ ...  │ ...   │ ...      │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  Rows: [10 ▼] | Showing 1 to 10 of 30 results           │
│  [‹ Previous] [1] [2] [3] [Next ›]                      │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│                    FOOTER                              │
│            Documentation  Privacy  Help  Contact       │
└────────────────────────────────────────────────────────┘
```

---

## TABLE SPECIFICATIONS

### Column Definitions

| Column | Header | Data Source | Format | Sortable | Width |
|---|---|---|---|---|---|
| **Rank** | Rank | Match score ranking | 1, 2, 3... | Yes (default asc) | 60px |
| **School** | School Name | `schools.school_name` | Bold, Maroon; sub-text: conference + nickname | Yes (alpha) | 250px |
| **Division** | Div | `schools.div` (mapped to Power 4, G5, FCS, etc.) | Abbreviated (P4, G5, FCS, D2, D3, FBS Ind) | Yes | 80px |
| **Distance** | Distance | `schools.dist` | Numeric miles, e.g., "450 mi" | Yes (numeric) | 80px |
| **Match Score** | Score | GRIT FIT algorithm output | Percentage 0–100%, e.g., "95%" | Yes (numeric desc) | 90px |
| **Cost** | Net Cost | `schools.net_cost` | Currency, e.g., "$28,500" | Yes (numeric) | 100px |
| **Action** | — | — | Button: "+ Add to Shortlist" or "✓ In List" | No | 120px |

### Row Structure

**Primary Row (Main Data):**
- School name (bold, 1rem, Maroon)
- Conference + nickname (smaller text, 0.875rem, Stone Gray)
- All columns from table above displayed left-to-right
- Row height: 64px (to accommodate two lines of text in School column)

**Expandable Detail Row (Optional):**
- Icon: [▾] to expand, [▸] when collapsed
- On expand, shows additional fields below the row (not shown in mockup):
  - Academic Rigor Score, EFC Tier, Athletic Tier Match, DROI, Grad Rate
  - Full recruiting questionnaire link
  - School logo or icon
- Animation: 200ms slide-down

### Column Sorting

**Clickable Headers:**
Each column header is clickable and acts as a sort toggle.

**Sort Indicators:**
- **Unsorted:** Plain text (Body Small, Charcoal)
- **Ascending:** Upward arrow (↑) appears after header text (Gold color)
- **Descending:** Downward arrow (↓) appears after header text (Gold color)

**Default Sort:**
- **Primary:** Rank (ascending, 1–30)
- **User action:** Click any header to re-sort

**Sort Logic:**
- **Rank:** Numeric ascending (default)
- **School:** Alphabetic (A–Z)
- **Division:** Custom order (P4 > G5 > FCS > FBS Ind > D2 > D3)
- **Distance:** Numeric ascending (closest first)
- **Score:** Numeric descending (highest match first)
- **Cost:** Numeric ascending (lowest cost first)

### Row Styling

| State | Background | Text | Border | Shadow |
|---|---|---|---|---|
| **Default** | `#FFFFFF` (white) | Charcoal, Stone Gray sub-text | Bottom border `1px solid #E8E8E8` | None |
| **Hover** | `#F5EFE0` (cream) | Charcoal, Stone Gray | Bottom border `1px solid #D4AF37` (gold) | `0 1px 4px rgba(0,0,0,0.08)` |
| **Selected/Expanded** | `#FFF9F0` (light cream) | Charcoal, Stone Gray | Bottom & top borders `2px solid #D4AF37` | `0 2px 6px rgba(0,0,0,0.1)` |

### Pagination & Row Display

**Rows Per Page Dropdown (Bottom Left):**
- Options: 10, 25, 50 schools per page
- Default: 10 rows per page
- Label: "Rows: [10 ▼]"

**Pagination Info (Center):**
- **Text:** "Showing [X] to [Y] of 30 results"
- **Example:** "Showing 1 to 10 of 30 results"

**Pagination Controls (Bottom Right):**
- **Buttons:** [‹ Previous] [1] [2] [3] [Next ›]
- **Active page:** Numbered button background is Maroon, text white
- **Inactive buttons:** Outlined, Maroon border, gray text
- **Disabled state (on first/last page):** Previous/Next buttons grayed out
- **Spacing:** 4px between page numbers

---

## FILTER CONTROLS

### Filter Bar (Above Table)

A horizontal filter toolbar with dropdowns and clear action:

```
Filter: [Conference ▼] [Division ▼] [State ▼]  [Clear all filters]
```

**Individual Dropdowns:**

1. **Conference Filter**
   - **Options:** All unique conferences in the 30 results (auto-populated)
   - **Example:** ACC, SEC, Big Ten, Big 12, Pac-12, G5 (Group of 5), FCS, D2, D3
   - **Multi-select or single-select?** Single-select for MVP (Chris to confirm)
   - **Default:** "All Conferences" (no filter)
   - **On select:** Table updates immediately, pagination resets to page 1
   - **Selected value display:** Dropdown shows selected conference name

2. **Division Filter**
   - **Options:** Power 4, G5, FCS, FBS Independent, D2, D3
   - **Default:** "All Divisions"
   - **Behavior:** Same as Conference

3. **State Filter**
   - **Options:** All unique states in the 30 results (auto-populated)
   - **Default:** "All States"
   - **Behavior:** Same as Conference

**Clear Action:**
- **Link:** "[Clear all filters]" (text link, Maroon, underline on hover)
- **Visibility:** Only shows if at least one filter is active
- **On click:** Resets all dropdowns to "All [X]", table reverts to full 30 results, re-sorts by default (Rank asc)

**Styling:**
- **Dropdowns:** Same as in Map View spec (Body Regular, 1rem, 12px padding, rounded 4px border)
- **Spacing:** 8px between dropdowns, 16px gap before "Clear all"
- **Mobile (< 768px):** Stack vertically (filter on top row, clear link below)

---

## ACTION BUTTON SPECIFICATIONS

### "Add to Shortlist" Column

**Per-row button:**
- **Default state:** "+ Add to Shortlist" (Secondary button, Gold outline, Maroon text)
- **Clicked state:** "✓ In List" (disabled, gray background, gray text)
- **Hover state:** Gold background, Maroon text, slight shadow

**Behavior:**
- On click: Insert into `short_list_items` with `source: 'grit_fit'` and `grit_fit_status: 'currently_recommended'`
- Show spinner briefly (0.3s)
- Button becomes disabled after click
- Toast notification: "Added [School Name] to your shortlist"
- Shortlist count in header increments (if visible)

**Size:** 120px wide, 36px tall, rounded 4px button

---

## RESPONSIVE DESIGN

### Desktop (1024px+)
- **Table width:** 100% (up to 1200px max container width)
- **All columns visible:** Rank, School, Division, Distance, Score, Cost, Action
- **Row height:** 64px
- **Font sizes:** As specified in column table above

### Tablet (768px–1023px)
- **Table width:** 100%
- **Column adjustments:**
  - School column width reduced (text may wrap)
  - Cost column may be hidden or collapsed
  - Division column abbreviations used (P4, G5, etc.)
- **Font sizes:** Body Regular reduced to 0.9375rem (15px)
- **Row height:** 56px
- **Pagination:** Stack vertically (info on top, controls below)

### Mobile (< 768px)
- **Table collapses to card layout** (not a traditional table)
- **Each school displayed as a card:**
  ```
  ┌──────────────────────────┐
  │ Rank 1. Alabama          │
  │ SEC | Roll Tide (P4)     │
  │                          │
  │ Distance: 450 mi         │
  │ Match Score: 95%         │
  │ Net Cost: $28,500        │
  │                          │
  │ [+ Add to Shortlist]     │
  └──────────────────────────┘
  ```
- **Card specs:**
  - Background: White
  - Border: `1px solid #E8E8E8`
  - Padding: 16px (md)
  - Margin: 8px
  - Border-radius: 8px
  - Shadow: `0 1px 4px rgba(0,0,0,0.1)`
- **School name (H3):** 1.125rem, Maroon, bold
- **Conference/division (Body Small):** Stone Gray
- **Stats:** Body Regular, formatted as "Distance: 450 mi", one per line
- **Button:** Full width, "+ Add to Shortlist"
- **Pagination:** Simple [‹ Previous] [Next ›] buttons at bottom, page number between

### Extra Small (< 480px)
- **Card width:** 100vw minus 16px padding (very tight)
- **Font sizes:** Reduced by 1–2px where possible
- **Button:** Full-width "+ Add to Shortlist", 44px tall (touch target)

---

## INTERACTION SPECIFICATIONS

### Sort Interaction

**User clicks column header:**
1. If column is currently unsorted → Sort ascending (show ↑ arrow)
2. If column is sorted ascending → Sort descending (show ↓ arrow)
3. If column is sorted descending → Remove sort, return to default (Rank asc)

**Animation:** Table rows reorder smoothly with subtle fade-in/fade-out (100ms)

### Filter Interaction

**User selects from dropdown:**
1. Dropdown closes immediately
2. Table filters to matching rows
3. If no matches: Show "No results match your filters" message
4. Pagination resets to page 1
5. Table height may shrink/grow (animate height change over 200ms)

### Expand Detail Row (Optional)

**User clicks [▾] icon on a row:**
1. Icon rotates to [▸]
2. Additional detail row slides down below the main row (200ms animation)
3. Detail row shows: Academic Rigor, EFC Tier, DROI, Grad Rate, full RQ link
4. Row background color shifts to light cream
5. Clicking [▸] again collapses the detail row

---

## ACCESSIBILITY NOTES

- **Screen readers:**
  - Table caption: "Your 30 GRIT FIT matches, sorted by rank"
  - Column headers are `<th>` elements with scope="col"
  - Each row has aria-label: "School: [name], Rank [X], Distance [Y] miles, Score [Z]%"
- **Keyboard navigation:**
  - Tab through column headers (each is focusable)
  - Enter to sort column
  - Tab through buttons (Add to Shortlist, Previous/Next pagination)
  - Escape to close any expanded row
- **Color contrast:**
  - All text on rows meets 4.5:1 minimum
  - Header text (Charcoal on white) = 8.3:1 (AAA)
  - Sorted column arrow (Gold) on white = 4.8:1 (AA)
- **Focus indicators:** 2px Maroon outline on focused elements (headers, buttons)

---

## DATA LOADING & STATES

### Initial Load
- Table shows spinner across entire table area (0.5–2s while GRIT FIT calculates)
- Once loaded, 10 rows display, default sort by Rank ascending
- "Showing 1 to 10 of 30 results" text appears
- Pagination controls show pages [1] [2] [3]

### Empty State (No Results)
If all 30 schools have been removed from GRIT FIT (e.g., profile edited drastically):
- Message: "No schools match your updated profile. Edit your profile to recalculate your matches."
- Show Rank, School, Division columns only (simplified table)
- Pagination hidden
- "[⟲ Recalculate]" button remains available

### Filter with No Results
If user applies Conference=Power 4 and State=AK, and no Power 4 schools are in AK:
- Message: "No results match your filters. [Clear all filters] to reset."
- Show [Clear all filters] link prominently

---

## IMPLEMENTATION NOTES

**Owner:** Nova (table component integration), Quill (design sign-off)

**Dependencies:**
- [ ] Data table component (or use third-party: TanStack Table, React Table, etc.)
- [ ] Sortable column headers
- [ ] Filterable dropdown menus
- [ ] Pagination component
- [ ] Responsive card layout (mobile)
- [ ] Toast notification component

**Key decisions for Nova:**
1. Should table be built with native HTML `<table>` or div-based layout for responsive flexibility? **Recommendation:** Div-based for easier mobile card transformation
2. Should filtering and sorting be client-side or server-side? **Recommendation:** Client-side for MVP (30 schools is small dataset)
3. Should expand detail row be implemented, or just the basic 7-column table? **Recommendation:** Basic 7-column for MVP, detail expansion as post-MVP enhancement

---

## APPROVAL GATE

This spec requires sign-off from:
- [ ] Quill (design consistency, responsive behavior, column choices)
- [ ] Nova (table component architecture and feasibility)
- [ ] Chris (product confirmation of filter and sort approach)

Once signed off, Nova proceeds to implementation.

---

*Table View Spec v1.0 — subject to revision based on stakeholder feedback and usability testing.*
