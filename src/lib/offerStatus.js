/**
 * offerStatus.js — Sprint 007 hotfix HF-4
 *
 * Single producer for "has the student received a verbal/written offer
 * from this school?". The truth lives in
 * short_list_items.recruiting_journey_steps JSONB:
 *   step_id 14 — "Received verbal offer"
 *   step_id 15 — "Received written offer"
 *
 * Both helpers are null-safe and return false on missing JSONB, missing
 * step entry, or non-strict-true completed values. Strict-equality on
 * `=== true` matches the rest of the codebase's JSONB read conventions
 * (see countCompletedSteps in ShortlistRow.jsx and extractScoreboardBooleans
 * in RecruitingScoreboard.jsx).
 *
 * Consumers:
 *   - ShortlistSlideOut.jsx (Verbal + Written chips in the offer-chips row)
 *   - RecruitingScoreboard.jsx (College column under school name)
 *   - SchoolDetailsCard.jsx (header pills, via props from Map)
 *   - GritFitMapView.jsx (popup pin lookup against shortlist map)
 *   - GritFitTableView.jsx (inline next to school_name for shortlisted rows)
 */

export const STEP_ID_VERBAL_OFFER = 14;
export const STEP_ID_WRITTEN_OFFER = 15;

function isStepComplete(item, stepId) {
  const steps = Array.isArray(item?.recruiting_journey_steps)
    ? item.recruiting_journey_steps
    : [];
  for (const s of steps) {
    if (s && s.step_id === stepId && s.completed === true) return true;
  }
  return false;
}

export function hasVerbalOffer(item) {
  return isStepComplete(item, STEP_ID_VERBAL_OFFER);
}

export function hasWrittenOffer(item) {
  return isStepComplete(item, STEP_ID_WRITTEN_OFFER);
}
