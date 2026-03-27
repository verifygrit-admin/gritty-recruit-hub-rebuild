# VAULT — CFB Asset Retrieval Handoff
Generated: 2026-03-26
Purpose: Full code extraction from cfb-recruit-hub and hs-fbcoach-dash for use in gritty-recruit-hub-rebuild UX/component work. Feeds Quill's UX spec.
Retrieval scope: 7 assets across 2 source repos.

---

## Access Confirmation

- `C:\Users\chris\dev\cfb-recruit-hub` — CONFIRMED. All files readable.
- `C:\Users\chris\dev\hs-fbcoach-dash` — CONFIRMED. index.html and assets readable.

---

## ASSET 1 — Animated Helmet CSS and Image Assets

**Source files:**
- `C:\Users\chris\dev\cfb-recruit-hub\src\components\HelmetAnim.jsx`
- `C:\Users\chris\dev\cfb-recruit-hub\src\index.css` (lines 579–605)
- `C:\Users\chris\dev\cfb-recruit-hub\public\helmet.png` — production image (200×250 render target; actual file is 1080×1350 RGBA PNG)

**HelmetAnim.jsx — full component:**

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
      // Clear the CSS animation — fill-mode:forwards would otherwise block the JS transition
      el.style.animation = "none";
      el.style.display   = "block"; // keep visible now that .active class equiv is removed
      void el.offsetHeight;         // force reflow to register the cleared animation

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
    // No cleanup needed — { once: true } self-removes; started.current prevents re-run
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={elRef} className="helmet-anim" aria-hidden="true">
      <img src={helmetSrc} alt="" draggable="false" />
    </div>
  );
}
```

**CSS — .helmet-anim class and @keyframes helmetReveal:**

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

**How it is triggered in App.jsx (lines 47–48, 65–66):**

```jsx
const [showBrowseAnim, setShowBrowseAnim] = useState(false);
const [showQLAnim, setShowQLAnim]         = useState(false);
const browseAnimShown = useRef(false);
const qlAnimShown     = useRef(false);
```

Two separate one-shot booleans gate whether the animation has been shown for browse mode and quicklist mode respectively. The animation targets button id `"tutHelpBtn"` or `"qlHelpBtn"` — the help button in the header. `onDone` callback sets `showBrowseAnim` / `showQLAnim` back to false to unmount the component after the fly-to completes.

**Implementation notes:**
- Image is 1080×1350 but rendered at 200×250 via CSS
- `started.current` guard is required because React StrictMode double-invokes effects in dev
- Phase 1 (CSS `@keyframes helmetReveal`, 2.8s): grow-in at viewport center with two bounces
- Phase 2 (JS inline transition, 1.1s): translate + scale(0.12) fly to the target button, fade out at 0.6s delay
- `void el.offsetHeight` forces reflow to prevent fill-mode:forwards blocking the JS transition
- Double `requestAnimationFrame` ensures repaint is registered before the transition fires

---

## ASSET 2 — Leaflet Clustering Implementation

**Source file:** `C:\Users\chris\dev\cfb-recruit-hub\src\components\MapView.jsx`

**Cluster group configuration (full iconCreateFunction):**

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

**Cluster visual specs:**
- Small (< 10 markers): 28px, `rgba(46,107,24,0.85)` fill, `#6ed430` border, `#c8f5a0` text, 11px font
- Medium (10–49): 34px, same colors, 11px font
- Large (50+): 40px, same colors, 13px font
- Font: Barlow Condensed, monospace fallback

**Individual marker icon factory:**

```jsx
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
```

**Marker color + size logic by mode:**

```jsx
const TIER_COLOR = { top: "#6ed430", good: "#f5a623", borderline: "#ef5350" };

// Browse mode: division color, size 9px
// Quicklist mode: tier color, size varies (top=13, good=11, borderline=10)
if (mode === "quicklist" && results) {
  const tier = scored?.matchTier;
  if (!tier) return; // hide non-matching schools entirely
  color = TIER_COLOR[tier];
  size  = tier === "top" ? 13 : tier === "good" ? 11 : 10;
} else {
  color = DIV_COLORS[school.Type] || "#888";
  size = 9;
}
```

