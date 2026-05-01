/**
 * RecruitsTopNav — Sprint 011 D2
 *
 * Top navigation for the public /athletes page. Five nav links: brand to
 * grittyfb.com, four external section links (Why / Partnership / Outcomes
 * / Contact), one "Recruits" intra-app marker, and a Coach Login slot
 * routing to /coach-login-placeholder (Sprint 016 lands the real flow).
 *
 * Mobile rule (Q3 lock): hide the four external grittyfb.com links below
 * 768px viewport. Brand, Recruits active marker, and Coach Login remain
 * visible at all sizes. No hamburger, no JS state.
 *
 * Token-only styling. Zero hardcoded brand hex literals (token-purity
 * guard). All colors / spacing / typography route through gf-* tokens.
 */

const NAV_LINKS = [
  { label: 'Why GrittyFB', href: 'https://www.grittyfb.com/#why', external: true },
  { label: 'Recruits', href: '/athletes', external: false, active: true },
  { label: 'Partnership', href: 'https://www.grittyfb.com/#partnership', external: true },
  { label: 'Outcomes', href: 'https://www.grittyfb.com/#outcomes', external: true },
  { label: 'Contact', href: 'https://www.grittyfb.com/#contact', external: true },
];

export default function RecruitsTopNav() {
  return (
    <nav
      data-testid="recruits-nav"
      style={{
        background: 'var(--gf-bg-deep)',
        color: 'var(--gf-text)',
        padding: 'var(--gf-space-md) var(--gf-space-xl)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--gf-border)',
        gap: 'var(--gf-space-md)',
        fontFamily: 'var(--gf-body)',
      }}
    >
      {/* Scoped CSS for the mobile hide-secondary rule. Uses gf-* tokens
          only; the regex literal-hex grep test still scans this block. */}
      <style>{`
        .recruits-nav-link-external { color: inherit; }
        .recruits-nav-link-external:hover { color: var(--gf-accent); }
        .recruits-nav-link-active { color: var(--gf-accent); }
        @media (max-width: 768px) {
          .recruits-nav-secondary { display: none !important; }
          .recruits-nav-root { padding: var(--gf-space-sm) var(--gf-space-md) !important; }
          /* D7 — touch-target floor (WCAG 2.5.5). */
          .recruits-nav-link-active,
          .recruits-nav-link-coach {
            min-height: 44px;
            display: inline-flex;
            align-items: center;
          }
        }
      `}</style>

      {/* Brand */}
      <a
        href="https://www.grittyfb.com"
        data-testid="recruits-nav-brand"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--gf-space-sm)',
          fontFamily: 'var(--gf-display)',
          fontWeight: 600,
          fontSize: '1.5rem',
          letterSpacing: '-0.015em',
          textDecoration: 'none',
          color: 'var(--gf-text)',
        }}
      >
        <img
          src="/grittyfb-logo.png"
          alt="GrittyFB Logo"
          style={{
            height: 38,
            width: 38,
            borderRadius: 8,
            objectFit: 'cover',
            display: 'block',
          }}
        />
        <span style={{ fontFamily: 'var(--gf-display)' }}>
          <span
            style={{
              fontFamily: 'var(--gf-display)',
              color: 'var(--gf-text)',
              fontWeight: 600,
            }}
          >
            Gritty
          </span>
          <span
            style={{
              fontFamily: 'var(--gf-display)',
              color: 'var(--gf-accent)',
              fontStyle: 'italic',
              fontWeight: 600,
              marginLeft: 1,
            }}
          >
            FB
          </span>
        </span>
      </a>

      {/* Link list */}
      <div
        data-testid="recruits-nav-links"
        style={{
          display: 'flex',
          gap: 'var(--gf-space-xl)',
          fontSize: '0.9rem',
          color: 'var(--gf-text-muted)',
          alignItems: 'center',
        }}
      >
        {NAV_LINKS.map((link) =>
          link.active ? (
            <a
              key={link.label}
              href={link.href}
              aria-current="page"
              className="recruits-nav-link-active"
              style={{
                fontFamily: 'var(--gf-body)',
                textDecoration: 'none',
                position: 'relative',
                paddingBottom: 6,
                borderBottom: '2px solid var(--gf-accent)',
              }}
            >
              {link.label}
            </a>
          ) : (
            <a
              key={link.label}
              href={link.href}
              className="recruits-nav-link-external recruits-nav-secondary"
              style={{
                fontFamily: 'var(--gf-body)',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              {link.label}
            </a>
          )
        )}
      </div>

      {/* Coach login placeholder slot — visible at all sizes */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--gf-space-sm)',
          alignItems: 'center',
        }}
      >
        <a
          href="/coach-login-placeholder"
          data-testid="recruits-nav-coach-login"
          className="recruits-nav-link-coach"
          style={{
            fontFamily: 'var(--gf-body)',
            color: 'var(--gf-text-muted)',
            textDecoration: 'none',
            fontSize: '0.9rem',
            padding: '0.5rem 0.9rem',
          }}
        >
          Coach Login
        </a>
      </div>
    </nav>
  );
}
