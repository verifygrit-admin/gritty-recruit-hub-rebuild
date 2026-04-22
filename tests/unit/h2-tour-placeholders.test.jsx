/**
 * @vitest-environment jsdom
 *
 * h2-tour-placeholders.test.jsx — Sprint 004 H2 (Wave 3a)
 *
 * Validates Take-the-Tour modal per Operator Ruling A-7:
 *   - Each step renders an <img>.
 *   - Each <img> has non-empty alt text.
 *   - Each <img> src points at /tour/.
 *   - TOUR_STEP_VIEWPORTS declares a viewport label per step (parallel to
 *     the A-7 annotation comments in the JSX).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import Tutorial, { TOUR_STEP_VIEWPORTS } from '../../src/components/Tutorial.jsx';

afterEach(() => cleanup());

const ALLOWED_VIEWPORTS = new Set(['desktop', 'mobile', 'slideout']);

describe('H2 tour placeholders — TOUR_STEP_VIEWPORTS constant', () => {
  it('declares 10 entries (5 browse + 5 gritfit)', () => {
    expect(TOUR_STEP_VIEWPORTS).toHaveLength(10);
    expect(TOUR_STEP_VIEWPORTS.filter(v => v.deck === 'browse')).toHaveLength(5);
    expect(TOUR_STEP_VIEWPORTS.filter(v => v.deck === 'gritfit')).toHaveLength(5);
  });

  it('every entry has a valid viewport label, concrete dimensions, and /tour/ src', () => {
    for (const v of TOUR_STEP_VIEWPORTS) {
      expect(ALLOWED_VIEWPORTS.has(v.viewport), `bad viewport for ${v.deck} step ${v.step}: ${v.viewport}`).toBe(true);
      expect(v.width).toBeGreaterThan(0);
      expect(v.height).toBeGreaterThan(0);
      expect(v.src).toMatch(/^\/tour\//);
    }
  });

  it('steps are numbered 1..5 within each deck', () => {
    for (const deck of ['browse', 'gritfit']) {
      const steps = TOUR_STEP_VIEWPORTS.filter(v => v.deck === deck).map(v => v.step).sort();
      expect(steps).toEqual([1, 2, 3, 4, 5]);
    }
  });
});

function stepThroughDeck(type, deckKey) {
  const { container, getByText, unmount } = render(<Tutorial type={type} onClose={() => {}} />);
  const results = [];

  for (let step = 1; step <= 5; step++) {
    const img = container.querySelector('img[data-tour-step]');
    expect(img, `deck ${deckKey} step ${step}: img not rendered`).not.toBeNull();
    results.push({
      step,
      src: img.getAttribute('src'),
      alt: img.getAttribute('alt'),
      viewport: img.getAttribute('data-tour-viewport'),
      deck: img.getAttribute('data-tour-deck'),
    });
    if (step < 5) fireEvent.click(getByText('Next →'));
  }

  unmount();
  return results;
}

describe('H2 tour placeholders — rendered <img> per step', () => {
  it('browse deck: all 5 steps render an <img> with alt and /tour/ src', () => {
    const rows = stepThroughDeck('browse', 'browse');
    for (const r of rows) {
      expect(r.src, `browse step ${r.step} src`).toMatch(/^\/tour\/browse-step-\d-placeholder\.png$/);
      expect(r.alt && r.alt.length, `browse step ${r.step} alt`).toBeTruthy();
      expect(ALLOWED_VIEWPORTS.has(r.viewport), `browse step ${r.step} viewport`).toBe(true);
      expect(r.deck).toBe('browse');
    }
  });

  it('gritfit deck: all 5 steps render an <img> with alt and /tour/ src', () => {
    const rows = stepThroughDeck('gritfit', 'gritfit');
    for (const r of rows) {
      expect(r.src, `gritfit step ${r.step} src`).toMatch(/^\/tour\/gritfit-step-\d-placeholder\.png$/);
      expect(r.alt && r.alt.length, `gritfit step ${r.step} alt`).toBeTruthy();
      expect(ALLOWED_VIEWPORTS.has(r.viewport), `gritfit step ${r.step} viewport`).toBe(true);
      expect(r.deck).toBe('gritfit');
    }
  });

  it('image is responsive: width:100% on the rendered <img>', () => {
    const { container } = render(<Tutorial type="browse" onClose={() => {}} />);
    const img = container.querySelector('img[data-tour-step]');
    expect(img).not.toBeNull();
    // Inline style width should be 100% (or equivalent). display:block also set.
    expect(img.style.width).toBe('100%');
  });
});
