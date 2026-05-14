// AccountUpdatesShell — Sprint 027.
// Owns: active toggle, paged rows, selection (max 10 per Q6), drawer state,
// EF dispatchers. Reuses src/components/AdminTableEditor.jsx for read display.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useToast } from '../Toast.jsx';
import useIsDesktop from '../../hooks/useIsDesktop.js';
import AdminTableEditor from '../AdminTableEditor.jsx';
import AccountUpdatesToggleBar from './AccountUpdatesToggleBar.jsx';
import BulkEditDrawer from './BulkEditDrawer.jsx';
import CreateRowModal from './CreateRowModal.jsx';
import DeleteConfirmModal from './DeleteConfirmModal.jsx';
import EmptyState from './EmptyState.jsx';
import { ENTITY_KEYS, getEntity } from '../../lib/adminAccountUpdates/entityRegistry.js';
import { getColumns } from '../../lib/adminAccountUpdates/columnConfigs.js';
import { fetchPagedRows } from '../../lib/adminAccountUpdates/fetchPagedRows.js';

const SELECTION_CAP = 10;

export default function AccountUpdatesShell() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const isDesktop = useIsDesktop();

  const [activeEntity, setActiveEntity] = useState(ENTITY_KEYS[0]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);

  const cfg = getEntity(activeEntity);
  const pkCol = cfg.pk;
  const adminEmail = session?.user?.email || '';

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    setRows([]);
    const res = await fetchPagedRows({ entity: activeEntity, page, pageSize });
    if (!res.ok) {
      setLoadError(res.error);
      setLoading(false);
      return;
    }
    setRows(res.rows);
    setTotal(res.total);
    setLoading(false);
  }, [activeEntity, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset selection when entity changes
  useEffect(() => {
    setSelectedIds(new Set());
    setPage(1);
  }, [activeEntity]);

  const toggleSelected = useCallback(
    (id) => {
      setSelectedIds((prev) => {
        if (prev.has(id)) {
          const next = new Set(prev);
          next.delete(id);
          return next;
        }
        if (prev.size >= SELECTION_CAP) {
          showToast({
            message: `Selection capped at ${SELECTION_CAP} rows. Deselect a row to add another.`,
            variant: 'error',
          });
          return prev;
        }
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    },
    [showToast],
  );

  // Compose columns with a leading checkbox column and (when delete_enabled)
  // a trailing delete-action column. The delete column is OMITTED entirely
  // for the 4 auth-linked entities — runtime gate matching the compile-time
  // gate on Create/Delete modal imports in the 4 auth-linked views per Q5.
  const baseColumns = useMemo(() => getColumns(activeEntity), [activeEntity]);
  const columnsWithSelect = useMemo(
    () => {
      const cols = [
        {
          key: '__select__',
          label: '',
          editable: false,
          width: '36px',
          render: (row) => {
            const id = row[pkCol];
            const checked = selectedIds.has(id);
            const atCap = !checked && selectedIds.size >= SELECTION_CAP;
            return (
              <input
                type="checkbox"
                data-testid={`row-select-${id}`}
                checked={checked}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleSelected(id);
                }}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Select row ${id}`}
                data-at-cap={atCap ? 'true' : 'false'}
              />
            );
          },
        },
        ...baseColumns,
      ];
      if (cfg.delete_enabled) {
        cols.push({
          key: '__delete__',
          label: '',
          editable: false,
          width: '64px',
          render: (row) => (
            <button
              type="button"
              data-testid={`row-delete-${row[pkCol]}`}
              onClick={(e) => {
                e.stopPropagation();
                setRowToDelete(row);
              }}
              style={{
                padding: '4px 10px',
                backgroundColor: '#FFFFFF',
                color: '#8B3A3A',
                border: '1px solid #8B3A3A',
                borderRadius: 3,
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
          ),
        });
      }
      return cols;
    },
    [baseColumns, selectedIds, pkCol, toggleSelected, cfg.delete_enabled],
  );

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedIds.has(r[pkCol])),
    [rows, selectedIds, pkCol],
  );

  const handleBulkSuccess = useCallback(
    ({ updated_count, audit_count }) => {
      setDrawerOpen(false);
      setSelectedIds(new Set());
      showToast({
        message: `Updated ${updated_count} ${updated_count === 1 ? 'row' : 'rows'} (${audit_count} audit ${audit_count === 1 ? 'entry' : 'entries'}).`,
        variant: 'success',
      });
      load();
    },
    [load, showToast],
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div data-testid="account-updates-shell" style={{ display: 'flex', flexDirection: 'column' }}>
      <AccountUpdatesToggleBar activeEntity={activeEntity} onChange={setActiveEntity} />

      <div style={{
        padding: '12px 24px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #F0F0F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '0.875rem', color: '#6B6B6B' }}>
          <span data-testid="selection-count">
            {selectedIds.size} of {SELECTION_CAP} selected
          </span>
          <span data-testid="row-count">{total} total rows</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {cfg.create_enabled && (
            <button
              type="button"
              data-testid="open-create-row"
              onClick={() => setCreateModalOpen(true)}
              style={{
                padding: '6px 14px',
                backgroundColor: '#FFFFFF',
                color: '#8B3A3A',
                border: '1px solid #8B3A3A',
                borderRadius: 4,
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + Create new
            </button>
          )}
          <button
            type="button"
            data-testid="open-bulk-edit"
            onClick={() => setDrawerOpen(true)}
            disabled={selectedIds.size === 0}
            style={{
              padding: '6px 14px',
              backgroundColor: selectedIds.size === 0 ? '#D0D0D0' : '#8B3A3A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 4,
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Bulk edit ({selectedIds.size})
          </button>
        </div>
      </div>

      {!loading && !loadError && rows.length === 0 ? (
        <EmptyState createEnabled={cfg.create_enabled} />
      ) : (
        <AdminTableEditor
          columns={columnsWithSelect}
          rows={rows}
          rowKey={pkCol}
          tableName={cfg.label}
          loading={loading}
          loadError={loadError}
          onRetry={load}
          isDesktop={isDesktop}
        />
      )}

      {totalPages > 1 && (
        <div style={{ padding: '8px 24px', display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.875rem' }}>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{ padding: '4px 10px' }}
          >
            Prev
          </button>
          <span data-testid="page-indicator">Page {page} of {totalPages}</span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            style={{ padding: '4px 10px' }}
          >
            Next
          </button>
        </div>
      )}

      {drawerOpen && selectedRows.length > 0 && (
        <BulkEditDrawer
          entity={activeEntity}
          selectedRows={selectedRows}
          onClose={() => setDrawerOpen(false)}
          onSuccess={handleBulkSuccess}
          adminEmail={adminEmail}
        />
      )}

      {cfg.create_enabled && createModalOpen && (
        <CreateRowModal
          entity={activeEntity}
          adminEmail={adminEmail}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={(newRow) => {
            setCreateModalOpen(false);
            showToast({ message: `Created new ${cfg.label.toLowerCase().replace(/s$/, '')}.`, variant: 'success' });
            // newRow could be merged into local state, but a refetch is simplest
            load();
            void newRow;
          }}
        />
      )}

      {cfg.delete_enabled && rowToDelete && (
        <DeleteConfirmModal
          entity={activeEntity}
          row={rowToDelete}
          adminEmail={adminEmail}
          onClose={() => setRowToDelete(null)}
          onSuccess={() => {
            setRowToDelete(null);
            showToast({ message: 'Row soft-deleted.', variant: 'success' });
            load();
          }}
        />
      )}
    </div>
  );
}
