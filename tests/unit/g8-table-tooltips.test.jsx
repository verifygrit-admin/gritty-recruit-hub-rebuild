/**
 * @vitest-environment jsdom
 *
 * g8-table-tooltips.test.jsx — Sprint 004 G8
 *
 * Integration cover for GRIT FIT Table View tooltip wiring:
 *   - Desktop: six column headers wrap labels in <Tooltip> (Rank, Div, Conf,
 *     Distance, ADTLV, Your Annual Cost).
 *   - Mobile: four sort-control buttons wrap labels in <Tooltip>
 *     (GRIT FIT Rank, Distance, ADLTV, Annual Cost).
 *   - ADLTV/ADTLV cross-spelling preserved per ruling A-9: mobile label stays
 *     "ADLTV", desktop label stays "ADTLV", tooltip content is shared.
 *   - "Your Annual Cost" tooltip copy includes the verbatim fragment
 *     "estimate using parent financial info in Student Profile".
 *   - Keyboard focus reveals tooltip.
 *   - Tapping a mobile sort button still changes the sort (G7a coexistence).
 *
 * useIsDesktop is mocked via vi.mock so the test can flip viewport decisions
 * without touching window.innerWidth (pattern borrowed from g7a).
 */

import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, fireEvent, cleanup, within, act } from '@testing-library/react';

let mockIsDesktop = true;
vi.mock('../../src/hooks/useIsDesktop.js', () => ({
  default: () => mockIsDesktop,
}));

import GritFitTableView from '../../src/components/GritFitTableView.jsx';
import { TABLE_TOOLTIPS } from '../../src/lib/copy/tooltipCopy.js';

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  mockIsDesktop = true;
});

const fixtureSchools = [
  { unitid: 1, school_name: 'Alpha U',   type: 'D3', conference: 'NESCAC', state: 'MA',
    matchRank: 3, dist: 120, adltv: 50000, netCost: 22000 },
  { unitid: 2, school_name: 'Bravo U',   type: 'D3', conference: 'NESCAC', state: 'CT',
    matchRank: 1, dist: 300, adltv: 10000, netCost: 8000  },
  { unitid: 3, school_name: 'Charlie U', type: 'D2', conference: 'CCAA',   state: 'CA',
    matchRank: 2, dist: 45,  adltv: 95000, netCost: 31000 },
  { unitid: 4, school_name: 'Delta U',   type: 'FCS',conference: 'Ivy',    state: 'NY',
    matchRank: 4, dist: 220, adltv: 30000, netCost: 15000 },
];

function renderView() {
  return render(
    <GritFitTableView
      results={fixtureSchools}
      shortlistIds={new Set()}
      onAddToShortlist={() => {}}
    />
  );
}

// Helpers
function getTriggerFor(container, labelTestId) {
  // Tooltip wraps the label <span> in a trigger <span data-testid="tooltip-trigger">.
  // Walk up from the label to its nearest tooltip-trigger ancestor.
  const label = container.querySelector(`[data-testid="${labelTestId}"]`);
  if (!label) return null;
  let node = label.parentElement;
  while (node && node.getAttribute && node.getAttribute('data-testid') !== 'tooltip-trigger') {
    node = node.parentElement;
  }
  return node;
}

function countTooltipTriggersWithin(root) {
  return root.querySelectorAll('[data-testid="tooltip-trigger"]').length;
}

