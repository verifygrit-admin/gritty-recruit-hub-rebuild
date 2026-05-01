/**
 * recruits-footer.test.jsx — Sprint 011 D8
 *
 * Covers <RecruitsFooter> — minimal footer at the bottom of /athletes.
 * Spec lines 181-188: GrittyFB attribution + one external link to
 * https://www.grittyfb.com, opened in the same tab, gf-text-muted copy.
 *
 * Assertions:
 *   a) Renders without throwing
 *   b) Renders the recruits-footer test-id wrapper
 *   c) Single anchor pointing to https://www.grittyfb.com
 *   d) Same-tab navigation: no target="_blank", no rel="noopener"
 *   e) Attribution copy includes the year and "GrittyFB"
 *   f) Token purity — zero hex literals in source
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import RecruitsFooter from '../../src/components/recruits/RecruitsFooter.jsx';

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

function findByTestId(el, id) {
  const m = collect(el, (n) => n.props && n.props['data-testid'] === id);
  return m[0] || null;
}

function flattenText(el) {
  if (el == null) return '';
  if (typeof el === 'string' || typeof el === 'number') return String(el);
  if (Array.isArray(el)) return el.map(flattenText).join('');
  if (typeof el === 'object' && el.props) return flattenText(el.props.children);
  return '';
}

// ── render ───────────────────────────────────────────────────────────────

describe('RecruitsFooter — render', () => {
  it('does not throw', () => {
    expect(() => RecruitsFooter()).not.toThrow();
  });

  it('renders the recruits-footer wrapper', () => {
    const el = RecruitsFooter();
    expect(findByTestId(el, 'recruits-footer')).not.toBeNull();
  });
});

// ── single external link, same tab ───────────────────────────────────────

describe('RecruitsFooter — link to grittyfb.com', () => {
  it('renders exactly one anchor', () => {
    const el = RecruitsFooter();
    const anchors = collect(el, (n) => n.type === 'a');
    expect(anchors).toHaveLength(1);
  });

  it('the anchor href is https://www.grittyfb.com', () => {
    const el = RecruitsFooter();
    const anchors = collect(el, (n) => n.type === 'a');
    expect(anchors[0].props.href).toBe('https://www.grittyfb.com');
  });

  it('the anchor opens in the same tab (no target="_blank")', () => {
    const el = RecruitsFooter();
    const anchors = collect(el, (n) => n.type === 'a');
    expect(anchors[0].props.target).toBeUndefined();
  });

  it('the anchor has no rel="noopener" (same-tab navigation)', () => {
    const el = RecruitsFooter();
    const anchors = collect(el, (n) => n.type === 'a');
    expect(anchors[0].props.rel).toBeUndefined();
  });
});

// ── attribution copy ─────────────────────────────────────────────────────

describe('RecruitsFooter — attribution copy', () => {
  it('contains the GrittyFB attribution', () => {
    const el = RecruitsFooter();
    const text = flattenText(el);
    expect(text).toContain('GrittyFB');
  });

  it('contains a four-digit year', () => {
    const el = RecruitsFooter();
    const text = flattenText(el);
    expect(text).toMatch(/\b20\d{2}\b/);
  });
});

// ── token purity ─────────────────────────────────────────────────────────

describe('RecruitsFooter — token purity', () => {
  it('contains no `#xxxxxx` or `#xxx` hex color literals', () => {
    const compPath = resolve(
      __dirname,
      '../../src/components/recruits/RecruitsFooter.jsx'
    );
    const src = readFileSync(compPath, 'utf8');
    const matches = src.match(/#[0-9a-fA-F]{3,6}\b/g) || [];
    expect(matches).toEqual([]);
  });
});
