/**
 * Browse Map Page — anonymous-accessible map showing all 662 schools.
 * No authentication required. School detail cards on marker click.
 * CTA banner at bottom encouraging account creation.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { supabase } from '../lib/supabaseClient.js';
import { TIER_COLORS } from '../lib/constants.js';

const DIVISION_OPTIONS = ['All Divisions', 'Power 4', 'G6', '1-FCS', 'FBS Ind', '2-Div II', '3-Div III'];

const LEGEND_ITEMS = [
  { label: 'Power 4', color: TIER_COLORS['Power 4'] },
  { label: 'G6', color: TIER_COLORS['G6'] },
  { label: '1-FCS', color: TIER_COLORS['1-FCS'] },
  { label: 'FBS Ind', color: TIER_COLORS['FBS Ind'] },
  { label: '2-Div II', color: TIER_COLORS['2-Div II'] },
  { label: '3-Div III', color: TIER_COLORS['3-Div III'] },
];

function makeSchoolIcon(color, initial) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:22px;height:22px;border-radius:50%;
      background:${color};border:1px solid rgba(139,58,58,0.5);
      box-shadow:0 1px 4px rgba(0,0,0,0.2);
      display:flex;align-items:center;justify-content:center;
      color:#FFFFFF;font-size:10px;font-weight:700;
      cursor:pointer;
    ">${initial}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -13],
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

function buildPopupHtml(school) {
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
  const lbl = 'margin:0 0 4px;color:#6B6B6B;font-weight:600;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.5px;';
  const val = 'margin:0 0 12px;';

  return `
    <div style="font-family:'Segoe UI',sans-serif;min-width:320px;max-width:360px;padding:16px;box-sizing:border-box;">
      <h3 style="margin:0 0 6px;color:#8B3A3A;font-size:1.1rem;font-weight:700;line-height:1.2;">${name}</h3>
      <p style="margin:0 0 14px;color:#6B6B6B;font-size:0.875rem;font-weight:500;">${division} | ${conf}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 16px;margin-bottom:14px;font-size:0.875rem;color:#2C2C2C;">
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
        ${school.recruiting_q_link ? `
          <a href="${school.recruiting_q_link}" target="_blank" rel="noopener"
             style="text-align:center;border:1px solid #D4D4D4;border-radius:4px;padding:8px 12px;
                    font-size:0.8rem;color:#8B3A3A;text-decoration:none;">
            \u2709 Recruiting Questionnaire
          </a>` : ''}
        ${school.coach_link ? `
          <a href="${school.coach_link}" target="_blank" rel="noopener"
             style="text-align:center;border:1px solid #D4D4D4;border-radius:4px;padding:8px 12px;
                    font-size:0.8rem;color:#8B3A3A;text-decoration:none;">
            Contact Coaches
          </a>` : ''}
      </div>
    </div>`;
}

export default function BrowseMapPage() {
  const [allSchools, setAllSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('All Divisions');

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  // Fetch all schools — public query, no auth needed
  useEffect(() => {
    const fetchSchools = async () => {
      setLoading(true);
      const { data, error: fetchError } = await supabase.from('schools').select('*');
      if (fetchError) {
        setError('Failed to load school data. Please try again.');
        console.error('BrowseMapPage fetch error:', fetchError);
      } else {
        setAllSchools(data || []);
      }
      setLoading(false);
    };
    fetchSchools();
  }, []);

  // Initialize map
  useEffect(() => {
    if (mapInstanceRef.current || loading || !mapContainerRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: [38.5, -96], zoom: 4, zoomControl: false, tap: false, closePopupOnClick: true,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>', maxZoom: 18,
    }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, [loading]);

  const getFilteredSchools = useCallback(() => {
    let schools = allSchools;
    if (divisionFilter !== 'All Divisions') {
      schools = schools.filter(s => s.type === divisionFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      schools = schools.filter(s =>
        (s.school_name || '').toLowerCase().includes(q) ||
        (s.city || '').toLowerCase().includes(q) ||
        (s.state || '').toLowerCase().includes(q) ||
        (s.conference || '').toLowerCase().includes(q)
      );
    }
    return schools;
  }, [allSchools, divisionFilter, searchQuery]);

  // Re-render markers when filters change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || loading) return;
    if (markersLayerRef.current) map.removeLayer(markersLayerRef.current);
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
    getFilteredSchools().forEach(school => {
      const lat = parseFloat(school.latitude);
      const lng = parseFloat(school.longitude);
      if (!lat || !lng) return;
      const name = school.school_name || '';
      const initial = name.charAt(0).toUpperCase() || '?';
      const color = TIER_COLORS[school.type] || '#8B3A3A';
      const marker = L.marker([lat, lng], { icon: makeSchoolIcon(color, initial), keyboard: true });
      marker.bindPopup(L.popup({ maxWidth: 360, minWidth: 320 }).setContent(buildPopupHtml(school)));
      cluster.addLayer(marker);
    });
    cluster.addTo(map);
    markersLayerRef.current = cluster;
  }, [allSchools, divisionFilter, searchQuery, loading, getFilteredSchools]);

  const schoolCount = getFilteredSchools().length;

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: '#6B6B6B' }}>Loading school map...</div>;
  if (error) return <div style={{ padding: 48, textAlign: 'center' }}><p style={{ color: '#8B3A3A', fontSize: '1.125rem' }}>{error}</p></div>;

  return (
    <div data-testid="browse-map-page">
      <h2 data-testid="browse-map-title" style={{ fontSize: '2rem', fontWeight: 700, color: '#8B3A3A', margin: '0 0 8px' }}>
        Browse All College Football Programs
      </h2>
      <p style={{ fontSize: '1.125rem', color: '#6B6B6B', margin: '0 0 24px' }}>
        Showing {schoolCount} of {allSchools.length} schools
      </p>

      {/* Filters */}
      <div data-testid="browse-map-filters" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <input type="text" data-testid="browse-map-search" placeholder="Search schools, cities, states..."
          value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: '1 1 240px', padding: '10px 14px', border: '1px solid #D4D4D4', borderRadius: 4, fontSize: '0.875rem', fontFamily: 'inherit' }} />
        <select data-testid="browse-map-division-filter" value={divisionFilter} onChange={(e) => setDivisionFilter(e.target.value)}
          style={{ padding: '10px 14px', border: '1px solid #D4D4D4', borderRadius: 4, fontSize: '0.875rem', fontFamily: 'inherit', backgroundColor: '#FFFFFF', cursor: 'pointer' }}>
          {DIVISION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        {(searchQuery || divisionFilter !== 'All Divisions') && (
          <button data-testid="browse-map-clear-filters" onClick={() => { setSearchQuery(''); setDivisionFilter('All Divisions'); }}
            style={{ background: 'none', border: 'none', color: '#8B3A3A', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.875rem' }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Map */}
      <div ref={mapContainerRef} data-testid="browse-map-leaflet-container"
        style={{ height: 600, width: '100%', border: '1px solid #E8E8E8', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }} />

      {/* Legend */}
      <div data-testid="browse-map-legend" style={{ marginTop: 16, padding: 16, backgroundColor: '#F5EFE0', border: '1px solid #E8E8E8', borderRadius: 8, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <span style={{ fontWeight: 600, color: '#2C2C2C', fontSize: '0.875rem', marginRight: 8 }}>School Type:</span>
        {LEGEND_ITEMS.map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: item.color, border: '1px solid rgba(0,0,0,0.15)' }} />
            <span style={{ fontSize: '0.875rem', color: '#2C2C2C' }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* CTA Banner */}
      <div data-testid="browse-map-cta" style={{ marginTop: 32, padding: '32px 24px', backgroundColor: '#8B3A3A', borderRadius: 8, textAlign: 'center', boxShadow: '0 4px 12px rgba(139,58,58,0.2)' }}>
        <h3 style={{ color: '#FFFFFF', fontSize: '1.5rem', fontWeight: 700, margin: '0 0 8px' }}>
          Find Your Perfect College Football Fit
        </h3>
        <p style={{ color: '#F5EFE0', fontSize: '1.125rem', margin: '0 0 24px', maxWidth: 600, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
          Create a free account to get your personalized GRIT FIT scores — matching your athletic stats,
          academics, and finances against all {allSchools.length} programs.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" data-testid="cta-register-btn"
            style={{ display: 'inline-block', padding: '14px 32px', backgroundColor: '#D4AF37', color: '#8B3A3A', borderRadius: 4, textDecoration: 'none', fontWeight: 700, fontSize: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
            Create Free Account
          </Link>
          <Link to="/login" data-testid="cta-login-btn"
            style={{ display: 'inline-block', padding: '14px 32px', border: '2px solid #FFFFFF', color: '#FFFFFF', borderRadius: 4, textDecoration: 'none', fontWeight: 600, fontSize: '1rem', backgroundColor: 'transparent' }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
