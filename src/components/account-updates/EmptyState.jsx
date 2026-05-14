// EmptyState — Sprint 027.
// "No records — use Create to add" for create-enabled entities (Q8).
// Generic empty state for the 4 auth-linked entities.

export default function EmptyState({ createEnabled = false }) {
  const message = createEnabled
    ? 'No records — use Create to add'
    : 'No records to display';
  return (
    <div
      data-testid="account-updates-empty-state"
      style={{
        padding: 48,
        textAlign: 'center',
        color: '#6B6B6B',
        fontSize: '0.95rem',
      }}
    >
      {message}
    </div>
  );
}
