import { useState, useCallback } from 'react';
import AdminTableEditor from './AdminTableEditor.jsx';
import SlideOutForm from './SlideOutForm.jsx';
import useIsDesktop from '../hooks/useIsDesktop.js';

// AdminRecruitingEventsTab — Recruiting Events tab for event calendar + registration tracking.
// Decision 3: No Supabase calls. TODO comments mark where data fetching will go.
// Decision 6: Sortable columns handled by AdminTableEditor.

const RECRUITING_EVENTS_COLUMNS = [
  { key: 'id', label: 'ID', editable: false, width: '80px' },
  { key: 'event_name', label: 'Event Name', editable: true, width: '220px' },
  { key: 'event_date', label: 'Date', editable: true, width: '120px' },
  { key: 'location', label: 'Location', editable: true, width: '180px' },
  { key: 'host_school_id', label: 'Host School', editable: true, width: '140px' },
  { key: 'registration_cap', label: 'Reg Cap', editable: true, width: '90px' },
  { key: 'current_registrations', label: 'Registered', editable: true, width: '100px' },
  { key: 'created_at', label: 'Created', editable: false, width: '140px' },
];

function getEventFieldGroups(row) {
  return [
    {
      title: 'Event Info',
      fields: [
        { key: 'event_name', label: 'Event Name', value: row.event_name, required: true, maxLength: 255 },
        { key: 'event_date', label: 'Event Date', value: row.event_date, type: 'date' },
        { key: 'event_time', label: 'Event Time', value: row.event_time, type: 'time' },
        { key: 'location', label: 'Location', value: row.location, maxLength: 255 },
      ],
    },
    {
      title: 'Logistics',
      fields: [
        { key: 'host_school_id', label: 'Host School', value: row.host_school_id, type: 'select', options: [] },
        { key: 'registration_cap', label: 'Registration Cap', value: row.registration_cap, type: 'number' },
        { key: 'current_registrations', label: 'Current Registrations', value: row.current_registrations, readOnly: true, type: 'number' },
      ],
    },
    {
      title: 'Details',
      fields: [
        { key: 'description', label: 'Description', value: row.description, type: 'textarea', maxLength: 1000 },
        { key: 'event_type', label: 'Event Type', value: row.event_type, type: 'select', options: [
          { value: 'camp', label: 'Camp' },
          { value: 'showcase', label: 'Showcase' },
          { value: 'combine', label: 'Combine' },
          { value: 'other', label: 'Other' },
        ]},
      ],
    },
  ];
}

// --- POR tooltip config (spec §1.4) ---
// Field names are PROVISIONAL pending WT-B Patch schema confirmation.
const POR_CONFIG = {
  tabContext: 'recruiting-events',
  getTooltipData: (row) => ({
    title: row.event_name || `Event #${row.id}`,
    eventType: row.event_type ?? null,
    eventDate: row.event_date ?? null,
    location: row.location ?? null,
    registeredCount: row.current_registrations ?? null,
    associatedInstitution: row.host_school_id ?? null,
    lastUpdated: row.updated_at ?? null,
  }),
};

export default function AdminRecruitingEventsTab() {
  const isDesktop = useIsDesktop();
  const [selectedRow, setSelectedRow] = useState(null);
  const [formData, setFormData] = useState({});

  // TODO: Wire Supabase data fetching for recruiting events.
  // GET /functions/v1/admin-read-recruiting-events
  const rows = [];
  const loading = false;
  const loadError = '';

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
    // TODO: Wire to Supabase Edge Function — PUT /functions/v1/admin-update-recruiting-event
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
