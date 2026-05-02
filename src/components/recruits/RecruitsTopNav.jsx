/**
 * RecruitsTopNav — Sprint 011 D2 + Sprint 012 hotfix Phase 2
 *
 * Top navigation for the public /athletes page. Five nav links: brand to
 * grittyfb.com, four external section links (Why / Partnership / Outcomes
 * / Contact), one "Recruits" intra-app marker, and a Coach Login slot
 * routing to /coach-login-placeholder (Sprint 016 lands the real flow).
 *
 * Mobile rule (hotfix Phase 2): below 768px, the four external links
 * and Coach Login collapse into a hamburger dropdown anchored to the
 * right of the nav. Brand and the active Recruits marker stay inline.
 * Dropdown closes on outside-click, Escape, or item tap; focus returns
 * to the hamburger button on Escape close. Desktop layout unchanged.
 *
 * Token-only styling. Zero hardcoded brand hex literals (token-purity
 * guard). All colors / spacing / typography route through gf-* tokens.
 */

import { useEffect, useRef, useState } from 'react';

const NAV_LINKS = [
  { label: 'Why GrittyFB', href: 'https://www.grittyfb.com/#opportunity' },
  { label: 'Recruits', href: '/athletes', active: true },
  { label: 'Partnership', href: 'https://www.grittyfb.com/#partner' },
  { label: 'Outcomes', href: 'https://www.grittyfb.com/#proof' },
  { label: 'Contact', href: 'https://www.grittyfb.com/#cta' },
];

const COACH_LOGIN = { label: 'Coach Login', href: '/coach-login-placeholder' };

const STYLE = `
  .recruits-nav-link-external { color: inherit; }
  .recruits-nav-link-external:hover { color: var(--gf-accent); }
  .recruits-nav-link-active { color: var(--gf-accent); }

  /* Hamburger button — hidden on desktop, visible at the existing
     mobile breakpoint. */
  .recruits-nav-hamburger {
    display: none;
    background: transparent;
    border: none;
    color: var(--gf-text);
    padding: 0.5rem;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    border-radius: var(--gf-radius-sm);
    transition: background 0.15s;
    min-width: 44px;
    min-height: 44px;
  }
  .recruits-nav-hamburger:hover { background: var(--gf-bg-elev); }
  .recruits-nav-hamburger:focus-visible {
    outline: 2px solid var(--gf-accent);
    outline-offset: 2px;
  }
  .recruits-nav-hamburger svg {
    width: 24px;
    height: 24px;
    display: block;
  }

  /* Dropdown — hidden on desktop. On mobile, present in the DOM but
     invisible until .open is applied; opacity + transform transition
     drives the slide-down reveal. visibility removes it from the
     a11y tree when closed without conflicting with the transition. */
  .recruits-nav-dropdown {
    display: none;
    position: absolute;
    top: 100%;
    right: var(--gf-space-md);
    z-index: 60;
    min-width: 220px;
    background: var(--gf-bg-deep);
    border: 1px solid var(--gf-border);
    border-radius: var(--gf-radius-sm);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
    padding: var(--gf-space-xs) 0;
    margin-top: var(--gf-space-xs);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-8px);
    pointer-events: none;
    transition: opacity 0.15s ease-out, transform 0.15s ease-out, visibility 0.15s;
  }
  .recruits-nav-dropdown.open {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
    pointer-events: auto;
  }
  .recruits-nav-dropdown-link {
    display: block;
    padding: 0.75rem var(--gf-space-lg);
    font-family: var(--gf-body);
    font-size: 0.95rem;
    color: var(--gf-text);
    text-decoration: none;
    min-height: 44px;
    line-height: 1.4;
    transition: background 0.12s, color 0.12s;
  }
  .recruits-nav-dropdown-link:hover,
  .recruits-nav-dropdown-link:focus-visible {
    background: var(--gf-bg-elev);
    color: var(--gf-accent);
    outline: none;
  }

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
    .recruits-nav-hamburger { display: inline-flex; }
    .recruits-nav-dropdown { display: block; }
  }
`;

export default function RecruitsTopNav() {
  const [navOpen, setNavOpen] = useState(false);
  const dropdownRef = useRef(null);
  const hamburgerRef = useRef(null);

  useEffect(() => {
    if (!navOpen) return undefined;
    const handleMouseDown = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        hamburgerRef.current &&
        !hamburgerRef.current.contains(e.target)
      ) {
        setNavOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setNavOpen(false);
        if (hamburgerRef.current) hamburgerRef.current.focus();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [navOpen]);

  const dropdownLinks = [
    ...NAV_LINKS.filter((l) => !l.active),
    COACH_LOGIN,
  ];

  return (
    <nav
      data-testid="recruits-nav"
      className="recruits-nav-root"
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
        position: 'relative',
      }}
    >
      <style>{STYLE}</style>

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

      {/* Link list — desktop renders all NAV_LINKS inline; mobile hides
          the secondary anchors via .recruits-nav-secondary, leaving the
          active Recruits marker visible. */}
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

      {/* Right slot: Coach Login (desktop) + Hamburger (mobile). Coach
          Login carries .recruits-nav-secondary so it hides on mobile;
          the hamburger is mobile-only. */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--gf-space-sm)',
          alignItems: 'center',
        }}
      >
        <a
          href={COACH_LOGIN.href}
          data-testid="recruits-nav-coach-login"
          className="recruits-nav-link-coach recruits-nav-secondary"
          style={{
            fontFamily: 'var(--gf-body)',
            color: 'var(--gf-text-muted)',
            textDecoration: 'none',
            fontSize: '0.9rem',
            padding: '0.5rem 0.9rem',
          }}
        >
          {COACH_LOGIN.label}
        </a>

        <button
          type="button"
          ref={hamburgerRef}
          data-testid="recruits-nav-hamburger"
          className="recruits-nav-hamburger"
          aria-label={navOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={navOpen ? 'true' : 'false'}
          aria-controls="recruits-nav-dropdown"
          onClick={() => setNavOpen((prev) => !prev)}
        >
          {navOpen ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          )}
        </button>
      </div>

      {/* Dropdown — sibling of brand/links/right slot so its
          position: absolute anchors against <nav> (which is
          position: relative). Always present in the DOM; .open
          applies to drive the opacity + transform transition. */}
      <div
        ref={dropdownRef}
        id="recruits-nav-dropdown"
        data-testid="recruits-nav-dropdown"
        className={`recruits-nav-dropdown${navOpen ? ' open' : ''}`}
        role="menu"
      >
        {dropdownLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            role="menuitem"
            className="recruits-nav-dropdown-link"
            onClick={() => setNavOpen(false)}
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
