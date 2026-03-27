# Tier 2 UX Specification — gritty-recruit-hub-rebuild
**Generated:** 2026-03-26
**For:** Chris (Approval Gate before Nova implementation)
**Source:** VAULT_CFB_ASSET_RETRIEVAL.md + Phase 1 MVP Review
**Status:** Ready for review

---

## Overview

This spec covers all 7 Tier 2 UX components required for Phase 1 MVP completion. Each component is extracted from cfb-recruit-hub or hs-fbcoach-dash, adapted to the rebuild's React + Supabase architecture, and specified in sufficient detail for Nova to implement without guessing.

**Design system baseline:**
- Dark theme: `--bg: #080d0a`, `--surface: #0e1510`, `--accent: #6ed430` (green)
- Font stack: Barlow (body), Barlow Condensed (labels/badges)
- Loaded via Google CDN in `src/index.css`

---

## ITEM 1: ANIMATED HELMET LOGIN ENTRANCE

**Purpose:** Branded entrance animation on first login. Helmet image appears at viewport center, bounces twice (2.8s CSS keyframe), then flies to Need Help button and fades out.

**Component File:** `src/components/HelmetAnim.jsx` (new)

**Assets Required:**
- `public/helmet.png` — 1080×1350 RGBA PNG (render size: 200×250)
  - Copy from `C:\Users\chris\dev\cfb-recruit-hub\public\helmet.png` to rebuild `/public/helmet.png`

**Component Props:**
```typescript
interface HelmetAnimProps {
  targetId: string;      // Button ID to fly toward (e.g. "tutHelpBtn")
  onDone?: () => void;   // Callback when animation completes
}
```

**Component Implementation:**

```jsx
import { useEffect, useRef } from "react";
import helmetSrc from "../assets/helmet.png";

const W = 200, H = 250;

export default function HelmetAnim({ targetId, onDone }) {
  const elRef     = useRef(null);
  const onDoneRef = useRef(onDone);
  const started   = useRef(false);

  // Keep ref current without re-triggering effect
  onDoneRef.current = onDone;

  useEffect(() => {
    // Guard: run only once even under React StrictMode double-invocation
    if (started.current) return;
    started.current = true;

    const el = elRef.current;
    if (!el) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    el.style.left      = `${vw / 2 - W / 2}px`;
    el.style.top       = `${vh / 2 - H / 2}px`;
    el.style.display   = "block";
    el.style.animation = "helmetReveal 2.8s ease forwards";

    function onAnimEnd() {
      el.style.animation = "none";
      el.style.display   = "block";
      void el.offsetHeight; // force reflow

      const btn = document.getElementById(targetId);
      if (!btn) {
        onDoneRef.current?.();
        return;
      }

      const br = btn.getBoundingClientRect();
      const dx = (br.left + br.width  / 2) - (vw / 2);
      const dy = (br.top  + br.height / 2) - (vh / 2);

      // Double rAF: ensures repaint before transition starts
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.transition = "transform 1.1s cubic-bezier(0.25,0.1,0.6,1), opacity 0.5s ease 0.6s";
        el.style.transform  = `translate(${dx}px, ${dy}px) scale(0.12)`;
        el.style.opacity    = "0";
      }));

      setTimeout(() => onDoneRef.current?.(), 1300);
    }

    el.addEventListener("animationend", onAnimEnd, { once: true });
  }, []);

  return (
    <div ref={elRef} className="helmet-anim" aria-hidden="true">
      <img src={helmetSrc} alt="" draggable="false" />
    </div>
  );
}
```

**CSS to add to `src/index.css`:**

```css
/* ── HELMET ANIMATION ──────────────────────────────────────────────── */
.helmet-anim {
  position: fixed;
  display: none;
  pointer-events: none;
  z-index: 9999;
  width: 200px;
  height: 250px;
  transform-origin: center center;
}
.helmet-anim img {
  width: 100%; height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 14px 36px rgba(0,0,0,0.55));
}

@keyframes helmetReveal {
  0%   { transform: translateY(0px)   scale(0.08, 0.08) rotate(-12deg); opacity: 0; }
  18%  { transform: translateY(0px)   scale(1.08, 1.08) rotate(2deg);   opacity: 1; }
  26%  { transform: translateY(0px)   scale(1.00, 1.00) rotate(0deg); }
  38%  { transform: translateY(-32px) scale(1.00, 1.00) rotate(0deg); }
  48%  { transform: translateY(5px)   scale(1.05, 0.91) rotate(0deg); }
  58%  { transform: translateY(-16px) scale(1.00, 1.00) rotate(0deg); }
  66%  { transform: translateY(2px)   scale(1.01, 0.98) rotate(0deg); }
  74%  { transform: translateY(0px)   scale(1.00, 1.00) rotate(0deg); }
  100% { transform: translateY(0px)   scale(1.00, 1.00) rotate(0deg); opacity: 1; }
}
```

**Integration Point:** In `App.jsx` (or whichever component guards the login redirect):

```jsx
const [showHelmetAnim, setShowHelmetAnim] = useState(false);

// On first login success:
setShowHelmetAnim(true);

// Then in JSX:
{showHelmetAnim && (
  <HelmetAnim
    targetId="tutHelpBtn"
    onDone={() => setShowHelmetAnim(false)}
  />
)}
```

---

## ITEM 2: LEAFLET CLUSTERING (GritFitMapView + BrowseMapPage)

**Purpose:** Interactive maps with dark forest green marker clusters (28/34/40px sizing based on marker count), maxClusterRadius 40, showing school divisions (browse) or GRIT FIT match tiers (quicklist mode).

**Component Files:**
- `src/components/GritFitMapView.jsx` (new) — Map for GRIT FIT results
- `src/components/BrowseMapPage.jsx` (new) — Map for school browsing
- Both share same clustering logic; mode differs by `results` prop

**Dependencies:**
```bash
npm install leaflet leaflet.markercluster
npm install --save-dev @types/leaflet @types/leaflet.markercluster
```

**CSS imports to add to `src/index.css`:**

```javascript
// In React component file:
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
```

**Map initialization:**

