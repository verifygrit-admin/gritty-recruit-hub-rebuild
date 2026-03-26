# UX SPEC: GRIT FIT RESULTS VIEW — Map + Table (Up to 30 Schools)

**Status:** Draft for review
**Date:** 2026-03-25
**Authority:** Quill (UX/UI Design)
**Related Decisions:** RB-003 (Leaflet integration), RB-006 (GRIT FIT list is dynamic)
**Test Authority:** Quin (QA Agent) — TC-MAP-001, TC-MAP-002, TC-GRIT-001, TC-GRIT-002, TC-SL-001

---

## OVERVIEW

The GRIT FIT Results View is the student's personalized matching center. It displays up to 30 schools that pass all four GRIT FIT algorithm gates, presented in two coordinated views: **Map View** (default, geographic exploration) and **Table View** (ranked list, data-driven comparison). Students toggle freely between views without losing context or filters.

This spec unifies and extends the separate Map and Table specs into a single, cohesive results container with shared state management, consistent design tokens, and explicit test identifiers for automated QA.

---

## DESIGN INTENT

The BC High Eagles logo embodies two qualities: **geographic breadth** (schools across the USA) and **strategic depth** (personalized scoring). The GRIT FIT Results View reflects this duality:

1. **Map View** — Geographic breadth: See all 30 matches on the map, understand the national landscape, click to explore details.
2. **Table View** — Strategic depth: Rank schools by fit score, sort by any column, filter by conference/division/state, compare side-by-side metrics.

The toggle between views is seamless. Filters, sorts, and state persist as the student switches. The design should feel authoritative (Maroon headings, Gold accents) and accessible (clear hierarchy, high contrast, full keyboard support).

---

## PAGE-LEVEL LAYOUT

```
┌─────────────────────────────────────────────────────────┐
│                    HEADER (Maroon)                      │
│  [Logo] Gritty Recruit Hub  [Shortlist (N)] [Settings] │
└─────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                                                          │
│  GRIT FIT RESULTS VIEW                                   │
│  Showing X of 30 schools matched to your profile         │
│                                                          │
│  [View Toggle]                                           │
│  ┌─ MAP VIEW ─┐ ┌─ TABLE VIEW ─┐                        │
│  │   Active   │ │             │                         │
│  └────────────┘ └─────────────┘                         │
│                                                          │
│  [Recalculate Button]  [School Count]  [Result Count]   │
│                                                          │
│  [Filter/Search Controls]                               │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │                                                    │ │
│  │           MAP VIEW or TABLE VIEW                   │ │
│  │           (One or the other, active)              │ │
│  │                                                    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│                    FOOTER                              │
│            Documentation  Privacy  Help  Contact       │
└────────────────────────────────────────────────────────┘
```

---

## COMPONENT 1: VIEW TOGGLE & HEADER

### View Toggle (Top of Content Area)

**Location:** Immediately below breadcrumb or page title
**Layout:** Horizontal toggle pair

```
┌─ MAP VIEW ─┐ ┌─ TABLE VIEW ─┐
│   Active   │ │             │
└────────────┘ └─────────────┘
```

**Specifications:**

| Property | Value |
|---|---|
| **Type** | Segmented toggle control |
| **Options** | 2: Map View, Table View |
| **Default state** | Map View active |
| **Active state** | Background `#8B3A3A` (Maroon), text white |
| **Inactive state** | Background transparent, border `2px solid #8B3A3A`, text Maroon |
| **Font** | Body Regular (1rem), weight 500 |
| **Padding per button** | 12px horizontal, 8px vertical |
| **Border-radius** | 4px |
| **Spacing between buttons** | 0px (no gap, adjacent) |
| **Cursor** | pointer on inactive, default on active |
| **Animation** | Background color transition 150ms ease-in-out |

**Data Test IDs:**
```html
<div data-testid="view-toggle-group">
  <button
    data-testid="view-toggle-map"
    aria-pressed="true"
    aria-label="Map View"
  >
    Map View
  </button>
  <button
    data-testid="view-toggle-table"
    aria-pressed="false"
    aria-label="Table View"
  >
    Table View
  </button>
</div>
```

