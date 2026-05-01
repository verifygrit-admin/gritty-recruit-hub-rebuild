/**
 * recruits-top-nav.test.jsx — Sprint 011 D2
 *
 * Covers <RecruitsTopNav> (the GrittyFB top navigation bar on /recruits)
 * and the /recruits route registration in App.jsx.
 *
 * Assertions:
 *   a) RecruitsTopNav renders without throwing on default props
 *   b) Renders the required structural pieces (brand, link list, recruits
 *      active link, coach login placeholder)
 *   c) External nav links point to grittyfb.com sections (full external URLs)
 *   d) "Recruits" link is marked aria-current="page"
 *   e) "Coach Login" routes to the /coach-login-placeholder stub
 *   f) /recruits and /coach-login-placeholder routes are wired in App.jsx
 *   g) RecruitsTopNav source contains zero hardcoded brand hex literals
 *      (token-purity guard, Sprint 010 carry-forward constraint)
 *
 * Vitest runs in node env without jsdom — same pattern as Sprint 010.
 *
 * Run: npm test -- recruits-top-nav
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import RecruitsTopNav from '../../src/components/recruits/RecruitsTopNav.jsx';

// ── helpers ──────────────────────────────────────────────────────────────

function collect(el, predicate, acc = []) {
  if (el == null || typeof el !== 'object') return acc;
  if (predicate(el)) acc.push(el);
  const children = el.props && el.props.children;
  if (children == null) return acc;
  if (Array.isArray(children)) {
    for (const child of children) collect(child, predicate, acc);
  } else {
    collect(children, predicate, acc);
  }
  return acc;
}

function findByTestId(el, testId) {
  const matches = collect(el, (n) => n.props && n.props['data-testid'] === testId);
  return matches[0] || null;
}

function findAll(el, predicate) {
  return collect(el, predicate);
}

// ── a) renders without throwing ──────────────────────────────────────────

describe('RecruitsTopNav — renders cleanly', () => {
  it('does not throw when invoked with no props', () => {
    expect(() => RecruitsTopNav()).not.toThrow();
    expect(RecruitsTopNav()).not.toBeNull();
  });
});

// ── b) required structural pieces ────────────────────────────────────────

describe('RecruitsTopNav — required structural pieces', () => {
  const el = RecruitsTopNav();

  it('renders the nav root, brand, link list, and coach-login slot', () => {
    expect(findByTestId(el, 'recruits-nav')).not.toBeNull();
    expect(findByTestId(el, 'recruits-nav-brand')).not.toBeNull();
    expect(findByTestId(el, 'recruits-nav-links')).not.toBeNull();
    expect(findByTestId(el, 'recruits-nav-coach-login')).not.toBeNull();
  });

  it('renders the GrittyFB logo image', () => {
    const imgs = findAll(el, (n) => n.type === 'img');
    expect(imgs.length).toBeGreaterThanOrEqual(1);
    expect(imgs[0].props.src).toBe('/grittyfb-logo.png');
  });
});

// ── c) external nav links point to grittyfb.com ──────────────────────────

describe('RecruitsTopNav — external links', () => {
  const el = RecruitsTopNav();
  const anchors = findAll(el, (n) => n.type === 'a');
  const hrefs = anchors.map((a) => a.props.href);

  it('brand links to https://www.grittyfb.com', () => {
    expect(hrefs).toContain('https://www.grittyfb.com');
  });

  it('links to all four grittyfb.com sections', () => {
    expect(hrefs).toContain('https://www.grittyfb.com/#why');
    expect(hrefs).toContain('https://www.grittyfb.com/#partnership');
    expect(hrefs).toContain('https://www.grittyfb.com/#outcomes');
    expect(hrefs).toContain('https://www.grittyfb.com/#contact');
  });
});

// ── d) Recruits link is marked aria-current ──────────────────────────────

describe('RecruitsTopNav — active link state', () => {
  it('marks the Recruits link with aria-current="page"', () => {
    const el = RecruitsTopNav();
    const current = findAll(
      el,
      (n) => n.type === 'a' && n.props['aria-current'] === 'page'
    );
    expect(current).toHaveLength(1);
    // Recruits link should be the active one
    const text = current[0].props.children;
    expect(text).toBe('Recruits');
  });
});

// ── e) Coach Login routes to /coach-login-placeholder ────────────────────

describe('RecruitsTopNav — coach login placeholder', () => {
  it('Coach Login link href points to /coach-login-placeholder', () => {
    const el = RecruitsTopNav();
    const slot = findByTestId(el, 'recruits-nav-coach-login');
    expect(slot).not.toBeNull();
    expect(slot.props.href).toBe('/coach-login-placeholder');
  });
});

// ── f) routes registered in App.jsx ──────────────────────────────────────

describe('App routing — /recruits + /coach-login-placeholder', () => {
  const appPath = resolve(__dirname, '../../src/App.jsx');
  const src = readFileSync(appPath, 'utf8');

  it('App.jsx registers the /recruits path', () => {
    expect(src).toMatch(/path="\/recruits"/);
    expect(src).toMatch(/RecruitsPage/);
  });

  it('App.jsx registers the /coach-login-placeholder path', () => {
    expect(src).toMatch(/path="\/coach-login-placeholder"/);
    expect(src).toMatch(/CoachLoginPlaceholderPage/);
  });
});

// ── g) zero hardcoded brand hex literals ─────────────────────────────────

describe('RecruitsTopNav — token purity', () => {
  it('contains no `#xxxxxx` or `#xxx` hex color literals', () => {
    const compPath = resolve(
      __dirname,
      '../../src/components/recruits/RecruitsTopNav.jsx'
    );
    const src = readFileSync(compPath, 'utf8');
    const matches = src.match(/#[0-9a-fA-F]{3,6}\b/g) || [];
    expect(matches).toEqual([]);
  });
});