**DIV_COLORS reference (from constants.js, via MapView.jsx import):**
Used as the color source for browse-mode markers. Keys are the `Type` field values: Power 4, G5, FBS Ind, FCS, D2, D3.

**Map initialization:**

```jsx
leafletRef.current = L.map(mapRef.current, {
  center: [38.5, -96],
  zoom: 4,
  zoomControl: true,
  tap: false,            // disables Leaflet's tap emulation to avoid double-fire on mobile
  closePopupOnClick: false, // prevents background tap from closing an open popup
});
L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  maxZoom: 18,
}).addTo(leafletRef.current);
```

**Required npm packages:**
- `leaflet`
- `leaflet.markercluster`
- CSS imports: `leaflet/dist/leaflet.css`, `leaflet.markercluster/dist/MarkerCluster.css`, `leaflet.markercluster/dist/MarkerCluster.Default.css`

**Map legend overlay (quicklist mode only, rendered as absolute-positioned div):**

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

## ASSET 3 — School Detail Card HTML/CSS/JS (Map Popup)

**Source file:** `C:\Users\chris\dev\cfb-recruit-hub\src\components\MapView.jsx` (lines 141–217)

**Popup HTML template (full string construction):**

```jsx
let popupContent = `
  <div class="popup-header">
    <div class="popup-school-name">${schoolName}</div>
    <div class="popup-location">${school["City/Location"] || ""}, ${school.State || ""}</div>
    <div class="popup-tier-badge" style="background:${DIV_COLORS[tier] || "#888"}">${tier}</div>
  </div>
  <div class="popup-body">
    <div class="popup-grid">
      <div class="popup-stat">
        <div class="popup-stat-label">Conference</div>
        <div class="popup-stat-value">${conf}</div>
      </div>
      <div class="popup-stat">
        <div class="popup-stat-label">Admissions Select.</div>
        <div class="popup-stat-value">${school["School Type"] || ""}</div>
      </div>
      <div class="popup-stat">
        <div class="popup-stat-label">ADLTV</div>
        <div class="popup-stat-value">${adltvNum ? "$" + Math.round(adltvNum).toLocaleString() : "—"}</div>
      </div>
      <div class="popup-stat">
        <div class="popup-stat-label">ADLTV Rank</div>
        <div class="popup-stat-value">${adltvRank ? "#" + adltvRank : "—"}</div>
      </div>
      <div class="popup-stat">
        <div class="popup-stat-label">Admission Rate</div>
        <div class="popup-stat-value">${admRate}</div>
      </div>
      <div class="popup-stat">
        <div class="popup-stat-label">Graduation Rate</div>
        <div class="popup-stat-value">${gradRate}</div>
      </div>
      <div class="popup-stat">
        <div class="popup-stat-label">COA (Out-of-State)</div>
        <div class="popup-stat-value">${coaNum ? "$" + Math.round(coaNum).toLocaleString() : "—"}</div>
      </div>
      <div class="popup-stat">
        <div class="popup-stat-label">Est. Avg Merit</div>
        <div class="popup-stat-value">${meritNum ? "$" + Math.round(meritNum).toLocaleString() : "—"}</div>
      </div>
    </div>
`;

// Quicklist match section (conditional, shown only when scored)
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

// Short List add/remove button (uses window global — see note below)
const inList = shortListIds.map(String).includes(String(school.UNITID));
popupContent += `
  <div style="padding:8px 14px 14px">
    <button
      onclick="window.__toggleShortList('${school.UNITID}')"
      class="popup-sl-btn${inList ? " popup-sl-btn--added" : ""}"
    >${inList ? "✓ In Short List" : "+ Add to Short List"}</button>
  </div>
`;

popupContent += `</div>`;

const marker = L.marker([lat, lng], { icon: makeIcon(color, size) });
marker.bindPopup(popupContent, { maxWidth: 300, autoPan: false });
```

