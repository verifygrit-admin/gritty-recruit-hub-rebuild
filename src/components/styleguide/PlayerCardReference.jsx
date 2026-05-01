/**
 * PlayerCardReference — Sprint 010 D3
 *
 * Internal styleguide component proving the GrittyFB design token system
 * (Sprint 010 Phase 1) is functional. Renders a single Player Card matching
 * the prototype at docs/specs/.coach-scheduler-sprints/index.html.
 *
 * Hard rule: zero hardcoded brand hex values. Every color, font, spacing,
 * radius, and shadow value flows through a `gf-*` CSS variable defined in
 * src/index.css. The only literals permitted are non-color primitives
 * (px sizes, percentages, currentColor, transparent).
 *
 * gf-text-dim is intentionally NOT used here — it sits at AA-Large only
 * (~3.5:1) on dark surfaces, and this card lives on a light surface.
 *
 * This component has no ties to existing app data; it accepts a single
 * `player` prop with sensible defaults so the styleguide route can render
 * it standalone. Sprint 011 onward will introduce the production Coach
 * Dashboard player card (separate component, not this one).
 */

const DEFAULT_PLAYER = {
  initials: 'AW',
  name: 'Ayden Watkins',
  position: 'CB',
  height: '5’11"',
  weight: '175 lbs',
  school: 'BC High',
  classYear: 'Class 2027',
  interestSummary: '41 schools · Recruiting Progress 32%',
  stats: [
    { label: 'GPA', value: '3.40' },
    { label: 'Hometown', value: 'Boston, MA' },
    { label: '40 Time', value: '4.52s' },
    { label: 'Also Plays', value: 'Track' },
  ],
  links: [
    { label: 'Hudl Film →', href: '#' },
    { label: 'X / Twitter', href: '#' },
  ],
};

export default function PlayerCardReference({ player = DEFAULT_PLAYER } = {}) {
  if (!player) return null;

  const positionLine = [player.position, player.height, player.weight]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      data-testid="pcr-card"
      style={{
        position: 'relative',
        background: 'var(--gf-light-bg-elev)',
        border: '1px solid var(--gf-light-border)',
        borderRadius: 'var(--gf-radius)',
        padding: 'var(--gf-space-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--gf-space-md)',
        boxShadow: 'var(--gf-shadow-card)',
        fontFamily: 'var(--gf-body)',
        color: 'var(--gf-light-text)',
        maxWidth: 360,
      }}
    >
      {player.classYear && (
        <span
          data-testid="pcr-tag"
          style={{
            position: 'absolute',
            top: 'var(--gf-space-md)',
            right: 'var(--gf-space-md)',
            fontSize: '0.7rem',
            fontWeight: 600,
            padding: '0.25rem 0.6rem',
            borderRadius: 'var(--gf-radius-pill)',
            background: 'var(--gf-accent-soft)',
            color: 'var(--gf-bg-deep)',
            border: '1px solid var(--gf-accent-deep)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {player.classYear}
        </span>
      )}

      <div
        data-testid="pcr-top"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--gf-space-md)',
        }}
      >
        <div
          data-testid="pcr-photo"
          aria-hidden="true"
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background:
              'linear-gradient(135deg, var(--gf-bg-elev) 0%, var(--gf-bg-deep) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--gf-accent)',
            fontFamily: 'var(--gf-display)',
            fontSize: '1.4rem',
            fontWeight: 600,
            flexShrink: 0,
            border: '2px solid var(--gf-light-border)',
          }}
        >
          {player.initials}
        </div>
        <div>
          <div
            data-testid="pcr-name"
            style={{
              fontFamily: 'var(--gf-display)',
              fontWeight: 600,
              fontSize: '1.15rem',
              color: 'var(--gf-light-text)',
              marginBottom: 2,
            }}
          >
            {player.name}
          </div>
          <div
            data-testid="pcr-position"
            style={{
              fontSize: '0.85rem',
              color: 'var(--gf-light-text-muted)',
              fontWeight: 500,
            }}
          >
            {positionLine}
          </div>
          {player.school && (
            <div
              data-testid="pcr-school"
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--gf-accent-deep)',
                marginTop: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--gf-accent-deep)',
                  display: 'inline-block',
                }}
              />
              {player.school}
            </div>
          )}
        </div>
      </div>

      {player.interestSummary && (
        <div
          data-testid="pcr-interest"
          style={{
            fontSize: '0.85rem',
            color: 'var(--gf-light-text)',
            background: 'var(--gf-light-bg)',
            borderRadius: 'var(--gf-radius-sm)',
            padding: '0.6rem 0.75rem',
            borderLeft: '3px solid var(--gf-accent-deep)',
          }}
        >
          <span
            style={{
              fontWeight: 600,
              color: 'var(--gf-light-text-muted)',
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              display: 'block',
              marginBottom: 2,
            }}
          >
            Active Interest
          </span>
          {player.interestSummary}
        </div>
      )}

      {Array.isArray(player.stats) && player.stats.length > 0 && (
        <div
          data-testid="pcr-stats"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 'var(--gf-space-sm) var(--gf-space-md)',
            fontSize: '0.85rem',
            paddingTop: 'var(--gf-space-sm)',
            borderTop: '1px dashed var(--gf-light-border)',
          }}
        >
          {player.stats.map((s, i) => (
            <div
              key={`${s.label}-${i}`}
              data-testid="pcr-stat"
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              <span
                style={{
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--gf-light-text-muted)',
                  marginBottom: 2,
                }}
              >
                {s.label}
              </span>
              <span style={{ fontWeight: 500, color: 'var(--gf-light-text)' }}>
                {s.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {Array.isArray(player.links) && player.links.length > 0 && (
        <div
          data-testid="pcr-links"
          style={{
            display: 'flex',
            gap: 'var(--gf-space-md)',
            fontSize: '0.85rem',
            marginTop: 'auto',
            paddingTop: 'var(--gf-space-sm)',
            borderTop: '1px solid var(--gf-light-border)',
          }}
        >
          {player.links.map((l, i) => (
            <a
              key={`${l.label}-${i}`}
              data-testid="pcr-link"
              href={l.href || '#'}
              style={{
                color: 'var(--gf-light-text-muted)',
                textDecoration: 'none',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