**Interaction:**
- Click either button to toggle view
- Page does not reload; content switches with 200ms fade transition
- Filters, sorts, and expand states persist when switching

### Page Heading & Context

**Above toggle:**

```
Your [X] GRIT FIT Matches
Showing [Y] of 30 schools matched to your profile
```

**Specifications:**

- **Heading:** H2, Maroon `#8B3A3A`, 2rem/32px, weight 700
- **Subheading:** Body Large `#6B6B6B`, Stone Gray, 1.125rem/18px
- **Spacing:** 8px between heading and subheading, 24px below subheading to toggle

**Data Test ID:**
```html
<div data-testid="grit-fit-results">
  <h2 data-testid="grit-fit-page-title">Your [X] GRIT FIT Matches</h2>
  <p data-testid="grit-fit-result-count">Showing [Y] of 30 schools matched to your profile</p>
</div>
```

---

## COMPONENT 2: ACTION BAR (Above Map/Table)

### Layout (Desktop)

```
┌────────────────────────────────────────────────────────────┐
│ [⟲ Recalculate]  "Showing X of 662 schools (Y matches)"    │
│ [Clear filters]                                            │
│                                                            │
│ [Conference ▼] [Division ▼] [State ▼]                     │
│                                                            │
│ 🔍 [Search by school name or location...]                 │
└────────────────────────────────────────────────────────────┘
```

### Subcomponent 2a: Recalculate Button & School Count

**Recalculate Button:**
- **Type:** Primary button (Secondary style for this context)
- **Text:** "⟲ Recalculate"
- **Background:** `#D4AF37` (Gold)
- **Text color:** `#2C2C2C` (Charcoal)
- **Border:** None
- **Padding:** 12px 24px
- **Font:** Body Regular, weight 500
- **Icon:** Circular reload symbol (12px, left of text)
- **Hover state:** Background `#C9A02B`, shadow increase
- **Click behavior:**
  - Show spinner (0.5–2s)
  - Re-run GRIT FIT algorithm with current profile
  - Update markers/rows with new 30 results
  - Show toast: "Results updated with your latest profile"
  - Preserve active view and filters (if still applicable)

**Data Test ID:**
```html
<button data-testid="recalculate-button">
  ⟲ Recalculate
</button>
```

**School Count Indicator (Static Text):**
- **Text format:** "Showing X of 662 schools (Y GRIT FIT matches)"
- **Color:** Stone Gray `#6B6B6B`
- **Font:** Body Small, 0.875rem
- **Position:** Right side of Recalculate button
- **Update:** Changes when Recalculate completes or filters applied

**Data Test ID:**
```html
<span data-testid="school-count">
  Showing X of 662 schools (Y GRIT FIT matches)
</span>
```

### Subcomponent 2b: Filter Controls

#### Filter Dropdowns (Above or Below Search)

**Three dropdowns (single-select for MVP):**

1. **[Conference ▼]** — Conferences in current 30 results (auto-populated)
2. **[Division ▼]** — Power 4, G5, FCS, FBS Ind, D2, D3
3. **[State ▼]** — States in current 30 results (auto-populated)

**Dropdown Specifications:**

| Property | Value |
|---|---|
| **Type** | Select dropdown |
| **Default option** | "All Conferences" / "All Divisions" / "All States" |
| **Background** | `#FFFFFF` (white) |
| **Border** | `1px solid #D4D4D4`, 2px on focus `#8B3A3A` |
| **Text** | Body Regular, 1rem, Charcoal |
| **Padding** | 12px 16px |
| **Border-radius** | 4px |
| **Spacing** | 8px between dropdowns |
| **Behavior** | On select: filter table/map immediately, pagination reset to page 1, "Clear filters" link appears |

**Data Test IDs:**
```html
<select data-testid="filter-conference">
  <option>All Conferences</option>
  <!-- options auto-populated -->
</select>

<select data-testid="filter-division">
  <option>All Divisions</option>
</select>

<select data-testid="filter-state">
  <option>All States</option>
</select>
```

#### Clear Filters Link

**Visibility:** Only appears if at least one filter is active
**Text:** "[Clear all filters]"
**Style:** Text link, Maroon `#8B3A3A`, Body Small, underline on hover
**Action:** Reset all three dropdowns to "All X", revert table to full 30 results, re-sort by default (Rank asc on table; no sort on map)

