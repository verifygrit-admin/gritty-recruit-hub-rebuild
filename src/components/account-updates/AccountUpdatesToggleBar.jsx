// AccountUpdatesToggleBar — Sprint 027.
// 7-button toggle styled like AdminPage.jsx tab nav.

import { ENTITY_KEYS, ENTITY_REGISTRY } from '../../lib/adminAccountUpdates/entityRegistry.js';

export default function AccountUpdatesToggleBar({ activeEntity, onChange }) {
  return (
    <nav
      data-testid="account-updates-toggle-bar"
      style={{
        display: 'flex',
        padding: '0 24px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E8E8E8',
        minHeight: 48,
        overflowX: 'auto',
      }}
    >
      {ENTITY_KEYS.map((key) => {
        const isActive = activeEntity === key;
        return (
          <button
            key={key}
            type="button"
            data-testid={`account-updates-toggle-${key}`}
            onClick={() => onChange(key)}
            style={{
              padding: '10px 16px',
              backgroundColor: 'transparent',
              color: isActive ? '#8B3A3A' : '#6B6B6B',
              border: 'none',
              borderBottom: isActive ? '3px solid #8B3A3A' : '3px solid transparent',
              fontSize: '0.875rem',
              fontWeight: isActive ? 700 : 500,
              cursor: 'pointer',
              marginBottom: -1,
              whiteSpace: 'nowrap',
            }}
          >
            {ENTITY_REGISTRY[key].label}
          </button>
        );
      })}
    </nav>
  );
}
