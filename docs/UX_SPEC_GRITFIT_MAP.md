# UX SPEC: GRIT FIT RESULTS — MAP VIEW

**Status:** Draft for review
**Date:** 2026-03-24
**Authority:** Quill (UX/UI Design)
**Related Decision:** RB-003 (Keep map component intact), RB-006 (GRIT FIT list is dynamic, computed)
**Component Reuse:** CFB-mapping repo (Leaflet.js, 662 schools, map markers)

---

## OVERVIEW

The GRIT FIT Map View displays up to 30 personalized school matches on an interactive Leaflet.js map. This view reuses the existing Leaflet implementation from CFB-mapping but filters to show only the 30 schools that pass all four GRIT FIT algorithm gates for the current student profile.

The map is the product's showpiece. It demonstrates data depth and recruiting landscape understanding without requiring a user to know anything about the app's logic. The interaction should feel natural and responsive.

---

## DESIGN INTENT

The BC High Eagles logo is bold and confident. Applied to the map: The 30 schools are highlighted with maroon and gold markers. The background map is neutral. The interaction is immediate and intuitive — click a school, see details, add to shortlist.

---

## MAP VIEW LAYOUT

```
┌─────────────────────────────────────────────────────────┐
│                    HEADER (Maroon)                      │
│  [Logo] Gritty Recruit Hub  [Shortlist (3)] [Settings] │
└─────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                                                          │
│  Your 30 GRIT FIT Matches  [⟲ Recalculate] [Table View] │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │                                                    │ │
│  │                                                    │ │
│  │         LEAFLET MAP (30 schools visible)          │ │
│  │                                                    │ │
│  │  [Layer Control]  [+] [-] [Reset Map Position]    │ │
│  │                                                    │ │
│  │ Zoom: School markers colored by athletic tier     │ │
│  │       Cluster markers at low zoom levels          │ │
│  │                                                    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─ MAP LEGEND (below map) ──────────────────────────┐ │
│  │ School Type:                                       │ │
│  │ 🟢 Power 4        🔵 G5        🟡 FCS            │ │
│  │ 🟣 FBS Ind        🟠 D2        ⚪ D3             │ │
│  │                                                   │ │
│  │ ⭕ Cluster (2-10 schools)    ⭕⭕ Cluster (11+) │ │
│  └──────────────────────────────────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│                    FOOTER                              │
│            Documentation  Privacy  Help  Contact       │
└────────────────────────────────────────────────────────┘
```

---

## DETAILED COMPONENT SPECIFICATIONS

### Top Section (Above Map)

#### Heading Row
- **Left:** "Your 30 GRIT FIT Matches" (H2)
- **Right (Desktop):** Three buttons/links in a row
  - [⟲ Recalculate] — Secondary button (Gold outline)
  - [Table View] — Text link (Maroon)
  - Spacing: 16px between buttons

**Mobile behavior:** Stack vertically at 768px and below

#### Subheading (optional, if filters applied)
- **Text:** "Showing [X] of 30 results. [Clear all filters]" (Body Small, Stone Gray)
- **Only shows if:** Filters (conference, division, state) are active
- **Interaction:** "Clear all filters" link resets all selections

### Leaflet Map Container

#### Dimensions
- **Height:** Responsive
  - Desktop: 600px (fixed height, scrollable page)
  - Tablet: 500px
  - Mobile: 400px
- **Aspect ratio:** Maintain map proportions across breakpoints
- **Border:** `1px solid #E8E8E8` (Light Gray)
- **Border-radius:** 8px
- **Shadow:** `0 2px 8px rgba(0,0,0,0.1)`

#### Markers & Visual Indicators

**Individual School Markers:**
- **Shape:** Circle (24px diameter by default, scales with zoom)
- **Colors (by athletic tier):**
  - Power 4: `#F5A623` (Orange)
  - G5: `#4FC3F7` (Cyan)
  - FCS: `#81C784` (Green)
  - FBS Independent: `#CE93D8` (Purple)
  - D2: `#EF9A9A` (Red)
  - D3: `#B0BEC5` (Gray)