**Data Test ID:**
```html
<button data-testid="clear-filters-link" style="background: none; border: none; text-decoration: underline; color: #8B3A3A;">
  Clear all filters
</button>
```

### Subcomponent 2c: Search Bar (Optional for MVP)

**Layout:** Horizontal input field below filters or on same row (depending on space)

```
🔍 [Search by school name or location...]
```

**Specifications:**

- **Type:** Text input
- **Placeholder:** "Search by school name or location..."
- **Icon:** Magnifying glass (16px, left side)
- **Padding:** 12px 16px (with icon space)
- **Font:** Body Regular, 1rem
- **Border:** `1px solid #D4D4D4`, 2px on focus `#8B3A3A`
- **Border-radius:** 4px
- **Behavior:**
  - Real-time search (as user types, filter on school name substring match)
  - Case-insensitive
  - Updates both Map and Table views
  - If search active + dropdown filter active: AND logic (intersection)

**Data Test ID:**
```html
<input
  type="text"
  data-testid="search-schools"
  placeholder="Search by school name or location..."
/>
```

---

## COMPONENT 3: MAP VIEW (DEFAULT)

### Container

```html
<div data-testid="grit-fit-results">
  <div class="leaflet-container" data-testid="leaflet-map-container">
    <!-- Leaflet map instance -->
  </div>
</div>
```

**Container Specifications:**

| Property | Value |
|---|---|
| **Height** | Desktop: 600px; Tablet: 500px; Mobile: 400px |
| **Width** | 100% (up to 1200px max container) |
| **Border** | `1px solid #E8E8E8` (Light Gray) |
| **Border-radius** | 8px |
| **Shadow** | `0 2px 8px rgba(0,0,0,0.1)` |
| **Background** | Leaflet default (light gray map tiles) |
| **Margin** | 24px top, 24px bottom |
| **Overflow** | hidden (map clips to border-radius) |

### Markers & Visual Indicators

#### Individual School Markers (30 matched schools + 632 non-matched greyed out)

**GRIT FIT Matched Schools (highlighted):**

- **Shape:** Circle, 24px diameter
- **Colors by athletic tier:**
  - Power 4: `#F5A623` (Orange)
  - G5: `#4FC3F7` (Cyan)
  - FCS: `#81C784` (Green)
  - FBS Independent: `#CE93D8` (Purple)
  - D2: `#EF9A9A` (Red)
  - D3: `#B0BEC5` (Gray)
- **Border:** `2px solid #8B3A3A` (Maroon) on hover; `1px solid rgba(139,58,58,0.5)` by default
- **Shadow:** `0 1px 4px rgba(0,0,0,0.2)`
- **Scale on hover:** 1.1x
- **Content:** School initial (e.g., "A" for Alabama)
- **Aria-label:** `"Alabama Crimson Tide, Power 4, 450 miles away"`

**Non-Matched Schools (all 662 schools visible as context):**

- **Color:** `#CCCCCC` (Light Gray, muted)
- **Size:** 14px diameter (smaller than matched schools)
- **Opacity:** 0.5
- **No interactive tooltip** (not clickable in MVP)

**Data Test IDs & Accessibility:**
```html
<div class="leaflet-marker-icon"
     data-testid="school-marker-[school_id]"
     data-school-id="123"
     data-is-match="true"
     data-tier="power_4"
     aria-label="Alabama Crimson Tide, Power 4, 450 miles away"
     role="button"
     tabindex="0">
  A
</div>
```

#### Cluster Markers (MarkerCluster)

- **Size increments:**
  - 2–10 schools: 40px circle, `#6B2C2C` (dark maroon)
  - 11–30 schools: 50px circle, `#4A1A1A` (darker maroon)
- **Text:** White school count (bold, centered)
- **Hover:** Scale 1.1x, shadow increases
- **Click:** Zoom in and break cluster apart

### Map Legend (Below Map)

```
┌─ MAP LEGEND ──────────────────────────┐
│ School Type:                          │
│ 🟠 Power 4  🔵 G5  🟢 FCS  🟣 FBS Ind  │
│ 🟥 D2       ⚪ D3                      │
│                                       │
│ ⭕ Cluster (2–10)  ⭕⭕ (11–30)        │
└───────────────────────────────────────┘
```

