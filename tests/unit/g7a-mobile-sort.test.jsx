/**
 * @vitest-environment jsdom
 *
 * g7a-mobile-sort.test.jsx — Sprint 004 G7a
 *
 * Integration cover for the mobile-only sort controls on GRIT FIT Table View:
 *   - Controls render on mobile (useIsDesktop=false), hidden on desktop (true)
 *   - Four sort keys with exact labels (GRIT FIT Rank / Distance / ADLTV / Annual Cost)
 *   - Default sort is Rank (ascending matchRank)
 *   - Switching sort keys re-orders the rendered cards
 *   - ADLTV label is the exact spelling "ADLTV" (not G8's "ADTLV")
 *
 * useIsDesktop is mocked via vi.mock so the test can flip viewport decisions
 * without touching window.innerWidth.
 */

import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, fireEvent, cleanup, within } from '@testing-library/react';

// Mutable hook mock — reset per test via setIsDesktop().
let mockIsDesktop = false;
vi.mock('../../src/hooks/useIsDesktop.js', () => ({
  default: () => mockIsDesktop,
}));

import GritFitTableView from '../../src/components/GritFitTableView.jsx';

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  mockIsDesktop = false;
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

function getCardRanks(container) {
  const cards = container.querySelectorAll('[data-testid^="result-card-"]');
  return Array.from(cards).map(el => {
    const m = el.getAttribute('data-testid').match(/result-card-(\d+)/);
    return m ? Number(m[1]) : null;
  });
}

describe('G7a — mobile sort controls (GritFitTableView)', () => {
  describe('visibility', () => {
    it('renders the sort control group on mobile (useIsDesktop=false)', () => {
      mockIsDesktop = false;
      const { queryByTestId } = renderView();
      expect(queryByTestId('mobile-sort-controls')).toBeTruthy();
    });

    it('hides the sort control group on desktop (useIsDesktop=true)', () => {
      mockIsDesktop = true;
      const { queryByTestId } = renderView();
      expect(queryByTestId('mobile-sort-controls')).toBeNull();
    });
  });

  describe('sort keys and labels', () => {
    it('renders exactly four sort keys with the correct visible labels', () => {
      mockIsDesktop = false;
      const { getByTestId } = renderView();
      expect(getByTestId('mobile-sort-rank').textContent).toBe('GRIT FIT Rank');
      expect(getByTestId('mobile-sort-distance').textContent).toBe('Distance');
      expect(getByTestId('mobile-sort-adltv').textContent).toBe('ADLTV');
      expect(getByTestId('mobile-sort-annualCost').textContent).toBe('Annual Cost');
    });

    it('ADLTV label is preserved exactly (regression guard — ruling A-9)', () => {
      mockIsDesktop = false;
      const { getByTestId } = renderView();
      const label = getByTestId('mobile-sort-adltv').textContent;
      expect(label).toBe('ADLTV');
      expect(label).not.toContain('ADTLV');
    });
  });

  describe('default and switching', () => {
    it('defaults to Rank (cards render in matchRank ascending order)', () => {
      mockIsDesktop = false;
      const { getByTestId, container } = renderView();
      expect(getByTestId('mobile-sort-rank').getAttribute('data-active')).toBe('true');
      expect(getCardRanks(container)).toEqual([1, 2, 3, 4]);
    });

    it('changing sort key re-orders the rendered cards', () => {
      mockIsDesktop = false;
      const { getByTestId, container } = renderView();

      // Distance ascending — Charlie (45), Alpha (120), Delta (220), Bravo (300).
      fireEvent.click(getByTestId('mobile-sort-distance'));
      // matchRanks in that order: 2, 3, 4, 1
      expect(getCardRanks(container)).toEqual([2, 3, 4, 1]);

      // ADLTV descending — Charlie (95k), Alpha (50k), Delta (30k), Bravo (10k).
      // matchRanks: 2, 3, 4, 1
      fireEvent.click(getByTestId('mobile-sort-adltv'));
      expect(getCardRanks(container)).toEqual([2, 3, 4, 1]);

      // Annual Cost ascending — Bravo (8k), Delta (15k), Alpha (22k), Charlie (31k).
      // matchRanks: 1, 4, 3, 2
      fireEvent.click(getByTestId('mobile-sort-annualCost'));
      expect(getCardRanks(container)).toEqual([1, 4, 3, 2]);

      // Active state flips to the clicked button.
      expect(getByTestId('mobile-sort-annualCost').getAttribute('data-active')).toBe('true');
      expect(getByTestId('mobile-sort-rank').getAttribute('data-active')).toBe('false');
    });
  });
});
