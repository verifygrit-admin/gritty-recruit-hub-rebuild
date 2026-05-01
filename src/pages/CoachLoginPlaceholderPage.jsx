/**
 * CoachLoginPlaceholderPage — Sprint 011 D2 placeholder
 *
 * Honest placeholder for the "Coach Login" affordance in the /athletes
 * top nav. The real coach-login flow lands in Sprint 016. This page exists
 * so the nav link has a truthful href instead of href="#" (which causes
 * scroll-jump and confuses screen readers). Delete on Sprint 016 promotion.
 *
 * Token-only styling. No hardcoded brand hex.
 */

export default function CoachLoginPlaceholderPage() {
  return (
    <div
      data-testid="coach-login-placeholder"
      style={{
        minHeight: '100vh',
        background: 'var(--gf-bg-deep)',
        color: 'var(--gf-text)',
        fontFamily: 'var(--gf-body)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--gf-space-xl)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--gf-body)',
          color: 'var(--gf-accent)',
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginBottom: 'var(--gf-space-lg)',
        }}
      >
        Coming soon — Sprint 016
      </div>
      <h1
        style={{
          fontFamily: 'var(--gf-display)',
          fontWeight: 500,
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          letterSpacing: '-0.02em',
          margin: 0,
          color: 'var(--gf-text)',
          maxWidth: 640,
        }}
      >
        Coach Login
      </h1>
      <p
        style={{
          fontFamily: 'var(--gf-body)',
          color: 'var(--gf-text-muted)',
          fontSize: '1rem',
          marginTop: 'var(--gf-space-md)',
          maxWidth: 520,
        }}
      >
        Sign-in for college coaches and recruiting staff opens in a future
        release. For now,{' '}
        <a
          href="/athletes"
          style={{
            fontFamily: 'var(--gf-body)',
            color: 'var(--gf-accent)',
            textDecoration: 'underline',
          }}
        >
          browse the public roster
        </a>
        .
      </p>
    </div>
  );
}
