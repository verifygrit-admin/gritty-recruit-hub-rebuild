// CreateRowModal — Sprint 027.
// Inline create form for the 2 create-enabled entities. Required fields per
// entityRegistry.create_required block submit. Whole-row whitelist enforced
// server-side by admin-create-account EF.

import { useState } from 'react';
import { getEntity } from '../../lib/adminAccountUpdates/entityRegistry.js';
import { applyCreate } from '../../lib/adminAccountUpdates/applyCreate.js';

export default function CreateRowModal({ entity, onClose, onSuccess, adminEmail }) {
  const cfg = getEntity(entity);
  const whitelist = cfg.create_whitelist || [];
  const required = cfg.create_required || [];

  const [values, setValues] = useState(() => {
    const init = {};
    for (const f of whitelist) init[f] = '';
    return init;
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isValid = required.every((f) => values[f] !== '' && values[f] !== null && values[f] !== undefined);

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    const payload = {};
    for (const k of Object.keys(values)) {
      if (values[k] !== '' && values[k] !== null && values[k] !== undefined) {
        payload[k] = values[k];
      }
    }
    const res = await applyCreate({ entity, row: payload, adminEmail });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSuccess(res.row);
  }

  return (
    <div
      data-testid="create-row-modal"
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        zIndex: 9100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{
        backgroundColor: '#FFFFFF',
        padding: 24,
        borderRadius: 4,
        width: 'min(560px, 92vw)',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem' }}>New {cfg.label.replace(/s$/, '')}</h2>
          <button
            type="button"
            data-testid="create-row-close"
            onClick={onClose}
            disabled={submitting}
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6B6B6B' }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {error && (
          <div
            data-testid="create-row-error"
            style={{ padding: '8px 12px', backgroundColor: '#FBE9E7', color: '#8B3A3A', borderRadius: 4, marginBottom: 12, fontSize: '0.875rem' }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {whitelist.map((field) => {
            const isReq = required.includes(field);
            return (
              <label key={field} style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8125rem', color: '#2C2C2C' }}>
                <span style={{ marginBottom: 2 }}>
                  {field}{isReq ? <span style={{ color: '#8B3A3A' }}> *</span> : null}
                </span>
                <input
                  data-testid={`create-field-${field}`}
                  type="text"
                  value={values[field] ?? ''}
                  onChange={(e) => setValues((p) => ({ ...p, [field]: e.target.value }))}
                  style={{ padding: '6px 8px', border: '1px solid #E8E8E8', borderRadius: 3, fontSize: '0.875rem' }}
                />
              </label>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{ padding: '8px 16px', backgroundColor: '#FFFFFF', color: '#6B6B6B', border: '1px solid #E8E8E8', borderRadius: 4, cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="create-row-submit"
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            style={{
              padding: '8px 16px',
              backgroundColor: !isValid || submitting ? '#D0D0D0' : '#8B3A3A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 4,
              cursor: !isValid || submitting ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: 700,
            }}
          >
            {submitting ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
