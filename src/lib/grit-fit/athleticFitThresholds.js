/**
 * athleticFitThresholds — Sprint 003 D4.
 *
 * Maps an Athletic Fit score (0–1 scale) to a {color, label, tone} tuple for
 * the per-division Athletic Fit Scorecard. Thresholds:
 *   ≥ 50%         → green, "Athletic Fit"
 *   40% – 49.9%   → yellow, "Athletic Stretch"
 *   < 40%         → grey,  "Below Fit"
 *
 * Score is expected as a 0–1 fraction (0.5 = 50%). Null/NaN/missing → grey.
 * Boundary behavior: exactly 0.5 is "fit"; exactly 0.4 is "stretch".
 */

export const FIT_THRESHOLDS = {
  FIT_MIN: 0.5,
  STRETCH_MIN: 0.4,
};

export const FIT_BUCKETS = {
  fit: { color: '#2E7D32', bg: '#E8F5E9', label: 'Athletic Fit', tone: 'fit' },
  stretch: { color: '#8B6B00', bg: '#FFF8E1', label: 'Athletic Stretch', tone: 'stretch' },
  below: { color: '#6B6B6B', bg: '#F2F2F2', label: 'Below Fit', tone: 'below' },
};

export function classifyAthleticFit(score) {
  if (score == null || isNaN(score)) return FIT_BUCKETS.below;
  if (score >= FIT_THRESHOLDS.FIT_MIN) return FIT_BUCKETS.fit;
  if (score >= FIT_THRESHOLDS.STRETCH_MIN) return FIT_BUCKETS.stretch;
  return FIT_BUCKETS.below;
}