```jsx
import L from "leaflet";
import "LC.markercluster";

const leafletRef = useRef(null);

useEffect(() => {
  const mapElement = document.getElementById("mapContainer");
  if (!mapElement) return;

  // Create map
  leafletRef.current = L.map(mapElement, {
    center: [38.5, -96],
    zoom: 4,
    zoomControl: true,
    tap: false,
    closePopupOnClick: false,
  });

  // Add CARTO dark tiles
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 18,
  }).addTo(leafletRef.current);
}, []);
```

**Marker icon factory:**

```jsx
// Color assignments by division (browse mode) or tier (quicklist mode)
const DIV_COLORS = {
  "Power 4":   "#f5a623",   // orange
  "G5":        "#4fc3f7",   // cyan
  "FBS Ind":   "#ce93d8",   // purple
  "FCS":       "#81c784",   // green
  "D2":        "#ef9a9a",   // pink
  "D3":        "#b0bec5",   // gray
};

const TIER_COLOR = {
  top:        "#6ed430",    // green (rebuild accent)
  good:       "#f5a623",    // gold
  borderline: "#ef5350",    // red
};

function makeIcon(color, size = 10) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:1.5px solid rgba(255,255,255,0.5);
      box-shadow:0 0 4px ${color}88;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
  });
}

// Usage:
const icon = mode === "quicklist"
  ? makeIcon(TIER_COLOR[school.matchTier], 13)
  : makeIcon(DIV_COLORS[school.Type], 9);
```

**Cluster group configuration:**

```jsx
const cluster = L.markerClusterGroup({
  maxClusterRadius: 40,
  iconCreateFunction: (c) => {
    const n = c.getChildCount();
    const sz = n < 10 ? 28 : n < 50 ? 34 : 40;
    return L.divIcon({
      html: `<div style="
        width:${sz}px;height:${sz}px;border-radius:50%;
        background:rgba(46,107,24,0.85);border:2px solid #6ed430;
        display:flex;align-items:center;justify-content:center;
        color:#c8f5a0;font-size:${sz < 34 ? 11 : 13}px;font-weight:bold;font-family:'Barlow Condensed',monospace;
      ">${n}</div>`,
      className: "",
      iconSize: [sz, sz],
      iconAnchor: [sz/2, sz/2],
    });
  },
});
```

**Marker creation and clustering:**

```jsx
schools.forEach(school => {
  // Determine color and size based on mode
  let color, size;
  if (mode === "quicklist" && results) {
    const scored = results[school.UNITID];
    if (!scored?.matchTier) return; // hide non-matching schools
    color = TIER_COLOR[scored.matchTier];
    size = scored.matchTier === "top" ? 13 : scored.matchTier === "good" ? 11 : 10;
  } else {
    color = DIV_COLORS[school.Type] || "#888";
    size = 9;
  }

  const marker = L.marker([school.Latitude, school.Longitude], { icon: makeIcon(color, size) });
  marker.bindPopup(popupContent, { maxWidth: 300, autoPan: false });
  cluster.addLayer(marker);
});

leafletRef.current.addLayer(cluster);
```

**Map legend overlay (quicklist mode only):**

```jsx
{mode === "quicklist" && results && (
  <div style={{
    position: "absolute", bottom: 16, left: 16, zIndex: 1000,
    background: "rgba(8,13,10,0.92)", border: "1px solid #1e2e21",
    borderRadius: 6, padding: "10px 14px",
    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
  }}>
    <div style={{ color: "#6ed430", marginBottom: 6, letterSpacing: 2, fontWeight: 700 }}>MAP LEGEND</div>
    {[
      { color: TIER_COLOR.top,        label: "Top match (1–30)" },
      { color: TIER_COLOR.good,       label: "Good match (31–40)" },
      { color: TIER_COLOR.borderline, label: "Borderline (41–50)" },
      { color: "#1c2a1e",             label: "Not eligible" },
    ].map(({ color, label }) => (
      <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, border: "1px solid rgba(255,255,255,0.3)" }} />
        <span style={{ color: "#6b8c72" }}>{label}</span>
      </div>
    ))}
  </div>
)}
```

---

## ITEM 3: SCHOOL DETAIL CARD (Map Popup)

**Purpose:** Rich popup card shown on school marker click. Displays school name/location, 8-stat 2-column grid, optional GRIT FIT scoring section, recruiting links, and add-to-shortlist button.

**Integration Point:** Rendered as Leaflet popup (HTML string + CSS styling). In a React context, consider using a React portal wrapper or window global for button handlers.

**Popup HTML template (full string construction):**

```jsx
let popupContent = `
  <div class="popup-header">
    <div class="popup-school-name">${schoolName}</div>
    <div class="popup-location">${school["City/Location"] || ""}, ${school.State || ""}</div>
    <div class="popup-tier-badge" style="background:${DIV_COLORS[school.Type] || "#888"}">${school.Type}</div>
  </div>
  <div class="popup-body">
    <div class="popup-grid">
      <div class="popup-stat">
        <div class="popup-stat-label">Conference</div>
        <div class="popup-stat-value">${school.Conference || ""}</div>
      </div>
      <div class="popup-stat">
        <div class="popup-stat-label">Admissions Select.</div>
        <div class="popup-stat-value">${school["School Type"] || ""}</div>
      </div>
      <div class="popup-stat">
        <div class="popup-stat-label">ADLTV</div>
        <div class="popup-stat-value">${school.ADLTV ? "$" + Math.round(school.ADLTV).toLocaleString() : "—"}</div>
      </div>
      <div class="popup-stat">
        <div class="popup-stat-label">ADLTV Rank</div>
        <div class="popup-stat-value">${school.ADLTV_Rank ? "#" + school.ADLTV_Rank : "—"}</div>
      </div>
      <div class="popup-stat">
        <div class="popup-stat-label">Admission Rate</div>
        <div class="popup-stat-value">${school.Admission_Rate || "—"}</div>
      </div>
      <div class="popup-stat">
        <div class="popup-stat-label">Graduation Rate</div>
        <div class="popup-stat-value">${school.Graduation_Rate || "—"}</div>
      </div>
      <div class="popup-stat">
        <div class="popup-stat-label">COA (Out-of-State)</div>
        <div class="popup-stat-value">${school.COA ? "$" + Math.round(school.COA).toLocaleString() : "—"}</div>
      </div>
      <div class="popup-stat">
        <div class="popup-stat-label">Est. Avg Merit</div>
        <div class="popup-stat-value">${school.Avg_Merit ? "$" + Math.round(school.Avg_Merit).toLocaleString() : "—"}</div>
      </div>
    </div>
`;

