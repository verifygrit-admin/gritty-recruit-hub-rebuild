/**
 * school-toggle.test.jsx — Sprint 011 D4
 *
 * Covers <SchoolToggle> — pill segment control above the roster grid.
 * Iterates src/data/recruits-schools.js. BC High active by default;
 * Belmont Hill disabled with inline "(coming May 2026)" subtext.
 *
 * Assertions:
 *   a) Renders without throwing
 *   b) Renders one <button> per RECRUIT_SCHOOLS entry (no hardcoded buttons)
 *   c) Active school button is marked aria-pressed="true" and uses gf-accent
 *      via test-id-tagged active state
 *   d) Disabled school button has the `disabled` attribute set
 *   e) Disabled school button renders "(coming May 2026)" inline subtext
 *      using gf-text-dim (label-class typography)
 *   f) Clicking the active-eligible button invokes onChange with its slug
 *   g) Disabled button has no onClick handler (cannot fire)
 *   h) Token purity — zero hex literals in source
 */

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import SchoolToggle from '../../src/components/recruits/SchoolToggle.jsx';
import { RECRUIT_SCHOOLS } from '../../src/data/recruits-schools.js';

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

function flattenText(el) {
  if (el == null) return '';
  if (typeof el === 'string' || typeof el === 'number') return String(el);
  if (Array.isArray(el)) return el.map(flattenText).join('');
  if (typeof el === 'object' && el.props) return flattenText(el.props.children);
  return '';
}

// ── a) renders ───────────────────────────────────────────────────────────

describe('SchoolToggle — render', () => {
  it('does not throw with required props', () => {
    expect(() => SchoolToggle({ activeSlug: 'bc-high', onChange: () => {} })).not.toThrow();
  });
});

// ── b) iterates RECRUIT_SCHOOLS ──────────────────────────────────────────

describe('SchoolToggle — iterates RECRUIT_SCHOOLS (no hardcoded buttons)', () => {
  it('renders exactly one button per RECRUIT_SCHOOLS entry', () => {
    const el = SchoolToggle({ activeSlug: 'bc-high', onChange: () => {} });
    const buttons = collect(el, (n) => n.type === 'button');
    expect(buttons).toHaveLength(RECRUIT_SCHOOLS.length);
  });

  it('each button contains its school label', () => {
    const el = SchoolToggle({ activeSlug: 'bc-high', onChange: () => {} });
    const buttons = collect(el, (n) => n.type === 'button');
    const labels = buttons.map(flattenText);
    for (const school of RECRUIT_SCHOOLS) {
      expect(labels.some((l) => l.includes(school.label))).toBe(true);
    }
  });
});

// ── c) active state ──────────────────────────────────────────────────────

describe('SchoolToggle — active state', () => {
  it('marks the active button with aria-pressed="true"', () => {
    const el = SchoolToggle({ activeSlug: 'bc-high', onChange: () => {} });
    const buttons = collect(el, (n) => n.type === 'button');
    const pressed = buttons.filter((b) => b.props['aria-pressed'] === 'true');
    expect(pressed).toHaveLength(1);
    expect(flattenText(pressed[0])).toContain('BC High');
  });

  it('non-active buttons are aria-pressed="false"', () => {
    const el = SchoolToggle({ activeSlug: 'bc-high', onChange: () => {} });
    const buttons = collect(el, (n) => n.type === 'button');
    const notPressed = buttons.filter((b) => b.props['aria-pressed'] === 'false');
    expect(notPressed.length).toBeGreaterThanOrEqual(1);
  });
});

// ── d, e) active partner schools (Sprint 020 drift fix) ──────────────────
//
// Sprint 011 shipped with Belmont Hill as `active: false` and rendered a
// disabled pill with "(coming May 2026)" subtext. Sprint 017 onboarded
// Belmont Hill (active: true). Both schools are now enabled buttons; the
// coming-soon subtext path only fires for a school whose `active: false`
// AND has a `comingMonth` value — neither current entry meets that.

describe('SchoolToggle — active partner schools', () => {
  it('every RECRUIT_SCHOOLS entry renders an enabled button (no disabled state today)', () => {
    const el = SchoolToggle({ activeSlug: 'bc-high', onChange: () => {} });
    const buttons = collect(el, (n) => n.type === 'button');
    for (const school of RECRUIT_SCHOOLS) {
      const btn = buttons.find((b) => flattenText(b).includes(school.label));
      expect(btn, `button for ${school.label}`).toBeDefined();
      // `disabled` prop is true only when school.active === false
      expect(btn.props.disabled).toBe(!school.active);
    }
  });

  it('renders no "(coming ...)" subtext for currently-active schools', () => {
    const el = SchoolToggle({ activeSlug: 'bc-high', onChange: () => {} });
    const buttons = collect(el, (n) => n.type === 'button');
    for (const school of RECRUIT_SCHOOLS) {
      if (!school.active) continue;
      const btn = buttons.find((b) => flattenText(b).includes(school.label));
      expect(flattenText(btn)).not.toContain('coming');
    }
  });
});

// ── f, g) onChange wiring ────────────────────────────────────────────────

describe('SchoolToggle — onChange', () => {
  it('clicking the BC High button calls onChange with "bc-high"', () => {
    const onChange = vi.fn();
    const el = SchoolToggle({ activeSlug: 'bc-high', onChange });
    const buttons = collect(el, (n) => n.type === 'button');
    const bc = buttons.find(
      (b) => flattenText(b).includes('BC High') && !b.props.disabled
    );
    expect(bc).toBeDefined();
    expect(typeof bc.props.onClick).toBe('function');
    bc.props.onClick();
    expect(onChange).toHaveBeenCalledWith('bc-high');
  });

  // Sprint 020 drift fix: Belmont Hill is now active (Sprint 017). The
  // generic invariant — every inactive school renders without an onClick
  // handler — is preserved here; today no school is inactive, so the loop
  // is a no-op-but-honest assertion that will catch a regression if a
  // future school is added with active: false.
  it('any inactive school button has no onClick handler', () => {
    const onChange = vi.fn();
    const el = SchoolToggle({ activeSlug: 'bc-high', onChange });
    const buttons = collect(el, (n) => n.type === 'button');
    for (const school of RECRUIT_SCHOOLS) {
      if (school.active) continue;
      const btn = buttons.find((b) => flattenText(b).includes(school.label));
      expect(btn.props.onClick == null || btn.props.disabled).toBe(true);
    }
  });
});

// ── h) token purity ──────────────────────────────────────────────────────

describe('SchoolToggle — token purity', () => {
  it('contains no `#xxxxxx` or `#xxx` hex color literals', () => {
    const compPath = resolve(
      __dirname,
      '../../src/components/recruits/SchoolToggle.jsx'
    );
    const src = readFileSync(compPath, 'utf8');
    const matches = src.match(/#[0-9a-fA-F]{3,6}\b/g) || [];
    expect(matches).toEqual([]);
  });
});
