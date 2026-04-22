/**
 * recomputeMatches — Sprint 003 D4.
 *
 * Pure client-side helper used by the view-only What-If sliders. Merges the
 * true profile with slider overrides, re-runs the scoring engine, then applies
 * the D4 match-return rule. Returns a snapshot shaped like the original
 * scoringResult plus the post-rule match list.
 *
 * IMPORTANT: no network, no DB writes. Slider interaction MUST NOT cause any
 * profile mutation; consumers pass the true profile in unchanged.
 */

import { runGritFitScoring } from '../scoring.js';
import { applyMatchReturnLogic, MATCH_RETURN_LIMIT } from './matchReturnLogic.js';

export const SLIDER_KEYS = ['height', 'weight', 'speed_40', 'gpa', 'sat'];

export function buildOverriddenProfile(trueProfile, overrides) {
  if (!trueProfile) return trueProfile;
  if (!overrides) return trueProfile;
  const merged = { ...trueProfile };
  for (const key of SLIDER_KEYS) {
    if (overrides[key] !== undefined && overrides[key] !== null && overrides[key] !== '') {
      merged[key] = overrides[key];
    }
  }
  return merged;
}

export function recomputeMatches(trueProfile, schools, overrides, limit = MATCH_RETURN_LIMIT) {
  const profile = buildOverriddenProfile(trueProfile, overrides);
  const scoringResult = runGritFitScoring(profile, schools || []);

  const eligibleSorted = (scoringResult.scored || [])
    .filter(s => s.eligible)
    .sort((a, b) => b.acadScore - a.acadScore);

  const topN = applyMatchReturnLogic(
    eligibleSorted,
    scoringResult.athFit,
    scoringResult.acadRigorScore,
    limit,
    { profile, schoolsPool: schools || [] },
  );

  return {
    ...scoringResult,
    top30: topN,
    athFit: scoringResult.athFit,
    academicRigorScore: scoringResult.acadRigorScore,
    testOptionalScore: scoringResult.acadTestOptScore,
  };
}