// Quicklist match section (conditional, shown only when scored exists)
if (scored?.matchTier) {
  const tierLabel = scored.matchTier === "top" ? "TOP MATCH" : scored.matchTier === "good" ? "GOOD MATCH" : "BORDERLINE";
  const tierCol   = TIER_COLOR[scored.matchTier];
  popupContent += `
    <hr style="border:none;border-top:1px solid var(--border);margin:8px 0;"/>
    <div style="color:${tierCol};font-weight:bold;margin-bottom:6px;font-family:'Barlow Condensed',sans-serif;font-size:13px;letter-spacing:1px;">✓ #${scored.matchRank} — ${tierLabel}</div>
    <div class="popup-grid">
      <div class="popup-stat"><div class="popup-stat-label">Acad Fit</div><div class="popup-stat-value">${scored.acadScore?.toFixed(3)}</div></div>
      <div class="popup-stat"><div class="popup-stat-label">Ath Fit</div><div class="popup-stat-value">${scored.athFitScore?.toFixed(3)}</div></div>
      <div class="popup-stat"><div class="popup-stat-label">Distance</div><div class="popup-stat-value">${scored.dist} mi</div></div>
      ${scored.netCost != null ? `<div class="popup-stat"><div class="popup-stat-label">Est Net Cost</div><div class="popup-stat-value">$${Math.round(scored.netCost).toLocaleString()}</div></div>` : ""}
      ${scored.droi != null ? `<div class="popup-stat"><div class="popup-stat-label">DROI</div><div class="popup-stat-value">${scored.droi.toFixed(1)}×</div></div>` : ""}
    </div>
  `;
}

// Links section (recruiting Q + coach page)
if (qLink || coachLink) {
  popupContent += `<div class="popup-unitid">`;
  if (qLink)     popupContent += `<a href="${qLink}"     target="_blank" class="popup-link">📋 Recruiting Questionnaire</a>`;
  if (coachLink) popupContent += `<a href="${coachLink}" target="_blank" class="popup-link">🏈 Coaching Staff</a>`;
  popupContent += `</div>`;
}

// Short List button
const inList = shortListIds.map(String).includes(String(school.UNITID));
popupContent += `
  <div style="padding:8px 14px 14px">
    <button
      onclick="window.__toggleShortList('${school.UNITID}')"
      class="popup-sl-btn${inList ? " popup-sl-btn--added" : ""}"
    >${inList ? "✓ In Short List" : "+ Add to Short List"}</button>
  </div>
`;
```

**CSS to add to `src/index.css`:**

```css
.leaflet-popup-content-wrapper {
  background: var(--surface) !important;
  border: 1px solid var(--border) !important;
  border-radius: 4px !important;
  box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important;
  padding: 0 !important;
}
.leaflet-popup-tip { background: var(--surface) !important; }
.leaflet-popup-content { margin: 0 !important; width: min(300px, calc(100vw - 40px)) !important; }

@media (max-width: 768px) {
  .leaflet-popup-content-wrapper { max-height: 70vh !important; overflow-y: auto !important; }
}
.leaflet-popup-close-button { color: var(--muted) !important; top: 8px !important; right: 8px !important; font-size: 18px !important; }
.leaflet-popup-close-button:hover { color: var(--text) !important; }

