/**
 * StudentDropdownPicker — Sprint 026 Phase 1a (Coach UI).
 *
 * <select> populated from `useCoachLinkedStudents()` (the calling page filters
 * out students already in the card list). Emits `onAdd(studentId)` when the
 * "Add Player" button is clicked. Local state holds the in-flight selection.
 */

import { useState, useEffect } from 'react';

const wrapStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 8,
  padding: '16px 20px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
  display: 'flex',
  flexWrap: 'wrap',
  gap: 12,
  alignItems: 'flex-end',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.875rem',
  color: '#2C2C2C',
  marginBottom: 4,
  fontWeight: 500,
};

const selectStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #D4D4D4',
  borderRadius: 4,
  fontSize: '1rem',
  color: '#2C2C2C',
  backgroundColor: '#FFFFFF',
  boxSizing: 'border-box',
};

const buttonStyle = {
  padding: '10px 18px',
  backgroundColor: 'var(--brand-maroon, #8B3A3A)',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: 4,
  fontWeight: 600,
  fontSize: '0.95rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const buttonDisabledStyle = {
  ...buttonStyle,
  backgroundColor: '#B0B0B0',
  cursor: 'not-allowed',
};

export default function StudentDropdownPicker({ students = [], onAdd, loading = false }) {
  const [selected, setSelected] = useState('');

  // If the currently selected student is consumed (added to a card and removed
  // from the available list), reset the dropdown.
  useEffect(() => {
    if (selected && !students.some(s => s.user_id === selected)) {
      setSelected('');
    }
  }, [students, selected]);

  const handleAdd = () => {
    if (!selected) return;
    onAdd?.(selected);
    setSelected('');
  };

  const noStudentsAvailable = students.length === 0 && !loading;
  const addDisabled = !selected;

  return (
    <section style={wrapStyle} aria-label="Add player to batch">
      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
        <label htmlFor="bulk-pds-student-select" style={labelStyle}>
          Add a player
        </label>
        <select
          id="bulk-pds-student-select"
          data-testid="bulk-pds-coach-student-picker"
          style={selectStyle}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={loading || noStudentsAvailable}
        >
          {loading && <option value="">Loading roster…</option>}
          {!loading && noStudentsAvailable && (
            <option value="">No players available</option>
          )}
          {!loading && !noStudentsAvailable && (
            <>
              <option value="">— Select a player —</option>
              {students.map(s => (
                <option key={s.user_id} value={s.user_id}>
                  {s.name || s.email || s.user_id}
                  {s.grad_year ? ` (Class of ${s.grad_year})` : ''}
                </option>
              ))}
            </>
          )}
        </select>
      </div>
      <button
        type="button"
        data-testid="bulk-pds-coach-student-add-btn"
        onClick={handleAdd}
        disabled={addDisabled}
        style={addDisabled ? buttonDisabledStyle : buttonStyle}
      >
        Add Player
      </button>
    </section>
  );
}
