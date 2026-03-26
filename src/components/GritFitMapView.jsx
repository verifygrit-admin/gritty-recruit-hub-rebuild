/**
 * GRIT FIT Map View — Leaflet map showing up to 30 matched schools + 632 non-matched (muted).
 * UX Spec: COMPONENT 3 — Map View
 *
 * NOTE: leaflet.markercluster is NOT yet installed. If clustering is needed, run:
 *   npm install leaflet.markercluster
 * For now, individual markers are rendered without clustering to avoid a missing dependency error.
 */
import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TIER_COLORS, TIER_LABELS } from '../lib/constants.js';

// Tier color legend items for the legend below the map
const LEGEND_ITEMS = [
  { label: 'Power 4', color: TIER_COLORS['Power 4'] },
  { label: 'G5', color: TIER_COLORS['G6'] },
  { label: 'FCS', color: TIER_COLORS['1-FCS'] },
  { label: 'FBS Ind', color: TIER_COLORS['FBS Ind'] },
  { label: 'D2', color: TIER_COLORS['2-Div II'] },
  { label: 'D3', color: TIER_COLORS['3-Div III'] },
];

function makeMatchedIcon(color, initial) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:24px;height:24px;border-radius:50%;
      background:${color};border:1px solid rgba(139,58,58,0.5);
      box-shadow:0 1px 4px rgba(0,0,0,0.2);
      display:flex;align-items:center;justify-content:center;
      color:#FFFFFF;font-size:11px;font-weight:700;
      font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;
      cursor:pointer;transition:transform 150ms;
    ">${initial}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
}

function makeNonMatchedIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:#CCCCCC;opacity:0.5;
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function formatMoney(v) {
  if (v == null) return 'N/A';
  return '$' + Math.round(v).toLocaleString();
}

function formatPct(v) {
  if (v == null || isNaN(v)) return 'N/A';
  return Math.round(v * 100) + '%';
}

