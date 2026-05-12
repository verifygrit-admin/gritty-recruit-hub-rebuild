/**
 * cmg-message-history.test.js — Sprint 025 Phase 8
 *
 * Covers <MessageHistory> — the student's sent-message log table on the CMG
 * page. Component is pure (no Supabase work, no hooks beyond render-time
 * sort), so we call it as a function and walk the returned React element
 * tree — same pattern as recruit-card.test.jsx.
 *
 * Assertions:
 *   1. Empty state copy + testid for `log = []`, null, and undefined.
 *   2. Populated state renders the table with one row per log entry.
 *   3. Scenario lookup: scenario_id=4 resolves to "Introducing Myself".
 *   4. Scenario fallback: missing id but present scenario_title still renders.
 *   5. Relative date matrix (5 buckets — exercises all branches).
 *   6. Recipient label: singular `recipient` and legacy `recipients[0]` both
 *      resolve; broadcast → "Public Post".
 *   7. Body preview truncates 200-char body to 80 chars + ellipsis.
 */

import { describe, it, expect } from 'vitest';
import MessageHistory, {
  formatRelativeDate,
  lookupScenarioTitle,
  recipientLabel,
  bodyPreview,
} from '../../src/components/cmg/MessageHistory.jsx';

// ── element-tree walkers (same shape as recruit-card.test.jsx) ───────────

function collect(el, predicate, acc = []) {
  if (el == null || typeof el !== 'object') return acc;
  if (predicate(el)) acc.push(el);
  const children = el.props && el.props.children;
  if (children == null) return acc;
  if (Array.isArray(children)) {
    for (const child of children) collect(child, predicate, acc);
  } else {
    collect(children, predicate, acc);
  }
  return acc;
}

function findByTestId(el, id) {
  const m = collect(el, (n) => n.props && n.props['data-testid'] === id);
  return m[0] || null;
}

function flattenText(el) {
  if (el == null) return '';
  if (typeof el === 'string' || typeof el === 'number') return String(el);
  if (Array.isArray(el)) return el.map(flattenText).join('');
  if (typeof el === 'object' && el.props) return flattenText(el.props.children);
  return '';
}

// ── empty state ──────────────────────────────────────────────────────────

describe('MessageHistory — empty state', () => {
  const EMPTY_COPY = 'No messages yet. Generate your first message above.';

  it('renders empty state when log is []', () => {
    const el = MessageHistory({ log: [] });
    const empty = findByTestId(el, 'cmg-history-empty');
    expect(empty).not.toBeNull();
    expect(flattenText(empty)).toContain(EMPTY_COPY);
  });

  it('renders empty state when log is null', () => {
    const el = MessageHistory({ log: null });
    expect(findByTestId(el, 'cmg-history-empty')).not.toBeNull();
  });

  it('renders empty state when log is undefined (missing prop)', () => {
    const el = MessageHistory({});
    expect(findByTestId(el, 'cmg-history-empty')).not.toBeNull();
  });

  it('does not render the table in empty state', () => {
    const el = MessageHistory({ log: [] });
    expect(findByTestId(el, 'cmg-history-table')).toBeNull();
  });
});

// ── populated state ──────────────────────────────────────────────────────

describe('MessageHistory — populated state', () => {
  it('renders one <tr> per log entry (plus thead row)', () => {
    const log = [
      {
        id: 'a',
        constructed_at: new Date().toISOString(),
        school_name: 'Holy Cross',
        scenario_id: 4,
        channel: 'email',
        recipient: 'position_coach',
        body_rendered: 'Hi Coach.',
      },
      {
        id: 'b',
        constructed_at: new Date(Date.now() - 86400000).toISOString(),
        school_name: 'Williams',
        scenario_id: 2,
        channel: 'dm',
        recipient: 'recruiting_area_coach',
        body_rendered: 'Hello Coach.',
      },
    ];
    const el = MessageHistory({ log });
    const table = findByTestId(el, 'cmg-history-table');
    expect(table).not.toBeNull();
    const bodyRows = collect(el, (n) => n.type === 'tr');
    // 1 header row + 2 body rows.
    expect(bodyRows).toHaveLength(3);
  });

  it('sorts rows DESC by constructed_at', () => {
    const newer = '2026-05-10T12:00:00Z';
    const older = '2026-05-01T12:00:00Z';
    const log = [
      { id: 'older', constructed_at: older, school_name: 'Older School', scenario_id: 4 },
      { id: 'newer', constructed_at: newer, school_name: 'Newer School', scenario_id: 4 },
    ];
    const el = MessageHistory({ log });
    const tds = collect(el, (n) => n.type === 'td');
    // First column of the first body row is the date; second column is School.
    // tds[1] is school of the first row — should be the newer one.
    expect(flattenText(tds[1])).toBe('Newer School');
  });
});

// ── scenario lookup ──────────────────────────────────────────────────────