**Note on `window.__toggleShortList`:** Because Leaflet popup content is a raw HTML string (not React), the short list toggle uses a global function injected onto `window` from App.jsx. In the rebuild this will need either the same global injection pattern or a different popup strategy (e.g. React portal rendered popup).

**Popup CSS (from index.css):**

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
```

---

## ASSET 4 — Athletic / Academic Score Header Frame

**Source file:** `C:\Users\chris\dev\cfb-recruit-hub\src\components\ResultsTable.jsx` (lines 128–161)

**Score calculation (from ResultsTable):**

```jsx
const athFitPct   = results.topTier && results.athFit ? (results.athFit[results.topTier] * 100).toFixed(1) : null;
const rigorPct    = results.acadRigorScore   != null ? (results.acadRigorScore   * 100).toFixed(1) : null;
const testOptPct  = results.acadTestOptScore != null ? (results.acadTestOptScore * 100).toFixed(1) : null;
```

**Score dashboard JSX:**

```jsx
{/* Athlete Score Dashboard */}
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
```

**Score dashboard CSS (from index.css):**

```css
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
  font-size: 10px; font-weight: 600; letter-spacing: 2px;
  text-transform: uppercase; color: var(--muted);
}
.ql-metric-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 28px; font-weight: 700; color: var(--accent);
  line-height: 1.1;
}
.ql-metric-sub {
  font-family: 'Barlow', sans-serif;
  font-size: 11px; color: var(--muted);
}
.ql-table-header {
  font-family: 'Barlow Condensed', sans-serif; font-size: 56px;
  letter-spacing: 1px; color: var(--accent); margin-bottom: 4px;
  font-weight: 700; text-transform: uppercase; padding-top: 20px;
  text-align: center; line-height: 1.05;
}

/* Mobile */
@media (max-width: 768px) {
  .ql-dashboard { gap: 10px; padding: 14px 0 12px; }
  .ql-metric { min-width: calc(50% - 8px); padding: 10px 12px; }
  .ql-metric-value { font-size: 22px; }
}
@media (max-width: 480px) {
  .ql-metric { min-width: 100%; }
}
```

**Table header display (shown above the score dashboard):**

```jsx
<div className="ql-table-header" style={{ color: "#ffffff" }}>
  {name ? `${name}'s GRIT FIT Results` : "GRIT FIT Results"}
</div>
<div style={{ fontSize: 12, color: "#c8f5a0", fontFamily: "'Barlow', sans-serif", fontWeight: 400, marginBottom: 16, marginTop: -4, textAlign: "center" }}>
  Your personalized target college football recruiting matches
</div>
```

---

## ASSET 5 — Money Map Chart Display

**Source file:** `C:\Users\chris\dev\cfb-recruit-hub\src\components\ShortList.jsx` (lines 27–132)

**Full MoneyMap component:**

```jsx
function MoneyMap({ shortList }) {
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
    </div>
  );
}
```

**Money Map CSS (from index.css):**

```css
.money-map { margin-bottom: 24px; }
.money-map-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
}
@media (max-width: 1100px) { .money-map-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px)  { .money-map-grid { grid-template-columns: 1fr; } }

