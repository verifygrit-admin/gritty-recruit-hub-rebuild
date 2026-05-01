/**
 * RecruitsFooter — Sprint 011 D8
 *
 * Minimal footer at the bottom of /recruits. Single line of attribution
 * with one same-tab external link back to https://www.grittyfb.com.
 *
 * Spec lines 181-188:
 *   - Lives at the bottom of the page, not fixed
 *   - gf-text-muted for attribution copy
 *   - One external link, opens in same tab
 *
 * Token-only styling. Zero hardcoded brand hex literals.
 */

export default function RecruitsFooter() {
  return (
    <footer
      data-testid="recruits-footer"
      style={{
        background: 'var(--gf-light-bg)',
        borderTop: '1px solid var(--gf-light-border)',
        padding: 'var(--gf-space-xl) var(--gf-space-xl)',
        textAlign: 'center',
        fontFamily: 'var(--gf-body)',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--gf-body)',
          color: 'var(--gf-light-text-muted)',
          fontSize: '0.85rem',
          margin: 0,
        }}
      >
        © 2026 GrittyFB ·{' '}
        <a
          href="https://www.grittyfb.com"
          style={{
            fontFamily: 'var(--gf-body)',
            color: 'var(--gf-light-text-muted)',
            textDecoration: 'underline',
          }}
        >
          grittyfb.com
        </a>
      </p>
    </footer>
  );
}
