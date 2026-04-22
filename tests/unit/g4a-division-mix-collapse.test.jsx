/**
 * @vitest-environment jsdom
 *
 * g4a-division-mix-collapse.test.jsx — Sprint 004 Wave 3 G4a
 *
 * Covers the integration of <CollapsibleTitleStrip> (SC-1) into the Division
 * Mix blurb section of <GritFitExplainer>, with body copy rendered from the
 * `DIVISION_MIX_EXPLAINER` constant (G4b).
 *
 * Assertions:
 *   a) Renders Division Mix title strip with the expected title text.
 *   b) Body renders DIVISION_MIX_EXPLAINER content when expanded (substring
 *      unique to G4b copy — "D3-heavy" and "what-if sliders").
 *   c) Body is hidden when collapsed (via data-testid absence + aria-expanded).
 *   d) Clicking the strip toggles isCollapsed.
 *   e) Default state is expanded.
 *   f) Body renders the two-paragraph structure as two <p> elements.
 *   g) Regression guard — verifies the rendered text matches the imported
 *      DIVISION_MIX_EXPLAINER string rather than re-hardcoded copy.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import GritFitExplainer from '../../src/components/grit-fit/GritFitExplainer.jsx';
import {
  GRIT_FIT_EXPLAINER,
  DIVISION_MIX_EXPLAINER,
} from '../../src/lib/copy/gritFitExplainerCopy.js';

afterEach(() => cleanup());

describe('G4a — Division Mix collapse', () => {
  it('a) renders Division Mix title strip with the expected title text', () => {
    const { getByTestId } = render(<GritFitExplainer />);
    const strip = getByTestId('collapsible-title-strip');
    expect(strip).toBeTruthy();
    const title = getByTestId('collapsible-title-strip-title');
    expect(title.textContent).toBe(GRIT_FIT_EXPLAINER.heading);
  });

  it('b) body renders DIVISION_MIX_EXPLAINER content when expanded', () => {
    const { getByTestId } = render(<GritFitExplainer />);
    const body = getByTestId('grit-fit-division-mix-body');
    expect(body.textContent).toContain('D3-heavy');
    expect(body.textContent).toContain('what-if sliders');
  });

  it('c) body is hidden when collapsed (strip remains)', () => {
    const { getByTestId, queryByTestId } = render(<GritFitExplainer />);
    const strip = getByTestId('collapsible-title-strip');

    // Default expanded — body present, aria-expanded=true.
    expect(queryByTestId('grit-fit-division-mix-body')).not.toBeNull();
    expect(strip.getAttribute('aria-expanded')).toBe('true');

    // Click to collapse.
    fireEvent.click(strip);

    // Strip still rendered; body gone; aria-expanded=false.
    expect(getByTestId('collapsible-title-strip')).toBeTruthy();
    expect(queryByTestId('grit-fit-division-mix-body')).toBeNull();
    expect(
      getByTestId('collapsible-title-strip').getAttribute('aria-expanded')
    ).toBe('false');
  });

  it('d) clicking the strip toggles isCollapsed (collapse → expand cycle)', () => {
    const { getByTestId, queryByTestId } = render(<GritFitExplainer />);
    const strip = getByTestId('collapsible-title-strip');

    // Start expanded.
    expect(queryByTestId('grit-fit-division-mix-body')).not.toBeNull();

    // Click → collapsed.
    fireEvent.click(strip);
    expect(queryByTestId('grit-fit-division-mix-body')).toBeNull();

    // Click again → expanded.
    fireEvent.click(getByTestId('collapsible-title-strip'));
    expect(queryByTestId('grit-fit-division-mix-body')).not.toBeNull();
  });

  it('e) default state is expanded', () => {
    const { getByTestId } = render(<GritFitExplainer />);
    const strip = getByTestId('collapsible-title-strip');
    expect(strip.getAttribute('aria-expanded')).toBe('true');
    expect(strip.getAttribute('data-collapsed')).toBe('false');
    expect(getByTestId('grit-fit-division-mix-body')).toBeTruthy();
  });

  it('f) body renders the two-paragraph structure as two <p> elements', () => {
    const { getByTestId } = render(<GritFitExplainer />);
    const body = getByTestId('grit-fit-division-mix-body');
    const paragraphs = body.querySelectorAll('p');
    expect(paragraphs.length).toBe(2);
    // Paragraph 1 — first sentence signature.
    expect(paragraphs[0].textContent).toContain('D3-heavy');
    // Paragraph 2 — what-if sliders signature.
    expect(paragraphs[1].textContent).toContain('what-if sliders');
  });

  it('g) regression guard — rendered paragraphs match the imported DIVISION_MIX_EXPLAINER', () => {
    const { getByTestId } = render(<GritFitExplainer />);
    const body = getByTestId('grit-fit-division-mix-body');
    const paragraphs = Array.from(body.querySelectorAll('p')).map(
      (p) => p.textContent
    );
    const expected = DIVISION_MIX_EXPLAINER.split('\n\n');
    expect(paragraphs).toEqual(expected);
    // Additional guard: total text matches the full constant when re-joined.
    expect(paragraphs.join('\n\n')).toBe(DIVISION_MIX_EXPLAINER);
  });
});
