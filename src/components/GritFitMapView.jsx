/**
 * GRIT FIT Map View — the unified "My Grit Fit Map" after Sprint 003 D3 merge.
 *
 * Base layer: all 662 programs, division-colored pins.
 * Overlay icons on pins:
 *   - star  → Grit Fit recommended school
 *   - check → shortlist school
 *   - both overlays → school is both (star + check composed on the pin)
 *
 * The surrounding filter bar (including the new Recruiting List dropdown) is
 * rendered by GritFitActionBar / GritFitPage; this component receives the
 * already-filtered `schools` array plus the Grit Fit and shortlist unitid
 * sets used to decide overlays.
 */
import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { TIER_COLORS } from '../lib/constants.js';
import { getOverlayState } from '../lib/map/overlayLogic.js';
import { STATUS_LABELS } from '../lib/statusLabels.js';
import { computeGritFitStatuses } from '../lib/gritFitStatus.js';
import { hasVerbalOffer, hasWrittenOffer } from '../lib/offerStatus.js';
import { buildOfferBadgeHtml } from './OfferBadge.jsx';

/**
 * Build the inline-HTML fragment for a GRIT FIT status pill inside the Leaflet
 * popup. Returns '' when statusKey is falsy or unknown (A-2: no pill for empty
 * status). Exported for testability — see tests/unit/g5-map-popup-status.test.js.
 */
export function buildStatusPillHtml(statusKey) {
  if (!statusKey) return '';
  const cfg = STATUS_LABELS[statusKey];
  if (!cfg) return '';
  return `<span data-testid="popup-status-pill" data-status="${statusKey}" style="display:inline-block;background:${cfg.bg};color:${cfg.textColor};border-radius:999px;padding:3px 10px;font-size:0.7rem;font-weight:700;margin-top:6px;letter-spacing:0.04em;">${cfg.label}</span>`;
}

/**
 * Derive the primary GRIT FIT status key for a school in the popup context.
 * Returns null when no label applies (A-2: no pill). Exported for testability.
 */
export function derivePopupStatusKey(school, topTier, recruitReach) {
  try {
    const labels = computeGritFitStatuses(school, topTier ?? null, recruitReach ?? null);
    return labels.length > 0 ? labels[0] : null;
  } catch (_e) {
    return null;
  }
}

const LEGEND_ITEMS = [
  { label: 'Power 4', color: TIER_COLORS['Power 4'] },
  { label: 'G6', color: TIER_COLORS['G6'] },
  { label: 'FCS', color: TIER_COLORS['FCS'] },
  { label: 'D2', color: TIER_COLORS['D2'] },
  { label: 'D3', color: TIER_COLORS['D3'] },
];

/**
 * Build an SVG-in-div Leaflet icon with a division-colored circle plus
 * optional star and/or check overlay glyphs. All overlays are composed on
 * the same pin — "both" shows both glyphs side-by-side.
 */
