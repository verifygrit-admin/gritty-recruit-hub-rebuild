/**
 * status-pill.test.js — Sprint 004 Wave 1 SC-2
 *
 * Covers:
 *   a-f) One assertion per valid status key: correct label + bg color
 *   g)   Renders null for unknown status
 *   h)   Renders null for null / undefined status prop
 *   i)   Renders null for the retired 'not_evaluated' key (regression guard)
 *   j)   Size prop 'sm' | 'md' | 'lg' all render without throwing
 *   k)   className prop is applied
 *   l)   STATUS_LABELS contains exactly 6 keys
 *   m)   STATUS_LABELS does not contain 'not_evaluated'
 *   n)   STATUS_ORDER length is 6 and does not include 'not_evaluated'
 *
 * Vitest runs in node env (no jsdom / RTL). StatusPill is a pure functional
 * component — we invoke it directly and inspect the returned React element
 * tree, which is sufficient for props / style / children assertions.
 *
 * Run: npm test -- status-pill
 */

import { describe, it, expect } from 'vitest';
import StatusPill from '../../src/components/StatusPill.jsx';
import {
  STATUS_LABELS,
  STATUS_ORDER,
  getStatusConfig,
} from '../../src/lib/statusLabels.js';

// Helper: call the functional component and return the React element (or null).
function render(props) {
  return StatusPill(props);
}

// ── a-f: one assertion per valid key ──────────────────────────────────────

const VALID_KEYS = [
  ['currently_recommended',    'Currently Recommended',    '#4CAF50'],
  ['below_academic_fit',       'Below Academic Fit',        '#FF9800'],
  ['out_of_academic_reach',    'Academic Stretch',          '#FF9800'],
  ['out_of_athletic_reach',    'Athletic Stretch',          '#FF9800'],
  ['below_athletic_fit',       'Highly Recruitable',        '#D4A017'],
  ['outside_geographic_reach', 'Outside Geographic Reach', '#9C27B0'],
];

describe('StatusPill — valid keys render correct label + bg', () => {
  for (const [key, expectedLabel, expectedBg] of VALID_KEYS) {
    it(`renders "${expectedLabel}" with bg ${expectedBg} for key "${key}"`, () => {
      const el = render({ status: key });
      expect(el).not.toBeNull();
      expect(el.props.children).toBe(expectedLabel);
      expect(el.props.style.backgroundColor).toBe(expectedBg);
      expect(el.props['data-bg']).toBe(expectedBg);
      expect(el.props['data-status']).toBe(key);
    });
  }
});

// ── g: unknown key ────────────────────────────────────────────────────────

describe('StatusPill — unknown key', () => {
  it('returns null for an unknown status key', () => {
    expect(render({ status: 'garbage_key' })).toBeNull();
  });
});

// ── h: null / undefined ───────────────────────────────────────────────────

describe('StatusPill — null / undefined status', () => {
  it('returns null when status is null', () => {
    expect(render({ status: null })).toBeNull();
  });
  it('returns null when status is undefined', () => {
    expect(render({ status: undefined })).toBeNull();
  });
  it('returns null when status is an empty string', () => {
    expect(render({ status: '' })).toBeNull();
  });
});

// ── i: regression guard for retired 'not_evaluated' ──────────────────────

describe('StatusPill — not_evaluated regression guard', () => {
  it('NEVER renders a pill for "not_evaluated" (Sprint 004 CW-1 retired)', () => {
    expect(render({ status: 'not_evaluated' })).toBeNull();
    expect(getStatusConfig('not_evaluated')).toBeNull();
  });
});

// ── j: size prop variants render without throwing ────────────────────────

describe('StatusPill — size prop variants', () => {
  for (const size of ['sm', 'md', 'lg']) {
    it(`renders without throwing for size="${size}"`, () => {
      const el = render({ status: 'currently_recommended', size });
      expect(el).not.toBeNull();
      expect(el.props.style.padding).toBeTruthy();
      expect(el.props.style.fontSize).toBeTruthy();
    });
  }

  it('uses md padding/fontSize when size is omitted', () => {
    const el = render({ status: 'currently_recommended' });
    expect(el.props.style.padding).toBe('4px 12px');
    expect(el.props.style.fontSize).toBe('0.8125rem');
  });
});

// ── k: className passthrough ──────────────────────────────────────────────

describe('StatusPill — className passthrough', () => {
  it('applies the className prop to the rendered element', () => {
    const el = render({ status: 'currently_recommended', className: 'my-pill' });
    expect(el.props.className).toBe('my-pill');
  });
});

// ── l-m-n: map / order integrity ──────────────────────────────────────────

describe('STATUS_LABELS map integrity', () => {
  it('contains exactly 6 keys', () => {
    expect(Object.keys(STATUS_LABELS)).toHaveLength(6);
  });

  it('does not contain the retired "not_evaluated" key', () => {
    expect(Object.prototype.hasOwnProperty.call(STATUS_LABELS, 'not_evaluated'))
      .toBe(false);
  });

  it('every entry has label, bg, and textColor', () => {
    for (const key of Object.keys(STATUS_LABELS)) {
      const entry = STATUS_LABELS[key];
      expect(entry.label).toBeTruthy();
      expect(entry.bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(entry.textColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe('STATUS_ORDER integrity', () => {
  it('has length 6', () => {
    expect(STATUS_ORDER).toHaveLength(6);
  });

  it('does not include "not_evaluated"', () => {
    expect(STATUS_ORDER).not.toContain('not_evaluated');
  });

  it('only contains keys that exist in STATUS_LABELS', () => {
    for (const key of STATUS_ORDER) {
      expect(STATUS_LABELS[key]).toBeDefined();
    }
  });
});
