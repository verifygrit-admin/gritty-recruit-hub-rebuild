import AdminBulkPdsBatchHeader from './AdminBulkPdsBatchHeader.jsx';
import AdminBulkPdsCompareRow from './AdminBulkPdsCompareRow.jsx';

/**
 * AdminBulkPdsBatchDetail — Sprint 026 Phase 1b.
 *
 * Right-column container for a selected batch. Renders the header (with
 * whole-batch CTAs) and one compare row per student in the batch. Per-row
 * approve/reject handlers are wired through to the parent AdminBulkPdsTab,
 * which owns the modal state and fixture client mutations.
 *
 * Empty state when no batch is selected matches the existing Admin tab
 * convention (`AdminUsersTab` etc).
 */
export default function AdminBulkPdsBatchDetail({
  batch,
  onApproveBatch,
  onRejectBatch,
  onApproveSubmission,
  onRejectSubmission,
}) {
  if (!batch) {
    return (
      <section
        data-testid="bulk-pds-admin-batch-detail"
        style={{
          flex: '1 1 0',
          minWidth: 0,
          padding: 24,
          border: '1px dashed #C8C8C8',
          borderRadius: 8,
          backgroundColor: '#FAFAFA',
          color: '#6B6B6B',
        }}
      >
        Select a pending batch from the list to review submissions.
      </section>
    );
  }

  const submissions = Array.isArray(batch.submissions) ? batch.submissions : [];

  return (
    <section
      data-testid="bulk-pds-admin-batch-detail"
      style={{
        flex: '1 1 0',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        border: '1px solid #E8E8E8',
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
      }}
    >
      <AdminBulkPdsBatchHeader
        batch={batch}
        onApproveBatch={onApproveBatch}
        onRejectBatch={onRejectBatch}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: 16,
          backgroundColor: '#FAFAFA',
          minHeight: 200,
        }}
      >
        {submissions.length === 0 ? (
          <div style={{ color: '#6B6B6B', fontStyle: 'italic' }}>
            This batch has no remaining pending submissions.
          </div>
        ) : (
          submissions.map((sub) => (
            <AdminBulkPdsCompareRow
              key={sub.staging?.id}
              submission={sub}
              onApprove={onApproveSubmission}
              onReject={onRejectSubmission}
            />
          ))
        )}
      </div>
    </section>
  );
}
