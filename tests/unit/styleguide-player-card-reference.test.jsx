/**
 * styleguide-player-card-reference.test.jsx — Sprint 010 D3
 *
 * Covers <PlayerCardReference> (the GrittyFB token-system reference card)
 * and <StyleguidePage> (the /styleguide host route).
 *
 * Assertions:
 *   a) PlayerCardReference renders without throwing on default props
 *   b) PlayerCardReference renders the required structural pieces
 *      (card, name, position line, school, interest summary, stats, links)
 *   c) PlayerCardReference returns null when player is explicitly null
 *   d) StyleguidePage renders without throwing and contains the card
 *   e) /styleguide route is wired in src/App.jsx
 *   f) PlayerCardReference contains zero hardcoded brand hex literals
 *      (defensive: blocks future regressions of the token-purity rule)
 *
 * Vitest runs in node env without jsdom — same pattern as
 * tests/unit/school-details-card.test.jsx. Components are invoked directly
 * as functions and the returned React element tree is traversed.
 *
 * Run: npm test -- styleguide-player-card-reference
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import PlayerCardReference from '../../src/components/styleguide/PlayerCardReference.jsx';
import StyleguidePage from '../../src/pages/StyleguidePage.jsx';

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

function textOf(el) {
  if (el == null) return '';
  const c = el.props && el.props.children;
  if (c == null) return '';
  if (typeof c === 'string' || typeof c === 'number') return String(c);
  if (Array.isArray(c)) {
    return c
      .map((ch) => (typeof ch === 'string' || typeof ch === 'number' ? String(ch) : ''))
      .join('');
  }
  return '';
}

// ── a) renders without throwing on default props ─────────────────────────

describe('PlayerCardReference — renders cleanly', () => {
  it('does not throw when invoked with no props (uses defaults)', () => {
    expect(() => PlayerCardReference()).not.toThrow();
    const el = PlayerCardReference();
    expect(el).not.toBeNull();
  });

  it('does not throw when invoked with empty props object', () => {
    expect(() => PlayerCardReference({})).not.toThrow();
  });
});

// ── b) renders required structural pieces ────────────────────────────────

describe('PlayerCardReference — required structural pieces', () => {
  it('renders the card root, name, position line, school, interest, stats, links', () => {
    const el = PlayerCardReference();
    expect(findByTestId(el, 'pcr-card')).not.toBeNull();
    expect(findByTestId(el, 'pcr-tag')).not.toBeNull();
    expect(findByTestId(el, 'pcr-photo')).not.toBeNull();
    expect(findByTestId(el, 'pcr-name')).not.toBeNull();
    expect(findByTestId(el, 'pcr-position')).not.toBeNull();
    expect(findByTestId(el, 'pcr-school')).not.toBeNull();
    expect(findByTestId(el, 'pcr-interest')).not.toBeNull();
    expect(findByTestId(el, 'pcr-stats')).not.toBeNull();
    expect(findByTestId(el, 'pcr-links')).not.toBeNull();
  });

  it('renders default fixture content (Ayden Watkins / BC High)', () => {
    const el = PlayerCardReference();
    expect(textOf(findByTestId(el, 'pcr-name'))).toBe('Ayden Watkins');
    expect(textOf(findByTestId(el, 'pcr-school'))).toContain('BC High');
    expect(textOf(findByTestId(el, 'pcr-position'))).toContain('CB');
    expect(textOf(findByTestId(el, 'pcr-position'))).toContain('175 lbs');
  });

  it('renders the requested number of stat items (default fixture: 4)', () => {
    const el = PlayerCardReference();
    const stats = collect(el, (n) => n.props && n.props['data-testid'] === 'pcr-stat');
    expect(stats).toHaveLength(4);
  });

  it('renders the requested number of link items (default fixture: 2)', () => {
    const el = PlayerCardReference();
    const links = collect(el, (n) => n.props && n.props['data-testid'] === 'pcr-link');
    expect(links).toHaveLength(2);
  });

  it('honors a custom player object', () => {
    const custom = {
      initials: 'JD',
      name: 'Jane Doe',
      position: 'WR',
      height: '5\'10"',
      weight: '170 lbs',
      school: 'Test Prep',
      classYear: 'Class 2028',
      interestSummary: '5 schools',
      stats: [{ label: 'GPA', value: '4.0' }],
      links: [],
    };
    const el = PlayerCardReference({ player: custom });
    expect(textOf(findByTestId(el, 'pcr-name'))).toBe('Jane Doe');
    const stats = collect(el, (n) => n.props && n.props['data-testid'] === 'pcr-stat');
    expect(stats).toHaveLength(1);
    expect(findByTestId(el, 'pcr-links')).toBeNull(); // empty links → no row
  });
});

// ── c) returns null when player is explicitly null ───────────────────────

describe('PlayerCardReference — null guard', () => {
  it('returns null when player is explicitly null', () => {
    expect(PlayerCardReference({ player: null })).toBeNull();
  });
});

// ── d) StyleguidePage renders and contains the card ──────────────────────

describe('StyleguidePage — render', () => {
  it('renders without throwing', () => {
    expect(() => StyleguidePage()).not.toThrow();
    expect(StyleguidePage()).not.toBeNull();
  });

  it('contains the page wrapper and a PlayerCardReference instance', () => {
    const el = StyleguidePage();
    expect(findByTestId(el, 'styleguide-page')).not.toBeNull();
    const cards = collect(el, (n) => n.type === PlayerCardReference);
    expect(cards.length).toBeGreaterThanOrEqual(1);
  });
});

// ── e) /styleguide route is wired in App.jsx ─────────────────────────────

describe('App routing — /styleguide route', () => {
  it('App.jsx registers the /styleguide path', () => {
    const appPath = resolve(__dirname, '../../src/App.jsx');
    const src = readFileSync(appPath, 'utf8');
    expect(src).toMatch(/path="\/styleguide"/);
    expect(src).toMatch(/StyleguidePage/);
  });
});

// ── f) zero hardcoded brand hex literals in the component file ───────────

describe('PlayerCardReference — token purity', () => {
  it('contains no `#xxxxxx` or `#xxx` hex color literals', () => {
    const compPath = resolve(
      __dirname,
      '../../src/components/styleguide/PlayerCardReference.jsx'
    );
    const src = readFileSync(compPath, 'utf8');
    // Match standalone hex color literals: # followed by 3 or 6 hex digits,
    // word-boundary ended. This catches '#fff', '#0a1f14', etc.
    const matches = src.match(/#[0-9a-fA-F]{3,6}\b/g) || [];
    expect(matches).toEqual([]);
  });
});
