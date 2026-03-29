/**
 * GRIT FIT Map View — Leaflet map showing matched schools only.
 * UX Spec: COMPONENT 3 — Map View
 *
 * MarkerCluster for grouped zoom behavior.
 */
import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { TIER_COLORS, TIER_LABELS } from '../lib/constants.js';

// Tier color legend items for the legend below the map
const LEGEND_ITEMS = [
  { label: 'Power 4', color: TIER_COLORS['Power 4'] },
  { label: 'G6', color: TIER_COLORS['G6'] },
  { label: 'FCS', color: TIER_COLORS['FCS'] },
  { label: 'D2', color: TIER_COLORS['D2'] },
  { label: 'D3', color: TIER_COLORS['D3'] },
];

/** Darken a hex color by a percentage (0–1). */
function darkenColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.round(((num >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 0xff) * (1 - amount)));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

function makeMatchedIcon(color, initial, inShortlist) {
  const bg = inShortlist ? darkenColor(color, 0.3) : color;
  const icon = inShortlist ? '\u2713' : '\uD83C\uDFC6';
  const fontSize = inShortlist ? '11px' : '13px';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:24px;height:24px;border-radius:50%;
      background:${bg};border:${inShortlist ? '2px solid #FFFFFF' : '1px solid rgba(139,58,58,0.5)'};
      box-shadow:0 1px 4px rgba(0,0,0,0.2);
      display:flex;align-items:center;justify-content:center;
      color:#FFFFFF;font-size:${fontSize};font-weight:700;
      font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;
      cursor:pointer;transition:transform 150ms;
    ">${icon}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
}


function formatMoney(v) {
  if (v == null) return 'N/A';
  return '$' + Math.round(v).toLocaleString();
}

function formatPct(v) {
  if (v == null || isNaN(v)) return 'N/A';
  return Math.round(v) + '%';
}

export default function GritFitMapView({
  matchedSchools,    // filtered top30 results (scored objects)
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
    const division = school.type || 'N/A';
    const conf = school.conference || 'N/A';
    const city = school.city || '';
    const state = school.state || '';
    const location = city && state ? `${city}, ${state}` : city || state || 'N/A';
    const selectivity = school.school_type || 'N/A';
    const adltv = formatMoney(school.adltv);
    const adltvRank = school.adltv_rank != null ? '#' + school.adltv_rank.toLocaleString() : 'N/A';
    const admRate = formatPct(school.admissions_rate);
    const gradRate = formatPct(school.graduation_rate);
    const inList = shortlistIds.has(school.unitid);
    const btnStyle = inList
      ? 'background:#E8E8E8;color:#6B6B6B;cursor:default;'
      : 'background:#D4AF37;color:#8B3A3A;cursor:pointer;';
    const lbl = 'margin:0 0 4px;color:#6B6B6B;font-weight:600;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.5px;';
    const val = 'margin:0 0 12px;';

    return `
      <div data-testid="school-popup-${school.unitid}" style="font-family:'Segoe UI',sans-serif;min-width:320px;max-width:360px;padding:16px;box-sizing:border-box;">
        <h3 data-testid="popup-school-name" style="margin:0 0 6px;color:#8B3A3A;font-size:1.1rem;font-weight:700;line-height:1.2;">${name}</h3>
        <p data-testid="popup-school-meta" style="margin:0 0 14px;color:#6B6B6B;font-size:0.875rem;font-weight:500;">${division} | ${conf}</p>
        <div data-testid="popup-metrics" style="display:grid;grid-template-columns:1fr 1fr;gap:12px 16px;margin-bottom:14px;font-size:0.875rem;color:#2C2C2C;">
          <div>
            <p style="${lbl}">Location</p>
            <p style="${val}">${location}</p>
            <p style="${lbl}">Division</p>
            <p style="${val}">${division}</p>
            <p style="${lbl}">Adm. Selectivity</p>
            <p style="margin:0;">${selectivity}</p>
          </div>
          <div>
            <p style="${lbl}">ADLTV</p>
            <p style="${val}">${adltv}</p>
            <p style="${lbl}">ADLTV Rank</p>
            <p style="${val}">${adltvRank}</p>
            <p style="${lbl}">Admissions Rate</p>
            <p style="margin:0;">${admRate}</p>
          </div>
        </div>
        <div style="margin-bottom:14px;font-size:0.875rem;">
          <p style="${lbl}">Graduation Rate</p>
          <p style="margin:0;color:#2C2C2C;">${gradRate}</p>
        </div>
        <div style="margin-top:14px;display:flex;flex-direction:column;gap:8px;">
          <button
            data-testid="add-to-shortlist-btn"
            data-school-id="${school.unitid}"
            ${inList ? 'disabled' : ''}
            style="border:none;border-radius:4px;padding:10px 16px;font-size:0.875rem;font-weight:600;${btnStyle}"
          >
            ${inList ? '\u2713 In Shortlist' : '+ Add to Shortlist'}
          </button>
          ${school.recruiting_q_link ? `
            <a href="${school.recruiting_q_link}" target="_blank" rel="noopener"
               data-testid="rq-link-btn"
               style="text-align:center;border:1px solid #D4D4D4;border-radius:4px;padding:8px 12px;
                      font-size:0.8rem;color:#8B3A3A;text-decoration:none;">
              \u2709 Recruiting Questionnaire
            </a>
          ` : ''}
          ${school.coach_link ? `
            <a href="${school.coach_link}" target="_blank" rel="noopener"
               data-testid="visit-profile-btn"
               style="text-align:center;border:1px solid #D4D4D4;border-radius:4px;padding:8px 12px;
                      font-size:0.8rem;color:#8B3A3A;text-decoration:none;">
              Contact Coaches
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

    // Use MarkerClusterGroup for zoom-based clustering
    const cluster = L.markerClusterGroup({
      maxClusterRadius: 40,
      iconCreateFunction: (c) => {
        const n = c.getChildCount();
        const sz = n < 10 ? 28 : n < 50 ? 34 : 40;
        return L.divIcon({
          html: `<div style="
            width:${sz}px;height:${sz}px;border-radius:50%;
            background:rgba(139,58,58,0.85);border:2px solid #8B3A3A;
            display:flex;align-items:center;justify-content:center;
            color:#FFFFFF;font-size:${sz < 34 ? 11 : 13}px;font-weight:bold;
            font-family:var(--font-body);
          ">${n}</div>`,
          className: '',
          iconSize: [sz, sz],
          iconAnchor: [sz / 2, sz / 2],
        });
      },
    });

    // Matched schools only (colored, interactive, with shortlist button)
    if (matchedSchools) {
      matchedSchools.forEach(school => {
        const lat = parseFloat(school.latitude);
        const lng = parseFloat(school.longitude);
        if (!lat || !lng) return;

        const name = school.school_name || '';
        const inShortlist = shortlistIds && shortlistIds.has(school.unitid);
        const color = TIER_COLORS[school.type] || '#8B3A3A';
        const marker = L.marker([lat, lng], {
          icon: makeMatchedIcon(color, null, inShortlist),
          keyboard: true,
        });

        marker.bindPopup(L.popup({ maxWidth: 360, minWidth: 320 }).setContent(buildPopupHtml(school)));

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

        cluster.addLayer(marker);
      });
    }

    cluster.addTo(map);
    markersLayerRef.current = cluster;
  }, [matchedSchools, shortlistIds, buildPopupHtml, onAddToShortlist]);

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
