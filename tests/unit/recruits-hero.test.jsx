/**
 * recruits-hero.test.jsx — Sprint 011 D3
 *
 * Covers <RecruitsHero> — the dark-forest hero section on /athletes.
 * Headline (Fraunces), subhead (Inter), partner-schools indicator
 * data-driven from src/data/recruits-schools.js. No CTA.
 *
 * Assertions:
 *   a) Renders without throwing on default props
 *   b) Required structural pieces present (hero root, headline, subhead,
 *      partner indicator)
 *   c) Headline contains the spec-required copy with the italic span
 *      ("One roster.")
 *   d) Subhead matches the locked Q5 wording
 *   e) Partner indicator is data-driven from RECRUIT_SCHOOLS active subset
 *      (mentions BC High; mentions Belmont Hill joining May 2026)
 *   f) Hero contains no <button> or CTA-class affordance (D3 line 117)
 *   g) Source contains zero hardcoded brand hex literals (token-purity)
 *
 * Run: npm test -- recruits-hero
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import RecruitsHero from '../../src/components/recruits/RecruitsHero.jsx';

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

function flattenText(el) {
  if (el == null) return '';
  if (typeof el === 'string' || typeof el === 'number') return String(el);
  if (Array.isArray(el)) return el.map(flattenText).join('');
  if (typeof el === 'object' && el.props) return flattenText(el.props.children);
  return '';
}

// ── a) renders cleanly ───────────────────────────────────────────────────

describe('RecruitsHero — renders cleanly', () => {
  it('does not throw', () => {
    expect(() => RecruitsHero()).not.toThrow();
    expect(RecruitsHero()).not.toBeNull();
  });
});

// ── b/c/d) structure + copy ──────────────────────────────────────────────

describe('RecruitsHero — structure and copy', () => {
  const el = RecruitsHero();

  it('renders the hero root, headline, subhead, and partner indicator', () => {
    expect(findByTestId(el, 'recruits-hero')).not.toBeNull();
    expect(findByTestId(el, 'recruits-hero-headline')).not.toBeNull();
    expect(findByTestId(el, 'recruits-hero-sub')).not.toBeNull();
    expect(findByTestId(el, 'recruits-hero-partners')).not.toBeNull();
  });

  it('headline contains required copy with italic emphasis on "One roster."', () => {
    const headline = findByTestId(el, 'recruits-hero-headline');
    const text = flattenText(headline);
    expect(text).toContain('Elite high school talent.');
    expect(text).toContain('One roster.');
    expect(text).toContain('One visit away.');
    // The italic emphasis should be a child <em> tag
    const ems = collect(headline, (n) => n.type === 'em');
    expect(ems.length).toBeGreaterThanOrEqual(1);
    expect(flattenText(ems[0])).toBe('One roster.');
  });

  it('subhead matches the locked Q5 copy', () => {
    const sub = findByTestId(el, 'recruits-hero-sub');
    const text = flattenText(sub);
    expect(text).toBe(
      "Browse student-athletes from GrittyFB partner schools. Verified rosters, real stats, public film — for college coaches and recruiting staff."
    );
  });
});

// ── e) partner indicator is data-driven ──────────────────────────────────

describe('RecruitsHero — partner indicator', () => {
  // Sprint 020 drift fix: Belmont Hill was activated in Sprint 017
  // (recruits-schools.js active: true). The "May 2026" coming-soon copy is
  // gone. Indicator now lists both schools as active.
  it('mentions BC High and Belmont Hill as active partners', () => {
    const el = RecruitsHero();
    const partners = findByTestId(el, 'recruits-hero-partners');
    const text = flattenText(partners);
    expect(text).toContain('BC High');
    expect(text).toContain('Belmont Hill');
  });
});

// ── f) no CTA in hero ────────────────────────────────────────────────────

describe('RecruitsHero — no CTA (spec D3 line 117)', () => {
  it('contains no <button> elements', () => {
    const el = RecruitsHero();
    const buttons = collect(el, (n) => n.type === 'button');
    expect(buttons).toHaveLength(0);
  });
});

// ── g) token purity ──────────────────────────────────────────────────────

describe('RecruitsHero — token purity', () => {
  it('contains no `#xxxxxx` or `#xxx` hex color literals', () => {
    const compPath = resolve(
      __dirname,
      '../../src/components/recruits/RecruitsHero.jsx'
    );
    const src = readFileSync(compPath, 'utf8');
    const matches = src.match(/#[0-9a-fA-F]{3,6}\b/g) || [];
    expect(matches).toEqual([]);
  });
});
