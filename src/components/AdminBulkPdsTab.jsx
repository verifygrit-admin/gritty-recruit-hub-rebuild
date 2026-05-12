import { useCallback, useEffect, useState } from 'react';
import AdminBulkPdsBatchList from './AdminBulkPdsBatchList.jsx';
import AdminBulkPdsBatchDetail from './AdminBulkPdsBatchDetail.jsx';
import AdminBulkPdsRejectModal from './AdminBulkPdsRejectModal.jsx';
import {
  listPendingBatches,
  approveBatch,
  approveSubmission,
  rejectBatch,
  rejectSubmission,
} from '../lib/bulkPds/admin/adminBulkPdsClient.js';

/**
 * AdminBulkPdsTab — Sprint 026 Phase 1b root for `/admin/bulk-pds`.
 *
 * Owns:
 *   - selected batch state
 *   - reject-modal context (batch vs submission, plus the target id)
 *   - all five admin client actions (approve/reject × batch/row + list)
 *
 * Phase 1b runs against the fixture-mode adminBulkPdsClient (`[STUB]
 * adminBulkPdsClient.<fn>` console warnings). Phase 2 swaps the client
 * internals to live Edge Function fetches without changing this component.
 *
 * See SPRINT_026_PLAN §3 for layout and §7 Q1/Q2 for the locked
 * approve/reject contract this UI implements.
 */
export default function AdminBulkPdsTab() {
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rejectContext, setRejectContext] = useState(null); // { kind: 'batch'|'submission', id, label }
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPendingBatches();
      setBatches(data);
      // Maintain selection when possible, otherwise pick first or clear.
      setSelectedBatchId((prev) => {
        if (prev && data.some((b) => b.batch_id === prev)) return prev;
        return data[0]?.batch_id || null;
      });
    } catch (e) {
      setError(e?.message || 'Failed to load pending batches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selectedBatch = batches.find((b) => b.batch_id === selectedBatchId) || null;

  // --- Whole-batch actions ---
  const handleApproveBatch = useCallback(async () => {
    if (!selectedBatchId) return;
    try {
      await approveBatch(selectedBatchId);
      await refresh();
    } catch (e) {
      setError(e?.message || 'Approve batch failed');
    }
  }, [selectedBatchId, refresh]);

  const handleOpenRejectBatch = useCallback(() => {
    if (!selectedBatchId) return;
    setRejectContext({
      kind: 'batch',
      id: selectedBatchId,
      label: 'Reject entire batch',
    });
  }, [selectedBatchId]);

  // --- Per-row actions ---
  const handleApproveSubmission = useCallback(async (submissionId) => {
    try {
      await approveSubmission(submissionId);
      await refresh();
    } catch (e) {
      setError(e?.message || 'Approve submission failed');
    }
  }, [refresh]);

  const handleOpenRejectSubmission = useCallback((submissionId) => {
    setRejectContext({
      kind: 'submission',
      id: submissionId,
      label: 'Reject this submission',
    });
  }, []);

  const handleConfirmReject = useCallback(async (reason) => {
    if (!rejectContext) return;
    try {
      if (rejectContext.kind === 'batch') {
        await rejectBatch(rejectContext.id, reason);
      } else {
        await rejectSubmission(rejectContext.id, reason);
      }
      setRejectContext(null);
      await refresh();
    } catch (e) {
      setError(e?.message || 'Reject failed');
    }
  }, [rejectContext, refresh]);

  return (
    <div
      data-testid="bulk-pds-admin-tab-shell"
      style={{
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#2C2C2C' }}>
          Bulk PDS Approval
        </h2>
        <span style={{ fontSize: '0.8125rem', color: '#6B6B6B' }}>
          {loading ? 'Loading…' : `${batches.length} pending ${batches.length === 1 ? 'batch' : 'batches'}`}
        </span>
      </div>
      {error && (
        <div
          role="alert"
          style={{
            padding: 12,
            border: '1px solid #8B3A3A',
            backgroundColor: '#FFF4F4',
            color: '#8B3A3A',
            borderRadius: 6,
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <AdminBulkPdsBatchList
          batches={batches}
          selectedBatchId={selectedBatchId}
          onSelect={setSelectedBatchId}
        />
        <AdminBulkPdsBatchDetail
          batch={selectedBatch}
          onApproveBatch={handleApproveBatch}
          onRejectBatch={handleOpenRejectBatch}
          onApproveSubmission={handleApproveSubmission}
          onRejectSubmission={handleOpenRejectSubmission}
        />
      </div>

      <AdminBulkPdsRejectModal
        open={!!rejectContext}
        title={rejectContext?.label || 'Reject submission'}
        onCancel={() => setRejectContext(null)}
        onConfirm={handleConfirmReject}
      />
    </div>
  );
}
