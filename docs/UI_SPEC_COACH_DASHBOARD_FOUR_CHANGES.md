# UI Specification — Coach Dashboard Four Changes

**Project:** gritty-recruit-hub-rebuild  
**Stack:** React + Vite, inline styles (no Tailwind)  
**Design System:** Inline style objects with fixed color tokens  
**Status:** Ready for implementation  
**Approval Gate:** Chris approval required before build begins

---

## Design Token Reference

All color tokens used in this spec are sourced from existing components:

| Token Name | Hex Value | Usage |
|------------|-----------|-------|
| MAROON (primary) | #8B3A3A | Buttons, headers, active states, badges |
| GOLD (accent) | #D4AF37 | Progress bars, achievements, highlights |
| DARK_TEXT | #2C2C2C | Primary text |
| MED_TEXT | #6B6B6B | Secondary text, labels |
| LIGHT_TEXT | #F5EFE0 | Light backgrounds, cream |
| BORDER | #E8E8E8 | Card borders, dividers |
| WHITE | #FFFFFF | Card/panel backgrounds |
| GREEN | #2E7D32 | Success states, recruiting recommendations |
| AMBER | #F9A825 | Warning/caution states |
| RED_URGENT | #C62828 | Urgent/deadline states |

---

## CHANGE 1: Pre-Read Document Status Indicator

### Component
- **Component name:** CoachSchoolDetailPanel (Panel 2 — School Detail Slide-out)
- **File location:** `src/components/CoachSchoolDetailPanel.jsx`
- **Lines:** 366–458 (Documents Status section within panel content)
- **Related component:** DocumentsSection.jsx (different component, not modified here)

### Current State

The pre-read document rows in Panel 2 currently show:
- Document type name (e.g., "Film Study")
- Two mailto buttons per row: "Email Student" and "Email Counselor" (or "Email Coach" for counselors)
- No visual indicator of submission status (not submitted, submitted, shared, etc.)

Current structure (lines 366–458):
```jsx
{DOCUMENT_TYPES.map(dt => {
  const slotKey = `${dt.type}_${dt.slot_number}`;
  return (
    <div key={slotKey} style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '8px 12px',
      backgroundColor: '#FAFAFA',
      borderRadius: 4,
      border: '1px solid #F0F0F0',
      flexWrap: 'wrap',
    }}>
      <span>{dt.libraryLabel}</span>
      {/* mailto buttons */}
    </div>
  );
})}
```

### Required Changes

**STEP 1: Add a status indicator badge to each document row**

Between the document label and the mailto button group (after line 394), insert a new status badge element:

```jsx
{/* Status badge — NOT SUBMITTED state (provisional) */}
<span style={{
  fontSize: '0.6875rem',
  fontWeight: 600,
  color: '#FFFFFF',
  backgroundColor: '#9E9E9E',
  padding: '2px 8px',
  borderRadius: 12,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  flexShrink: 0,
}}>
  Not Submitted
</span>
```

**Location:** Insert as a new element inside the `<div>` that contains the document row (line 374–386), after the `<span>` that renders `dt.libraryLabel`.

