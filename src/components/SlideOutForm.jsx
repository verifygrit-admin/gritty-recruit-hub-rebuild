import { useEffect, useCallback } from 'react';
import FieldGroup from './FieldGroup.jsx';

// SlideOutForm — Right-side detail/edit panel for any admin entity.
// Decision 3: No Supabase calls. onSave is a prop callback (TODO: wire to Edge Functions).
//
// Props:
//   isOpen       — boolean
//   onClose      — () => void
//   title        — string, e.g., "School — Wilson High (ID: 14921)"
//   fieldGroups  — Array<{ title?: string, divider?: boolean, fields: FieldGroup.fields }>
//   isDesktop    — boolean (from useIsDesktop)
//   onFieldChange — (key: string, value: string) => void
//   onSave       — () => void   (TODO: wire to Supabase Edge Function)
//   saving       — boolean
//   formError    — string (top-of-form error banner)
//   onDismissError — () => void
//   disabled     — boolean (disables all inputs)

export default function SlideOutForm({
  isOpen,
  onClose,
  title = '',
  fieldGroups = [],
  isDesktop = true,
  onFieldChange,
  onSave,
  saving = false,
  formError = '',
  onDismissError,
  disabled = false,
}) {
  // Escape key closes the form
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape' && isOpen) onClose?.();
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when form is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const panelWidth = isDesktop ? 420 : '100%';

  return (
    <>
      {/* Overlay backdrop — click to close */}
      <div
        data-testid="admin-form-backdrop"
        onClick={onClose}
        role="presentation"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          zIndex: 9997,
        }}
      />

      {/* Form panel */}
      <div
        data-testid="admin-form-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: 'fixed',
          right: 0,
          top: 112,
          width: panelWidth,
          height: 'calc(100vh - 112px)',
          backgroundColor: '#FFFFFF',
          borderLeft: isDesktop ? '1px solid #E8E8E8' : 'none',
          boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
          padding: isDesktop ? 24 : 16,
          overflowY: 'auto',
          zIndex: 9998,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Sticky header */}
        <div
          data-testid="admin-form-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 24,
            position: 'sticky',
            top: 0,
            backgroundColor: '#FFFFFF',
            zIndex: 9999,
            paddingBottom: 8,
          }}
        >
          <h3
            style={{
              fontSize: isDesktop ? '1.125rem' : '1rem',
              color: '#2C2C2C',
              fontWeight: 700,
              margin: 0,
            }}
          >
            {title}
          </h3>
          <button
            type="button"
            data-testid="admin-form-close"
            onClick={onClose}
            aria-label="Close details"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.5rem',
              color: '#6B6B6B',
              cursor: 'pointer',
              padding: '0 8px',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {/* Error banner */}
        {formError && (
          <div
            data-testid="admin-form-error"
            style={{
              backgroundColor: '#FFF5F5',
              border: '1px solid #F44336',
              borderRadius: 4,
              padding: 12,
              color: '#C62828',
              fontSize: '0.875rem',
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{formError}</span>
            {onDismissError && (
              <button
                type="button"
                onClick={onDismissError}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#C62828',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  padding: '0 4px',
                }}
                aria-label="Dismiss error"
              >
                &times;
              </button>
            )}
          </div>
        )}

        {/* Field groups */}
        <div style={{ flex: 1 }}>
          {fieldGroups.map((group, i) => (
            <FieldGroup
              key={group.title || i}
              title={group.title}
              divider={group.divider !== undefined ? group.divider : i < fieldGroups.length - 1}
              fields={group.fields}
              onChange={onFieldChange}
              disabled={disabled || saving}
            />
          ))}
        </div>

        {/* Sticky form actions */}
        <div
          data-testid="admin-form-actions"
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end',
            marginTop: 24,
            paddingTop: 24,
            borderTop: '1px solid #E8E8E8',
            backgroundColor: '#FFFFFF',
            position: 'sticky',
            bottom: 0,
          }}
        >
          <button
            type="button"
            data-testid="admin-form-cancel"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '10px 20px',
              backgroundColor: '#FFFFFF',
              color: '#6B6B6B',
              border: '1px solid #D4D4D4',
              borderRadius: 4,
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.5 : 1,
            }}
          >
            Discard
          </button>
          <button
            type="button"
            data-testid="admin-form-save"
            onClick={() => {
              // TODO: Wire to Supabase Edge Function for persistence + audit trail.
              // When wired, onSave will call the entity-specific Edge Function
              // and write an audit log entry server-side.
              onSave?.();
            }}
            disabled={saving || disabled}
            style={{
              padding: '10px 20px',
              backgroundColor: '#8B3A3A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 4,
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: saving || disabled ? 'not-allowed' : 'pointer',
              opacity: saving || disabled ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </>
  );
}
