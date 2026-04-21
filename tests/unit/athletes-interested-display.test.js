/**
 * athletes-interested-display.test.js — Sprint 001 Deliverable 3
 *
 * Owner: Nova (frontend, TDD)
 * Date: 2026-04-20
 *
 * Covers the pure truncation helper used by PORTooltip InstitutionContent
 * to render up to 10 athlete names plus a "+ N more" overflow row.
 *
 * Run: npm run test:unit
 */

import { describe, it, expect } from 'vitest';
import { truncateAthletesInterested } from '../../src/lib/athletesInterestedDisplay.js';

describe('truncateAthletesInterested — pure helper', () => {
  it('empty array returns { names: [], overflowCount: 0 }', () => {
    expect(truncateAthletesInterested([])).toEqual({ names: [], overflowCount: 0 });
  });

  it('single name returns the name with overflow 0', () => {
    const input = ['Ada Lovelace'];
    expect(truncateAthletesInterested(input)).toEqual({
      names: ['Ada Lovelace'],
      overflowCount: 0,
    });
  });

  it('exactly 10 names returns all 10 with overflow 0', () => {
    const input = Array.from({ length: 10 }, (_, i) => `Athlete ${i + 1}`);
    const result = truncateAthletesInterested(input);
    expect(result.names).toHaveLength(10);
    expect(result.names).toEqual(input);
    expect(result.overflowCount).toBe(0);
  });

  it('13 names returns first 10 with overflow 3', () => {
    const input = Array.from({ length: 13 }, (_, i) => `Athlete ${i + 1}`);
    const result = truncateAthletesInterested(input);
    expect(result.names).toHaveLength(10);
    expect(result.names).toEqual(input.slice(0, 10));
    expect(result.overflowCount).toBe(3);
  });

  it('undefined input defensively returns { names: [], overflowCount: 0 }', () => {
    expect(truncateAthletesInterested(undefined)).toEqual({ names: [], overflowCount: 0 });
  });

  it('null input defensively returns { names: [], overflowCount: 0 }', () => {
    expect(truncateAthletesInterested(null)).toEqual({ names: [], overflowCount: 0 });
  });

  it('non-array input (object) defensively returns { names: [], overflowCount: 0 }', () => {
    expect(truncateAthletesInterested({ foo: 'bar' })).toEqual({ names: [], overflowCount: 0 });
  });
});
