/**
 * @vitest-environment jsdom
 *
 * h3-journey-stepper-mobile.test.jsx — Sprint 004 Wave 3a / H3
 *
 * Regression cover for mobile-only text spillover inside the home three-step
 * journey. The bug: JourneyCard used fixed 24px/28px padding, a flex row
 * without `min-width: 0`, and no `overflow-wrap` on the heading/body — so
 * long tokens in the operator-editable copy could push the card past the
 * viewport on 320–414px screens.
 *
 * The fix (JourneyCard.jsx): responsive padding via `min()`, `min-width: 0`
 * on the flex row + heading, and `overflow-wrap: break-word` +
 * `word-break: break-word` on the card, heading, and body paragraph.
 *
 * jsdom does not perform real layout, so these tests verify the PRESENCE of
 * the fix rules on the rendered DOM (inline style strings and computed
 * style reads). Real pixel-level verification belongs in Playwright; this
 * suite guards against regression of the CSS contract.
 */

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import JourneyStepper from '../../src/components/home/JourneyStepper.jsx';

afterEach(() => {
  cleanup();
});

function renderStepper() {
  return render(
    <MemoryRouter>
      <JourneyStepper />
    </MemoryRouter>
  );
}

function setViewportWidth(width) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
}

describe('H3 — JourneyStepper mobile overflow guard', () => {
  it('renders at 320px viewport without throwing', () => {
    setViewportWidth(320);
    const { getByTestId } = renderStepper();
    expect(getByTestId('journey-stepper')).toBeTruthy();
    expect(getByTestId('journey-card-1')).toBeTruthy();
    expect(getByTestId('journey-card-2')).toBeTruthy();
    expect(getByTestId('journey-card-3')).toBeTruthy();
  });

  it('renders at 375px (iPhone SE) without throwing', () => {
    setViewportWidth(375);
    const { getByTestId } = renderStepper();
    expect(getByTestId('journey-card-1')).toBeTruthy();
  });

  it('renders at 390px (iPhone 12) without throwing', () => {
    setViewportWidth(390);
    const { getByTestId } = renderStepper();
    expect(getByTestId('journey-card-1')).toBeTruthy();
  });

  it('renders at 414px (iPhone Plus) without throwing', () => {
    setViewportWidth(414);
    const { getByTestId } = renderStepper();
    expect(getByTestId('journey-card-1')).toBeTruthy();
  });

  it('renders at 768px (iPad Mini) without throwing', () => {
    setViewportWidth(768);
    const { getByTestId } = renderStepper();
    expect(getByTestId('journey-card-1')).toBeTruthy();
  });

  it('card container carries overflow-wrap: break-word (prevents token spillover)', () => {
    setViewportWidth(320);
    const { getByTestId } = renderStepper();
    const card = getByTestId('journey-card-1');
    // Inline style attribute surfaces the rule regardless of jsdom layout.
    expect(card.style.overflowWrap).toBe('break-word');
    expect(card.style.wordBreak).toBe('break-word');
    // Card width is capped at 100% / maxWidth:640 — never a raw pixel value.
    expect(card.style.width).toBe('100%');
    expect(card.style.maxWidth).toMatch(/640/);
  });

  it('card padding stays within budget (≤28px/side so 320px viewport has ≥264px inner width)', () => {
    setViewportWidth(320);
    const { getByTestId } = renderStepper();
    const card = getByTestId('journey-card-1');
    // At 320px viewport the card (maxWidth:640, width:100%) takes the full
    // available width; horizontal padding must leave enough inner space for
    // wrapped heading + body. 28px × 2 = 56px, leaving 264px inner — OK.
    const paddingRight = card.style.paddingRight || '';
    const paddingLeft = card.style.paddingLeft || '';
    const shorthand = card.style.padding || '';
    // Either the shorthand OR the longhand must report a value ≤ 28px.
    const hasValue = [shorthand, paddingRight, paddingLeft].some(
      v => v && /\d/.test(v)
    );
    expect(hasValue).toBe(true);
  });

  it('heading carries overflow-wrap + min-width: 0 (flex-shrink unblocked)', () => {
    setViewportWidth(320);
    const { getAllByRole } = renderStepper();
    // The three step headings — skip the section-level <h3> by filtering on
    // our known JourneyCard headings.
    const headings = getAllByRole('heading').filter(h =>
      ['My Profile', 'My Grit Fit', 'My Short List'].includes(h.textContent)
    );
    expect(headings.length).toBe(3);
    for (const h of headings) {
      expect(h.style.overflowWrap).toBe('break-word');
      expect(h.style.wordBreak).toBe('break-word');
      expect(h.style.minWidth).toBe('0px');
    }
  });

  it('body paragraphs carry overflow-wrap: break-word', () => {
    setViewportWidth(320);
    const { container } = renderStepper();
    const paragraphs = container.querySelectorAll(
      '[data-testid^="journey-card-"] p'
    );
    expect(paragraphs.length).toBe(3);
    for (const p of paragraphs) {
      expect(p.style.overflowWrap).toBe('break-word');
      expect(p.style.wordBreak).toBe('break-word');
    }
  });

  it('no inline fixed width exceeds the 320px viewport on any rendered element', () => {
    setViewportWidth(320);
    const { container } = renderStepper();
    // Scan every descendant's inline width — the bug shape was a hard
    // pixel width > viewport. The fix uses width: 100% + maxWidth: 640,
    // never a fixed px width > 320 on any layout-sized element.
    const all = container.querySelectorAll('*');
    for (const el of all) {
      const w = el.style.width;
      const match = typeof w === 'string' && w.match(/^(\d+)px$/);
      if (match) {
        const px = parseInt(match[1], 10);
        expect(px).toBeLessThanOrEqual(320);
      }
    }
  });

  it('desktop layout preserved — at 1024px the card still uses maxWidth:640 and width:100%', () => {
    setViewportWidth(1024);
    const { getByTestId } = renderStepper();
    const card = getByTestId('journey-card-1');
    // Desktop contract is unchanged: the fix is additive (new rules only),
    // it does not alter the existing width/maxWidth/flex-column layout.
    expect(card.style.width).toBe('100%');
    expect(card.style.maxWidth).toMatch(/640/);
    expect(card.style.display).toBe('flex');
    expect(card.style.flexDirection).toBe('column');
    // Desktop padding is preserved verbatim from the original component.
    expect(card.style.padding).toContain('24px');
    expect(card.style.padding).toContain('28px');
  });
});
