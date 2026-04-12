# Admin Horizontal Scroll Unified Spec — OBJ-3

**Session:** 016-C WT-A  
**Objective:** Standardize horizontal scroll behavior across all admin tabs (Schools, Institutions, Users, Events)  
**Status:** Specification

---

## 1. Recommended Approach

**Use a CSS class in `src/index.css` named `.admin-scroll-wrap`**

**Rationale:** All admin styling is already inline in React components. A global CSS class provides:
- Single source of truth for scroll behavior
- Easier future theming (dark mode, etc.)
- Consistent application across all tabs without component refactoring
- Clean separation between component logic (state, data) and presentation (CSS)

Do NOT create a shared JS constant (`adminStyles.js`). Inline styles mixed with CSS classes in the same component create maintenance debt. Full CSS class is cleaner.

---

## 2. CSS Class Definition

Add this to `src/index.css` at the end of the file:

```css
/* ── ADMIN TABLE HORIZONTAL SCROLL ────────────────────────── */
.admin-scroll-wrap {
  overflow-x: auto;
  overflow-y: visible;
  border: 1px solid #E8E8E8;
  border-radius: 4px;
  background-color: #FFFFFF;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
  scroll-snap-type: x mandatory;
}

/* Hide scrollbar on desktop, show on mobile for clarity */
@media (min-width: 1024px) {
  .admin-scroll-wrap::-webkit-scrollbar {
    height: 6px;
  }
  .admin-scroll-wrap::-webkit-scrollbar-track {
    background: #F5F5F5;
  }
  .admin-scroll-wrap::-webkit-scrollbar-thumb {
    background: #D4D4D4;
    border-radius: 3px;
  }
  .admin-scroll-wrap::-webkit-scrollbar-thumb:hover {
    background: #A0A0A0;
  }
}
```

---

## 3. Property Breakdown

| Property | Value | Purpose |
|----------|-------|---------|
| `overflow-x` | `auto` | Enable horizontal scroll when table exceeds container width |
| `overflow-y` | `visible` | Prevent unintended vertical scroll |
| `border` | `1px solid #E8E8E8` | Consistent border with rest of admin UI |
| `border-radius` | `4px` | Matches button/input styling throughout app |
| `background-color` | `#FFFFFF` | White background for clean table appearance |
| `box-shadow` | `0 1px 3px rgba(0,0,0,0.05)` | Subtle depth, consistent with card pattern |
| `-webkit-overflow-scrolling` | `touch` | Enables momentum scrolling on iOS (native feel) |
| `scroll-behavior` | `smooth` | Smooth scroll on programmatic scroll operations |
| `scroll-snap-type` | `x mandatory` | Optional: forces snap-to-column on scroll (can remove if jittery) |

**Scrollbar styling (desktop only):**
- Height: 6px (thin, unobtrusive)
- Track: #F5F5F5 (light gray background)
- Thumb: #D4D4D4 (medium gray, matching borders)
- Hover: #A0A0A0 (darker gray for interaction feedback)

---

## 4. Application Instructions

### Step 1: Update `src/index.css`
Add the CSS class block above to the end of `src/index.css`, after line 118.

### Step 2: Update `SchoolsTableEditor.jsx`
**Target:** Line 279 (current scroll wrapper div)

**Before:**
```jsx
<div style={{ overflowX: 'auto', border: '1px solid #E8E8E8', borderRadius: 4 }}>
```

**After:**
```jsx
<div className="admin-scroll-wrap">
```

**Why:** SchoolsTableEditor is missing `backgroundColor` and `boxShadow` from the pattern. The CSS class provides the complete, consistent set.

### Step 3: Update `AdminTableEditor.jsx`
**Target:** Lines 251-259 (current scroll wrapper div)

**Before:**
```jsx
<div
  style={{
    overflowX: 'auto',
    border: '1px solid #E8E8E8',
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  }}
>
```

**After:**
```jsx
<div className="admin-scroll-wrap">
```

**Verify:** All inline styles are removed and replaced with className. Inline properties moved to CSS.

### Step 4: Future Rollout (if AdminInstitutionsTab, AdminUsersTab, AdminRecruitingEventsTab need independent scroll wrappers)
If those tabs use AdminTableEditor (which they should), they inherit the scroll behavior automatically. No changes needed.