- **Border:** `2px solid #8B3A3A` (Maroon) on hover, `1px solid rgba(139,58,58,0.5)` by default
- **Shadow:** `0 1px 4px rgba(0,0,0,0.2)`
- **Content (center of marker):** School initial or icon (e.g., "Α" for Alabama)
- **Tooltip (on hover):** School name, distance, athletic tier (appears above marker, 300ms delay)

**Cluster Markers (Leaflet MarkerCluster):**
- **Size increments:**
  - 2–10 schools: 40px circle, `#6B2C2C` (dark maroon)
  - 11–30 schools: 50px circle, `#4A1A1A` (darker maroon)
- **Text:** White school count (bold, centered)
- **Hover:** Slight scale up (1.1x) and shadow increase
- **Interaction:** Click to zoom in and break apart cluster

#### Layer Control (Top Left)

A simple toggleable menu:
- **Title:** "Layers"
- **Options:**
  - [☑] Schools by Tier — shows/hides individual school markers, colored by tier
  - [☑] State boundaries — shows/hides state borders (light gray, no fill)
  - [☑] School names — shows/hides school name labels on markers

**Styling:**
- Background: White, border `1px solid #E8E8E8`
- Text: Body Small, Maroon
- Checkboxes: Standard HTML, styled to match design system

#### Zoom & Navigation Controls (Top Right)

- **[+] Zoom in** — 40px button, Maroon background, white icon
- **[−] Zoom out** — 40px button, Maroon background, white icon
- **[Reset Map] or [⟲]** — 40px button, Gold background, Maroon icon
- **Spacing:** 4px vertical gap between buttons
- **On hover:** Buttons darken, shadow increases
- **Disabled state (if already zoomed max/min):** Button grays out

### Map Legend (Below Map)

#### Layout
- **Background:** `#F5EFE0` (Cream)
- **Padding:** 16px (md)
- **Border:** `1px solid #E8E8E8`
- **Border-radius:** 8px
- **Text (Body Small, Charcoal):** "School Type:"
- **Legend items (inline, 6 columns on desktop, responsive stack on mobile):**
  - [Color circle] Power 4
  - [Color circle] G5
  - [Color circle] FCS
  - [Color circle] FBS Ind
  - [Color circle] D2
  - [Color circle] D3
- **Cluster legend (on new line):**
  - [Cluster circle] 2–10 schools
  - [Cluster circle] 11–30 schools

#### Mobile Behavior
On mobile, legend stacks to 2–3 columns max. Text stays Body Small. Circles remain 16px.

---

## MARKER INTERACTION SPECIFICATIONS

### Hover State
- **Marker:** Scale 1.1x, shadow increases
- **Tooltip:** School name, distance, tier (text appears in 300ms, stays while hovering)
- **Cursor:** Changes to `pointer`

### Click State
When a user clicks a school marker:

**Map View → School Detail Popup:**
```
┌────────────────────────────────────┐
│ Alabama Crimson Tide              │
│ Division: Power 4 Conference: SEC  │
│                                    │
│ 🎯 Match Score: 92%                │
│ 📍 Distance: 480 miles             │
│ 💰 Net Cost: $28,500/year          │
│ 📈 DROI: 2.3x                      │
│ 🎓 Grad Rate: 68%                  │
│                                    │
│ [▣ Added to Shortlist] [Remove]    │
│                                    │
│ [Visit School Profile]             │
│ [✉ Recruiting Questionnaire Link]  │
│                                    │
│ [X]                                │
└────────────────────────────────────┘
```

**Popup Specifications:**
- **Width:** 320px (fixed on desktop, responsive on mobile)
- **Background:** White
- **Border:** `2px solid #D4AF37` (Gold)
- **Border-radius:** 8px
- **Padding:** 16px (md)
- **Shadow:** `0 4px 12px rgba(139,58,58,0.2)` (Maroon shadow for emphasis)
- **Position:** Centered on clicked marker, or bottom-right if near screen edge

**Popup Content:**

