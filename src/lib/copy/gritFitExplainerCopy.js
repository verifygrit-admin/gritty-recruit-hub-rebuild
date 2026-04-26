/**
 * gritFitExplainerCopy — Sprint 003 D4 + Sprint 004 Wave 2 (G2, G3a, G3b, G4b).
 *
 * Operator-editable copy for the GRIT FIT Explainer section that sits below
 * the scorecards and above the map. Copy is structured as a heading plus a
 * list of paragraphs so the operator can revise without component edits.
 *
 * Sprint 004 Wave 2 extends this module with per-metric explainer strings
 * (Athletic Fit, Academic Rigor, Test Optional) and a two-paragraph Division
 * Mix replacement (G4b). Operator-ruled constraints preserved verbatim:
 *   - G4b blank-line paragraph break represented as \n\n.
 *
 * Sprint 007 R1 — operator confirmed the "means means" duplicate from the
 * Sprint 004 outline was a typo, not intentional. Ruling A-9's preservation
 * of the duplicate is reversed for the Athletic Fit explainer; single
 * "means" is now canonical. The regression guard in
 * tests/unit/grit-fit-explainer.test.js was inverted to match.
 */

export const GRIT_FIT_EXPLAINER = {
  heading: 'Why GRIT FIT is recommending this division mix',
  paragraphs: [
    'GRIT FIT is not ranking you against recruits — it is ranking programs against your profile. The division mix you see reflects where your athletic and academic numbers actually line up, not where the recruiting conversation happens loudest.',
    'For a lot of high-academic student-athletes, that mix leans more heavily toward D2 and D3 programs than first expected. That is a feature, not a letdown. D2 and D3 football are not after-thoughts. Many D3 programs sit inside elite academic institutions that award significant merit aid and produce degrees that pay out across a 40-year career.',
    'If your Grit Fit map looks D3-heavy and you meet the academic bar, you are almost certainly looking at a real opportunity to find a program where your football years add to a degree worth paying for — not one that competes with it. Use the what-if sliders below to see how your scores and matches shift as your numbers change.',
  ],
};

// G2 — Athletic Fit explainer. Sprint 007 R1: single "means" is canonical
// (reverses Sprint 004 ruling A-9 which preserved the outline duplicate).
export const ATHLETIC_FIT_EXPLAINER =
  'Your percent rank compared to the distribution of Height, Weight, and Speed of all players in each level of college football. A score of 50% means your athletic metrics equate to the average athletic metrics for that level of play.';

// G3a — Academic Rigor Score explainer.
export const ACADEMIC_RIGOR_EXPLAINER =
  'Your current GPA and P/SAT scores qualify you for schools that are NOT test optional and are equal to or below this percent rank of Academic Rigor.';

// G3b — Test Optional Score explainer.
export const TEST_OPTIONAL_EXPLAINER =
  'Your current GPA qualifies you for admission to schools that ARE test optional and are equal to or below this percent rank of Academic Rigor.';

// G4b — Division Mix two-paragraph replacement. Blank-line break represented as \n\n.
export const DIVISION_MIX_EXPLAINER =
  'If your Grit Fit Map and Grit Fit Table look D3-heavy, you are almost certainly looking at a real opportunity to find a program where your football talent allows you to earn a degree worth hundreds of thousands of dollars more than other students with a similar academic background, but who are not recruitable as football players.\n\nWant to see how athletic and academic growth could change your GRIT FIT Recommendations? Use the what-if sliders below to see how your scores and matches shift as your numbers change. Don\'t be afraid to add Athletic and Academic Stretch schools to your Shortlist.';
