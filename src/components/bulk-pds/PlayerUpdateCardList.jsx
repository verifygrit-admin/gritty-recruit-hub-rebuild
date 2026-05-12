/**
 * PlayerUpdateCardList — Sprint 026 Phase 1a (Coach UI), spec G3.
 *
 * Renders the dynamic list of PlayerUpdateCards in a responsive grid:
 *   - <768px viewport  → single column
 *   - 768–1199px       → two columns
 *   - >=1200px         → three columns
 *
 * Achieved with `grid-template-columns: repeat(auto-fill, minmax(360px, 1fr))`
 * which yields 1/2/3 columns at the boundary widths above.
 */

import PlayerUpdateCard from './PlayerUpdateCard.jsx';

const wrapStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.55)',
  borderRadius: 8,
  padding: 16,
  minHeight: 80,
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
  gap: 16,
};

const emptyStyle = {
  textAlign: 'center',
  padding: 24,
  color: '#FFFFFF',
  fontSize: '0.95rem',
  textShadow: '0 1px 2px rgba(0, 0, 0, 0.4)',
};

export default function PlayerUpdateCardList({ cards = [], errors = {}, onFieldChange, onRemove }) {
  return (
    <section style={wrapStyle} data-testid="bulk-pds-coach-card-list" aria-label="Player update cards">
      {cards.length === 0 ? (
        <div style={emptyStyle}>
          Add a player above to start a batch.
        </div>
      ) : (
        <div style={gridStyle}>
          {cards.map(({ student, fields }) => (
            <PlayerUpdateCard
              key={student.user_id}
              student={student}
              fields={fields}
              errors={errors[student.user_id]}
              onFieldChange={onFieldChange}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </section>
  );
}