.money-map-panel {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 4px; padding: 12px;
}
.money-map-panel-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; margin-bottom: 2px;
}
.money-map-panel-sub {
  font-family: 'Barlow', sans-serif; font-size: 10px;
  color: var(--muted); margin-bottom: 10px;
}
.money-map-bar-row {
  display: flex; align-items: center; gap: 6px; margin-bottom: 6px;
}
.money-map-bar-label {
  font-family: 'Barlow', sans-serif; font-size: 10px; color: var(--muted);
  width: 86px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.money-map-bar-track {
  flex: 1; height: 8px; background: var(--bg); border-radius: 2px; overflow: hidden;
}
.money-map-bar-fill { height: 100%; border-radius: 2px; transition: width 0.3s ease; }
.money-map-bar-val {
  font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 700;
  width: 52px; text-align: right; flex-shrink: 0;
}
```

**Money Map placement in ShortList.jsx:**

```jsx
{/* Money Map toggle */}
<div className="sl-section-toggle" onClick={() => setShowMoneyMap(v => !v)}>
  <span>Short List Money Map</span>
  <span>{showMoneyMap ? "▲" : "▼"}</span>
</div>
{showMoneyMap && <MoneyMap shortList={shortList} />}
```

Money Map is toggled open/closed. Default state is `showMoneyMap = true` (open). It sits above the sortable short list table. `breakEven` is computed inline for the Fastest Payback panel: `40 / s.droi` is the fallback when `s.breakEven` is null. Values truncated at 200 years to exclude noise.

**Panel color assignments:**
- Lowest Net Cost: `#6ed430` (accent green)
- Highest ADLTV: `#4fc3f7` (cyan)
- Fastest Payback: `#f5a623` (gold)
- Best ROI: `#ce93d8` (lavender/purple)

---

## ASSET 6 — Need Help Tutorial Content

**Source file:** `C:\Users\chris\dev\cfb-recruit-hub\src\components\Tutorial.jsx`

**Two slide decks — BROWSE_SLIDES (5 slides) and QL_SLIDES (5 slides).**

**BROWSE_SLIDES:**

| Slide | Title | Key Content |
|-------|-------|-------------|
| 01/05 | Welcome to GrittyOS CFB Recruit Hub | Map overview, 661 schools, division color legend (P4 orange, G5 cyan, FBS Ind purple, FCS green, D2 pink, D3 gray) |
| 02/05 | Understanding the Data | COA (OOS), ADLTV, ADLTV Rank, Admissions Select. definitions |
| 03/05 | Filtering & Browsing | Division Tier, Admissions Selectivity, Conference, ADLTV Rank, State, Search filter descriptions |
| 04/05 | My GRIT Fit | Green/gold/red marker meaning, TABLE view mention, tip: profile saves for coaches |
| 05/05 | Choose Your Path | "Explore the Map" vs "Get My GRIT Fit — Free" CTA split |

**QL_SLIDES:**

| Slide | Title | Key Content |
|-------|-------|-------------|
| 01/05 | What is My GRIT Fit? | Athletic Score, Academic Rigor Score, Test Optional Score, Recruit Reach definitions |
| 02/05 | Your Score Dashboard | Three score types above results table — what each measures |
| 03/05 | Reading Your Results | Target Rank, Net Cost, DROI, ADLTV definitions; tip: click header to sort |
| 04/05 | Taking Action | Recruit Quest. link, Coaching Staff link, Edit Profile, switch back to Home |
| 05/05 | Refine Your Results Anytime | Honest inputs = accurate matches; Edit My Profile button at bottom |

**Tutorial component JSX (full):**

```jsx
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
          Support: <a href="mailto:verifygrit@gmail.com">verifygrit@gmail.com</a>
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
```

**Tutorial CSS (from index.css):**

```css
#tutOverlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.75);
  z-index: 2000;
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}
#tutCard {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  width: 100%; max-width: 520px;
  max-height: 90vh;
  display: flex; flex-direction: column;
  overflow: hidden;
  padding: 28px 28px 0;
  position: relative;
}
.tut-body { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.tut-slide { display: block; }
#tutClose { position: absolute; top: 12px; right: 14px; background: transparent; border: none; color: var(--muted); font-size: 20px; cursor: pointer; padding: 4px 8px; }
#tutClose:hover { color: var(--text); }
.tut-num { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
.tut-h { font-family: 'Barlow Condensed', sans-serif; font-size: 22px; font-weight: 700; color: var(--text); margin-bottom: 12px; line-height: 1.2; }
.tut-p { font-size: 14px; color: var(--text); line-height: 1.6; margin-bottom: 14px; }
.tut-tip { font-size: 13px; color: var(--muted); background: var(--surface2); border-left: 3px solid var(--accent); padding: 8px 12px; border-radius: 0 3px 3px 0; margin-top: 12px; line-height: 1.5; }
.tut-legend { display: flex; flex-direction: column; gap: 8px; margin-bottom: 4px; }
.tut-legend-row { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text); }
.tut-swatch { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.tut-defs { display: flex; flex-direction: column; gap: 10px; }
.tut-def-row { display: flex; flex-direction: column; gap: 2px; }
.tut-def-term { font-family: 'Barlow Condensed', sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: var(--accent); }
.tut-def-desc { font-size: 13px; color: var(--text); line-height: 1.5; }
.tut-list { padding-left: 18px; margin: 0 0 4px; display: flex; flex-direction: column; gap: 8px; }
.tut-list li { font-size: 13px; color: var(--text); line-height: 1.5; }
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

---

## ASSET 7 — Coach Dashboard Player Card Formatting / Layout

**Source file:** `C:\Users\chris\dev\hs-fbcoach-dash\index.html` (CSS lines 46–81, HTML further in file)

**Design system — hs-fbcoach-dash CSS variables:**

```css
:root {
  --bg: #f8fafc; --surface: #ffffff; --surface2: #f1f5f9;
  --border: #e2e8f0; --text: #0f172a; --muted: #64748b; --faint: #94a3b8;
  --accent: #16a34a; --accent-l: #f0fdf4; --accent-t: #15803d;
  --gold: #d97706; --gold-l: #fffbeb;
  --radius: 10px; --shadow: 0 1px 4px rgba(0,0,0,0.08);
  --offer: #7c3aed; --offer-l: #f5f3ff;
  /* BC High Eagles brand colors */
  --bch-crimson: #7C1E2E; --bch-crimson-t: #5e1623; --bch-crimson-l: #fdf2f4;
  --bch-gold: #C8922A; --bch-gold-t: #a67520; --bch-gold-l: #fdf6e8;
}
```

Note: This is a light-mode dashboard (white/light gray surface) — the opposite of cfb-recruit-hub's dark theme. The rebuild's coach-facing views may need to consider this distinction.

**Player card (landing grid) — full CSS:**

```css
/* Grid */
.roster-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; }

