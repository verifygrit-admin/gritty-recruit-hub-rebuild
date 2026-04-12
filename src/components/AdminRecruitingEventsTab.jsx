import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import AdminTableEditor from './AdminTableEditor.jsx';
import SlideOutForm from './SlideOutForm.jsx';
import useIsDesktop from '../hooks/useIsDesktop.js';

// AdminRecruitingEventsTab — Recruiting Events tab for event calendar + registration tracking.
// OBJ-4 (Session 016-C): Supabase data wired via admin-read-recruiting-events Edge Function.
// Column config aligned to public.recruiting_events schema (migration 0030).
// Decision 6: Sortable columns handled by AdminTableEditor.

const RECRUITING_EVENTS_COLUMNS = [
  { key: 'id', label: 'ID', editable: false, width: '80px' },
  { key: 'event_name', label: 'Event Name', editable: true, width: '220px' },
  { key: 'event_type', label: 'Type', editable: true, width: '120px' },
  { key: 'event_date', label: 'Date', editable: true, width: '120px' },
  { key: 'end_date', label: 'End Date', editable: true, width: '120px' },
  { key: 'school_name', label: 'School', editable: false, width: '180px' },
  { key: 'location', label: 'Location', editable: true, width: '180px' },
  { key: 'status', label: 'Status', editable: true, width: '130px' },
  { key: 'cost_dollars', label: 'Cost ($)', editable: true, width: '90px' },
  { key: 'registration_deadline', label: 'Reg Deadline', editable: true, width: '120px' },
  { key: 'created_at', label: 'Created', editable: false, width: '140px' },
];

function getEventFieldGroups(row) {
  return [
    {
      title: 'Event Info',
      fields: [
        { key: 'event_name', label: 'Event Name', value: row.event_name, required: true, maxLength: 255 },
        { key: 'event_type', label: 'Event Type', value: row.event_type, type: 'select', options: [
          { value: 'camp', label: 'Camp' },
          { value: 'junior_day', label: 'Junior Day' },
          { value: 'official_visit', label: 'Official Visit' },
          { value: 'unofficial_visit', label: 'Unofficial Visit' },
        ]},
        { key: 'status', label: 'Status', value: row.status, type: 'select', options: [
          { value: 'confirmed', label: 'Confirmed' },
          { value: 'registration_open', label: 'Registration Open' },
          { value: 'completed', label: 'Completed' },
          { value: 'cancelled', label: 'Cancelled' },
        ]},
        { key: 'description', label: 'Description', value: row.description, type: 'textarea', maxLength: 1000 },
      ],
    },
    {
      title: 'Schedule & Location',
      fields: [
        { key: 'event_date', label: 'Event Date', value: row.event_date, type: 'date', required: true },
        { key: 'end_date', label: 'End Date', value: row.end_date, type: 'date' },
        { key: 'registration_deadline', label: 'Registration Deadline', value: row.registration_deadline, type: 'date' },
        { key: 'location', label: 'Location', value: row.location, maxLength: 255 },
      ],
    },
    {
      title: 'Logistics',
      fields: [
        { key: 'school_name', label: 'Host School', value: row.school_name, readOnly: true },
        { key: 'unitid', label: 'School ID (unitid)', value: row.unitid, readOnly: true, type: 'number' },
        { key: 'cost_dollars', label: 'Cost ($)', value: row.cost_dollars, type: 'number' },
        { key: 'registration_url', label: 'Registration URL', value: row.registration_url, maxLength: 500 },
      ],
    },
  ];
}

// --- POR tooltip config (spec §1.4) ---
// Field names confirmed against 0030 schema by Patch (Session 016-C).
const POR_CONFIG = {
  tabContext: 'recruiting-events',
  getTooltipData: (row) => ({
    title: row.event_name || `Event #${row.id}`,
    eventType: row.event_type ?? null,
    eventDate: row.event_date ?? null,
    location: row.location ?? null,
    status: row.status ?? null,
    costDollars: row.cost_dollars ?? null,
    associatedInstitution: row.school_name ?? null,
    createdAt: row.created_at ?? null,
  }),
};

export default function AdminRecruitingEventsTab() {
  const isDesktop = useIsDesktop();
  const [selectedRow, setSelectedRow] = useState(null);
  const [formData, setFormData] = useState({});
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadEvents = useCallback(async () => {
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

      const res = await fetch(`${supabaseUrl}/functions/v1/admin-read-recruiting-events`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
          'apikey': anonKey,
        },
      });

      if (!res.ok) {
        setLoadError(`Failed to load recruiting events (HTTP ${res.status}). The admin-read-recruiting-events Edge Function may not be deployed yet.`);
        setLoading(false);
        return;
      }

      const body = await res.json();
      if (!body?.success) {
        setLoadError(body?.error || 'Failed to load recruiting events.');
        setLoading(false);
        return;
      }

      setRows(body.events || []);
      setLoading(false);
    } catch (err) {
      setLoadError('Network error loading recruiting events. Please try again.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

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
    // TODO (016-C follow-up): Wire to admin-update-recruiting-event Edge Function.
    // Reads are wired; writes will follow the admin-update-school pattern.
    handleClose();
  }, [handleClose]);

  const fieldGroups = selectedRow ? getEventFieldGroups(formData) : [];

  return (
    <>
      <AdminTableEditor
        columns={RECRUITING_EVENTS_COLUMNS}
        rows={rows}
        rowKey="id"
        tableName="recruiting events"
        loading={loading}
        loadError={loadError}
        onRetry={loadEvents}
        isDesktop={isDesktop}
        onRowClick={handleRowClick}
        porConfig={POR_CONFIG}
      />
      <SlideOutForm
        isOpen={!!selectedRow}
        onClose={handleClose}
        title={selectedRow ? `Event — ${formData.event_name || ''} (ID: ${formData.id || ''})` : ''}
        fieldGroups={fieldGroups}
        isDesktop={isDesktop}
        onFieldChange={handleFieldChange}
        onSave={handleSave}
      />
    </>
  );
}
