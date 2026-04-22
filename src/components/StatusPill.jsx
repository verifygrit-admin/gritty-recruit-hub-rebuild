/**
 * StatusPill — shared pill renderer for GRIT FIT status labels.
 *
 * Sprint 004 Wave 1 SC-2. Single source of truth for the six-status
 * taxonomy. Renders nothing when status is not one of the six valid keys —
 * this implements operator ruling A-2 at the component layer (empty status,
 * null/undefined, unknown keys, and the retired 'not_evaluated' key all
 * produce no pill).
 *
 * Props:
 *   status:    string (required) — one of the six STATUS_LABELS keys
 *   size:      'sm' | 'md' | 'lg' (optional, default 'md')
 *   className: string (optional) — applied to the rendered <span>
 */
import { getStatusConfig } from '../lib/statusLabels.js';

const SIZE_STYLES = {
  sm: { padding: '2px 8px', fontSize: '0.6875rem' },
  md: { padding: '4px 12px', fontSize: '0.8125rem' },
  lg: { padding: '6px 16px', fontSize: '0.9375rem' },
};

export default function StatusPill({ status, size = 'md', className }) {
  const config = getStatusConfig(status);
  if (!config) return null;

  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.md;

  return (
    <span
      data-testid="status-pill"
      data-status={status}
      data-bg={config.bg}
      className={className}
      style={{
        display: 'inline-block',
        backgroundColor: config.bg,
        color: config.textColor,
        fontWeight: 600,
        borderRadius: 12,
        padding: sizeStyle.padding,
        fontSize: sizeStyle.fontSize,
        whiteSpace: 'nowrap',
      }}
    >
      {config.label}
    </span>
  );
}