describe('MessageHistory — scenario lookup', () => {
  it('scenario_id=4 resolves to "Introducing Myself"', () => {
    const result = lookupScenarioTitle({ scenario_id: 4 });
    expect(result.id).toBe(4);
    expect(result.title).toBe('Introducing Myself');
  });

  it('legacy scenario_number=2 also resolves', () => {
    const result = lookupScenarioTitle({ scenario_number: 2 });
    expect(result.title).toBe('Camp Follow-Up');
  });

  it('falls back to denormalized scenario_title when id missing', () => {
    const result = lookupScenarioTitle({ scenario_title: 'Custom Title' });
    expect(result.title).toBe('Custom Title');
  });

  it('returns null title when both id and title are missing', () => {
    expect(lookupScenarioTitle({}).title).toBeNull();
  });

  it('renders #id + title tag in the scenario column', () => {
    const log = [
      {
        id: 'a',
        constructed_at: new Date().toISOString(),
        school_name: 'Holy Cross',
        scenario_id: 4,
        channel: 'email',
        recipient: 'position_coach',
      },
    ];
    const el = MessageHistory({ log });
    const tag = collect(el, (n) => n.props && n.props.className === 'cmg-history-tag')[0];
    expect(tag).toBeDefined();
    expect(flattenText(tag)).toContain('#4');
    expect(flattenText(tag)).toContain('Introducing Myself');
  });
});

// ── relative date matrix ─────────────────────────────────────────────────

describe('MessageHistory — formatRelativeDate', () => {
  const NOW = new Date('2026-05-12T12:00:00Z').getTime();

  it('renders "Xm ago" for < 1 hour', () => {
    const iso = new Date(NOW - 15 * 60_000).toISOString();
    expect(formatRelativeDate(iso, NOW)).toBe('15m ago');
  });

  it('renders "0m ago" for just-now (boundary)', () => {
    const iso = new Date(NOW - 5_000).toISOString();
    expect(formatRelativeDate(iso, NOW)).toBe('0m ago');
  });

  it('renders "Xh ago" for < 24 hours', () => {
    const iso = new Date(NOW - 2 * 3_600_000).toISOString();
    expect(formatRelativeDate(iso, NOW)).toBe('2h ago');
  });

  it('renders "yesterday" for exactly 1 day', () => {
    const iso = new Date(NOW - 86_400_000).toISOString();
    expect(formatRelativeDate(iso, NOW)).toBe('yesterday');
  });

  it('renders "X days ago" for 2-6 days', () => {
    const iso = new Date(NOW - 3 * 86_400_000).toISOString();
    expect(formatRelativeDate(iso, NOW)).toBe('3 days ago');
  });

  it('renders "M/D" for 7-30 days', () => {
    // 9 days before 2026-05-12 → 2026-05-03 → "5/3"
    const iso = new Date(NOW - 9 * 86_400_000).toISOString();
    expect(formatRelativeDate(iso, NOW)).toBe('5/3');
  });

  it('renders "M/D/YY" for > 30 days', () => {
    // 150 days before 2026-05-12 → 2025-12-13 → "12/13/25"
    const iso = new Date(NOW - 150 * 86_400_000).toISOString();
    expect(formatRelativeDate(iso, NOW)).toBe('12/13/25');
  });

  it('renders "—" for missing or invalid date', () => {
    expect(formatRelativeDate(null, NOW)).toBe('—');
    expect(formatRelativeDate(undefined, NOW)).toBe('—');
    expect(formatRelativeDate('not-a-date', NOW)).toBe('—');
  });
});

// ── recipient label ──────────────────────────────────────────────────────

describe('MessageHistory — recipientLabel', () => {
  it('singular Phase 7 contract — position_coach → "Position Coach"', () => {
    expect(recipientLabel({ recipient: 'position_coach' })).toBe('Position Coach');
  });

  it('singular — head_coach → "Head Coach"', () => {
    expect(recipientLabel({ recipient: 'head_coach' })).toBe('Head Coach');
  });

  it('legacy array fallback — recipients=["broadcast"] → "Public Post"', () => {
    expect(recipientLabel({ recipients: ['broadcast'] })).toBe('Public Post');
  });

  it('legacy array fallback — recipients=["position_coach"] → "Position Coach"', () => {
    expect(recipientLabel({ recipients: ['position_coach'] })).toBe('Position Coach');
  });

  it('returns em-dash when no recipient information is present', () => {
    expect(recipientLabel({})).toBe('—');
  });

  it('singular preferred over legacy when both present', () => {
    expect(
      recipientLabel({ recipient: 'head_coach', recipients: ['position_coach'] })
    ).toBe('Head Coach');
  });
});

// ── body preview ─────────────────────────────────────────────────────────

describe('MessageHistory — bodyPreview', () => {
  it('truncates a 200-char body to 80 chars + ellipsis', () => {
    const body = 'x'.repeat(200);
    const out = bodyPreview(body);
    expect(out).toHaveLength(81); // 80 chars + 1 ellipsis char (…)
    expect(out.endsWith('…')).toBe(true);
    expect(out.slice(0, 80)).toBe('x'.repeat(80));
  });

  it('returns the full body without ellipsis when <= 80 chars', () => {
    const body = 'Hi Coach Smith — looking forward to camp.';
    expect(bodyPreview(body)).toBe(body);
  });

  it('normalizes whitespace across newlines', () => {
    const body = 'Line one.\n\nLine two with    spaces.';
    expect(bodyPreview(body)).toBe('Line one. Line two with spaces.');
  });

  it('returns "—" for empty / null / non-string body', () => {
    expect(bodyPreview(null)).toBe('—');
    expect(bodyPreview('')).toBe('—');
    expect(bodyPreview('   ')).toBe('—');
    expect(bodyPreview(undefined)).toBe('—');
  });
});