function makePinIcon(color, overlay) {
  const base = `
    <div style="
      width:26px;height:26px;border-radius:50%;
      background:${color};border:1px solid rgba(0,0,0,0.25);
      box-shadow:0 1px 4px rgba(0,0,0,0.2);
      position:relative;
      display:flex;align-items:center;justify-content:center;
      color:#FFFFFF;font-size:12px;font-weight:700;
      font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;
      cursor:pointer;
    ">`;

  const glyphs = [];
  if (overlay === 'star' || overlay === 'both') glyphs.push('★');
  if (overlay === 'check' || overlay === 'both') glyphs.push('✓');
  const body = glyphs.length
    ? `<span style="line-height:1;text-shadow:0 1px 2px rgba(0,0,0,0.4);font-size:${glyphs.length > 1 ? '10px' : '13px'};letter-spacing:1px;">${glyphs.join('')}</span>`
    : '';

  return L.divIcon({
    className: '',
    html: `${base}${body}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -15],
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
  schools,              // array of scored school records to render (already filtered)
  gritFitUnitIds,       // Set<number> — user's top30 Grit Fit unitids
  shortlistIds,         // Set<number> — user's shortlist unitids
  shortlistByUnitid,    // Map<number, short_list_items row> — HF-4, drives Verbal/Written Offer badges in the popup
  onAddToShortlist,     // (school) => void
  topTier,              // from scoringResult; needed to compute per-school GRIT FIT status pill (F2)
  recruitReach,         // from scoringResult; needed to compute per-school GRIT FIT status pill (F2)
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

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 18,
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const buildPopupHtml = useCallback((school, overlay) => {
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
    const inList = overlay === 'check' || overlay === 'both';
    const isGritFit = overlay === 'star' || overlay === 'both';
    const btnStyle = inList
      ? 'background:#E8E8E8;color:#6B6B6B;cursor:default;'
      : 'background:var(--brand-gold);color:var(--brand-maroon);cursor:pointer;';
    const lbl = 'margin:0 0 4px;color:#6B6B6B;font-weight:600;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.5px;';
    const val = 'margin:0 0 12px;';

    const statusChip = isGritFit
      ? '<span style="display:inline-block;background:#FFF4CC;color:#8B6B00;border:1px solid #E6C860;border-radius:999px;padding:2px 8px;font-size:0.7rem;font-weight:700;margin-left:6px;">★ Grit Fit</span>'
      : '';

    // Sprint 004 Phase 1 F2 — ADDITIVE: GRIT FIT StatusPill in popup header.
    // Sprint 005 D3a — render the FULL set of applicable Fit Category badges
    // (priority-ordered by computeGritFitStatuses), not just the top label.
    // Each pill is concatenated into a single inline-flex container so the
    // existing data-testid="popup-status-slot" still resolves and the popup
    // wraps cleanly when 3+ badges apply.
    // computeGritFitStatuses requires schoolRigor + athleteAcad; schools not in
    // the scored pool fall back to empty labels (no pill). A-2 compliant.
    let statusPillHtml = '';
    try {
      const labels = computeGritFitStatuses(school, topTier ?? null, recruitReach ?? null);
      if (labels.length > 0) {
        statusPillHtml = labels.map(buildStatusPillHtml).filter(Boolean).join(' ');
      }
    } catch (_e) {
      statusPillHtml = '';
    }

    // HF-4 — Verbal / Written Offer badges. Lookup is keyed by unitid against
    // the shortlist map; pins for non-shortlisted schools render no badge.
    const sli = shortlistByUnitid ? shortlistByUnitid.get(school.unitid) : null;
    const offerBadgesHtml = sli
      ? [
          hasVerbalOffer(sli)  ? buildOfferBadgeHtml('verbal')  : '',
          hasWrittenOffer(sli) ? buildOfferBadgeHtml('written') : '',
        ].filter(Boolean).join(' ')
      : '';

    return `
      <div data-testid="school-popup-${school.unitid}" style="font-family:'Segoe UI',sans-serif;min-width:320px;max-width:360px;padding:16px;box-sizing:border-box;">
        <h3 data-testid="popup-school-name" style="margin:0 0 6px;color:var(--brand-maroon);font-size:1.1rem;font-weight:700;line-height:1.2;">${name}${statusChip}</h3>
        <p data-testid="popup-school-meta" style="margin:0 0 14px;color:#6B6B6B;font-size:0.875rem;font-weight:500;">${division} | ${conf}</p>
        ${statusPillHtml ? `<div data-testid="popup-status-slot" style="margin:0 0 12px;">${statusPillHtml}</div>` : ''}
        ${offerBadgesHtml ? `<div data-testid="popup-offer-badges" style="margin:0 0 12px;display:flex;gap:6px;flex-wrap:wrap;">${offerBadgesHtml}</div>` : ''}
        <div data-testid="popup-metrics" style="display:grid;grid-template-columns:1fr 1fr;gap:12px 16px;margin-bottom:14px;font-size:0.875rem;color:#2C2C2C;">
          <div>
            <p style="${lbl}">Location</p>
            <p style="${val}">${location}</p>
          </div>
          <div>
            <p style="${lbl}">ADLTV</p>
            <p style="${val}">${adltv}</p>
          </div>
          <div>
            <p style="${lbl}">Adm. Selectivity</p>
            <p style="${val}">${selectivity}</p>
          </div>
          <div>
            <p style="${lbl}">ADLTV Rank</p>
            <p style="${val}">${adltvRank}</p>
          </div>
          <div>
            <p style="${lbl}">Admissions Rate</p>
            <p style="margin:0;">${admRate}</p>
          </div>
          <div>
            <p style="${lbl}">Graduation Rate</p>
            <p style="margin:0;">${gradRate}</p>
          </div>
        </div>
        <div style="margin-top:14px;display:flex;flex-direction:column;gap:8px;">
          <button
            data-testid="add-to-shortlist-btn"
            data-school-id="${school.unitid}"
            ${inList ? 'disabled' : ''}
            style="border:none;border-radius:4px;padding:10px 16px;font-size:0.875rem;font-weight:600;${btnStyle}"
          >
            ${inList ? '✓ In Shortlist' : '+ Add to Shortlist'}
          </button>
          ${school.recruiting_q_link ? `
            <a href="${school.recruiting_q_link}" target="_blank" rel="noopener noreferrer"
               data-testid="rq-link-btn"
               style="text-align:center;border:1px solid #D4D4D4;border-radius:4px;padding:8px 12px;
                      font-size:0.8rem;color:var(--brand-maroon);text-decoration:none;">
              ✉ Recruiting Questionnaire
            </a>
          ` : ''}
          ${school.coach_link ? `
            <a href="${school.coach_link}" target="_blank" rel="noopener noreferrer"
               data-testid="visit-profile-btn"
               style="text-align:center;border:1px solid #D4D4D4;border-radius:4px;padding:8px 12px;
                      font-size:0.8rem;color:var(--brand-maroon);text-decoration:none;">
              Contact Coaches
            </a>
          ` : ''}
        </div>
      </div>
    `;
  }, [topTier, recruitReach, shortlistByUnitid]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (markersLayerRef.current) {
      map.removeLayer(markersLayerRef.current);
    }

    const cluster = L.markerClusterGroup({
      maxClusterRadius: 40,
      iconCreateFunction: (c) => {
        const n = c.getChildCount();
        const sz = n < 10 ? 28 : n < 50 ? 34 : 40;
        return L.divIcon({
          html: `<div style="
            width:${sz}px;height:${sz}px;border-radius:50%;
            background:rgba(139,58,58,0.85);border:2px solid var(--brand-maroon);
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

    if (schools) {
      schools.forEach(school => {
        const lat = parseFloat(school.latitude);
        const lng = parseFloat(school.longitude);
        if (!lat || !lng) return;

        const overlay = getOverlayState(school, gritFitUnitIds, shortlistIds);
        const color = TIER_COLORS[school.type] || '#8B3A3A';
        const marker = L.marker([lat, lng], {
          icon: makePinIcon(color, overlay),
          keyboard: true,
        });

        // Sprint 004 Phase 1 F2 — revert to Leaflet popup (G5 slide-out removed).
        // Popup now additively shows the GRIT FIT status pill (derived via
        // computeGritFitStatuses inside buildPopupHtml).
        marker.bindPopup(L.popup({ maxWidth: 360, minWidth: 320 }).setContent(buildPopupHtml(school, overlay)));

        marker.on('popupopen', () => {
          const popupEl = marker.getPopup().getElement();
          if (!popupEl) return;
          const btn = popupEl.querySelector('[data-testid="add-to-shortlist-btn"]');
          if (btn && !btn.disabled && onAddToShortlist) {
            btn.addEventListener('click', () => {
              onAddToShortlist(school);
              btn.textContent = '✓ In Shortlist';
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
  }, [schools, gritFitUnitIds, shortlistIds, shortlistByUnitid, buildPopupHtml, onAddToShortlist]);

  return (
    <div>
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
          alignItems: 'center',
        }}
      >
        <span style={{ fontWeight: 600, color: '#2C2C2C', fontSize: '0.875rem', marginRight: 8 }}>
          Division:
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

        <span style={{ borderLeft: '1px solid #D4D4D4', height: 20, margin: '0 4px' }} />

        <span style={{ fontWeight: 600, color: '#2C2C2C', fontSize: '0.875rem', marginRight: 8 }}>
          Overlay:
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '1rem' }}>★</span>
          <span style={{ fontSize: '0.875rem', color: '#2C2C2C' }}>Grit Fit match</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '1rem' }}>✓</span>
          <span style={{ fontSize: '0.875rem', color: '#2C2C2C' }}>On my Short List</span>
        </div>
      </div>
    </div>
  );
}