If any tab has a custom scroll wrapper with inline styles, apply the same replacement: remove inline styles, add `className="admin-scroll-wrap"`.

---

## 5. Mobile & Accessibility Behavior

| Device | Behavior |
|--------|----------|
| **Desktop (≥1024px)** | Scrollbar visible (6px height, styled gray). Smooth scroll on arrow key navigation. Scroll-snap optional (users can disable if performance issue). |
| **Tablet (768px–1023px)** | Touch-scrollable. Momentum scrolling enabled via `-webkit-overflow-scrolling: touch`. Scrollbar visible. |
| **Mobile (<768px)** | Touch-scrollable. Momentum scrolling enabled. No scrollbar (native browser default). Table columns scale or wrap if possible; if not, user scrolls horizontally. |

**Keyboard Navigation:**
- Arrow keys (← →): User can navigate horizontally via `scroll-behavior: smooth`
- Tab key: Focus moves through editable cells left-to-right, horizontal scroll follows focus
- No explicit ARIA needed; semantic `<table>` + standard scrolling is sufficient

**Accessibility Notes:**
- Scrollable region is a container `<div>`, not a scroll region requiring explicit `role="region"` (semantic `<table>` inside is already understood)
- If a future requirement demands explicit ARIA, add `role="region" aria-label="Schools table"` to the `.admin-scroll-wrap` div per design decision
- High contrast scrollbar colors (#D4D4D4, #A0A0A0) meet WCAG AA threshold

---

## 6. Testing Checklist (Nova / QA)

Before committing, verify:

- [ ] CSS class added to `src/index.css` end (after line 118)
- [ ] SchoolsTableEditor.jsx line 279: inline styles removed, `className="admin-scroll-wrap"` applied
- [ ] AdminTableEditor.jsx lines 251-259: inline styles removed, `className="admin-scroll-wrap"` applied
- [ ] No other admin tabs reference inline scroll styles (grep for `overflowX: 'auto'` in admin components)
- [ ] npm run dev: Schools tab renders, table scrolls horizontally, no layout shift
- [ ] npm run dev: Other admin tabs still render correctly (Institutions, Users, Events)
- [ ] Desktop scrollbar visible at 1024px+ width (gray color, 6px height, hover effect works)
- [ ] Mobile (320px): Table scrolls left-right without horizontal window scroll
- [ ] Tablet (768px): Touch scrolling smooth, momentum enabled
- [ ] Edit functionality unchanged (click-to-edit, Save/Cancel buttons work during scroll)

---

## 7. Scope & Limitations

- **In scope:** Horizontal scroll container styling only. Table layout, cell editing, column sorting unchanged.
- **Out of scope:** Scroll shadows (left/right fade gradients). Complexity not warranted for this MVP. Can add post-launch if UX testing indicates need.
- **No breaking changes:** CSS class is additive. Component state, props, event handlers unchanged.
- **No Tailwind dependency:** All inline styles → CSS class. App remains 100% inline styling + global CSS.

---

## 8. Rollout Sequence

1. **Nova:** Add CSS class to `src/index.css`
2. **Nova:** Update SchoolsTableEditor.jsx
3. **Nova:** Update AdminTableEditor.jsx
4. **Nova:** Run `npm run dev`, verify Schools & other admin tabs scroll correctly
5. **Quin (optional):** Run existing admin table tests; confirm no breakage
6. **Nova:** Commit: `"feat: unified horizontal scroll class for admin tables"`
7. **Chris:** Review, approve, push

---

## 9. Future Enhancements (BACKLOG)

- **Scroll shadows:** Add left/right fade gradients using `background-image: linear-gradient(...)` if users report difficulty seeing overflow
- **Scroll indicator:** Top-right badge showing "scroll right →" on narrow viewports (requires JS, deferred)
- **Sticky columns:** Left-lock School name column while scrolling (Design 8 feature, future sprint)
- **Resizable columns:** Allow users to adjust column width (Future, lower priority)

---

## Notes for Nova

- Test in Edge, Chrome, Safari (for `-webkit-overflow-scrolling` compatibility)
- The `scroll-snap-type: x mandatory` can be removed if it feels jittery on scroll; test both before deciding
- Inline styles in AdminTableEditor (lines 251-259) are the reference—match those properties exactly in the CSS class
- SchoolsTableEditor wrapper is missing background & shadow—this spec fixes that inconsistency

**End Spec**