| Field | Source | Display |
|---|---|---|
| School Name | `schools.school_name` | H3, Maroon |
| Tier & Conference | `schools.div`, `schools.conference` | Body Small, Stone Gray |
| Match Score | GRIT FIT algorithm | H4, Gold text |
| Distance | `schools.dist` | Body Regular, with 📍 icon |
| Net Cost | `schools.net_cost` | Body Regular, formatted as currency |
| DROI | `schools.droi` | Body Regular |
| Grad Rate | `schools.grad_rate` | Body Regular, formatted as percentage |

**Action Buttons in Popup:**

1. **[▣ Added to Shortlist] or [+ Add to Shortlist]**
   - **Logic:**
     - If school already on student's shortlist: shows "▣ Added to Shortlist" (disabled state, gray background)
     - If not on shortlist: shows "+ Add to Shortlist" (enabled, Maroon button)
   - **On click:** Insert into `short_list_items` table with `source: 'grit_fit'` and `grit_fit_status: 'currently_recommended'`
   - **Feedback:** Button changes to "▣ Added to Shortlist" (disabled) after click, show success toast at top of page

2. **[Visit School Profile]**
   - **Action:** Opens a new tab to the school's profile page (if implemented, or links to external college athletics site)
   - **For MVP:** May be disabled/hidden if no profile page exists

3. **[✉ Recruiting Questionnaire Link]**
   - **Logic:** If `schools.q_link` exists, button is enabled (Gold text link)
   - **Action:** Opens `schools.q_link` in new tab
   - **If no q_link:** Button disabled (grayed out)

4. **[X] Close Popup**
   - **Action:** Closes popup, returns to map
   - **Button:** Small X button (16px), top-right corner of popup

### Cluster Click Interaction

When user clicks a cluster marker:
- **Action:** Map automatically zooms in and clusters break apart to show individual schools
- **Animation:** Smooth zoom over 300ms
- **Behavior:** If zoomed to maximum, cluster explodes into individual markers around the cluster center

---

## FILTER & LAYER CONTROLS

### Layer Control (Checkbox-based)

Toggle visibility of:
1. **Schools by Tier** — Shows/hides all school markers (default: ON)
2. **State Boundaries** — Shows/hides state border overlays (default: OFF)
3. **School Name Labels** — Shows/hides text labels on markers at high zoom levels (default: OFF at low zoom, ON at high zoom)

**Implementation detail:** Use Leaflet's native `LayerGroup` and `Control.Layers` to manage visibility.

### Search/Filter Bar (Top of Map)

A simple keyword search box:
```
┌─────────────────────────────────────┐
│ 🔍 Search schools or filter...      │
└─────────────────────────────────────┘

[Conference ▼] [Division ▼] [State ▼]
```

**Fields:**
1. **Search (text input)** — Real-time search for school name (as user types, markers are filtered on the map)
2. **Conference dropdown** — Filter by conference (ACC, SEC, Big Ten, etc.)
3. **Division dropdown** — Filter by division (Power 4, G5, FCS, D2, D3)
4. **State dropdown** — Filter by state

**Behavior:**
- **Search:** Case-insensitive substring match on school name. Updates map in real-time. Resets other filters.
- **Dropdowns:** Multi-select or single-select (TBD with Quill). Once selected, map updates to show only matching schools. Subheading updates: "Showing [X] of 30 results."
- **Combined filters:** If user selects Conference=ACC and State=CA, map shows only ACC schools in CA (intersection logic).
- **Clear all:** Link appears if any filter is active: "[Clear all filters]" — resets everything.

**Design:**
- **Search input:** Body Regular, 1rem font-size, 12px padding, rounded 4px border (Light Gray), focus outline Maroon 2px
- **Dropdowns:** Same styling as search input, arrow icon inside
- **Spacing:** 16px gap between search and dropdown group, 8px between dropdowns

---

## RESPONSIVE DESIGN

