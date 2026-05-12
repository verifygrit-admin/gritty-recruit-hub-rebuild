/**
 * MeasurableField — Sprint 026 Phase 1a (Coach UI).
 *
 * Shared input for a single Player Update Card measurable. Renders the field
 * label, an <input>, and an optional unit suffix ("s" for time fields, "lbs"
 * for weight/lifts). Numeric fields use `inputMode="decimal"` so mobile
 * keyboards open with a numeric pad; height is plain text ("6-2").
 */

const fieldWrap = { marginBottom: 12 };

const labelStyle = {
  display: 'block',
  fontSize: '0.85rem',
  color: '#2C2C2C',
  marginBottom: 4,
  fontWeight: 500,
};

const inputRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const inputStyle = {
  flex: 1,
  minWidth: 0,
  padding: '8px 10px',
  border: '1px solid #D4D4D4',
  borderRadius: 4,
  fontSize: '0.95rem',
  color: '#2C2C2C',
  backgroundColor: '#FFFFFF',
  boxSizing: 'border-box',
  outline: 'none',
};

const inputErrorStyle = {
  ...inputStyle,
  borderColor: '#F44336',
};

const unitStyle = {
  fontSize: '0.85rem',
  color: '#6B6B6B',
  flexShrink: 0,
  width: 30,
};

const errorMsgStyle = {
  fontSize: '0.75rem',
  color: '#F44336',
  marginTop: 4,
  display: 'block',
};

export default function MeasurableField({
  name,
  label,
  unit,
  inputMode = 'text',
  value,
  onChange,
  error,
  testId,
  placeholder,
}) {
  return (
    <div style={fieldWrap}>
      <label htmlFor={testId} style={labelStyle}>{label}</label>
      <div style={inputRowStyle}>
        <input
          id={testId}
          name={name}
          type="text"
          inputMode={inputMode}
          data-testid={testId}
          value={value ?? ''}
          onChange={(e) => onChange?.(name, e.target.value)}
          placeholder={placeholder || ''}
          style={error ? inputErrorStyle : inputStyle}
          aria-invalid={error ? 'true' : 'false'}
        />
        {unit && <span style={unitStyle} aria-hidden="true">{unit}</span>}
      </div>
      {error && <span style={errorMsgStyle}>{error}</span>}
    </div>
  );
}
