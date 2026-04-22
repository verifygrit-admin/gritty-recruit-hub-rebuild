/**
 * tooltipCopy — Sprint 004 Wave 2 (G8).
 *
 * Operator-editable tooltip copy for the GRIT FIT table column headers.
 * Five placeholder strings are marked with TODO(tooltip-copy) for operator
 * finalization. "Your Annual Cost" is verbatim-required per spec G8.
 *
 * Ruling A-9: ADTLV spelling preserved verbatim — do NOT reconcile to ADLTV.
 */

// TODO(tooltip-copy): placeholder
export const TABLE_TOOLTIPS = {
  // TODO(tooltip-copy): placeholder — operator to finalize
  Rank: 'Your GRIT FIT rank for this school.',
  // TODO(tooltip-copy): placeholder — operator to finalize
  Div: 'NCAA Division: D1, D2, or D3.',
  // TODO(tooltip-copy): placeholder — operator to finalize
  Conf: 'Athletic conference affiliation.',
  // TODO(tooltip-copy): placeholder — operator to finalize
  Distance: 'Distance from your home in miles.',
  // ADTLV spelling preserved per ruling A-9 — do not reconcile to ADLTV
  // TODO(tooltip-copy): placeholder — operator to finalize
  ADTLV: 'Academic Degree Lifetime Value — preserved spelling, operator to reconcile.',
  // Verbatim per spec G8: must include "estimate using parent financial info in Student Profile"
  'Your Annual Cost': 'Your Annual Cost: an estimate using parent financial info in Student Profile.',
};
