/**
 * Scoring result fixture factory for Item 5 unit tests.
 *
 * Matches the shape returned by runGritFitScoring:
 * { top30, top50, scored, athFit, athFitBase, boost, topTier, recruitReach,
 *   acadRigorScore, acadTestOptScore, gates }
 *
 * Base result: a G6-tier student with 1 match (passing all gates).
 * Override gates and topTier to simulate specific failure modes for deriveReason.
 *
 * Usage:
 *   makeScoringResult()                                         — 1 match, G6 topTier
 *   makeScoringResult({ topTier: null, gates: { passAll: 0 } }) — no athletic tier
 *   makeScoringResult({ topTier: 'G6', gates: { passAll: 0 } }) — combined miss
 */
export function makeScoringResult(overrides = {}) {
  const baseGates = {
    passAthletic: 1,
    passDist: 1,
    passAcad: 1,
    passAll: 1,
    ...((overrides.gates) || {}),
  };

  const base = {
    top30: [{ unitid: 100001 }],
    top50: [{ unitid: 100001 }],
    scored: [],
    athFit: { 'Power 4': 0.2, G6: 0.6, FCS: 0.4, D2: 0.3, D3: 0.2 },
    athFitBase: { 'Power 4': 0.2, G6: 0.6, FCS: 0.4, D2: 0.3, D3: 0.2 },
    boost: 0,
    topTier: 'G6',
    recruitReach: 1500,
    acadRigorScore: 0.48,
    acadTestOptScore: 0.45,
    gates: baseGates,
  };

  // Apply non-gates overrides
  const { gates: _gatesOverride, ...restOverrides } = overrides;
  return { ...base, ...restOverrides, gates: baseGates };
}