export default function GritFitMapView({
  matchedSchools,    // filtered top30 results (scored objects)
  allSchools,        // all 662 schools for non-matched dots
  shortlistIds,      // Set<unitid> for shortlist state
  onAddToShortlist,  // (school) => void
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  // Initialize map once
  useEffect(() => {
    if (mapInstanceRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: [38.5, -96],
      zoom: 4,
      zoomControl: false,
      tap: false,
      closePopupOnClick: true,
    });

    // Light tiles (spec says Leaflet default light gray — use CartoDB Positron)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 18,
    }).addTo(map);

    // Custom zoom controls top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Build popup HTML for a matched school
  const buildPopupHtml = useCallback((school) => {
    const name = school.school_name || 'Unknown';
    const tier = school.type || '';
    const conf = school.conference || '';
    const score = school.acadScore ? Math.round(school.acadScore * 100) + '%' : 'N/A';
    const dist = school.dist != null ? school.dist + ' miles' : 'N/A';
    const cost = formatMoney(school.netCost != null ? school.netCost / 4 : null);
    const droi = school.droi != null ? school.droi.toFixed(1) + 'x' : 'N/A';
    const grad = formatPct(school.gradRate);
    const inList = shortlistIds.has(school.unitid);
    const btnStyle = inList
      ? 'background:#E8E8E8;color:#6B6B6B;cursor:default;'
      : 'background:#D4AF37;color:#8B3A3A;cursor:pointer;';

    return `
      <div data-testid="school-popup-${school.unitid}" style="font-family:'Segoe UI',sans-serif;min-width:260px;">
        <h3 data-testid="popup-school-name" style="margin:0 0 4px;color:#8B3A3A;font-size:1.1rem;">${name}</h3>
        <p data-testid="popup-school-meta" style="margin:0 0 12px;color:#6B6B6B;font-size:0.875rem;">${tier} | ${conf}</p>
        <div data-testid="popup-metrics" style="font-size:0.875rem;line-height:1.8;color:#2C2C2C;">
          <p style="margin:0;"><strong>Match Score:</strong> ${score}</p>
          <p style="margin:0;"><strong>Distance:</strong> ${dist}</p>
          <p style="margin:0;"><strong>Net Cost:</strong> ${cost}/year</p>
          <p style="margin:0;"><strong>DROI:</strong> ${droi}</p>
          <p style="margin:0;"><strong>Grad Rate:</strong> ${grad}</p>
        </div>
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:6px;">
          <button
            data-testid="add-to-shortlist-btn"
            data-school-id="${school.unitid}"
            ${inList ? 'disabled' : ''}
            style="border:none;border-radius:4px;padding:8px 16px;font-size:0.875rem;font-weight:600;${btnStyle}"
          >
            ${inList ? '\u2713 In Shortlist' : '+ Add to Shortlist'}
          </button>
          ${school.recruiting_q_link ? `
            <a href="${school.recruiting_q_link}" target="_blank" rel="noopener"
               data-testid="rq-link-btn"
               style="text-align:center;border:1px solid #D4D4D4;border-radius:4px;padding:6px 12px;
                      font-size:0.8rem;color:#8B3A3A;text-decoration:none;">
              \u2709 Recruiting Questionnaire
            </a>
          ` : ''}
          ${school.coach_link ? `
            <a href="${school.coach_link}" target="_blank" rel="noopener"
               data-testid="visit-profile-btn"
               style="text-align:center;border:1px solid #D4D4D4;border-radius:4px;padding:6px 12px;
                      font-size:0.8rem;color:#8B3A3A;text-decoration:none;">
              Visit School Profile
            </a>
          ` : ''}
        </div>
      </div>
    `;
  }, [shortlistIds]);

  // Re-render markers when data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous markers
    if (markersLayerRef.current) {
      map.removeLayer(markersLayerRef.current);
    }

    const layer = L.layerGroup();

    // Build set of matched unitids for quick lookup
    const matchedIds = new Set((matchedSchools || []).map(s => s.unitid));

    // Non-matched schools (muted dots)
    if (allSchools) {
      allSchools.forEach(school => {
        if (matchedIds.has(school.unitid)) return;
        const lat = parseFloat(school.latitude);
        const lng = parseFloat(school.longitude);
        if (!lat || !lng) return;
        const marker = L.marker([lat, lng], { icon: makeNonMatchedIcon(), interactive: false });
        layer.addLayer(marker);
      });
    }

    // Matched schools (colored, interactive)
    if (matchedSchools) {
      matchedSchools.forEach(school => {
        const lat = parseFloat(school.latitude);
        const lng = parseFloat(school.longitude);
        if (!lat || !lng) return;

        const name = school.school_name || '';
        const initial = name.charAt(0).toUpperCase() || '?';
        const color = TIER_COLORS[school.type] || '#8B3A3A';
        const marker = L.marker([lat, lng], {
          icon: makeMatchedIcon(color, initial),
          keyboard: true,
        });

        marker.setAttribute
          ? null
          : marker.options.alt = `${name}, ${school.type}, ${school.dist} miles away`;

        const popup = L.popup({
          maxWidth: 320,
          minWidth: 260,
          className: 'gritfit-popup',
        }).setContent(buildPopupHtml(school));

        marker.bindPopup(popup);

        // Handle shortlist button clicks inside popup
        marker.on('popupopen', () => {
          const popupEl = marker.getPopup().getElement();
          if (!popupEl) return;
          const btn = popupEl.querySelector('[data-testid="add-to-shortlist-btn"]');
          if (btn && !btn.disabled) {
            btn.addEventListener('click', () => {
              onAddToShortlist(school);
              btn.textContent = '\u2713 In Shortlist';
              btn.disabled = true;
              btn.style.background = '#E8E8E8';
              btn.style.color = '#6B6B6B';
              btn.style.cursor = 'default';
            }, { once: true });
          }
        });

        layer.addLayer(marker);
      });
    }

    layer.addTo(map);
    markersLayerRef.current = layer;
  }, [matchedSchools, allSchools, shortlistIds, buildPopupHtml, onAddToShortlist]);

  return (
    <div>
      {/* Map Container */}
      <div
        ref={mapContainerRef}
        data-testid="leaflet-map-container"
        style={{
          height: 600,
          width: '100%',
          border: '1px solid #E8E8E8',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}
      />

      {/* Map Legend */}
      <div
        data-testid="map-legend"
        style={{
          marginTop: 16,
          padding: 16,
          backgroundColor: '#F5EFE0',
          border: '1px solid #E8E8E8',
          borderRadius: 8,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <span style={{ fontWeight: 600, color: '#2C2C2C', fontSize: '0.875rem', marginRight: 8 }}>
          School Type:
        </span>
        {LEGEND_ITEMS.map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 16, height: 16, borderRadius: '50%',
              backgroundColor: item.color,
              border: '1px solid rgba(0,0,0,0.15)',
            }} />
            <span style={{ fontSize: '0.875rem', color: '#2C2C2C' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
