/**
 * StyleguidePage — Sprint 010 D3
 *
 * Internal styleguide route at /styleguide. Unlisted, no nav entry, no auth
 * gate. Sole purpose: render the GrittyFB token system's reference component
 * (PlayerCardReference) against a dark gf-bg-deep surface so the dark
 * palette tokens are visually exercised end-to-end.
 *
 * Token-only styling. No hardcoded brand hex.
 */

import PlayerCardReference from '../components/styleguide/PlayerCardReference.jsx';

export default function StyleguidePage() {
  return (
    <div
      data-testid="styleguide-page"
      style={{
        minHeight: '100vh',
        background: 'var(--gf-bg-deep)',
        color: 'var(--gf-text)',
        fontFamily: 'var(--gf-body)',
        padding: 'var(--gf-space-2xl) var(--gf-space-xl)',
      }}
    >
      <header
        style={{
          maxWidth: 1100,
          margin: '0 auto var(--gf-space-xl)',
        }}
      >
        <div
          style={{
            color: 'var(--gf-accent)',
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: 'var(--gf-space-sm)',
          }}
        >
          Sprint 010 · GrittyFB Tokens
        </div>
        <h1
          style={{
            fontFamily: 'var(--gf-display)',
            fontWeight: 500,
            fontSize: '2rem',
            letterSpacing: '-0.01em',
            margin: 0,
            color: 'var(--gf-text)',
          }}
        >
          Styleguide — Player Card Reference
        </h1>
        <p
          style={{
            color: 'var(--gf-text-muted)',
            fontSize: '0.95rem',
            marginTop: 'var(--gf-space-sm)',
            maxWidth: 640,
          }}
        >
          Internal reference. Not linked from any nav. Demonstrates the GrittyFB
          token system from <code>src/index.css</code> rendering on a dark
          surface (gf-bg-deep) with a light-surface card composition.
        </p>
      </header>

      <main
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <PlayerCardReference />
      </main>
    </div>
  );
}