**Specifications:**

- **Background:** `#F5EFE0` (Cream)
- **Border:** `1px solid #E8E8E8`
- **Border-radius:** 8px
- **Padding:** 16px (md)
- **Font:** Body Small, Charcoal
- **Margin:** 16px top from map
- **Layout:** 6 columns on desktop, 3 on tablet, 2 on mobile
- **Color circles:** 16px diameter, exact colors matching markers

**Data Test ID:**
```html
<div data-testid="map-legend">
  <!-- legend items -->
</div>
```

### Map Controls

#### Layer Control (Top Left)

A simple toggleable menu for visibility:

- **Title:** "Layers"
- **Options:**
  - ☑ Schools by Tier (default ON)
  - ☑ State boundaries (default OFF)
  - ☑ School name labels (default OFF)

#### Zoom & Navigation Controls (Top Right)

- **[+] Zoom in** — 40px button, Maroon background, white icon
- **[−] Zoom out** — 40px button, Maroon background, white icon
- **[⟲] Reset** — 40px button, Gold background, Maroon icon
- **Spacing:** 4px between buttons
- **Hover:** Darken background, increase shadow
- **Disabled state (max/min zoom):** Gray out

### Marker Click Interaction (School Detail Popup)

**When user clicks a matched school marker, a popup appears:**

```
┌─────────────────────────────────┐
│ Alabama Crimson Tide            │
│ Power 4 | SEC | Crimson Tide    │
│                                 │
│ 🎯 Match Score: 92%             │
│ 📍 Distance: 450 miles          │
│ 💰 Net Cost: $28,500/year       │
│ 📈 DROI: 2.3x                   │
│ 🎓 Grad Rate: 68%               │
│                                 │
│ [+ Add to Shortlist]            │
│                                 │
│ [Visit School Profile]          │
│ [✉ RQ Link]                     │
│                                 │
│ [X]                             │
└─────────────────────────────────┘
```

**Popup Specifications:**

| Property | Value |
|---|---|
| **Width** | 320px (desktop); 280px (tablet); 90vw max 300px (mobile) |
| **Background** | `#FFFFFF` |
| **Border** | `2px solid #D4AF37` (Gold) |
| **Border-radius** | 8px |
| **Padding** | 16px (md) |
| **Shadow** | `0 4px 12px rgba(139,58,58,0.2)` |
| **Position** | Centered on marker, or bottom-right if near edge |
| **Close button** | Small X (16px), top-right |

**Content (HTML structure):**
```html
<div class="popup" data-testid="school-popup-[school_id]">
  <h3 data-testid="popup-school-name">Alabama Crimson Tide</h3>
  <p data-testid="popup-school-meta">Power 4 | SEC | Crimson Tide</p>

  <div data-testid="popup-metrics">
    <p><strong>Match Score:</strong> 92%</p>
    <p><strong>Distance:</strong> 450 miles</p>
    <p><strong>Net Cost:</strong> $28,500/year</p>
    <p><strong>DROI:</strong> 2.3x</p>
    <p><strong>Grad Rate:</strong> 68%</p>
  </div>

  <button data-testid="add-to-shortlist-btn" class="popup-action">
    + Add to Shortlist
  </button>

  <button data-testid="visit-profile-btn" class="popup-action">
    Visit School Profile
  </button>

  <button data-testid="rq-link-btn" class="popup-action">
    ✉ Recruiting Questionnaire
  </button>

  <button aria-label="Close popup" class="popup-close">[X]</button>
</div>
```

**"Add to Shortlist" Button Logic:**

- **If NOT on shortlist:** Shows "+ Add to Shortlist" (enabled, Maroon background)
- **If already on shortlist:** Shows "✓ In Shortlist" (disabled, gray background)
- **On click:**
  1. Show spinner (0.3s)
  2. Insert into `short_list_items` with `source: 'grit_fit'`, `grit_fit_status: 'currently_recommended'`
  3. Button changes to "✓ In Shortlist" (disabled)
  4. Toast appears: "Added [School Name] to your shortlist"
  5. Shortlist count in header increments (if visible)

