// FieldGroup — Reusable field grouping pattern for slide-out entity forms.
// Renders a titled section with labeled form fields.
// Decision 3: No Supabase calls. All data passed via props.
//
// Props:
//   title     — string (optional section header, e.g., "School Metadata")
//   divider   — boolean (render bottom border, default true)
//   fields    — Array<{
//     key: string,
//     label: string,
//     value: any,
//     readOnly?: boolean,
//     type?: 'text'|'tel'|'email'|'number'|'select'|'textarea'|'date'|'time',
//     required?: boolean,
//     options?: Array<{ value: string, label: string }>,  (for select type)
//     maxLength?: number,
//     error?: string,
//   }>
//   onChange  — (key: string, value: string) => void
//   disabled — boolean (form-level disable, e.g., during save)

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #D4D4D4',
  borderRadius: 4,
  fontSize: '0.875rem',
  color: '#2C2C2C',
  backgroundColor: '#FFFFFF',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const readOnlyStyle = {
  ...inputStyle,
  backgroundColor: '#F5F5F5',
  color: '#6B6B6B',
  cursor: 'default',
};

const errorInputStyle = {
  ...inputStyle,
  borderColor: '#C62828',
};

export default function FieldGroup({
  title,
  divider = true,
  fields = [],
  onChange,
  disabled = false,
}) {
  return (
    <div
      style={{
        marginBottom: 24,
        paddingBottom: divider ? 24 : 0,
        borderBottom: divider ? '1px solid #E8E8E8' : 'none',
      }}
    >
      {title && (
        <div
          style={{
            fontSize: '0.875rem',
            fontWeight: 700,
            color: '#8B3A3A',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 12,
          }}
        >
          {title}
        </div>
      )}

      {fields.map((field) => {
        const isReadOnly = field.readOnly || false;
        const fieldType = field.type || 'text';
        const hasError = !!field.error;
        const currentStyle = isReadOnly
          ? readOnlyStyle
          : hasError
            ? errorInputStyle
            : inputStyle;
        const fieldId = `field-${field.key}`;

        return (
          <div key={field.key} style={{ marginBottom: 16 }}>
            <label
              htmlFor={fieldId}
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#2C2C2C',
                display: 'block',
                marginBottom: 4,
              }}
            >
              {field.label}
              {field.required && !isReadOnly && (
                <span style={{ color: '#2C2C2C' }}>*</span>
              )}
            </label>

            {fieldType === 'select' ? (
              <select
                id={fieldId}
                data-testid={`field-${field.key}`}
                value={field.value ?? ''}
                onChange={(e) => onChange?.(field.key, e.target.value)}
                disabled={disabled || isReadOnly}
                aria-required={field.required ? 'true' : undefined}
                style={{
                  ...currentStyle,
                  cursor: isReadOnly ? 'default' : 'pointer',
                }}
              >
                <option value="">— Select —</option>
                {(field.options || []).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : fieldType === 'textarea' ? (
              <textarea
                id={fieldId}
                data-testid={`field-${field.key}`}
                value={field.value ?? ''}
                onChange={(e) => onChange?.(field.key, e.target.value)}
                readOnly={isReadOnly}
                disabled={disabled}
                maxLength={field.maxLength}
                aria-required={field.required ? 'true' : undefined}
                style={{
                  ...currentStyle,
                  minHeight: 80,
                  maxHeight: 200,
                  resize: 'vertical',
                }}
              />
            ) : (
              <input
                id={fieldId}
                data-testid={`field-${field.key}`}
                type={fieldType}
                value={field.value ?? ''}
                onChange={(e) => onChange?.(field.key, e.target.value)}
                readOnly={isReadOnly}
                disabled={disabled}
                maxLength={field.maxLength}
                aria-required={field.required ? 'true' : undefined}
                style={currentStyle}
              />
            )}

            {hasError && (
              <div
                style={{
                  fontSize: '0.75rem',
                  color: '#C62828',
                  marginTop: 4,
                }}
                aria-live="polite"
              >
                {field.error}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