**Conditional logic:**
- Show "Not Submitted" badge (gray #9E9E9E background) when no documents have been shared for this school yet
- Style remains fixed as above — no dynamic color changes at this stage

**Note:** Future: When document_shares data becomes available in the component's data flow, the badge text and color will update to show: "Submitted" (green #2E7D32), "Shared" (maroon #8B3A3A), or "Not Submitted" (gray #9E9E9E). For now, hard-code the "Not Submitted" state.

### Design Tokens
- Badge background (NOT SUBMITTED): `#9E9E9E` (gray)
- Badge text color: `#FFFFFF` (white)
- Font size: `0.6875rem` (11px)
- Font weight: `600` (semibold)
- Padding: `2px 8px`
- Border radius: `12px` (pill shape)
- Text transform: `uppercase`
- Letter spacing: `0.5px`

### Edge Cases
- **Empty state:** If DOCUMENT_TYPES is empty, no rows render (existing behavior — no change needed)
- **Mobile viewport:** Badge remains visible and does not reflow with buttons (flex layout handles wrapping)
- **Text overflow:** Document label text may wrap on narrow mobile screens — badge position is correct as a flex sibling

### Risks
- **Risk: Badge layout shifts button position.** Mitigation: The parent flexWrap: 'wrap' ensures buttons move to a new line if needed. The badge is small and uses flexShrink: 0 to prevent compression.
- **Risk: Future data integration.** When document_shares data is passed to CoachSchoolDetailPanel, this badge will need conditional styling. Coordinate with Patch (GAS layer) and Nova (wiring) before merge.
- **Testing:** Verify badge renders in all breakpoints. Test with long document label text. Verify badge does not obscure mailto buttons on mobile.

---

## CHANGE 2: Email Buttons — Mobile Width and Vertical Text Centering

### Component
- **Component name:** CoachSchoolDetailPanel (Panel 2 — School Detail Slide-out)
- **File location:** `src/components/CoachSchoolDetailPanel.jsx`
- **Lines:** 414–454 (mailto anchor elements within the document row loop)

### Current State

The mailto button pair (Email Student, Email Coach/Counselor) are styled as inline anchor elements with these issues on mobile:
- Width is constrained by flex layout and long text ("Email Counselor" / "Email Coach")
- Text may wrap, causing button height to expand unexpectedly
- Vertical text alignment within buttons is inconsistent across breakpoints

Current structure (lines 414–454):
```jsx
<a
  href={`mailto:${student.email}?...`}
  style={{
    fontSize: '0.75rem',
    color: '#8B3A3A',
    fontWeight: 600,
    textDecoration: 'none',
    padding: '3px 8px',
    border: '1px solid #8B3A3A',
    borderRadius: 4,
    whiteSpace: 'nowrap',
  }}
>
  Email Student
</a>
```

### Required Changes

**STEP 1: Add display and alignment properties to both mailto buttons**

For **both** the "Email Student" and "Email Coach/Counselor" anchor elements, modify the style object to add:

```jsx
style={{
  fontSize: '0.75rem',
  color: '#8B3A3A',
  fontWeight: 600,
  textDecoration: 'none',
  padding: '3px 8px',
  border: '1px solid #8B3A3A',
  borderRadius: 4,
  whiteSpace: 'nowrap',
  // NEW: Mobile-friendly width and centering
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '80px',
  height: '24px',
}}
```

**Location:** Lines 417–429 (Email Student button) and lines 435–447 (Email Coach button).

**Explanation:**
- `display: 'inline-flex'` ensures text centers vertically within the button
- `alignItems: 'center'` + `justifyContent: 'center'` guarantee vertical and horizontal centering
- `minWidth: '80px'` provides a consistent baseline width on mobile without forcing text wrap
- `height: '24px'` locks button height to prevent vertical expansion
- `whiteSpace: 'nowrap'` (existing) prevents text wrapping

### Design Tokens
- Font size: `0.75rem` (12px) — unchanged
- Font weight: `600` (semibold) — unchanged
- Padding: `3px 8px` — unchanged
- Border: `1px solid #8B3A3A` (maroon) — unchanged
- Border radius: `4px` — unchanged
- Min width: `80px` (new)
- Height: `24px` (new)
- Display: `inline-flex` (new)
- Align items: `center` (new)
- Justify content: `center` (new)

### Edge Cases
- **Very long labels (future):** If a label text exceeds minWidth, the button expands only horizontally (whiteSpace: 'nowrap' prevents vertical wrapping). This is acceptable for buttons.
- **Mobile portrait (< 360px):** minWidth: '80px' is still appropriate; the parent flex container wraps buttons to a new line if row space is insufficient.
- **Desktop viewport:** Buttons remain at minWidth or natural width if content is smaller — no negative impact.
- **Button pair layout:** The `<div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>` parent (line 415) already handles side-by-side layout. The new inline-flex on children does not conflict.

### Risks
- **Risk: Height lock (24px) may clip future text.** Mitigation: If new labels are added longer than current text, test button height visually and adjust to `28px` or `32px` if needed. Document the new baseline.
- **Risk: minWidth conflicts with flex shrink on narrow screens.** Mitigation: Parent flex container `flexWrap: 'wrap'` is already set (line 385), so buttons will wrap to a new line before being crushed.
- **Testing:** 
  - Test button text centering on mobile landscape (iPhone SE, Galaxy S10, etc.)
  - Test with "Email Counselor" label (longest current text)
  - Verify button height is consistent in all breakpoints
  - Verify buttons wrap to a new line on very narrow mobile (< 280px width)

---

## CHANGE 3: Coach Dashboard Tabs — Horizontal Scroll on Mobile

### Component
- **Component name:** CoachDashboardPage (tab row container)
- **File location:** `src/pages/CoachDashboardPage.jsx`
- **Lines:** 281–305 (Tab Navigation container and individual tab buttons)

### Current State

The tab navigation row currently displays all four tabs (Students, Recruiting Intelligence, Calendar, Reports) in a flex row with a bottom border. On mobile (< 640px), all tabs remain visible in a single row with no overflow handling, causing:
- Horizontal scroll of the entire page (not just the tab bar)
- Tab text wrapping or truncation
- Poor touch target size

Current structure (lines 281–305):
```jsx
<div style={{
  display: 'flex', borderBottom: '1px solid #E8E8E8',
  backgroundColor: '#FFFFFF', marginBottom: 16,
}}>
  {TABS.map(tab => (
    <button
      key={tab.key}
      style={{
        padding: '12px 24px',
        background: 'none',
        border: 'none',
        borderBottom: activeTab === tab.key ? '2px solid #8B3A3A' : '2px solid transparent',
        color: activeTab === tab.key ? '#8B3A3A' : '#6B6B6B',
        fontWeight: activeTab === tab.key ? 600 : 400,
        fontSize: '0.875rem',
        cursor: 'pointer',
        transition: 'color 150ms, border-color 150ms',
      }}
    >
      {tab.label}
    </button>
  ))}
</div>
```

### Required Changes

**STEP 1: Add horizontal scroll container to the tab row on mobile**

Wrap the entire tab row in a container div with horizontal scroll enabled only on mobile:

Replace the current tab container `<div style={{ display: 'flex', ... }}>` with:

```jsx
<div style={{
  display: 'flex',
  borderBottom: '1px solid #E8E8E8',
  backgroundColor: '#FFFFFF',
  marginBottom: 16,
  overflowX: 'auto',
  overflowY: 'hidden',
  scrollBehavior: 'smooth',
  WebkitOverflowScrolling: 'touch',
}}>
```

**STEP 2: Modify individual tab buttons to prevent flex shrinking**

Ensure each tab button cannot shrink below its natural width. Update the button style object (currently lines 290–300) to add:

```jsx
style={{
  padding: '12px 24px',
  background: 'none',
  border: 'none',
  borderBottom: activeTab === tab.key ? '2px solid #8B3A3A' : '2px solid transparent',
  color: activeTab === tab.key ? '#8B3A3A' : '#6B6B6B',
  fontWeight: activeTab === tab.key ? 600 : 400,
  fontSize: '0.875rem',
  cursor: 'pointer',
  transition: 'color 150ms, border-color 150ms',
  // NEW: Prevent flex shrink on mobile
  flexShrink: 0,
  whiteSpace: 'nowrap',
}}
```

**STEP 3: Add inline style for scrollbar visibility (optional, improve UX)**

Add a `<style>` tag at the end of the CoachDashboardPage component (before the closing `</div>`) to style the scrollbar on iOS and Android:

```jsx
<style>{`
  @supports (scrollbar-width: thin) {
    div[style*="overflowX: auto"] {
      scrollbar-width: thin;
      scrollbar-color: #D4D4D4 transparent;
    }
  }
  @supports selector(::-webkit-scrollbar) {
    div[style*="overflowX: auto"]::-webkit-scrollbar {
      height: 4px;
    }
    div[style*="overflowX: auto"]::-webkit-scrollbar-track {
      background: transparent;
    }
    div[style*="overflowX: auto"]::-webkit-scrollbar-thumb {
      background-color: #D4D4D4;
      border-radius: 2px;
    }
  }
`}</style>
```

### Design Tokens
- Container overflow: `overflowX: 'auto'`, `overflowY: 'hidden'`
- Scroll behavior: `scrollBehavior: 'smooth'`
- iOS momentum scroll: `WebkitOverflowScrolling: 'touch'`
- Button flex shrink: `flexShrink: 0`
- Button wrapping: `whiteSpace: 'nowrap'`
- Scrollbar color: `#D4D4D4` (light gray, from border palette)
- Border bottom color: `#E8E8E8` (existing border token)

### Edge Cases
- **Desktop (> 768px):** overflowX: 'auto' activates but no scrollbar appears because all tabs fit in width. Behavior is identical to current state.
- **Mobile landscape (landscape orientation, ~600px width):** All four tabs may still fit without scrolling depending on device. Scrolling activates only when needed.
- **Mobile portrait (< 360px):** All tabs remain visible and scrollable. Touch scrolling works smoothly due to WebkitOverflowScrolling: 'touch'.
- **Tab content change (clicking a tab):** Selected tab remains visible in the viewport after click. No need for scroll-into-view logic for this change.
- **Keyboard navigation:** Tab order remains correct. Arrow keys do not automatically scroll the tab bar (standard browser behavior).

### Risks
- **Risk: Horizontal scroll conflicts with page vertical scroll.** Mitigation: overflowY: 'hidden' on the tab container prevents interference. Parent page scroll remains unaffected.
- **Risk: Scrollbar visibility varies by browser.** Mitigation: The `<style>` tag provides scrollbar styling for Firefox (scrollbar-width) and Chrome/Safari (::-webkit-scrollbar). Safari on iOS does not show the scrollbar by default — momentum scroll feedback is sufficient.
- **Risk: Touch scroll may feel unresponsive on older Android.** Mitigation: WebkitOverflowScrolling: 'touch' enables momentum scroll on all iOS and modern Android browsers.
- **Testing:**
  - Test on mobile device: swipe left/right in tab bar, verify no page scroll
  - Test on mobile landscape: verify all tabs are accessible without scrolling if they fit
  - Test on tablet (iPad portrait): verify scrolling works if tabs exceed width
  - Test keyboard navigation: Tab key should move focus through tabs in order
  - Test on old Android device (if available): verify momentum scroll engages
  - Verify scrollbar appears on Firefox desktop (scrollbar-width)
  - Verify scrollbar hidden on Chrome desktop at rest, appears on hover

---

## CHANGE 4: Recruiting Intelligence Tab — Section Header for Upcoming Deadlines

### Component
- **Component name:** CoachRecruitingIntelPage (Recruiting Intelligence tab panel)
- **File location:** `src/pages/coach/CoachRecruitingIntelPage.jsx`
- **Line:** 159 (DeadlinePercentileTracker component invocation — needs section header above it)

### Current State

The circular countdown section (DeadlinePercentileTracker) appears at the top of the Recruiting Intelligence tab with no section header. The layout flows directly from the page title to the deadline circles.

Current structure around line 159:
```jsx
<DeadlinePercentileTracker deadlines={DEADLINES} />
{/* Content below */}
```

### Required Changes

**STEP 1: Add a section header above the DeadlinePercentileTracker component**

Before the line that invokes `<DeadlinePercentileTracker deadlines={DEADLINES} />`, insert a new section header div:

```jsx
{/* Section Header — Upcoming Deadlines */}
<h3 style={{
  fontSize: '0.875rem',
  fontWeight: 600,
  color: '#2C2C2C',
  margin: '0 0 12px 0',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
}}>
  Upcoming Deadlines
</h3>

<DeadlinePercentileTracker deadlines={DEADLINES} />
```

**Location:** Insert the new `<h3>` element immediately before the `<DeadlinePercentileTracker />` invocation (line 159).

**Rationale:**
- Matches existing section header pattern used in CoachSchoolDetailPanel (line 355–363: "Pre-Read Documents" header)
- Matches the pattern in DocumentsSection.jsx (line 104–110: section header for share buttons grid)
- Provides context for the circular countdown visualization
- Improves visual hierarchy and navigation cues on the Recruiting Intelligence tab

### Design Tokens
- Font size: `0.875rem` (14px)
- Font weight: `600` (semibold)
- Color: `#2C2C2C` (dark text — matches existing headers)
- Margin: `0 0 12px 0` (no top, 12px bottom spacing)
- Text transform: `uppercase`
- Letter spacing: `0.5px`

### Reference Pattern

This header style exactly matches the existing "Pre-Read Documents" section header in CoachSchoolDetailPanel (lines 355–363):

```jsx
<h4 style={{
  fontSize: '0.875rem',
  fontWeight: 600,
  color: '#2C2C2C',
  margin: '0 0 12px',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
}}>
  Pre-Read Documents
</h4>
```

The only differences in this spec are:
- Use `<h3>` tag (CoachSchoolDetailPanel uses `<h4>` because it's nested in a panel; CoachRecruitingIntelPage is at page level, so `<h3>` is appropriate for semantic HTML)
- Margin specified explicitly as `0 0 12px 0` (same value, more explicit)

### Edge Cases
- **Mobile viewport:** Header remains above the deadline circles. No layout conflict.
- **Long deadline list (future):** If more deadlines are added to the DEADLINES constant, the header remains a single line and the circle grid scales below it (DeadlinePercentileTracker already handles flex wrapping).
- **No deadlines edge case:** If DEADLINES array is empty, the header "Upcoming Deadlines" still renders above an empty DeadlinePercentileTracker container. This is acceptable (future: conditionally hide both if empty).

### Risks
- **Risk: Header appears but no visual change needed elsewhere.** This is a low-risk addition — pure styling, no data changes.
- **Testing:**
  - Verify header appears above deadline circles
  - Verify header text is uppercase and centered with circles
  - Verify spacing between header and circles is 12px (no overlap)
  - Test on mobile portrait and landscape — header should remain above circles

---

## Implementation Checklist

Before submitting for Chris approval, verify:

### Pre-implementation (Quill)
- [ ] All four changes have been reviewed by Chris
- [ ] No conflicting style updates to related components
- [ ] Design tokens are consistent with existing components

### Implementation (Nova)
- [ ] CHANGE 1: Document status badge inserted in CoachSchoolDetailPanel.jsx line 394+
  - [ ] Badge renders for all document types
  - [ ] Badge does not obscure mailto buttons
  - [ ] Badge styling matches token spec exactly
- [ ] CHANGE 2: Email buttons updated with display properties
  - [ ] Both mailto buttons have inline-flex + centering styles
  - [ ] minWidth: '80px' and height: '24px' applied to both
  - [ ] whiteSpace: 'nowrap' preserved
- [ ] CHANGE 3: Tab row scroll enabled on mobile
  - [ ] overflowX: 'auto' added to tab container
  - [ ] flexShrink: 0 + whiteSpace: 'nowrap' added to tab buttons
  - [ ] Scrollbar styling (Firefox + WebKit) in <style> tag
- [ ] CHANGE 4: Section header added to Recruiting Intelligence
  - [ ] Header appears above DeadlinePercentileTracker
  - [ ] Header style matches reference pattern exactly
  - [ ] Margin: 0 0 12px 0 creates correct spacing

### Testing (Quin)
- [ ] Playwright snapshots pass for all four changes
- [ ] Mobile breakpoints (320px, 480px, 768px, 1024px) verified
- [ ] Touch scroll behavior tested on physical mobile device
- [ ] Keyboard navigation and focus states maintained
- [ ] No regression in existing dashboard functionality

### Post-implementation
- [ ] All changes pushed to cfb-recruit-hub
- [ ] Dexter PASS gate cleared
- [ ] Retro scheduled if multi-agent involvement

---

## Build Authorization

This spec is ready for Nova execution **only after Chris approval**.

**Required approval checklist:**
- [ ] Chris has reviewed all four changes
- [ ] Chris confirms scope and timeline
- [ ] Chris approves design tokens and styling choices

---

**Specification drafted by:** Quill  
**Date:** 2026-04-04  
**Status:** Ready for Chris review  
**Next step:** Await Chris approval before passing to Nova