**Data Test IDs:**
```html
<button
  data-testid="add-to-shortlist-btn"
  data-school-id="123"
  aria-label="Add Alabama Crimson Tide to shortlist"
>
  + Add to Shortlist
</button>
```

---

## COMPONENT 4: TABLE VIEW

### Container

```html
<div data-testid="grit-fit-results">
  <table data-testid="results-table">
    <!-- table content -->
  </table>
</div>
```

**Container Specifications:**

- **Width:** 100% (up to 1200px max container)
- **Margin:** 24px top, 24px bottom
- **Overflow on mobile:** Horizontal scroll

### Table Structure

**Columns (in order):**

| Column | Header | Width | Sortable | Format |
|---|---|---|---|---|
| Rank | Rank | 60px | Yes (asc default) | 1, 2, 3... |
| School | School Name | 250px | Yes (alpha) | Bold Maroon; sub-text conference + nickname |
| Div | Division | 80px | Yes | P4, G5, FCS, FBS Ind, D2, D3 |
| Conf | Conference | 100px | Yes | ACC, SEC, etc. |
| State | State | 60px | Yes | CA, TX, etc. |
| Distance | Distance | 80px | Yes (numeric) | "450 mi" |
| Score | Match Score | 100px | Yes (desc default) | "92%" |
| Cost | Net Cost | 100px | Yes (numeric) | "$28,500" |
| Actions | — | 120px | No | Button: "+ Add to Shortlist" or "✓ In List" |

**Total width:** ~800px (scrolls on < 1024px)

### Table Header Row

```html
<thead>
  <tr data-testid="table-header-row">
    <th data-testid="header-rank" data-sort="rank">
      Rank <span data-testid="sort-indicator" style="visibility: hidden;">↑</span>
    </th>
    <th data-testid="header-school" data-sort="school_name">
      School Name <span data-testid="sort-indicator">↑</span>
    </th>
    <!-- more headers... -->
  </tr>
</thead>
```

**Header Specifications:**

- **Font:** Body Small, weight 600, Charcoal `#2C2C2C`
- **Background:** `#F5EFE0` (Cream)
- **Padding:** 12px 16px
- **Text-align:** left (all columns)
- **Cursor:** pointer (on sortable headers)
- **Hover:** Background lighter, text bold
- **Sort indicator:** Gold `#D4AF37` arrow (↑ asc, ↓ desc, hidden if unsorted)

**Sortable Headers:**
- Click to toggle: unsorted → ascending → descending → unsorted

### Table Body Rows

```html
<tbody>
  <tr data-testid="result-row-1" class="result-row">
    <td data-testid="rank-cell">1</td>
    <td data-testid="school-cell">
      <strong data-testid="school-name">Alabama</strong>
      <span data-testid="school-meta">SEC | Crimson Tide</span>
    </td>
    <td data-testid="division-cell">P4</td>
    <!-- more cells... -->
    <td data-testid="action-cell">
      <button data-testid="add-to-shortlist-btn" data-school-id="123">
        + Add to Shortlist
      </button>
    </td>
  </tr>
</tbody>
```

**Row Specifications:**

| State | Background | Text | Border | Shadow |
|---|---|---|---|---|
| **Default (even rows)** | `#FFFFFF` (white) | Charcoal | Bottom `1px solid #E8E8E8` | None |
| **Default (odd rows)** | `#F5EFE0` (cream) | Charcoal | Bottom `1px solid #E8E8E8` | None |
| **Hover** | `#FFF5F0` (light cream) | Charcoal | Bottom `2px solid #D4AF37` (gold) | `0 1px 4px rgba(0,0,0,0.08)` |

**Row Height:** 64px (accommodates 2 lines in School column)

### Action Column Button

**Style (per row):**

| State | Background | Text | Border |
|---|---|---|---|
| **Not in shortlist** | Gold `#D4AF37` | Maroon `#8B3A3A` | None |
| **Hover** | Gold darken `#C9A02B` | Maroon | None |
| **Already in shortlist** | Gray `#E8E8E8` | Gray `#6B6B6B` | None |

**Size:** 120px wide, 36px tall, 4px border-radius

