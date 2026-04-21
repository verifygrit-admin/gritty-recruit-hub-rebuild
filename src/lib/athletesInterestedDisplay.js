// athletesInterestedDisplay.js — Sprint 001 Deliverable 3
// Pure helper for truncating an alphabetical list of athlete names for the
// Institutions POR tooltip. Display layer only — no schema, no I/O.
//
// Contract (per Chris, 2026-04-20):
//   Input:  an array of "First Last" strings (already alphabetical from backend)
//   Output: { names: string[], overflowCount: number }
//     - names: at most MAX_VISIBLE entries, in input order
//     - overflowCount: max(0, input.length - MAX_VISIBLE)
//   Defensive: non-array input collapses to { names: [], overflowCount: 0 }

const MAX_VISIBLE = 10;

export function truncateAthletesInterested(athletes) {
  if (!Array.isArray(athletes)) {
    return { names: [], overflowCount: 0 };
  }
  if (athletes.length <= MAX_VISIBLE) {
    return { names: athletes.slice(), overflowCount: 0 };
  }
  return {
    names: athletes.slice(0, MAX_VISIBLE),
    overflowCount: athletes.length - MAX_VISIBLE,
  };
}

export const ATHLETES_INTERESTED_MAX_VISIBLE = MAX_VISIBLE;
