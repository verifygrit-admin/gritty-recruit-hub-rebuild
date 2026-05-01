/**
 * recruits-filter-bar.test.jsx — Sprint 011 D5
 *
 * Covers <RecruitsFilterBar> — the controlled filter row above the card
 * grid. Owns no state; reads filters + dropdown options from props,
 * delegates change events to onChange.
 *
 * Assertions:
 *   a) Renders without throwing
 *   b) Renders one search input + three select elements
 *   c) Position select is populated from the positions prop with an
 *      "All positions" empty option at the head
 *   d) Class year select is populated from classYears with an "All years"
 *      empty option at the head
 *   e) Sort select carries exactly three options:
 *      Name A-Z, Name Z-A, Class Year (no stat-based sort)
 *   f) onChange invocation merges the new field into existing filter state
 *   g) Token purity
 */

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import RecruitsFilterBar from '../../src/components/recruits/RecruitsFilterBar.jsx';

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

const DEFAULT_FILTERS = {
  search: '',
  position: '',
  classYear: '',
  sort: 'name-asc',
};

function defaultProps(overrides = {}) {
  return {
    filters: { ...DEFAULT_FILTERS },
    onChange: () => {},
    positions: ['CB', 'LB', 'QB', 'RB'],
    classYears: [2026, 2027, 2028],
    ...overrides,
  };
}

// ── a) renders ───────────────────────────────────────────────────────────

describe('RecruitsFilterBar — render', () => {
  it('does not throw with required props', () => {
    expect(() => RecruitsFilterBar(defaultProps())).not.toThrow();
  });

  it('renders the filter-bar root', () => {
    const el = RecruitsFilterBar(defaultProps());
    expect(findByTestId(el, 'recruits-filter-bar')).not.toBeNull();
  });
});

// ── b) inputs ────────────────────────────────────────────────────────────

describe('RecruitsFilterBar — inputs', () => {
  it('renders one search input and three selects', () => {
    const el = RecruitsFilterBar(defaultProps());
    const inputs = collect(el, (n) => n.type === 'input');
    const selects = collect(el, (n) => n.type === 'select');
    expect(inputs).toHaveLength(1);
    expect(selects).toHaveLength(3);
  });

  it('search input has placeholder text', () => {
    const el = RecruitsFilterBar(defaultProps());
    const input = collect(el, (n) => n.type === 'input')[0];
    expect(typeof input.props.placeholder).toBe('string');
    expect(input.props.placeholder.length).toBeGreaterThan(0);
  });
});

// ── c) position select ───────────────────────────────────────────────────

describe('RecruitsFilterBar — position select', () => {
  it('renders one option per position plus an "All positions" head option', () => {
    const positions = ['CB', 'LB', 'QB', 'RB'];
    const el = RecruitsFilterBar(defaultProps({ positions }));
    const positionSelect = findByTestId(el, 'rfb-position');
    const options = collect(positionSelect, (n) => n.type === 'option');
    expect(options).toHaveLength(positions.length + 1);
    expect(options[0].props.value).toBe('');
    expect(flattenText(options[0])).toMatch(/all positions/i);
    for (const pos of positions) {
      expect(options.some((o) => o.props.value === pos)).toBe(true);
    }
  });
});

// ── d) class year select ─────────────────────────────────────────────────

describe('RecruitsFilterBar — class year select', () => {
  it('renders one option per class year plus an "All years" head option', () => {
    const classYears = [2026, 2027, 2028];
    const el = RecruitsFilterBar(defaultProps({ classYears }));
    const yearSelect = findByTestId(el, 'rfb-class-year');
    const options = collect(yearSelect, (n) => n.type === 'option');
    expect(options).toHaveLength(classYears.length + 1);
    expect(options[0].props.value).toBe('');
    expect(flattenText(options[0])).toMatch(/all years/i);
    for (const y of classYears) {
      expect(options.some((o) => Number(o.props.value) === y)).toBe(true);
    }
  });
});

// ── e) sort select ───────────────────────────────────────────────────────

describe('RecruitsFilterBar — sort select', () => {
  it('exposes exactly three sort options: Name A-Z, Name Z-A, Class Year', () => {
    const el = RecruitsFilterBar(defaultProps());
    const sortSelect = findByTestId(el, 'rfb-sort');
    const options = collect(sortSelect, (n) => n.type === 'option');
    expect(options).toHaveLength(3);
    const labels = options.map(flattenText).join(' | ');
    expect(labels).toMatch(/Name\s*A.?Z/i);
    expect(labels).toMatch(/Name\s*Z.?A/i);
    expect(labels).toMatch(/Class\s*Year/i);
  });

  it('does not expose a stat-based sort option (per spec D5 line 141)', () => {
    const el = RecruitsFilterBar(defaultProps());
    const sortSelect = findByTestId(el, 'rfb-sort');
    const labels = collect(sortSelect, (n) => n.type === 'option')
      .map(flattenText)
      .join(' ');
    expect(labels).not.toMatch(/40\s*yd|gpa/i);
  });
});

// ── f) onChange wiring ───────────────────────────────────────────────────

describe('RecruitsFilterBar — onChange merging', () => {
  it('search input change calls onChange with the new search merged in', () => {
    const onChange = vi.fn();
    const el = RecruitsFilterBar(defaultProps({ onChange }));
    const input = collect(el, (n) => n.type === 'input')[0];
    input.props.onChange({ target: { value: 'ayden' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_FILTERS,
      search: 'ayden',
    });
  });

  it('position select change calls onChange with new position merged in', () => {
    const onChange = vi.fn();
    const el = RecruitsFilterBar(defaultProps({ onChange }));
    const sel = findByTestId(el, 'rfb-position');
    sel.props.onChange({ target: { value: 'CB' } });
    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_FILTERS,
      position: 'CB',
    });
  });

  it('class year select change calls onChange with new classYear merged in', () => {
    const onChange = vi.fn();
    const el = RecruitsFilterBar(defaultProps({ onChange }));
    const sel = findByTestId(el, 'rfb-class-year');
    sel.props.onChange({ target: { value: '2027' } });
    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_FILTERS,
      classYear: '2027',
    });
  });

  it('sort select change calls onChange with new sort merged in', () => {
    const onChange = vi.fn();
    const el = RecruitsFilterBar(defaultProps({ onChange }));
    const sel = findByTestId(el, 'rfb-sort');
    sel.props.onChange({ target: { value: 'name-desc' } });
    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_FILTERS,
      sort: 'name-desc',
    });
  });
});

// ── g) token purity ──────────────────────────────────────────────────────

describe('RecruitsFilterBar — token purity', () => {
  it('contains no `#xxxxxx` or `#xxx` hex color literals', () => {
    const compPath = resolve(
      __dirname,
      '../../src/components/recruits/RecruitsFilterBar.jsx'
    );
    const src = readFileSync(compPath, 'utf8');
    const matches = src.match(/#[0-9a-fA-F]{3,6}\b/g) || [];
    expect(matches).toEqual([]);
  });
});