**Text:**
- "Add to Shortlist" (not in list)
- "✓ In Shortlist" (already in list, disabled)

**Behavior:**
- On click: Insert into `short_list_items` with `source: 'grit_fit'`, `grit_fit_status: 'currently_recommended'`
- Show spinner 0.3s
- Button becomes disabled
- Toast: "Added [School Name] to your shortlist"

### Pagination Controls (Below Table)

**Layout:**

```
Rows: [10 ▼]  |  Showing 1 to 10 of 30 results  |  [‹ Prev] [1] [2] [3] [Next ›]
```

**Left (Rows Per Page):**
- Label: "Rows:"
- Dropdown: [10 ▼], [25], [50]
- Default: 10
- On change: Table updates, page resets to 1

**Center (Info Text):**
- "Showing [X] to [Y] of 30 results"
- Example: "Showing 1 to 10 of 30 results"

**Right (Pagination Buttons):**
- [‹ Previous] — disabled if on page 1
- [1] [2] [3] — page numbers, active button has Maroon background + white text
- [Next ›] — disabled if on last page
- Spacing: 4px between page numbers

**Data Test IDs:**
```html
<div data-testid="pagination-container">
  <select data-testid="rows-per-page">
    <option>10</option>
    <option>25</option>
    <option>50</option>
  </select>

  <span data-testid="pagination-info">
    Showing 1 to 10 of 30 results
  </span>

  <div data-testid="pagination-controls">
    <button data-testid="prev-page">‹ Previous</button>
    <button data-testid="page-1" aria-current="page">1</button>
    <button data-testid="page-2">2</button>
    <button data-testid="next-page">Next ›</button>
  </div>
</div>
```

### Mobile Transformation (< 768px)

**On mobile, the table becomes a card layout:**

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

**Card Specifications:**

- **Background:** `#FFFFFF`
- **Border:** `1px solid #E8E8E8`
- **Padding:** 16px
- **Margin:** 8px
- **Border-radius:** 8px
- **Shadow:** `0 1px 4px rgba(0,0,0,0.1)`

**Content:**

- School name (H3, 1.125rem, Maroon)
- Conference/division (Body Small, Stone Gray)
- Stats (Body Regular): Distance, Score, Cost
- Button: Full-width, 44px tall, "+ Add to Shortlist"

**Data Test ID:**
```html
<div data-testid="result-card-[rank]" class="result-card">
  <!-- card content -->
</div>
```

---

## STATE MANAGEMENT & PERSISTENCE

### View Toggle Behavior

- **Switching from Map → Table:**
  - Active filters persist (conference, division, state, search)
  - Table displays filtered results, re-sorts by Rank asc
  - Pagination resets to page 1
  - URL parameter (optional): `?view=table`

- **Switching from Table → Map:**
  - Active filters persist
  - Map displays filtered markers
  - Clusters reform if applicable
  - URL parameter (optional): `?view=map`

### Initial Load

1. User navigates to `/grit-fit/results`
2. App fetches GRIT FIT results (up to 30 schools)
3. Default view: Map View, no filters active, all 30 schools visible
4. Map initializes centered on USA, all markers visible
5. Table initiates with 10 rows per page, sorted by Rank asc

### Profile Edit → Recalculate

1. User clicks [⟲ Recalculate]
2. Button shows spinner (0.5–2s)
3. App re-runs GRIT FIT algorithm with current profile
4. Server returns new up-to-30 schools
5. Map/Table updates with new markers/rows
6. Toast: "Results updated with your latest profile"
7. Filters reset to "All X"
8. Active view preserved

### Filter Application

1. User selects from Conference/Division/State dropdown or types in search
2. Both Map and Table filter immediately (real-time)
3. School count updates: "Showing X of 662 schools (Y matches)"
4. Map clusters re-form with fewer markers
5. Table pagination resets to page 1
6. If no results: Show "No schools match your filters. [Clear all filters]"

### Add to Shortlist Workflow

**From Map popup:**

1. User clicks "+ Add to Shortlist" button in popup
2. Button shows spinner (0.3s)
3. Insert into `short_list_items` table:
   - `source: 'grit_fit'`
   - `grit_fit_status: 'currently_recommended'`
   - `said: [current student assessment decision ID]`