/* Card shell */
.player-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 16px;
  cursor: pointer; transition: box-shadow .15s, border-color .15s;
  position: relative; overflow: hidden;
}
.player-card:hover { box-shadow: 0 4px 16px rgba(124,30,46,0.15); border-color: var(--bch-crimson); }
/* Crimson accent bar at top of every card */
.player-card::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: var(--bch-crimson);
}

/* Card top row: avatar + name block */
.pc-top { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
.pc-avatar {
  width: 44px; height: 44px; border-radius: 50%;
  background: var(--surface2); border: 2px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.1rem; font-weight: 800; color: var(--muted);
  flex-shrink: 0; overflow: hidden;
}
.pc-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.pc-name { font-size: 1rem; font-weight: 700; color: var(--text); line-height: 1.2; }
.pc-meta { font-size: 0.72rem; color: var(--muted); margin-top: 2px; }
.pc-said { font-size: 0.65rem; color: var(--faint); margin-top: 1px; letter-spacing: 0.3px; }

/* Offer banner (shown when athlete has an offer) */
.pc-offer-banner {
  background: var(--bch-gold-l); border: 1px solid var(--bch-gold);
  border-radius: 7px; padding: 8px 10px; margin-bottom: 10px;
}
.pc-offer-label { font-size: 0.65rem; font-weight: 700; color: var(--bch-crimson); letter-spacing: 0.5px; text-transform: uppercase; }
.pc-offer-school { font-size: 0.85rem; font-weight: 700; color: var(--bch-crimson); margin-top: 1px; }
.pc-offer-detail { font-size: 0.7rem; color: var(--bch-gold-t); margin-top: 1px; }

/* Stat row (GPA, offers, etc.) */
.pc-stats { display: flex; gap: 12px; margin-bottom: 10px; }
.pc-stat { flex: 1; }
.pc-stat-val { font-size: 1.1rem; font-weight: 800; color: var(--bch-crimson); }
.pc-offer-count .pc-stat-val { color: var(--bch-gold-t); }
.pc-stat-lbl { font-size: 0.65rem; color: var(--muted); letter-spacing: 0.2px; }

/* Recruiting progress bar */
.progress-wrap { margin-bottom: 10px; }
.progress-label { display: flex; justify-content: space-between; margin-bottom: 4px; }
.progress-label span { font-size: 0.7rem; color: var(--muted); }
.progress-label strong { font-size: 0.7rem; color: var(--bch-crimson); }
.progress-bar { height: 6px; background: var(--surface2); border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--bch-crimson); border-radius: 3px; transition: width 1s ease; }

