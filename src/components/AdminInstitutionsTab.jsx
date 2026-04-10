import { useState, useCallback } from 'react';
import AdminTableEditor from './AdminTableEditor.jsx';
import SlideOutForm from './SlideOutForm.jsx';
import useIsDesktop from '../hooks/useIsDesktop.js';

// AdminInstitutionsTab — Institutions tab for college metadata, division/conference data.
// Decision 3: No Supabase calls. TODO comments mark where data fetching will go.
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

export default function AdminInstitutionsTab() {
  const isDesktop = useIsDesktop();
  const [selectedRow, setSelectedRow] = useState(null);
  const [formData, setFormData] = useState({});

  // TODO: Wire Supabase data fetching for institutions/schools metadata.
  // GET /functions/v1/admin-read-institutions
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
    // TODO: Wire to Supabase Edge Function — PUT /functions/v1/admin-update-institution
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
        isDesktop={isDesktop}
        onRowClick={handleRowClick}
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
