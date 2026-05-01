/**
 * RecruitsHero — Sprint 011 D3
 *
 * Dark-forest hero on /recruits. Fraunces serif headline with italic
 * emphasis on "One roster.", Inter subhead (locked Q5 copy), and a
 * partner-schools indicator that reads its content from
 * src/data/recruits-schools.js (single source for D3 + D4).
 *
 * No CTA, no button, no link in hero (spec D3 line 117).
 *
 * Token-only styling. Zero hardcoded brand hex literals.
 */

import { RECRUIT_SCHOOLS } from '../../data/recruits-schools.js';

function formatPartnerIndicator(schools) {
  const active = schools.filter((s) => s.active);
  const upcoming = schools.filter((s) => !s.active);

  const activeText = active.length
    ? `Currently active: ${active.map((s) => s.label).join(', ')}`
    : 'No partner schools active yet';

  const upcomingText = upcoming
    .map((s) =>
      s.comingMonth ? `${s.label} joining ${s.comingMonth}` : s.label
    )
    .join(' · ');

  return upcomingText ? `${activeText} · ${upcomingText}` : activeText;
}

export default function RecruitsHero() {
  return (
    <section
      data-testid="recruits-hero"
      style={{
        background: 'var(--gf-bg-deep)',
        color: 'var(--gf-text)',
        padding: 'var(--gf-space-3xl) var(--gf-space-xl) var(--gf-space-2xl)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Soft accent halo behind the headline (matches prototype). */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: '50%',
          height: '140%',
          background:
            'radial-gradient(ellipse at center, var(--gf-accent-soft) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      <h1
        data-testid="recruits-hero-headline"
        style={{
          fontFamily: 'var(--gf-display)',
          fontWeight: 500,
          fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          marginBottom: 'var(--gf-space-lg)',
          maxWidth: 900,
          marginLeft: 'auto',
          marginRight: 'auto',
          color: 'var(--gf-text)',
          position: 'relative',
        }}
      >
        Elite high school talent.{' '}
        <em
          style={{
            fontFamily: 'var(--gf-display)',
            fontStyle: 'italic',
            color: 'var(--gf-accent)',
            fontWeight: 400,
          }}
        >
          One roster.
        </em>{' '}
        One visit away.
      </h1>

      <p
        data-testid="recruits-hero-sub"
        style={{
          color: 'var(--gf-text-muted)',
          fontSize: '1.1rem',
          maxWidth: 580,
          margin: '0 auto var(--gf-space-xl)',
          fontFamily: 'var(--gf-body)',
          position: 'relative',
        }}
      >
        Browse student-athletes from GrittyFB partner schools. Verified rosters,
        real stats, public film — for college coaches and recruiting staff.
      </p>

      <div
        data-testid="recruits-hero-partners"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--gf-space-md)',
          fontSize: '0.85rem',
          color: 'var(--gf-text-dim)',
          borderTop: '1px solid var(--gf-border)',
          paddingTop: 'var(--gf-space-md)',
          marginTop: 'var(--gf-space-md)',
          fontFamily: 'var(--gf-body)',
          fontWeight: 600,
          letterSpacing: '0.02em',
          position: 'relative',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--gf-accent)',
            boxShadow: '0 0 12px var(--gf-accent)',
            display: 'inline-block',
          }}
        />
        {formatPartnerIndicator(RECRUIT_SCHOOLS)}
      </div>
    </section>
  );
}
