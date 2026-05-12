/**
 * MessageHistory — reads public.profiles.cmg_message_log (passed via `log`
 * prop) and renders the student's sent-message log table.
 *
 * Columns: Date | School | Scenario | Channel | Recipient | Preview
 * Sort: DESC by constructed_at.
 *
 * Phase 8 refinements:
 *   - Relative date formatter (5 buckets: minutes / hours / yesterday /
 *     days / MM/DD / MM/DD/YY).
 *   - Scenario lookup against CMG_SCENARIOS (id-keyed) with fallback to
 *     denormalized record.scenario_title.
 *   - Single Recipient column with friendly labels (Position Coach,
 *     Recruiting Area Coach, Head Coach, Public Post, Recruiting
 *     Coordinator). Accepts both record.recipient (Phase 7 contract) and
 *     record.recipients[0] (legacy array — Phase 1 smoke-test shape).
 *   - Body preview column (first 80 chars of body_rendered, ellipsis if
 *     truncated).
 *   - Emailed-to-Self column REMOVED (info preserved on the record;
 *     surface as row badge in a follow-up if requested).
 *
 * Empty state copy: "No messages yet. Generate your first message above."
 */
import { CMG_SCENARIOS } from '../../data/cmgScenarios.ts';

export default function MessageHistory({ log }) {
  const rows = Array.isArray(log) ? [...log] : [];
  rows.sort((a, b) => {
    const ta = a?.constructed_at ? new Date(a.constructed_at).getTime() : 0;
    const tb = b?.constructed_at ? new Date(b.constructed_at).getTime() : 0;
    return tb - ta;
  });

  if (rows.length === 0) {
    return (
      <section className="cmg-history" data-testid="cmg-message-history">
        <h2 className="cmg-history-heading">Message History</h2>
        <p className="cmg-history-empty" data-testid="cmg-history-empty">
          No messages yet. Generate your first message above.
        </p>
      </section>
    );
  }

  return (
    <section className="cmg-history" data-testid="cmg-message-history">
      <h2 className="cmg-history-heading">Message History</h2>
      <div className="cmg-history-table-wrap">
        <table className="cmg-history-table" data-testid="cmg-history-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>School</th>
              <th>Scenario</th>
              <th>Channel</th>
              <th>Recipient</th>
              <th>Preview</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const scenario = lookupScenarioTitle(row);
              return (
                <tr key={row.id ?? `${row.constructed_at ?? 'na'}-${idx}`}>
                  <td>{formatRelativeDate(row?.constructed_at)}</td>
                  <td>{row?.school_name ?? '—'}</td>
                  <td>
                    {scenario.title
                      ? (
                          <span className="cmg-history-tag">
                            {scenario.id != null ? `#${scenario.id} ` : ''}{scenario.title}
                          </span>
                        )
                      : '—'}
                  </td>
                  <td>
                    {row?.channel
                      ? (
                          <span className="cmg-history-pill" data-channel={row.channel}>
                            {row.channel}
                          </span>
                        )
                      : '—'}
                  </td>
                  <td>{recipientLabel(row)}</td>
                  <td>{bodyPreview(row?.body_rendered)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Relative date formatter — 5 buckets:
 *   < 1 hour    → "Xm ago"
 *   < 24 hours  → "Xh ago"
 *   1 day       → "yesterday"
 *   2-6 days    → "X days ago"
 *   7-30 days   → "M/D"            (compact, no year)
 *   > 30 days   → "M/D/YY"         (with two-digit year)
 *   missing/NaN → "—"
 *
 * Future dates (clock skew, bad data) fall through to the absolute MM/DD form
 * so they remain legible rather than displaying a nonsense "Xm ago" negative.
 */
export function formatRelativeDate(iso, now = Date.now()) {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '—';

  const deltaMs = now - t;
  const deltaMin = Math.floor(deltaMs / 60000);
  const deltaHr = Math.floor(deltaMs / 3600000);
  const deltaDay = Math.floor(deltaMs / 86400000);

  // Future or clock-skew → fall through to absolute.
  if (deltaMs >= 0) {
    if (deltaMin < 60) {
      const m = Math.max(deltaMin, 0);
      return `${m}m ago`;
    }
    if (deltaHr < 24) return `${deltaHr}h ago`;
    if (deltaDay === 1) return 'yesterday';
    if (deltaDay >= 2 && deltaDay <= 6) return `${deltaDay} days ago`;
  }

  const d = new Date(t);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  if (deltaDay >= 7 && deltaDay <= 30) {
    return `${month}/${day}`;
  }
  // > 30 days OR future → MM/DD/YY
  const yy = String(d.getFullYear()).slice(-2);
  return `${month}/${day}/${yy}`;
}

/**
 * Scenario lookup — prefers record.scenario_id, falls back to legacy
 * record.scenario_number, then to denormalized record.scenario_title.
 */
export function lookupScenarioTitle(record) {
  const id = record?.scenario_id ?? record?.scenario_number ?? null;
  if (id != null) {
    const found = CMG_SCENARIOS.find((s) => s.id === id);
    if (found) return { id, title: found.title };
  }
  if (record?.scenario_title) return { id, title: record.scenario_title };
  return { id, title: null };
}

/**
 * Recipient label — accepts the Phase 7 singular record.recipient or the
 * legacy record.recipients array (first element).
 */
export function recipientLabel(record) {
  const r = record?.recipient ?? record?.recipients?.[0] ?? null;
  switch (r) {
    case 'position_coach':
      return 'Position Coach';
    case 'recruiting_area_coach':
      return 'Recruiting Area Coach';
    case 'recruiting_coordinator':
      return 'Recruiting Coordinator';
    case 'head_coach':
      return 'Head Coach';
    case 'broadcast':
      return 'Public Post';
    default:
      return r ?? '—';
  }
}

/**
 * Body preview — first 80 chars of body_rendered with ellipsis if truncated.
 * Whitespace normalized so multi-line bodies render as a single visual line
 * in the table cell.
 */
export function bodyPreview(body, limit = 80) {
  if (!body || typeof body !== 'string') return '—';
  const normalized = body.replace(/\s+/g, ' ').trim();
  if (normalized.length === 0) return '—';
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit)}…`;
}
