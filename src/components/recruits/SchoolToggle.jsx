/**
 * SchoolToggle — Sprint 011 D4
 *
 * Pill segment control above the roster grid. Iterates RECRUIT_SCHOOLS
 * (no hardcoded buttons) so a future school promotion is a one-line config
 * change. Active school uses gf-accent. Inactive (active: false) school
 * renders disabled with inline "(coming May 2026)" subtext routed through
 * gf-text-dim (label-class typography per Sprint 010 carry-forward).
 *
 * Controlled component. Parent owns activeSlug state and onChange handler.
 *
 * Token-only styling. Zero hardcoded brand hex literals.
 */

import { RECRUIT_SCHOOLS } from '../../data/recruits-schools.js';

export default function SchoolToggle({ activeSlug, onChange }) {
  return (
    <div
      data-testid="recruits-school-toggle"
      role="group"
      aria-label="Filter by school"
      style={{
        display: 'inline-flex',
        background: 'var(--gf-light-bg-elev)',
        border: '1px solid var(--gf-light-border)',
        borderRadius: 'var(--gf-radius-pill)',
        padding: 4,
        gap: 2,
        marginBottom: 'var(--gf-space-xl)',
        fontFamily: 'var(--gf-body)',
      }}
    >
      {RECRUIT_SCHOOLS.map((school) => {
        const isActive = school.slug === activeSlug;
        const isDisabled = !school.active;

        const baseStyle = {
          fontFamily: 'var(--gf-body)',
          background: 'transparent',
          border: 'none',
          padding: '0.6rem 1.2rem',
          fontSize: '0.9rem',
          fontWeight: 500,
          borderRadius: 'var(--gf-radius-pill)',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s',
          color: 'var(--gf-light-text-muted)',
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: 'var(--gf-space-xs)',
        };

        const activeStyle = isActive
          ? {
              background: 'var(--gf-bg-deep)',
              color: 'var(--gf-accent)',
            }
          : {};

        const disabledStyle = isDisabled
          ? {
              opacity: 0.85,
            }
          : {};

        return (
          <button
            key={school.slug}
            type="button"
            disabled={isDisabled}
            aria-pressed={isActive ? 'true' : 'false'}
            onClick={isDisabled ? undefined : () => onChange(school.slug)}
            style={{ ...baseStyle, ...activeStyle, ...disabledStyle }}
          >
            <span style={{ fontFamily: 'var(--gf-body)' }}>{school.label}</span>
            {isDisabled && school.comingMonth && (
              <span
                style={{
                  fontFamily: 'var(--gf-body)',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--gf-text-dim)',
                }}
              >
                (coming {school.comingMonth})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