.popup-header { background: var(--surface2); padding: 12px 14px; border-bottom: 1px solid var(--border); }
.popup-school-name { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 16px; color: var(--text); line-height: 1.2; margin-bottom: 3px; }
.popup-location { font-size: 12px; color: var(--muted); margin-bottom: 4px; }
.popup-tier-badge {
  display: inline-block; padding: 2px 8px; border-radius: 2px;
  font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #000;
}
.popup-body { padding: 12px 14px; }
.popup-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
.popup-stat-label { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: var(--muted); margin-bottom: 2px; font-family: 'Barlow Condensed', sans-serif; }
.popup-stat-value { font-family: 'Barlow Condensed', sans-serif; font-size: 14px; font-weight: 600; color: var(--text); }
.popup-unitid { font-size: 11px; color: var(--muted); padding-top: 8px; border-top: 1px solid var(--border); margin-top: 4px; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.popup-link,
.leaflet-popup-content .popup-link {
  display: inline-block; padding: 5px 12px; margin-top: 10px;
  background: #2e6b18; border: 1px solid #2e6b18; color: #c8f5a0 !important;
  font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
  text-decoration: none; border-radius: 2px; transition: background 0.15s;
}
.popup-link:hover,
.leaflet-popup-content .popup-link:hover { background: #3a8a1e; border-color: #3a8a1e; color: #c8f5a0 !important; }

.popup-sl-btn {
  width: 100%; padding: 10px;
  background: var(--surface2); border: 1px solid var(--border); color: var(--text);
  font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 1px;
  text-transform: uppercase; border-radius: 2px; cursor: pointer; transition: background 0.15s;
}
.popup-sl-btn:hover {
  background: #2e6b18; border-color: #2e6b18; color: #c8f5a0;
}
.popup-sl-btn--added {
  background: #2e6b18; border-color: #2e6b18; color: #c8f5a0;
}
```

**Global handler for shortlist toggle:**

In `App.jsx` (or a central event handler), inject a global function:

```jsx
useEffect(() => {
  window.__toggleShortList = (unitid) => {
    // Dispatch Redux action or call API to toggle shortlist
    toggleShortList(unitid);
  };
  return () => delete window.__toggleShortList;
}, []);
```

**Data source:**
- School data from Supabase `schools` table (all 661+ schools with division, stats)
- Scored results (in quicklist mode) passed as a `results` object keyed by `UNITID`
- Shortlist IDs from user's profile or Redux state

---

## ITEM 4: ATHLETIC / ACADEMIC SCORE HEADER FRAME

**Purpose:** Three-metric dashboard displayed at the top of the GRIT FIT results page, showing Athletic Fit Score, Academic Rigor Score, and Test Optional Score (all percentage-based).

**Component File:** `src/components/GritFitScoreDashboard.jsx` (new)

**Component Props:**
```typescript
interface GritFitScoreDashboardProps {
  scores: {
    athleticFit: number | null;     // 0–1 (rendered as %)
    academicRigor: number | null;   // 0–1
    testOptional: number | null;    // 0–1
  };
  studentName?: string;              // Optional: "${name}'s GRIT FIT Results"
}
```

**Component JSX:**

```jsx
export default function GritFitScoreDashboard({ scores, studentName }) {
  const athFitPct   = scores.athleticFit != null ? (scores.athleticFit * 100).toFixed(1) : null;
  const rigorPct    = scores.academicRigor != null ? (scores.academicRigor * 100).toFixed(1) : null;
  const testOptPct  = scores.testOptional != null ? (scores.testOptional * 100).toFixed(1) : null;

  return (
    <div>
      <div className="ql-table-header" style={{ color: "#ffffff" }}>
        {studentName ? `${studentName}'s GRIT FIT Results` : "GRIT FIT Results"}
      </div>
      <div style={{ fontSize: 12, color: "#c8f5a0", fontFamily: "'Barlow', sans-serif", fontWeight: 400, marginBottom: 16, marginTop: -4, textAlign: "center" }}>
        Your personalized target college football recruiting matches
      </div>

      <div className="ql-dashboard">
        <div className="ql-metric">
          <div className="ql-metric-icon">&#127944;</div>
          <div className="ql-metric-label">My Athletic Score</div>
          <div className="ql-metric-value">{athFitPct != null ? `${athFitPct}%` : "—"}</div>
          <div className="ql-metric-sub">Compared to My Matched Schools</div>
        </div>
        <div className="ql-metric">
          <div className="ql-metric-icon">&#128218;</div>
          <div className="ql-metric-label">My Academic Rigor Score</div>
          <div className="ql-metric-value">{rigorPct != null ? `${rigorPct}%` : "—"}</div>
          <div className="ql-metric-sub">SAT + GPA composite</div>
        </div>
        <div className="ql-metric">
          <div className="ql-metric-icon">&#9999;&#65039;</div>
          <div className="ql-metric-label">My Test Optional Score</div>
          <div className="ql-metric-value">{testOptPct != null ? `${testOptPct}%` : "—"}</div>
          <div className="ql-metric-sub">GPA-only score</div>
        </div>
      </div>
    </div>
  );
}
```

**CSS to add to `src/index.css`:**

```css
.ql-table-header {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 56px;
  letter-spacing: 1px;
  color: var(--accent);
  margin-bottom: 4px;
  font-weight: 700;
  text-transform: uppercase;
  padding-top: 20px;
  text-align: center;
  line-height: 1.05;
}

.ql-dashboard {
  display: flex;
  gap: 16px;
  padding: 20px 0 16px;
  flex-wrap: wrap;
}
.ql-metric {
  flex: 1;
  min-width: 140px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ql-metric-icon { font-size: 20px; margin-bottom: 4px; }
.ql-metric-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--muted);
}
.ql-metric-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: var(--accent);
  line-height: 1.1;
}
.ql-metric-sub {
  font-family: 'Barlow', sans-serif;
  font-size: 11px;
  color: var(--muted);
}

/* Mobile */
@media (max-width: 768px) {
  .ql-table-header { font-size: 36px; padding-top: 14px; }
  .ql-dashboard { gap: 10px; padding: 14px 0 12px; }
  .ql-metric { min-width: calc(50% - 8px); padding: 10px 12px; }
  .ql-metric-value { font-size: 22px; }
}
@media (max-width: 480px) {
  .ql-metric { min-width: 100%; }
}
```

**Integration Point:** In `GritFitResultsPage.jsx`:

```jsx
<GritFitScoreDashboard
  scores={{
    athleticFit: results.athFit ? results.athFit[results.topTier] : null,
    academicRigor: results.acadRigorScore,
    testOptional: results.acadTestOptScore,
  }}
  studentName={userProfile.first_name}
/>

{/* Results table follows below */}
```

---

## ITEM 5: MONEY MAP CHART DISPLAY

**Purpose:** Four collapsible panels (Lowest Net Cost, Highest ADLTV, Fastest Payback, Best ROI) showing bar charts with school rankings. Placement: above the sortable shortlist table on the ShortList page.

**Component File:** `src/components/MoneyMap.jsx` (new)

**Component Props:**
```typescript
interface MoneyMapProps {
  shortList: Array<{
    UNITID: number;
    _schoolName: string;
    netCost?: number;
    adltv?: number;
    droi?: number;
    breakEven?: number;
  }>;
}
```

**Component JSX:**

```jsx
import { useState } from "react";

