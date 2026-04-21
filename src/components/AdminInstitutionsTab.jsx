import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import AdminTableEditor from './AdminTableEditor.jsx';
import SlideOutForm from './SlideOutForm.jsx';
import useIsDesktop from '../hooks/useIsDesktop.js';

// AdminInstitutionsTab — Institutions tab for college metadata, division/conference data.
// OBJ-4 (Session 016-C): Supabase data wired via admin-read-institutions Edge Function.
// Backing table is public.schools (662 rows, PK unitid). UI calls them "institutions".
// Decision 6: Sortable columns handled by AdminTableEditor.

const INSTITUTIONS_COLUMNS = [
  { key: 'unitid', label: 'UNITID', editable: false, width: '80px' },
  { key: 'school_name', label: 'School', editable: false, width: '220px' },
  { key: 'city', label: 'City', editable: false, width: '120px' },
  { key: 'state', label: 'State', editable: false, width: '80px' },
  { key: 'ncaa_division', label: 'Division', editable: false, width: '100px' },
  { key: 'conference', label: 'Conference', editable: false, width: '160px' },
  { key: 'avg_gpa', label: 'Avg GPA', editable: false, width: '80px' },
  { key: 'avg_sat', label: 'Avg SAT', editable: false, width: '80px' },
  { key: 'graduation_rate', label: 'Grad Rate', editable: false, width: '100px' },
  { key: 'need_blind_school', label: 'Need Blind', editable: false, width: '100px' },
  { key: 'is_test_optional', label: 'Test Optional', editable: false, width: '110px' },
  { key: 'athletics_phone', label: 'Athletics Phone', editable: true, width: '140px' },
  { key: 'athletics_email', label: 'Athletics Email', editable: true, width: '200px' },
];

function getInstitutionFieldGroups(row) {
  return [
    {
      title: 'School Metadata',
      fields: [
        { key: 'school_name', label: 'School Name', value: row.school_name, readOnly: true },
        { key: 'city', label: 'City', value: row.city, readOnly: true },
        { key: 'state', label: 'State', value: row.state, readOnly: true },
        { key: 'ncaa_division', label: 'Division', value: row.ncaa_division, type: 'select', options: [
          { value: 'D1', label: 'Division I' },
          { value: 'D2', label: 'Division II' },
          { value: 'D3', label: 'Division III' },
          { value: 'NAIA', label: 'NAIA' },
          { value: 'NJCAA', label: 'NJCAA' },
        ]},
        { key: 'conference', label: 'Conference', value: row.conference, type: 'select', options: [] },
        { key: 'latitude', label: 'Latitude', value: row.latitude, readOnly: true },
        { key: 'longitude', label: 'Longitude', value: row.longitude, readOnly: true },
      ],
    },
    {
      title: 'Financial / Academic',
      fields: [
        { key: 'avg_gpa', label: 'Average GPA', value: row.avg_gpa, readOnly: true, type: 'number' },
        { key: 'avg_sat', label: 'Average SAT', value: row.avg_sat, readOnly: true, type: 'number' },
        { key: 'graduation_rate', label: 'Graduation Rate', value: row.graduation_rate, readOnly: true },
        { key: 'need_blind_school', label: 'Need Blind', value: row.need_blind_school, readOnly: true },
        { key: 'is_test_optional', label: 'Test Optional', value: row.is_test_optional, readOnly: true },
      ],
    },
    {
      title: 'Contact',
      fields: [
        { key: 'athletics_phone', label: 'Athletics Phone', value: row.athletics_phone, type: 'tel' },
        { key: 'athletics_email', label: 'Athletics Email', value: row.athletics_email, type: 'email' },
      ],
    },
  ];
}

// --- POR tooltip config (spec §1.3) ---
// Field names confirmed against schools schema by Patch (Session 016-C).
// Ghost columns stripped: active_coach_count, athlete_interest_count.
// Renamed: updated_at → last_updated.
// Sprint 001 D3 (2026-04-20): athletesInterested (string[]) + athleteInterestCount
// (number) now surfaced from the row. Backend populates; frontend defaults to
// empty array / 0 if absent.
const POR_CONFIG = {
  tabContext: 'institutions',
  getTooltipData: (row) => ({
    title: row.school_name || `Institution #${row.unitid}`,
    institutionType: row.ncaa_division ? `NCAA ${row.ncaa_division}` : null,
    state: row.state ?? null,
    athletesInterested: Array.isArray(row.athletesInterested) ? row.athletesInterested : [],
    athleteInterestCount: typeof row.athleteInterestCount === 'number' ? row.athleteInterestCount : 0,
    lastUpdated: row.last_updated ?? null,
  }),
};

export default function AdminInstitutionsTab() {
  const isDesktop = useIsDesktop();
  const [selectedRow, setSelectedRow] = useState(null);
  const [formData, setFormData] = useState({});
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadInstitutions = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    setRows([]);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData?.session?.access_token;

      if (!jwt) {
        setLoadError('No active admin session. Please sign in again.');
        setLoading(false);
        return;
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/admin-read-institutions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
          'apikey': anonKey,
        },
      });

      if (!res.ok) {
        setLoadError(`Failed to load institutions (HTTP ${res.status}). The admin-read-institutions Edge Function may not be deployed yet.`);
        setLoading(false);
        return;
      }

      const body = await res.json();
      if (!body?.success) {
        setLoadError(body?.error || 'Failed to load institutions.');
        setLoading(false);
        return;
      }

      setRows(body.institutions || []);
      setLoading(false);
    } catch (err) {
      setLoadError('Network error loading institutions. Please try again.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInstitutions();
  }, [loadInstitutions]);

  const handleRowClick = useCallback((row) => {
    setSelectedRow(row);
    setFormData({ ...row });
  }, []);

  const handleFieldChange = useCallback((key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleClose = useCallback(() => {
    setSelectedRow(null);
    setFormData({});
  }, []);

  const handleSave = useCallback(() => {
    // TODO (016-C follow-up): Wire to admin-update-institution Edge Function.
    // Reads are wired; writes will follow the admin-update-school pattern.
    handleClose();
  }, [handleClose]);

  const fieldGroups = selectedRow ? getInstitutionFieldGroups(formData) : [];

  return (
    <>
      <AdminTableEditor
        columns={INSTITUTIONS_COLUMNS}
        rows={rows}
        rowKey="unitid"
        tableName="institutions"
        loading={loading}
        loadError={loadError}
        onRetry={loadInstitutions}
        isDesktop={isDesktop}
        onRowClick={handleRowClick}
        porConfig={POR_CONFIG}
      />
      <SlideOutForm
        isOpen={!!selectedRow}
        onClose={handleClose}
        title={selectedRow ? `School — ${formData.school_name || ''} (ID: ${formData.unitid || ''})` : ''}
        fieldGroups={fieldGroups}
        isDesktop={isDesktop}
        onFieldChange={handleFieldChange}
        onSave={handleSave}
      />
    </>
  );
}