/* Upcoming events section */
.pc-events { }
.pc-events-label { font-size: 0.65rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 6px; }
.pc-event-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.pc-event-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.dot-critical { background: var(--bch-crimson); }
.dot-registered { background: var(--bch-gold); }
.dot-upcoming { background: var(--faint); }
.pc-event-name { font-size: 0.72rem; color: var(--text); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pc-event-date { font-size: 0.65rem; color: var(--muted); flex-shrink: 0; }

/* Card CTA strip */
.pc-cta {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  margin-top: 12px; padding: 8px;
  background: var(--bch-crimson-l); border-radius: 7px;
  font-size: 0.75rem; font-weight: 600; color: var(--bch-crimson);
}
```

**Detail view header (expanded player view):**

```css
#detail { display: none; padding-bottom: 24px; }
.detail-header { background: #f7e6ea; border-bottom: 1px solid #e8c8d0; padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; }
.detail-header-row { display: flex; align-items: center; gap: 10px; }
.detail-pill-row { display: flex; flex-wrap: wrap; gap: 6px; }
/* Athlete profile strip in detail header */
.detail-profile-strip { border-top: 1px solid var(--border); padding-top: 8px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.dps-block { display: flex; flex-direction: column; gap: 2px; }
.dps-label { font-size: 0.6rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.3px; }
.dps-val { font-size: 0.75rem; font-weight: 700; color: var(--text); }
.dps-divider { width: 1px; height: 26px; background: var(--border); flex-shrink: 0; }
.dps-bar-row { display: flex; align-items: center; gap: 5px; }
.dps-bar-bg { width: 44px; height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
.dps-bar-fill { height: 100%; border-radius: 2px; }
```

**Score bar pattern (reused across detail tables):**

```css
.score-cell { display: flex; align-items: center; gap: 6px; }
.score-bar-bg { flex: 1; max-width: 60px; height: 5px; background: var(--surface2); border-radius: 3px; overflow: hidden; }
.score-bar-fill { height: 100%; border-radius: 3px; }
.score-val { font-weight: 700; font-size: 0.72rem; }
```

**Scorecard layout (Recruiting Scoreboard tab — .sc-card):**

```css
.card-list { display: flex; flex-direction: column; gap: 8px; }
.sc-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; }
.sc-top { display: flex; align-items: center; gap: 10px; }
.sc-school { font-size: 0.82rem; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sc-sub { font-size: 0.65rem; color: var(--muted); margin-top: 2px; display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
.sc-stats { display: flex; gap: 14px; margin-top: 7px; flex-wrap: wrap; }
.sc-stat-lbl { font-size: 0.58rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; color: var(--muted); }
.sc-stat-val { font-size: 0.75rem; font-weight: 700; color: var(--text); margin-top: 1px; }
.punch-row { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 7px; }
.punch { font-size: 0.62rem; font-weight: 700; padding: 2px 7px; border-radius: 4px; white-space: nowrap; letter-spacing: 0.1px; }
.punch-on   { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
.punch-off  { background: var(--surface2); color: var(--faint); border: 1px solid var(--border); }
.punch-offer { background: var(--offer-l); color: var(--offer); border: 1px solid #c4b5fd; }
```

**Tab navigation pattern:**

```css
.tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border); background: var(--surface); margin-top: 12px; overflow-x: auto; scrollbar-width: none; }
.tabs::-webkit-scrollbar { display: none; }
.tab { padding: 10px 14px; font-size: 0.75rem; font-weight: 600; color: var(--muted); cursor: pointer; white-space: nowrap; border-bottom: 2px solid transparent; transition: color .15s, border-color .15s; }
.tab.active { color: var(--accent-t); border-bottom-color: var(--accent); }
.tab-panel { display: none; padding: 14px 16px; }
.tab-panel.active { display: block; }
```

**Division badge variants:**

```css
.div-badge { font-size: 0.62rem; padding: 2px 6px; border-radius: 4px; font-weight: 600; display: inline-block; }
.div-fcs { background: #dcfce7; color: #166534; }
.div-d3 { background: #dbeafe; color: #1e40af; }
.div-d2 { background: #fce7f3; color: #9d174d; }
.div-fbs { background: #fef3c7; color: #92400e; }
.div-all { background: #f3e8ff; color: #6b21a8; }
```

**Rank badge:**

```css
.rank-num { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: var(--surface2); font-size: 0.7rem; font-weight: 700; color: var(--muted); }
.rank-num.top { background: var(--gold-l); color: var(--gold); border: 1px solid #fcd34d; }
```

**Offer bar (full-width offer callout in detail view):**

```css
.offer-bar { margin: 12px 16px 0; background: var(--offer-l); border: 1.5px solid #c4b5fd; border-radius: 10px; padding: 12px 14px; display: flex; align-items: center; gap: 10px; }
.offer-bar-icon { font-size: 1.4rem; }
.offer-bar-label { font-size: 0.65rem; font-weight: 700; color: var(--offer); letter-spacing: 0.5px; text-transform: uppercase; }
.offer-bar-school { font-size: 1rem; font-weight: 800; color: var(--offer); }
.offer-bar-detail { font-size: 0.72rem; color: #7c3aedaa; }
```

---

## Source Design Token Summary

### cfb-recruit-hub (dark theme — student-facing)

```css
--bg:      #080d0a;
--surface: #0e1510;
--surface2:#141e16;
--border:  #1e2e21;
--accent:  #6ed430;
--accent2: #4caf1e;
--text:    #e8edf0;
--muted:   #6b8c72;
--p4:      #f5a623;
--g5:      #4fc3f7;
--fbs:     #ce93d8;
--fcs:     #81c784;
--d2:      #ef9a9a;
--d3:      #b0bec5;
```

### hs-fbcoach-dash (light theme — coach-facing)

```css
--bg:         #f8fafc;
--surface:    #ffffff;
--surface2:   #f1f5f9;
--border:     #e2e8f0;
--text:       #0f172a;
--muted:      #64748b;
--faint:      #94a3b8;
--accent:     #16a34a;
--accent-l:   #f0fdf4;
--accent-t:   #15803d;
--gold:       #d97706;
--bch-crimson:#7C1E2E;
--bch-gold:   #C8922A;
--offer:      #7c3aed;
```

---

## Typography

Both repos use system/Google fonts:

cfb-recruit-hub:
- Body: `'Barlow', sans-serif`
- Condensed / labels / badges: `'Barlow Condensed', sans-serif`
- Loaded via CDN in index.html

hs-fbcoach-dash:
- Body: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` (no custom fonts)

---

## Files Referenced

| Asset | Source File |
|-------|-------------|
| 1 — Helmet anim | `cfb-recruit-hub/src/components/HelmetAnim.jsx`, `src/index.css` lines 579–605, `public/helmet.png` |
| 2 — Leaflet clustering | `cfb-recruit-hub/src/components/MapView.jsx` |
| 3 — School detail card | `cfb-recruit-hub/src/components/MapView.jsx` (popup), `src/index.css` lines 378–415 |
| 4 — Score header frame | `cfb-recruit-hub/src/components/ResultsTable.jsx`, `src/index.css` lines 434–472 |
| 5 — Money Map | `cfb-recruit-hub/src/components/ShortList.jsx` (MoneyMap function), `src/index.css` lines 725–761 |
| 6 — Tutorial content | `cfb-recruit-hub/src/components/Tutorial.jsx`, `src/index.css` lines 341–376, 634–645 |
| 7 — Coach player card | `hs-fbcoach-dash/index.html` lines 46–200 |

---

VAULT LOG ENTRY: 2026-03-26 — RETRIEVED — VAULT_CFB_ASSET_RETRIEVAL.md — cfb-recruit-hub + hs-fbcoach-dash — gritty-recruit-hub-rebuild\docs\ — Quill UX spec feed