### Desktop (1024px+)
- **Map height:** 600px
- **Popup width:** 320px (fixed)
- **Layer controls:** Visible at top-left
- **Zoom controls:** Visible at top-right
- **Filter bar:** Horizontal, below heading
- **Legend:** Full 6-column layout

### Tablet (768px–1023px)
- **Map height:** 500px
- **Popup width:** 280px
- **Filter bar:** Horizontal, same as desktop (may wrap if constrained)
- **Legend:** 3-column layout
- **Zoom controls:** May stack if space constrained

### Mobile (< 768px)
- **Map height:** 400px
- **Popup width:** 90vw (responsive to screen width, max 300px)
- **Filter bar:** Vertical stack (search on top, dropdowns in a row below)
- **Layer controls:** Hamburger icon (tap to open/close)
- **Zoom controls:** Larger touch targets (50px), positioned outside map corner
- **Legend:** 2–3 columns, smaller circles (12px instead of 16px)

---

## STATE MANAGEMENT & DATA FLOW

### Initial Load
1. User navigates to `/grit-fit/results`
2. App fetches GRIT FIT results from server (or calculates on demand)
3. Returns up to 30 schools sorted by match score
4. Map initializes with Leaflet, centers on USA, all 30 schools visible
5. Markers are rendered colored by tier
6. Clusters auto-form if multiple schools in same region

### Profile Edit → Recalculate
When user clicks [⟲ Recalculate]:
1. Button shows spinner (0.5s–2s depending on calculation time)
2. App re-runs GRIT FIT algorithm with current profile
3. Server returns new up-to-30 schools
4. Map updates with new markers (animate removed/added markers)
5. Shortlist `grit_fit_status` flags update in batch (see Shortlist spec for details)
6. Toast notification: "Results updated with your latest profile"

### Add to Shortlist
When user clicks "+ Add to Shortlist" in popup:
1. Button shows spinner briefly
2. App inserts row into `short_list_items` with:
   - `source: 'grit_fit'`
   - `grit_fit_status: 'currently_recommended'`
   - `said` from current session
3. Button becomes disabled, text changes to "▣ Added"
4. Toast appears: "Added to your shortlist"
5. Shortlist count in header increments (if visible)

---

## ACCESSIBILITY NOTES

- **Screen readers:** Each marker has aria-label with school name, tier, distance
- **Keyboard navigation:** Tab through markers, Enter to open popup, Esc to close
- **Color contrast:** All text on popups meets 4.5:1 minimum
- **Focus indicators:** Clear 2px Maroon outline on focused elements (buttons, search input)
- **Map zoom keyboard shortcuts:** `+` to zoom in, `-` to zoom out (Leaflet default)

---

## PERFORMANCE NOTES

- **30 schools max:** Leaflet MarkerCluster handles clustering and decluttering efficiently
- **Lazy loading:** Only render markers for schools in viewport when zoomed far out
- **Caching:** Cache GRIT FIT results for 5 minutes (or until profile is edited)
- **Animations:** Use CSS transforms for smooth marker transitions (no expensive DOM rewrites)

---

## IMPLEMENTATION NOTES

**Owner:** Nova (component integration), Quill (design sign-off)
**Dependencies:**
- [ ] Leaflet.js (existing, from CFB-mapping)
- [ ] Leaflet MarkerCluster plugin
- [ ] Filter/search component
- [ ] School detail popup component
- [ ] Toast/notification component

**Reuse from CFB-mapping:**
- [x] Map initialization
- [x] School markers and color-coding by tier
- [x] Layer controls
- [x] Zoom controls

**Differences from CFB-mapping:**
- Filter to 30 schools only (not all 662)
- Add search/filter interface
- Add "Add to Shortlist" button in popup
- Add match score and DROI to popup
- Add Recalculate button

---

## APPROVAL GATE

This spec requires sign-off from:
- [ ] Quill (design consistency, layout, responsive behavior)
- [ ] Nova (Leaflet integration feasibility)
- [ ] Chris (product confirmation of filter approach)

Once signed off, Nova proceeds to implementation.

---

*Map View Spec v1.0 — subject to revision based on stakeholder feedback and usability testing.*
