/**
 * coach-login-placeholder.test.jsx — Sprint 011 D2 placeholder
 *
 * Covers <CoachLoginPlaceholderPage> — the honest stub the /athletes nav
 * "Coach Login" link routes to. Replaced in Sprint 016.
 *
 * Assertions:
 *   a) Renders without throwing
 *   b) Page wrapper renders with the expected test id
 *   c) Source contains zero hardcoded brand hex literals (token-purity)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import CoachLoginPlaceholderPage from '../../src/pages/CoachLoginPlaceholderPage.jsx';

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

describe('CoachLoginPlaceholderPage — render', () => {
  it('does not throw', () => {
    expect(() => CoachLoginPlaceholderPage()).not.toThrow();
  });

  it('renders the placeholder wrapper', () => {
    const el = CoachLoginPlaceholderPage();
    expect(findByTestId(el, 'coach-login-placeholder')).not.toBeNull();
  });
});

describe('CoachLoginPlaceholderPage — token purity', () => {
  it('contains no `#xxxxxx` or `#xxx` hex color literals', () => {
    const compPath = resolve(
      __dirname,
      '../../src/pages/CoachLoginPlaceholderPage.jsx'
    );
    const src = readFileSync(compPath, 'utf8');
    const matches = src.match(/#[0-9a-fA-F]{3,6}\b/g) || [];
    expect(matches).toEqual([]);
  });
});
