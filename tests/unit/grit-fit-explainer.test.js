/**
 * grit-fit-explainer.test.js — Sprint 003 D4 + Sprint 004 Wave 2 (G2, G3a, G3b, G4b).
 * Pure data test on the operator-editable copy constants.
 */

import { describe, it, expect } from 'vitest';
import {
  GRIT_FIT_EXPLAINER,
  ATHLETIC_FIT_EXPLAINER,
  ACADEMIC_RIGOR_EXPLAINER,
  TEST_OPTIONAL_EXPLAINER,
  DIVISION_MIX_EXPLAINER,
} from '../../src/lib/copy/gritFitExplainerCopy.js';

describe('GRIT_FIT_EXPLAINER', () => {
  it('exports a heading string', () => {
    expect(typeof GRIT_FIT_EXPLAINER.heading).toBe('string');
    expect(GRIT_FIT_EXPLAINER.heading.length).toBeGreaterThan(0);
  });

  it('exports at least 2 paragraphs of substantive copy', () => {
    expect(Array.isArray(GRIT_FIT_EXPLAINER.paragraphs)).toBe(true);
    expect(GRIT_FIT_EXPLAINER.paragraphs.length).toBeGreaterThanOrEqual(2);
    for (const p of GRIT_FIT_EXPLAINER.paragraphs) {
      expect(p.length).toBeGreaterThanOrEqual(80);
    }
  });

  it('mentions the D2+D3 framing the spec requires', () => {
    const joined = GRIT_FIT_EXPLAINER.paragraphs.join(' ').toLowerCase();
    expect(joined).toContain('d2');
    expect(joined).toContain('d3');
  });
});

describe('Sprint 004 Wave 2 — metric explainers', () => {
  it('G2 — Athletic Fit explainer matches verbatim (Sprint 007 R1: single "means")', () => {
    expect(ATHLETIC_FIT_EXPLAINER).toBe(
      'Your percent rank compared to the distribution of Height, Weight, and Speed of all players in each level of college football. A score of 50% means your athletic metrics equate to the average athletic metrics for that level of play.'
    );
    // Sprint 007 R1 — guard inverts the Sprint 004 A-9 preservation of "means means".
    // Operator confirmed in the Sprint 007 open that the duplicate was a typo.
    expect(ATHLETIC_FIT_EXPLAINER).not.toMatch(/means means/);
  });

  it('G3a — Academic Rigor explainer matches verbatim', () => {
    expect(ACADEMIC_RIGOR_EXPLAINER).toBe(
      'Your current GPA and P/SAT scores qualify you for schools that are NOT test optional and are equal to or below this percent rank of Academic Rigor.'
    );
  });

  it('G3b — Test Optional explainer matches verbatim', () => {
    expect(TEST_OPTIONAL_EXPLAINER).toBe(
      'Your current GPA qualifies you for admission to schools that ARE test optional and are equal to or below this percent rank of Academic Rigor.'
    );
  });

  it('G4b — Division Mix matches verbatim, with exactly one \\n\\n paragraph break', () => {
    const expected =
      'If your Grit Fit Map and Grit Fit Table look D3-heavy, you are almost certainly looking at a real opportunity to find a program where your football talent allows you to earn a degree worth hundreds of thousands of dollars more than other students with a similar academic background, but who are not recruitable as football players.\n\nWant to see how athletic and academic growth could change your GRIT FIT Recommendations? Use the what-if sliders below to see how your scores and matches shift as your numbers change. Don\'t be afraid to add Athletic and Academic Stretch schools to your Shortlist.';
    expect(DIVISION_MIX_EXPLAINER).toBe(expected);
    // Guard against collapse to \n or expansion to \n\n\n.
    const matches = DIVISION_MIX_EXPLAINER.match(/\n\n/g) || [];
    expect(matches.length).toBe(1);
    expect(DIVISION_MIX_EXPLAINER).not.toMatch(/\n\n\n/);
  });
});