4. Button changes to "✓ In Shortlist" (disabled)
5. Toast: "Added [School Name] to your shortlist"
6. Shortlist count in header increments
7. Popup stays open; user can close with [X] or click elsewhere

**From Table row:**

1. User clicks "+ Add to Shortlist" button in Actions column
2. Same workflow as above
3. Button in row becomes "✓ In Shortlist" (disabled)
4. Toast appears

---

## RESPONSIVE BREAKPOINTS

### Desktop (≥ 1024px)

- **Map height:** 600px
- **Table width:** 100% (up to 1200px max)
- **All columns visible**
- **Filter bar:** Horizontal (Recalculate + School Count, then Filter row)
- **Pagination:** Full controls visible
- **Legend:** 6-column layout
- **Popup width:** 320px (fixed)

### Tablet (768px–1023px)

- **Map height:** 500px
- **Table columns:** May reduce Cost column or abbreviate headers
- **Filter bar:** Same horizontal layout
- **Pagination:** May stack if constrained
- **Legend:** 3-column layout
- **Popup width:** 280px

### Mobile (< 768px)

- **Map height:** 400px
- **Table:** Transforms to card layout
- **Filter bar:** Vertical stack (filters in column)
- **Pagination:** Simplified [‹ Prev] [Next ›]
- **Legend:** 2 columns
- **Popup width:** 90vw, max 300px
- **View toggle:** Full width
- **Actions button:** Full-width, 44px tap target

---

## ACCESSIBILITY REQUIREMENTS

### Keyboard Navigation

- **Tab order:**
  1. View toggle buttons (Map, Table)
  2. Recalculate button
  3. Filter dropdowns (Conference, Division, State)
  4. Search input
  5. **On Map:** Markers (tabindex="0"), Layer controls, Zoom controls
  6. **On Table:** Column headers, pagination buttons
  7. Action buttons (Add to Shortlist)

- **Map:** Arrow keys move focus between markers, Enter opens popup, Esc closes
- **Table:** Arrow keys move between rows, Enter opens popup (if expanded row), Esc closes
- **Dropdowns:** Arrow keys navigate options, Enter selects

### Screen Reader Announcements

**Map View:**
```
region "GRIT FIT results map"
main
  heading "Your 30 GRIT FIT Matches"
  text "Showing 30 of 662 schools (30 GRIT FIT matches)"

  group "View toggle"
    button "Map View" aria-pressed="true"
    button "Table View" aria-pressed="false"

  button "⟲ Recalculate"

  region "Results map"
    text "662 schools mapped; 30 highlighted as matches"
    button "Alabama Crimson Tide, Power 4, 450 miles away"
    <!-- more markers... -->

  heading "School Type"
  list
    listitem "Power 4: orange"
    listitem "G5: cyan"
    <!-- more legend items... -->
```

**Table View:**
```
region "GRIT FIT results table"
  table "Your 30 GRIT FIT matches, sorted by rank"
    thead
      row
        columnheader "Rank" aria-sort="ascending"
        columnheader "School Name"
        <!-- more headers... -->
    tbody
      row
        cell "1"
        cell "Alabama Crimson Tide, SEC, Crimson Tide"
        <!-- more cells... -->
```

### Color Contrast

- All text on white/cream/colored backgrounds: minimum 4.5:1 (AA)
- Maroon text on Cream: 7.2:1 (AAA)
- Gold text on white: 4.8:1 (AA)
- Sorted column arrows: 4.8:1 (AA)

### Focus Indicators

- All focusable elements (buttons, links, inputs): `outline: 2px solid #8B3A3A` with 2px offset
- Focus visible on all interactive elements

---

## DATA-TESTID REFERENCE (For Quin — Test Cases TC-MAP-001, TC-MAP-002, TC-GRIT-001, TC-GRIT-002, TC-SL-001)

### Essential Test IDs

