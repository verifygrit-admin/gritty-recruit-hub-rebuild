/**
 * MessageHistory — reads public.profiles.cmg_message_log and renders the
 * student's sent-message log table.
 *
 * Columns: Date | School | Scenario | Channel | Recipient | Emailed to Self
 * Sort: DESC by constructed_at.
 * Empty state: "No messages yet. Pick a scenario above to get started."
 *
 * Sprint 025 Phase 4 — render only; Phase 7/8 wire the live re-fetch on
 * Copy / Email-to-Self action append.
 */
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
        <p className="cmg-history-empty">
          No messages yet. Pick a scenario above to get started.
        </p>
      </section>
    );
  }

  return (
    <section className="cmg-history" data-testid="cmg-message-history">
      <h2 className="cmg-history-heading">Message History</h2>
      <div className="cmg-history-table-wrap">
        <table className="cmg-history-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>School</th>
              <th>Scenario</th>
              <th>Channel</th>
              <th>Recipient</th>
              <th>Emailed to Self</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id ?? `${row.constructed_at}-${row.unitid}`}>
                <td>{formatDate(row.constructed_at)}</td>
                <td>{row.school_name ?? '—'}</td>
                <td>
                  <span className="cmg-history-tag">#{row.scenario_number} {row.scenario_title}</span>
                </td>
                <td>
                  <span className="cmg-history-pill" data-channel={row.channel}>{row.channel}</span>
                </td>
                <td>{(row.recipients ?? []).join(', ') || '—'}</td>
                <td>{row.emailed_to_self ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`;
  } catch {
    return iso;
  }
}