describe('G8 — table tooltips (GritFitTableView)', () => {
  describe('desktop column-header tooltips', () => {
    it('renders exactly six tooltip triggers on the desktop header row', () => {
      mockIsDesktop = true;
      const { getByTestId } = renderView();
      const headerRow = getByTestId('table-header-row');
      expect(countTooltipTriggersWithin(headerRow)).toBe(6);
    });

    it('hovering (via focus path) the Rank header reveals the Rank tooltip content', () => {
      // Focus uses the same visibility state as hover and fires synchronously
      // (no 150ms show delay), so it is the cleaner jsdom assertion path.
      mockIsDesktop = true;
      const { container } = renderView();
      const label = container.querySelector('[data-testid="header-label-matchRank"]');
      expect(label).toBeTruthy();
      fireEvent.focus(label);
      const trigger = getTriggerFor(container, 'header-label-matchRank');
      const content = trigger.querySelector('[role="tooltip"]');
      expect(content).toBeTruthy();
      expect(content.textContent).toContain(TABLE_TOOLTIPS.Rank);
    });

    it('"Your Annual Cost" tooltip copy includes the parent-financial-info fragment', () => {
      // Spec-locked substring — verbatim per G8 spec. Also the same copy is
      // reused on the mobile Annual Cost sort button.
      expect(TABLE_TOOLTIPS['Your Annual Cost']).toContain(
        'estimate using parent financial info in Student Profile'
      );
    });

    it('ADTLV column label is preserved on the desktop header (A-9 regression)', () => {
      mockIsDesktop = true;
      const { container } = renderView();
      const label = container.querySelector('[data-testid="header-label-adltv"]');
      expect(label).toBeTruthy();
      expect(label.textContent).toBe('ADTLV');
      expect(label.textContent).not.toBe('ADLTV');
    });

    it('keyboard focus on a header label reveals its tooltip (a11y)', () => {
      mockIsDesktop = true;
      const { container } = renderView();
      const label = container.querySelector('[data-testid="header-label-dist"]');
      expect(label).toBeTruthy();
      // Focus fires immediately on the wrapper span (no 150ms delay).
      fireEvent.focus(label);
      const trigger = getTriggerFor(container, 'header-label-dist');
      const content = trigger.querySelector('[role="tooltip"]');
      expect(content).toBeTruthy();
      expect(content.textContent).toContain(TABLE_TOOLTIPS.Distance);
    });
  });

  describe('mobile sort-label tooltips', () => {
    it('renders exactly four tooltip triggers in the mobile sort control group', () => {
      mockIsDesktop = false;
      const { getByTestId } = renderView();
      const controls = getByTestId('mobile-sort-controls');
      expect(countTooltipTriggersWithin(controls)).toBe(4);
    });

    it('ADLTV sort button label is exactly "ADLTV" (A-9 regression guard)', () => {
      mockIsDesktop = false;
      const { container } = renderView();
      const label = container.querySelector('[data-testid="mobile-sort-label-adltv"]');
      expect(label).toBeTruthy();
      expect(label.textContent).toBe('ADLTV');
      expect(label.textContent).not.toBe('ADTLV');
    });

    it('ADLTV sort button tooltip resolves to TABLE_TOOLTIPS.ADTLV (cross-spelling mapping)', () => {
      mockIsDesktop = false;
      const { container } = renderView();
      const label = container.querySelector('[data-testid="mobile-sort-label-adltv"]');
      expect(label).toBeTruthy();
      // Focus the label — same visibility path as hover/tap, no timer.
      fireEvent.focus(label);
      const trigger = getTriggerFor(container, 'mobile-sort-label-adltv');
      const content = trigger.querySelector('[role="tooltip"]');
      expect(content).toBeTruthy();
      expect(content.textContent).toBe(TABLE_TOOLTIPS.ADTLV);
    });

    it('Annual Cost sort button tooltip reuses the desktop "Your Annual Cost" copy', () => {
      mockIsDesktop = false;
      const { container } = renderView();
      const label = container.querySelector('[data-testid="mobile-sort-label-annualCost"]');
      expect(label).toBeTruthy();
      fireEvent.focus(label);
      const trigger = getTriggerFor(container, 'mobile-sort-label-annualCost');
      const content = trigger.querySelector('[role="tooltip"]');
      expect(content).toBeTruthy();
      expect(content.textContent).toContain(
        'estimate using parent financial info in Student Profile'
      );
    });

    it('tapping a mobile sort button still changes the sort (G7a coexistence)', () => {
      mockIsDesktop = false;
      const { getByTestId, container } = renderView();
      // Default active is 'rank'
      expect(getByTestId('mobile-sort-rank').getAttribute('data-active')).toBe('true');
      fireEvent.click(getByTestId('mobile-sort-distance'));
      expect(getByTestId('mobile-sort-distance').getAttribute('data-active')).toBe('true');
      expect(getByTestId('mobile-sort-rank').getAttribute('data-active')).toBe('false');
      // Re-ordered cards — Distance ascending: Charlie (45), Alpha (120),
      // Delta (220), Bravo (300) -> matchRanks 2, 3, 4, 1.
      const cards = container.querySelectorAll('[data-testid^="result-card-"]');
      const ranks = Array.from(cards).map(el => {
        const m = el.getAttribute('data-testid').match(/result-card-(\d+)/);
        return m ? Number(m[1]) : null;
      });
      expect(ranks).toEqual([2, 3, 4, 1]);
    });
  });
});
