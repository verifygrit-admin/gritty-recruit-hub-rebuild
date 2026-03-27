/**
 * DocumentsSection — collapsible pre-read documents per school card.
 * Buttons show share state (A/B/C/D) based on library and share records.
 *
 * Props:
 *   files: array of file_uploads rows for this school (user_id + unitid)
 *   unitid: number — the school's UNITID
 *   userId: string — authenticated user_id
 *   onUpload: (unitid, documentType, file) => Promise<void> — school-specific upload (legacy)
 *   onDelete: (fileId, storagePath) => Promise<void>
 *   onDownload: (storagePath, fileName) => Promise<void>
 *   uploading: string|null — document_type currently uploading (school-specific)
 *   libraryDocs: document_library rows for this user
 *   shares: document_shares rows for this user
 *   sharingSlot: { [slotKey]: boolean } — in-flight share state
 *   onShareDoc: (libraryDocId, unitid, documentType, slotNumber) => Promise<void>
 */
import { useState, useRef } from 'react';
import { DOCUMENT_TYPES } from '../lib/documentTypes.js';
import { getButtonState, getLibraryDocId } from '../lib/buttonStateLogic.js';
import SlotTooltip from './SlotTooltip.jsx';

const shareBtnBase = {
  padding: '8px 16px',
  border: '2px solid #8B3A3A',
  borderRadius: 4,
  backgroundColor: 'transparent',
  color: '#8B3A3A',
  fontSize: '0.8125rem',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'background-color 150ms',
  textAlign: 'center',
  width: '100%',
};

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function DocumentsSection({
  files,
  unitid,
  userId,
  onUpload,
  onDelete,
  onDownload,
  uploading,
  libraryDocs = [],
  shares = [],
  sharingSlot = {},
  onShareDoc,
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const uploadedCount = (files || []).length;
  const sharedCount = shares.filter(s => s.unitid === unitid).length;

  const handleDeleteConfirm = async (fileId, storagePath) => {
    await onDelete(fileId, storagePath);
    setConfirmDeleteId(null);
  };

  const handleDownloadClick = async (f) => {
    if (!onDownload) return;
    setDownloadingId(f.id);
    try { await onDownload(f.storage_path, f.file_name); }
    finally { setDownloadingId(null); }
  };

  const handleShareClick = async (documentType, slotNumber) => {
    const libraryDocId = getLibraryDocId(documentType, slotNumber, libraryDocs);
    if (!libraryDocId || !onShareDoc) return;
    await onShareDoc(libraryDocId, unitid, documentType, slotNumber);
  };

  return (
    <div data-testid="documents-section">
      {/* Collapsed header */}
      <button
        data-testid="documents-toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px 0',
          width: '100%',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '0.875rem', color: '#6B6B6B', width: 16 }}>
          {expanded ? '\u25B8' : '\u25BE'}
        </span>
        <span style={{ fontSize: '1rem', fontWeight: 600, color: '#2C2C2C' }}>
          Pre-Read Documents
        </span>
        <span style={{ fontSize: '0.875rem', color: '#6B6B6B' }}>
          ({sharedCount} shared{uploadedCount > 0 ? `, ${uploadedCount} uploaded` : ''})
        </span>
      </button>

      {expanded && (
        <div style={{ paddingLeft: 24, marginTop: 8 }}>
          {/* Existing uploaded files list */}
          {(files || []).length > 0 && (
            <div data-testid="uploaded-files-list" style={{ marginBottom: 16 }}>
              {files.map(f => (
                <div
                  key={f.id}
                  data-testid={`file-row-${f.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 0',
                    borderBottom: '1px solid #F0F0F0',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#8B3A3A' }}>
                    {f.file_label || f.document_type}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#6B6B6B' }}>
                    Submitted {new Date(f.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  {f.file_size_bytes && (
                    <span style={{ fontSize: '0.75rem', color: '#6B6B6B' }}>
                      {formatFileSize(f.file_size_bytes)}
                    </span>
                  )}

                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button
                      data-testid={`download-file-${f.id}`}
                      onClick={() => handleDownloadClick(f)}
                      disabled={downloadingId === f.id}
                      style={{
                        background: 'none', border: 'none', color: '#1976D2',
                        fontSize: '0.75rem', fontWeight: 600,
                        cursor: downloadingId === f.id ? 'default' : 'pointer',
                        textDecoration: 'underline',
                        opacity: downloadingId === f.id ? 0.5 : 1,
                      }}
                    >
                      {downloadingId === f.id ? 'Opening...' : 'Download'}
                    </button>
                    {confirmDeleteId === f.id ? (
                      <>
                        <span style={{ fontSize: '0.75rem', color: '#F44336' }}>Remove?</span>
                        <button
                          data-testid={`confirm-delete-${f.id}`}
                          onClick={() => handleDeleteConfirm(f.id, f.storage_path)}
                          style={{
                            background: 'none', border: 'none', color: '#F44336',
                            fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          style={{
                            background: 'none', border: 'none', color: '#6B6B6B',
                            fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline',
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        data-testid={`delete-file-${f.id}`}
                        onClick={() => setConfirmDeleteId(f.id)}
                        style={{
                          background: 'none', border: 'none', color: '#F44336',
                          fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline',
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Share buttons grid — state A/B/C/D per slot */}
          <div
            data-testid="share-buttons-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 8,
              marginBottom: 8,
            }}
          >
            {DOCUMENT_TYPES.map(dt => {
              const slotKey = `${dt.type}_${dt.slot_number}`;
              const state = getButtonState(
                dt.type, dt.slot_number, libraryDocs, shares, unitid, sharingSlot
              );

              // State A: no library doc — disabled with tooltip
              if (state === 'A') {
                return (
                  <SlotTooltip
                    key={slotKey}
                    message={`Oops! Looks like you are fresh out. Please upload your ${dt.libraryLabel} to the Pre-Read Docs Library at the top of this page first.`}
                  >
                    <button
                      data-testid={`share-btn-${slotKey}`}
                      disabled
                      aria-label={`${dt.shareLabel} — not yet in library`}
                      style={{
                        ...shareBtnBase,
                        opacity: 0.4,
                        cursor: 'not-allowed',
                        borderColor: '#9E9E9E',
                        color: '#9E9E9E',
                      }}
                    >
                      {dt.shareLabel}
                    </button>
                  </SlotTooltip>
                );
              }

              // State B: library doc exists, not shared — enabled
              if (state === 'B') {
                return (
                  <button
                    key={slotKey}
                    data-testid={`share-btn-${slotKey}`}
                    aria-label={dt.shareLabel}
                    onClick={() => handleShareClick(dt.type, dt.slot_number)}
                    style={shareBtnBase}
                  >
                    {dt.shareLabel}
                  </button>
                );
              }

              // State C: already shared — maroon bg, gold text
              if (state === 'C') {
                return (
                  <button
                    key={slotKey}
                    data-testid={`share-btn-${slotKey}`}
                    disabled
                    aria-label={`${dt.sharedLabel}`}
                    style={{
                      ...shareBtnBase,
                      backgroundColor: '#8B3A3A',
                      borderColor: '#8B3A3A',
                      color: '#D4AF37',
                      cursor: 'default',
                      opacity: 1,
                      fontWeight: 600,
                    }}
                  >
                    {dt.sharedLabel}
                  </button>
                );
              }

              // State D: sharing in progress
              return (
                <button
                  key={slotKey}
                  data-testid={`share-btn-${slotKey}`}
                  disabled
                  style={{
                    ...shareBtnBase,
                    opacity: 0.5,
                    cursor: 'default',
                  }}
                >
                  Sharing...
                </button>
              );
            })}
          </div>

          <p style={{ fontSize: '0.6875rem', color: '#6B6B6B', margin: '4px 0 0', fontStyle: 'italic' }}>
            Note: Coach cannot see Financial Aid Info documents
          </p>
        </div>
      )}
    </div>
  );
}