| Test Case | Element | data-testid |
|---|---|---|
| **TC-MAP-001** | Map container | `.leaflet-container` |
| **TC-MAP-001** | School markers | `school-marker-[id]` |
| **TC-MAP-001** | Cluster markers | `cluster-marker-[count]` |
| **TC-MAP-002** | Popup after marker click | `school-popup-[id]` |
| **TC-MAP-002** | Popup "Add to Shortlist" button | `add-to-shortlist-btn` |
| **TC-GRIT-001** | Results table | `results-table` |
| **TC-GRIT-001** | Table rows | `result-row-[rank]` |
| **TC-GRIT-001** | Table headers (sortable) | `header-[column]` |
| **TC-GRIT-002** | Sort indicators | `sort-indicator` |
| **TC-GRIT-002** | Pagination controls | `pagination-controls` |
| **TC-SL-001** | "Add to Shortlist" button (table) | `add-to-shortlist-btn` |
| **TC-SL-001** | "Add to Shortlist" button (map) | `add-to-shortlist-btn` |
| **General** | Results container | `grit-fit-results` |
| **General** | View toggle | `view-toggle-map`, `view-toggle-table` |
| **General** | Result count | `grit-fit-result-count` |
| **General** | Filter controls | `filter-conference`, `filter-division`, `filter-state` |
| **General** | School count | `school-count` |
| **General** | Clear filters | `clear-filters-link` |
| **General** | Recalculate button | `recalculate-button` |

---

## DESIGN TOKENS (From DESIGN_SYSTEM.md)

### Colors

| Token | Value | Usage |
|---|---|---|
| Maroon (Primary) | `#8B3A3A` | Headings, primary buttons, active states |
| Gold (Accent) | `#D4AF37` | Highlights, hover states, sorted arrows |
| Cream (Background) | `#F5EFE0` | Card backgrounds, section backgrounds |
| Charcoal (Text) | `#2C2C2C` | Primary text |
| Stone Gray (Secondary) | `#6B6B6B` | Secondary text, labels |
| Light Gray (Border) | `#E8E8E8` | Borders, dividers |
| White | `#FFFFFF` | Primary background |

### Typography

| Scale | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| H2 | 2rem / 32px | 700 | 1.3 | Page headings |
| H3 | 1.5rem / 24px | 600 | 1.4 | Section headings, card titles |
| H4 | 1.25rem / 20px | 600 | 1.5 | Small headings |
| Body Large | 1.125rem / 18px | 400 | 1.6 | Primary body |
| Body Regular | 1rem / 16px | 400 | 1.6 | Standard UI copy |
| Body Small | 0.875rem / 14px | 400 | 1.5 | Secondary text |

### Spacing

| Unit | Value |
|---|---|
| xs | 4px |
| sm | 8px |
| md | 16px |
| lg | 24px |
| xl | 32px |
| 2xl | 48px |

---

## IMPLEMENTATION NOTES

**Owner:** Nova (React component implementation), Quill (design sign-off)

**Dependencies:**
- Leaflet.js (map) + MarkerCluster plugin
- TanStack Table or native `<table>` + sorting logic
- React state management (Context or Zustand) for view toggle, filters, pagination
- Toast notification component
- Filter/search component
- Popup component

**Key Decisions for Nova:**
1. **State library:** Use React Context for shared state (filters, active view) or Zustand for cross-component sync
2. **Table implementation:** Native HTML `<table>` with CSS Grid for responsive mobile transformation, OR TanStack Table for built-in sorting/filtering
3. **Map library:** Leaflet.js with MarkerCluster; layer controls via native Leaflet.Control.Layers
4. **Filter strategy:** Client-side (all 30 schools in memory) for MVP; no server round-trips for filtering
5. **Popup positioning:** Use Leaflet's built-in popup positioning; fallback to `bottomRight` if near edge

---

## APPROVAL GATE

This spec requires sign-off from:

- [ ] **Quill** — Design consistency (tokens, responsive behavior, accessibility)
- [ ] **Nova** — Technical feasibility (Leaflet integration, state management, responsive table transform)
- [ ] **Quin** — Test coverage completeness (all data-testid entries present, test cases alignable)
- [ ] **Chris** — Product confirmation (view toggle behavior, filter strategy, shortlist workflow)

Once all approvals confirmed, Nova proceeds to implementation.

---

*GRIT FIT Results View Spec v1.0 — unified Map + Table specification with full QA test identifier coverage. Subject to revision based on stakeholder feedback and usability testing.*
