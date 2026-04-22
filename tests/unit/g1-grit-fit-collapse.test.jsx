/**
 * @vitest-environment jsdom
 *
 * g1-grit-fit-collapse.test.jsx — Sprint 004 G1
 *
 * Verifies the collapse-state wiring for the Athletic Fit + Academic Rigor
 * scorecard pair on the My Grit Fit page (ruling A-5):
 *   Desktop — ONE shared isCollapsed bool (collapsing either strip collapses both)
 *   Mobile  — TWO independent bools (each scorecard collapses independently)
 *
 * isDesktop is injected as a prop on the exported GritFitCollapseWrapper so
 * the test does not need to mock window.innerWidth or the useIsDesktop hook
 * — the wrapper is presentational-ish once the viewport decision is lifted
 * out. Default state assertion (g) and re-expand (f) are covered inline.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup, within } from '@testing-library/react';
import React from 'react';
import { GritFitCollapseWrapper } from '../../src/pages/GritFitPage.jsx';

afterEach(() => {
  cleanup();
});

// Minimal scoring-result fixture — only the fields GritFitCollapseWrapper reads.
const fixtureScoring = {
  athFit: {
    'Power 4': 0.5,
    'G6': 0.6,
    'FCS': 0.7,
    'D2': 0.8,
    'D3': 0.9,
  },
  acadRigorScore: 0.75,
  acadTestOptScore: 0.85,
};

function athleticBodyVisible(container) {
  return container.querySelector('[data-testid="athletic-fit-scorecard-body"]') !== null;
}
function academicBodyVisible(container) {
  return container.querySelector('[data-testid="academic-rigor-scorecard-body"]') !== null;
}

function getStrips(container) {
  // Two strips render within the wrapper — first is Athletic, second is Academic.
  const strips = container.querySelectorAll('[data-testid="collapsible-title-strip"]');
  return { athletic: strips[0], academic: strips[1], all: strips };
}

describe('G1 — GritFitCollapseWrapper', () => {
  describe('rendering + default state', () => {
    it('renders both title strips with their titles visible (desktop)', () => {
      const { container, getByText } = render(
        <GritFitCollapseWrapper scoringResult={fixtureScoring} isDesktop={true} />
      );
      const { all } = getStrips(container);
      expect(all.length).toBe(2);
      expect(getByText('Athletic Fit Scores')).toBeTruthy();
      expect(getByText('Academic Rigor Scores')).toBeTruthy();
    });

    it('renders both title strips with their titles visible (mobile)', () => {
      const { container, getByText } = render(
        <GritFitCollapseWrapper scoringResult={fixtureScoring} isDesktop={false} />
      );
      const { all } = getStrips(container);
      expect(all.length).toBe(2);
      expect(getByText('Athletic Fit Scores')).toBeTruthy();
      expect(getByText('Academic Rigor Scores')).toBeTruthy();
    });

    it('defaults to expanded on both scorecards (desktop)', () => {
      const { container } = render(
        <GritFitCollapseWrapper scoringResult={fixtureScoring} isDesktop={true} />
      );
      expect(athleticBodyVisible(container)).toBe(true);
      expect(academicBodyVisible(container)).toBe(true);
    });

    it('defaults to expanded on both scorecards (mobile)', () => {
      const { container } = render(
        <GritFitCollapseWrapper scoringResult={fixtureScoring} isDesktop={false} />
      );
      expect(athleticBodyVisible(container)).toBe(true);
      expect(academicBodyVisible(container)).toBe(true);
    });

    it('desktop layout renders ONE modal-level container', () => {
      const { container } = render(
        <GritFitCollapseWrapper scoringResult={fixtureScoring} isDesktop={true} />
      );
      const wrapper = container.querySelector('[data-testid="grit-fit-scorecards"]');
      expect(wrapper).not.toBeNull();
      expect(wrapper.getAttribute('data-layout')).toBe('desktop');
      expect(container.querySelector('[data-testid="grit-fit-scorecard-athletic-wrapper"]')).toBeNull();
    });

    it('mobile layout renders TWO stacked modal-level containers', () => {
      const { container } = render(
        <GritFitCollapseWrapper scoringResult={fixtureScoring} isDesktop={false} />
      );
      const wrapper = container.querySelector('[data-testid="grit-fit-scorecards"]');
      expect(wrapper.getAttribute('data-layout')).toBe('mobile');
      expect(container.querySelector('[data-testid="grit-fit-scorecard-athletic-wrapper"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="grit-fit-scorecard-academic-wrapper"]')).not.toBeNull();
    });
  });

  describe('desktop — shared state', () => {
    it('clicking Athletic strip collapses BOTH bodies', () => {
      const { container } = render(
        <GritFitCollapseWrapper scoringResult={fixtureScoring} isDesktop={true} />
      );
      expect(athleticBodyVisible(container)).toBe(true);
      expect(academicBodyVisible(container)).toBe(true);

      const { athletic } = getStrips(container);
      fireEvent.click(athletic);

      expect(athleticBodyVisible(container)).toBe(false);
      expect(academicBodyVisible(container)).toBe(false);
    });

    it('clicking Academic strip also collapses BOTH bodies', () => {
      const { container } = render(
        <GritFitCollapseWrapper scoringResult={fixtureScoring} isDesktop={true} />
      );
      expect(athleticBodyVisible(container)).toBe(true);
      expect(academicBodyVisible(container)).toBe(true);

      const { academic } = getStrips(container);
      fireEvent.click(academic);

      expect(athleticBodyVisible(container)).toBe(false);
      expect(academicBodyVisible(container)).toBe(false);
    });

    it('clicking again re-expands BOTH bodies', () => {
      const { container } = render(
        <GritFitCollapseWrapper scoringResult={fixtureScoring} isDesktop={true} />
      );
      const { athletic } = getStrips(container);
      fireEvent.click(athletic);
      expect(athleticBodyVisible(container)).toBe(false);
      expect(academicBodyVisible(container)).toBe(false);

      fireEvent.click(athletic);
      expect(athleticBodyVisible(container)).toBe(true);
      expect(academicBodyVisible(container)).toBe(true);
    });

    it('aria-expanded reflects the shared state on both strips', () => {
      const { container } = render(
        <GritFitCollapseWrapper scoringResult={fixtureScoring} isDesktop={true} />
      );
      const { athletic, academic } = getStrips(container);
      expect(athletic.getAttribute('aria-expanded')).toBe('true');
      expect(academic.getAttribute('aria-expanded')).toBe('true');

      fireEvent.click(athletic);
      expect(athletic.getAttribute('aria-expanded')).toBe('false');
      expect(academic.getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('mobile — independent state', () => {
    it('clicking Athletic strip collapses ONLY Athletic body', () => {
      const { container } = render(
        <GritFitCollapseWrapper scoringResult={fixtureScoring} isDesktop={false} />
      );
      expect(athleticBodyVisible(container)).toBe(true);
      expect(academicBodyVisible(container)).toBe(true);

      const { athletic } = getStrips(container);
      fireEvent.click(athletic);

      expect(athleticBodyVisible(container)).toBe(false);
      expect(academicBodyVisible(container)).toBe(true);
    });

    it('clicking Academic strip collapses ONLY Academic body', () => {
      const { container } = render(
        <GritFitCollapseWrapper scoringResult={fixtureScoring} isDesktop={false} />
      );
      expect(athleticBodyVisible(container)).toBe(true);
      expect(academicBodyVisible(container)).toBe(true);

      const { academic } = getStrips(container);
      fireEvent.click(academic);

      expect(athleticBodyVisible(container)).toBe(true);
      expect(academicBodyVisible(container)).toBe(false);
    });

    it('collapsing one and then the other leaves both collapsed independently', () => {
      const { container } = render(
        <GritFitCollapseWrapper scoringResult={fixtureScoring} isDesktop={false} />
      );
      const { athletic, academic } = getStrips(container);
      fireEvent.click(athletic);
      fireEvent.click(academic);
      expect(athleticBodyVisible(container)).toBe(false);
      expect(academicBodyVisible(container)).toBe(false);

      // Re-expand Athletic only — Academic stays collapsed.
      fireEvent.click(athletic);
      expect(athleticBodyVisible(container)).toBe(true);
      expect(academicBodyVisible(container)).toBe(false);
    });

    it('each strip carries mobile variant', () => {
      const { container } = render(
        <GritFitCollapseWrapper scoringResult={fixtureScoring} isDesktop={false} />
      );
      const { athletic, academic } = getStrips(container);
      expect(athletic.getAttribute('data-variant')).toBe('mobile');
      expect(academic.getAttribute('data-variant')).toBe('mobile');
    });

    it('each strip carries desktop variant on desktop', () => {
      const { container } = render(
        <GritFitCollapseWrapper scoringResult={fixtureScoring} isDesktop={true} />
      );
      const { athletic, academic } = getStrips(container);
      expect(athletic.getAttribute('data-variant')).toBe('desktop');
      expect(academic.getAttribute('data-variant')).toBe('desktop');
    });
  });

  describe('viewport switching', () => {
    it('re-rendering with isDesktop=false on a previously-desktop collapsed state does not crash and resets to independent tracking', () => {
      // Simulates a resize: desktop collapses both, then viewport switches to mobile.
      const { container, rerender } = render(
        <GritFitCollapseWrapper scoringResult={fixtureScoring} isDesktop={true} />
      );
      const { athletic: dAthletic } = getStrips(container);
      fireEvent.click(dAthletic);
      expect(athleticBodyVisible(container)).toBe(false);
      expect(academicBodyVisible(container)).toBe(false);

      rerender(<GritFitCollapseWrapper scoringResult={fixtureScoring} isDesktop={false} />);

      // After switch to mobile, the isBothCollapsed bool no longer drives visibility.
      // Both independent bools default to false → both bodies visible.
      expect(athleticBodyVisible(container)).toBe(true);
      expect(academicBodyVisible(container)).toBe(true);

      // And mobile clicks behave independently.
      const { athletic: mAthletic } = getStrips(container);
      fireEvent.click(mAthletic);
      expect(athleticBodyVisible(container)).toBe(false);
      expect(academicBodyVisible(container)).toBe(true);
    });
  });
});