export default function MoneyMap({ shortList }) {
  const [isOpen, setIsOpen] = useState(true);

  const panels = [
    {
      id: "cost",
      title: "Lowest Net Cost",
      sub: "4-year projected cost",
      items: [...shortList]
        .filter(s => s.netCost != null && s.netCost > 0)
        .sort((a, b) => a.netCost - b.netCost)
        .slice(0, 8),
      key: "netCost",
      fmt: v => "$" + Math.round(v / 1000) + "K",
      color: "#6ed430",
      inverted: true,
    },
    {
      id: "adltv",
      title: "Highest ADLTV",
      sub: "Adjusted degree lifetime value",
      items: [...shortList]
        .filter(s => s.adltv != null && s.adltv > 0)
        .sort((a, b) => b.adltv - a.adltv)
        .slice(0, 8),
      key: "adltv",
      fmt: v => "$" + Math.round(v / 1000) + "K",
      color: "#4fc3f7",
      inverted: false,
    },
    {
      id: "payback",
      title: "Fastest Payback",
      sub: "Years to break even",
      items: [...shortList]
        .map(s => {
          const be = (s.breakEven != null && s.breakEven > 0) ? s.breakEven
            : (s.droi != null && s.droi > 0) ? 40 / s.droi : null;
          return { ...s, breakEven: be };
        })
        .filter(s => s.breakEven != null && s.breakEven > 0 && s.breakEven < 200)
        .sort((a, b) => a.breakEven - b.breakEven)
        .slice(0, 8),
      key: "breakEven",
      fmt: v => v.toFixed(1) + " yr",
      color: "#f5a623",
      inverted: true,
    },
    {
      id: "roi",
      title: "Best ROI",
      sub: "Degree return on investment",
      items: [...shortList]
        .filter(s => s.droi != null && s.droi > 0)
        .sort((a, b) => b.droi - a.droi)
        .slice(0, 8),
      key: "droi",
      fmt: v => v.toFixed(1) + "x",
      color: "#ce93d8",
      inverted: false,
    },
  ];

  return (
    <div className="money-map">
      {/* Toggle header */}
      <div className="sl-section-toggle" onClick={() => setIsOpen(v => !v)}>
        <span>Short List Money Map</span>
        <span>{isOpen ? "▲" : "▼"}</span>
      </div>

      {/* Panels grid */}
      {isOpen && (
        <div className="money-map-grid">
          {panels.map(panel => {
            if (!panel.items.length) {
              return (
                <div key={panel.id} className="money-map-panel">
                  <div className="money-map-panel-title" style={{ color: panel.color }}>{panel.title}</div>
                  <div className="money-map-panel-sub">{panel.sub}</div>
                  <div style={{ color: "#2a3a2e", fontSize: 11, fontFamily: "'Barlow',sans-serif", paddingTop: 8 }}>
                    Add schools with financial data to see this chart.
                  </div>
                </div>
              );
            }
            const values = panel.items.map(s => s[panel.key]);
            const maxVal = Math.max(...values);
            const minVal = Math.min(...values);
            const range  = maxVal - minVal || 1;
            return (
              <div key={panel.id} className="money-map-panel">
                <div className="money-map-panel-title" style={{ color: panel.color }}>{panel.title}</div>
                <div className="money-map-panel-sub">{panel.sub}</div>
                {panel.items.map(s => {
                  const v = s[panel.key];
                  const pct = panel.inverted
                    ? ((maxVal - v) / range) * 100
                    : ((v - minVal) / range) * 100;
                  return (
                    <div key={s.UNITID} className="money-map-bar-row">
                      <div className="money-map-bar-label">{(s._schoolName || "").slice(0, 18)}</div>
                      <div className="money-map-bar-track">
                        <div className="money-map-bar-fill" style={{ width: Math.max(pct, 5) + "%", background: panel.color }} />
                      </div>
                      <div className="money-map-bar-val" style={{ color: panel.color }}>{panel.fmt(v)}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

**CSS to add to `src/index.css`:**

```css
.money-map { margin-bottom: 24px; }
.money-map-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
@media (max-width: 1100px) { .money-map-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px)  { .money-map-grid { grid-template-columns: 1fr; } }

.money-map-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 12px;
}
.money-map-panel-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 2px;
}
.money-map-panel-sub {
  font-family: 'Barlow', sans-serif;
  font-size: 10px;
  color: var(--muted);
  margin-bottom: 10px;
}
.money-map-bar-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.money-map-bar-label {
  font-family: 'Barlow', sans-serif;
  font-size: 10px;
  color: var(--muted);
  width: 86px;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.money-map-bar-track {
  flex: 1;
  height: 8px;
  background: var(--bg);
  border-radius: 2px;
  overflow: hidden;
}
.money-map-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}
.money-map-bar-val {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  font-weight: 700;
  width: 52px;
  text-align: right;
  flex-shrink: 0;
}

.sl-section-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  cursor: pointer;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--text);
}
.sl-section-toggle:hover { color: var(--accent); }
```

**Integration Point:** In `ShortListPage.jsx`:

```jsx
import MoneyMap from "../components/MoneyMap";

export default function ShortListPage() {
  const shortList = /* fetch from Supabase or Redux */;

  return (
    <div className="page-container">
      <h1>Your Short List</h1>

      <MoneyMap shortList={shortList} />

      {/* Sortable table below */}
    </div>
  );
}
```

---

## ITEM 6: NEED HELP TUTORIAL (Collapsible Section)

**Purpose:** Modal-based tutorial walkthrough with two slide decks (Browse mode: 5 slides, GRIT FIT mode: 5 slides). Triggered by "Need Help" button. Displays walkthrough content, pagination dots, navigation buttons, and final CTA split.

**Component File:** `src/components/Tutorial.jsx` (new)

**Slide content structure:**

```jsx
const BROWSE_SLIDES = [
  {
    num: "01/05",
    title: "Welcome to GrittyOS CFB Recruit Hub",
    body: "Explore a map of 661+ college football programs across all divisions. Each school is color-coded by division tier and filterable by conference, selectivity, ADLTV rank, and more.",
    extra: <TutorialDivisionLegend />,
    tip: "Tip: Click on any school to see detailed stats, recruiting questionnaire links, and coaching staff pages.",
  },
  {
    num: "02/05",
    title: "Understanding the Data",
    body: "Each school card shows key financial and academic metrics:",
    extra: (
      <ul className="tut-list">
        <li><strong>COA (Out-of-State):</strong> Cost of Attendance for non-residents</li>
        <li><strong>ADLTV:</strong> Adjusted Degree Lifetime Value (earning potential post-graduation)</li>
        <li><strong>ADLTV Rank:</strong> National ranking by ADLTV</li>
        <li><strong>Admissions Selectivity:</strong> Admission rate tier</li>
      </ul>
    ),
    tip: null,
  },
  {
    num: "03/05",
    title: "Filtering & Browsing",
    body: "Use the sidebar filters to narrow your search:",
    extra: (
      <ul className="tut-list">
        <li>Division Tier (Power 4, G5, FBS Ind, FCS, D2, D3)</li>
        <li>Admissions Selectivity</li>
        <li>Conference</li>
        <li>ADLTV Rank</li>
        <li>State</li>
        <li>Search by school name</li>
      </ul>
    ),
    tip: null,
  },
  {
    num: "04/05",
    title: "My GRIT Fit",
    body: "After you enter your profile (GPA, test scores, athletic stats), the app shows your personalized match tier for each school: green (top match), gold (good match), or red (borderline).",
    extra: null,
    tip: "Tip: Your profile saves on our secure server — coaches can request to view your contact info with your permission.",
  },
  {
    num: "05/05",
    title: "Choose Your Path",
    body: "You can explore the map casually, or get a personalized GRIT FIT score to see exactly which schools are the best match for your athletic and academic profile.",
    extra: null,
    tip: null,
  },
];

const QL_SLIDES = [
  {
    num: "01/05",
    title: "What is My GRIT Fit?",
    body: "GRIT Fit is your personalized college recruiting match score. It measures three dimensions:",
    extra: (
      <ul className="tut-list">
        <li><strong>Athletic Score:</strong> Your athletic performance vs. the team's recruiting targets</li>
        <li><strong>Academic Rigor Score:</strong> Your GPA + test scores vs. admitted students</li>
        <li><strong>Test Optional Score:</strong> Your GPA-only score for test-optional schools</li>
      </ul>
    ),
    tip: null,
  },
  {
    num: "02/05",
    title: "Your Score Dashboard",
    body: "At the top of your results, you see your three scores as percentages (0–100%). These represent your strength in each dimension compared to your matched schools.",
    extra: null,
    tip: "Tip: A 95% Athletic Score means you're in the top tier of recruit profiles.",
  },
  {
    num: "03/05",
    title: "Reading Your Results",
    body: "Your results table shows every school ranked 1–50 by match strength. Each row includes:",
    extra: (
      <ul className="tut-list">
        <li><strong>Target Rank:</strong> Your predicted recruiting rank at that school (1=best)</li>
        <li><strong>Net Cost:</strong> Estimated 4-year out-of-pocket cost after aid</li>
        <li><strong>DROI:</strong> Degree Return on Investment (earnings multiplier over 40 years)</li>
        <li><strong>ADLTV:</strong> School's adjusted lifetime value</li>
      </ul>
    ),
    tip: "Tip: Click the column headers to sort by any metric.",
  },
  {
    num: "04/05",
    title: "Taking Action",
    body: "From each school's detail card, you can:",
    extra: (
      <ul className="tut-list">
        <li>📋 Fill out the recruiting questionnaire</li>
        <li>🏈 View the coaching staff page</li>
        <li>✏️ Edit your profile if scores change</li>
        <li>↩️ Go back to the map to explore more schools</li>
      </ul>
    ),
    tip: null,
  },
  {
    num: "05/05",
    title: "Refine Your Results Anytime",
    body: "The accuracy of your GRIT Fit depends on the honesty of your inputs. If your GPA, test score, or athletic stats change, click Edit My Profile to recalculate your matches.",
    extra: null,
    tip: null,
  },
];
```

**Component JSX:**

```jsx
import { useState } from "react";

const BROWSE_SLIDES = [ /* ... */ ];
const QL_SLIDES = [ /* ... */ ];

export default function Tutorial({ type = "browse", onClose, onGritFit }) {
  const [idx, setIdx] = useState(0);
  const slides = type === "quicklist" ? QL_SLIDES : BROWSE_SLIDES;
  const slide  = slides[idx];

  return (
    <div id="tutOverlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div id="tutCard">
        <button id="tutClose" onClick={onClose}>×</button>
        <div className="tut-body">
          <div className="tut-slide active">
            <div className="tut-num">{slide.num}</div>
            <div className="tut-h">{slide.title}</div>
            <p className="tut-p">{slide.body}</p>
            {slide.extra}
            {slide.tip && <div className="tut-tip">{slide.tip}</div>}
          </div>
        </div>
        <div className="tut-support">
          Support: <a href="mailto:support@grittyfb.com">support@grittyfb.com</a>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0 20px" }}>
          <button
            onClick={() => setIdx(i => Math.max(0, i - 1))}
            disabled={idx === 0}
            style={{ padding: "7px 18px", background: "transparent", border: "1px solid #1e2e21", borderRadius: 3, color: idx === 0 ? "#2a3a2e" : "#6b8c72", cursor: idx === 0 ? "default" : "pointer", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, letterSpacing: 1 }}
          >← Back</button>
          <div style={{ display: "flex", gap: 6 }}>
            {slides.map((_, i) => (
              <div key={i} onClick={() => setIdx(i)} style={{ width: 6, height: 6, borderRadius: "50%", background: i === idx ? "#6ed430" : "#1e2e21", cursor: "pointer" }} />
            ))}
          </div>
          {idx < slides.length - 1
            ? <button onClick={() => setIdx(i => i + 1)} style={{ padding: "7px 18px", background: "#6ed430", border: "none", borderRadius: 3, color: "#000", cursor: "pointer", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, letterSpacing: 1, fontWeight: 700 }}>Next →</button>
            : type === "browse" && onGritFit
              ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={onClose} style={{ padding: "7px 14px", background: "transparent", border: "1px solid #6b8c72", borderRadius: 3, color: "#6b8c72", cursor: "pointer", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, letterSpacing: 1 }}>Explore Map</button>
                  <button onClick={onGritFit} style={{ padding: "7px 14px", background: "#6ed430", border: "none", borderRadius: 3, color: "#000", cursor: "pointer", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, letterSpacing: 1, fontWeight: 700 }}>Get GRIT Fit →</button>
                </div>
              )
              : <button onClick={onClose} style={{ padding: "7px 18px", background: "#6ed430", border: "none", borderRadius: 3, color: "#000", cursor: "pointer", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, letterSpacing: 1, fontWeight: 700 }}>Get Started →</button>
          }
        </div>
      </div>
    </div>
  );
}

function TutorialDivisionLegend() {
  return (
    <div className="tut-legend">
      <div className="tut-legend-row"><div className="tut-swatch" style={{ background: "#f5a623" }}></div> Power 4</div>
      <div className="tut-legend-row"><div className="tut-swatch" style={{ background: "#4fc3f7" }}></div> G5</div>
      <div className="tut-legend-row"><div className="tut-swatch" style={{ background: "#ce93d8" }}></div> FBS Ind</div>
      <div className="tut-legend-row"><div className="tut-swatch" style={{ background: "#81c784" }}></div> FCS</div>
      <div className="tut-legend-row"><div className="tut-swatch" style={{ background: "#ef9a9a" }}></div> D2</div>
      <div className="tut-legend-row"><div className="tut-swatch" style={{ background: "#b0bec5" }}></div> D3</div>
    </div>
  );
}
```

**CSS to add to `src/index.css`:**

```css
#tutOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
#tutCard {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 28px 28px 0;
  position: relative;
}
.tut-body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.tut-slide { display: block; }
#tutClose {
  position: absolute;
  top: 12px;
  right: 14px;
  background: transparent;
  border: none;
  color: var(--muted);
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
}
#tutClose:hover { color: var(--text); }
.tut-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 8px;
}
.tut-h {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 12px;
  line-height: 1.2;
}
.tut-p {
  font-size: 14px;
  color: var(--text);
  line-height: 1.6;
  margin-bottom: 14px;
}
.tut-tip {
  font-size: 13px;
  color: var(--muted);
  background: var(--surface2);
  border-left: 3px solid var(--accent);
  padding: 8px 12px;
  border-radius: 0 3px 3px 0;
  margin-top: 12px;
  line-height: 1.5;
}
.tut-legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 4px;
}
.tut-legend-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--text);
}
.tut-swatch {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}
.tut-list {
  padding-left: 18px;
  margin: 0 0 4px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tut-list li {
  font-size: 13px;
  color: var(--text);
  line-height: 1.5;
}
.tut-support {
  text-align: center;
  font-family: 'Barlow', sans-serif;
  font-size: 11px;
  color: var(--muted);
  padding-top: 16px;
  border-top: 1px solid var(--border);
  margin-top: 12px;
}
```

**Integration Point:** Header component with "Need Help" button:

```jsx
const [showTutorial, setShowTutorial] = useState(false);

return (
  <>
    <button id="tutHelpBtn" onClick={() => setShowTutorial(true)}>
      Need Help?
    </button>

    {showTutorial && (
      <Tutorial
        type={mode} // "browse" or "quicklist"
        onClose={() => setShowTutorial(false)}
        onGritFit={() => {
          setShowTutorial(false);
          navigateToGritFit();
        }}
      />
    )}
  </>
);
```

---

## ITEM 7: COACH DASHBOARD PLAYER CARDS

**Purpose:** Player card grid from hs-fbcoach-dash adapted to rebuild design system. Each card shows Hudl profile pic, stats (GPA, offers), progress bar (recruiting progress), upcoming events list, and CTA.

**Component File:** `src/components/PlayerCard.jsx` (new)

**Component Props:**
```typescript
interface PlayerCardProps {
  player: {
    id: string;
    name: string;
    position: string;
    classYear: string;
    hudlProfileUrl?: string;
    gpa: number;
    offerCount: number;
    recruitingProgress: number;  // 0–1
    offers?: Array<{ school: string; date: string }>;
    upcomingEvents?: Array<{
      name: string;
      date: string;
      type: "critical" | "registered" | "upcoming";
    }>;
  };
  onCardClick?: (playerId: string) => void;
}
```

**Component JSX:**

```jsx
import React from "react";

export default function PlayerCard({ player, onCardClick }) {
  const handleCardClick = () => {
    onCardClick?.(player.id);
  };

  return (
    <div className="player-card" onClick={handleCardClick}>
      {/* Top row: avatar + name block */}
      <div className="pc-top">
        <div className="pc-avatar">
          {player.hudlProfileUrl ? (
            <img src={player.hudlProfileUrl} alt={player.name} />
          ) : (
            player.name.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <div className="pc-name">{player.name}</div>
          <div className="pc-meta">{player.position} • Class {player.classYear}</div>
        </div>
      </div>

      {/* Offer banner (if any offers) */}
      {player.offers && player.offers.length > 0 && (
        <div className="pc-offer-banner">
          <div className="pc-offer-label">Offer</div>
          <div className="pc-offer-school">{player.offers[0].school}</div>
          <div className="pc-offer-detail">Received {player.offers[0].date}</div>
        </div>
      )}

      {/* Stats row: GPA, Offer count */}
      <div className="pc-stats">
        <div className="pc-stat">
          <div className="pc-stat-val">{player.gpa.toFixed(2)}</div>
          <div className="pc-stat-lbl">GPA</div>
        </div>
        <div className="pc-stat pc-offer-count">
          <div className="pc-stat-val">{player.offerCount}</div>
          <div className="pc-stat-lbl">Offers</div>
        </div>
      </div>

      {/* Recruiting progress bar */}
      <div className="progress-wrap">
        <div className="progress-label">
          <span>Recruiting Progress</span>
          <strong>{Math.round(player.recruitingProgress * 100)}%</strong>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${player.recruitingProgress * 100}%` }}
          />
        </div>
      </div>

      {/* Upcoming events section */}
      {player.upcomingEvents && player.upcomingEvents.length > 0 && (
        <div className="pc-events">
          <div className="pc-events-label">Upcoming</div>
          {player.upcomingEvents.slice(0, 3).map((event, i) => (
            <div key={i} className="pc-event-row">
              <div className={`pc-event-dot dot-${event.type}`} />
              <div className="pc-event-name">{event.name}</div>
              <div className="pc-event-date">{event.date}</div>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="pc-cta">
        View Profile →
      </div>
    </div>
  );
}
```

**Player card CSS (to add to `src/index.css`):**

```css
.roster-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
  padding: 20px 0;
}

/* Card shell */
.player-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
  cursor: pointer;
  transition: box-shadow 0.15s, border-color 0.15s;
  position: relative;
  overflow: hidden;
}
.player-card:hover {
  box-shadow: 0 4px 16px rgba(46, 107, 24, 0.15);
  border-color: #2e6b18;
}
/* Dark green accent bar at top of card */
.player-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: #2e6b18;
}

/* Card top row: avatar + name block */
.pc-top {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
}
.pc-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--surface2);
  border: 2px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--muted);
  flex-shrink: 0;
  overflow: hidden;
}
.pc-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}
.pc-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
}
.pc-meta {
  font-size: 0.72rem;
  color: var(--muted);
  margin-top: 2px;
}

/* Offer banner */
.pc-offer-banner {
  background: #f9eda5;
  border: 1px solid #f5a623;
  border-radius: 7px;
  padding: 8px 10px;
  margin-bottom: 10px;
}
.pc-offer-label {
  font-size: 0.65rem;
  font-weight: 700;
  color: #b85a00;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.pc-offer-school {
  font-size: 0.85rem;
  font-weight: 700;
  color: #b85a00;
  margin-top: 1px;
}
.pc-offer-detail {
  font-size: 0.7rem;
  color: #c47000;
  margin-top: 1px;
}

/* Stat row */
.pc-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
}
.pc-stat {
  flex: 1;
}
.pc-stat-val {
  font-size: 1.1rem;
  font-weight: 800;
  color: #2e6b18;
}
.pc-offer-count .pc-stat-val {
  color: #f5a623;
}
.pc-stat-lbl {
  font-size: 0.65rem;
  color: var(--muted);
  letter-spacing: 0.2px;
}

/* Recruiting progress bar */
.progress-wrap {
  margin-bottom: 10px;
}
.progress-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}
.progress-label span {
  font-size: 0.7rem;
  color: var(--muted);
}
.progress-label strong {
  font-size: 0.7rem;
  color: #2e6b18;
  font-weight: 700;
}
.progress-bar {
  height: 6px;
  background: var(--surface2);
  border-radius: 3px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: #2e6b18;
  border-radius: 3px;
  transition: width 1s ease;
}

/* Upcoming events section */
.pc-events {}
.pc-events-label {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: 6px;
}
.pc-event-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.pc-event-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-critical { background: #2e6b18; }
.dot-registered { background: #f5a623; }
.dot-upcoming { background: #6b8c72; }
.pc-event-name {
  font-size: 0.72rem;
  color: var(--text);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pc-event-date {
  font-size: 0.65rem;
  color: var(--muted);
  flex-shrink: 0;
}

/* Card CTA strip */
.pc-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 12px;
  padding: 8px;
  background: #f0fdf4;
  border-radius: 7px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #2e6b18;
}
.pc-cta:hover {
  background: #e6fcd8;
}
```

**Grid container JSX (in Coach Dashboard page):**

```jsx
import PlayerCard from "../components/PlayerCard";

export default function CoachDashboard() {
  const [players, setPlayers] = useState([]);

  return (
    <div className="page-container">
      <h1>Your Roster</h1>

      <div className="roster-grid">
        {players.map(player => (
          <PlayerCard
            key={player.id}
            player={player}
            onCardClick={(playerId) => {
              // Navigate to player detail view
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

**Data source:** Player data from Supabase `players` table or Google Sheets (via Apps Script).

---

## DESIGN TOKENS SUMMARY

**Dark theme (rebuild baseline):**
```css
--bg:      #080d0a;
--surface: #0e1510;
--surface2:#141e16;
--border:  #1e2e21;
--accent:  #6ed430;
--text:    #e8edf0;
--muted:   #6b8c72;

/* Division colors (browse mode) */
--p4:      #f5a623;   /* Power 4 (orange) */
--g5:      #4fc3f7;   /* G5 (cyan) */
--fbs:     #ce93d8;   /* FBS Ind (purple) */
--fcs:     #81c784;   /* FCS (green) */
--d2:      #ef9a9a;   /* D2 (pink) */
--d3:      #b0bec5;   /* D3 (gray) */

/* GRIT FIT tier colors */
--tier-top: #6ed430;  /* Green */
--tier-good: #f5a623; /* Gold */
--tier-borderline: #ef5350; /* Red */
```

**Typography:**
- Body: `'Barlow', sans-serif`
- Condensed/labels: `'Barlow Condensed', sans-serif`
- Loaded via Google CDN

---

## INTEGRATION CHECKLIST FOR NOVA

- [ ] Copy `helmet.png` from cfb-recruit-hub to rebuild `/public/`
- [ ] Create `HelmetAnim.jsx` component with CSS keyframes
- [ ] Install `leaflet` and `leaflet.markercluster` npm packages
- [ ] Create `GritFitMapView.jsx` and `BrowseMapPage.jsx` with clustering logic
- [ ] Create `SchoolDetailCard.jsx` (or inline in map components) with popup HTML
- [ ] Create `GritFitScoreDashboard.jsx` with three-metric layout
- [ ] Create `MoneyMap.jsx` with four-panel collapsible grid
- [ ] Create `Tutorial.jsx` with Browse and GRIT FIT slide decks
- [ ] Create `PlayerCard.jsx` with roster grid layout
- [ ] Add all CSS to `src/index.css`
- [ ] Wire components into page layouts (App, GritFitResultsPage, ShortListPage, CoachDashboard)
- [ ] Test on mobile (responsive breakpoints: 768px, 600px, 480px, 360px)
- [ ] Test helmet animation on login with React StrictMode
- [ ] Test map interactions (cluster zoom, popup open/close, shortlist toggle)
- [ ] Test tutorial pagination and CTA flows
- [ ] Verify all color tokens match design system

---

## NOTES FOR NOVA

1. **Helmet animation guard:** The `started.current` ref is critical to prevent double-fire under React StrictMode in dev. Do not remove it.

2. **Leaflet popup HTML:** Popups are raw HTML strings, not React components. The shortlist toggle uses `window.__toggleShortList()` global. Inject this handler into `window` from App.jsx or consider a React portal wrapper for future refactors.

3. **Data sources:** Most components expect Supabase queries:
   - Schools data: `schools` table (661+ records with UNITID, stats, links)
   - Scoring results: Computed from user profile + schools (passed as props)
   - Shortlist: User's profile or Redux state
   - Player data: `players` table (coach dashboard)

4. **Color consistency:** The rebuild uses dark theme exclusively. The hs-fbcoach-dash player cards have light theme colors — adapt them to dark theme (dark forest green accents, light text) as shown in the CSS above.

5. **Mobile-first CSS:** All components include media query breakpoints (1100px, 768px, 600px, 480px, 360px). Test at each breakpoint.

6. **Accessibility:** All interactive elements should have proper ARIA labels, focus states, and keyboard navigation. Helmet animation has `aria-hidden="true"`.

---

## FILE LOCATIONS

All files to create:
- `src/components/HelmetAnim.jsx`
- `src/components/GritFitMapView.jsx`
- `src/components/BrowseMapPage.jsx`
- `src/components/GritFitScoreDashboard.jsx`
- `src/components/MoneyMap.jsx`
- `src/components/Tutorial.jsx`
- `src/components/PlayerCard.jsx`
- `src/index.css` (append all CSS)
- `public/helmet.png` (copy from cfb-recruit-hub)

---

**Status:** READY FOR NOVA IMPLEMENTATION

Chris — Please review and approve. Once confirmed, Nova will proceed with building all 7 components end-to-end with full integration testing on all page flows.

