/**
 * PreReadLibrary — cream-background document library section above shortlist cards.
 * Students upload documents here once, then share to individual schools.
 *
 * Props:
 *   userId: string
 *   libraryDocs: document_library rows
 *   onUpload: (documentType, slotNumber, file) => Promise<void>
 *   onDelete: (libraryDocId, storagePath) => Promise<void>
 *   uploadingSlot: string|null — slotKey currently uploading
 *   deletingSlot: string|null — slotKey currently deleting
 */
import { useRef, useState } from 'react';
import { DOCUMENT_TYPES } from '../lib/documentTypes.js';
import CollapsibleTitleStrip from './CollapsibleTitleStrip.jsx';
import { PRE_READ_DOCS_EXPLAINER } from '../lib/copy/shortlistCopy.js';

export default function PreReadLibrary({
  userId,
  libraryDocs,
  onUpload,
  onDelete,
  uploadingSlot,
  deletingSlot,
}) {
  const fileInputRef = useRef(null);
  const [pendingSlot, setPendingSlot] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  // S1a — Sprint 004 Wave 3a: default expanded, local state, no persistence
  const [isLibraryCollapsed, setIsLibraryCollapsed] = useState(false);

  const handleUploadClick = (docType, slotNumber) => {
    setPendingSlot({ type: docType, slot_number: slotNumber });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !pendingSlot) return;
    await onUpload(pendingSlot.type, pendingSlot.slot_number, file);
    setPendingSlot(null);
  };

  const handleDeleteConfirm = async (libraryDocId, storagePath) => {
    await onDelete(libraryDocId, storagePath);
    setConfirmDeleteId(null);
  };

  return (
    <div
      data-testid="pre-read-library"
      style={{
        backgroundColor: '#FDFAF4',
        border: '1px solid #E8E0CC',
        borderRadius: 8,
        padding: 24,
        marginBottom: 24,
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
        onChange={handleFileSelected}
      />

      <CollapsibleTitleStrip
        title="Pre-Read Docs Library"
        isCollapsed={isLibraryCollapsed}
        onToggle={() => setIsLibraryCollapsed(v => !v)}
        ariaControls="pre-read-library-body"
      />

      {!isLibraryCollapsed && (
        <div id="pre-read-library-body" data-testid="pre-read-library-body" style={{ marginTop: 16 }}>
          <p
            data-testid="pre-read-library-explainer"
            style={{ fontSize: '0.8125rem', color: '#6B6B6B', margin: '0 0 16px' }}
          >
            {PRE_READ_DOCS_EXPLAINER}
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
        {DOCUMENT_TYPES.map(dt => {
          const slotKey = `${dt.type}_${dt.slot_number}`;
          const libraryDoc = libraryDocs.find(
            d => d.document_type === dt.type && d.slot_number === dt.slot_number
          );
          const isUploading = uploadingSlot === slotKey;
          const isDeleting = deletingSlot === slotKey;

          return (
            <div
              key={slotKey}
              data-testid={`library-slot-${slotKey}`}
              style={{
                border: '1px solid',
                borderColor: libraryDoc ? '#4CAF50' : '#D4D4D4',
                borderRadius: 6,
                padding: 12,
                backgroundColor: libraryDoc ? '#F1FBF1' : '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#2C2C2C' }}>
                {dt.libraryLabel}
              </span>

              {libraryDoc ? (
                <>
                  <span style={{ fontSize: '0.75rem', color: '#4CAF50', fontWeight: 500 }}>
                    Uploaded
                  </span>
                  <span
                    style={{ fontSize: '0.6875rem', color: '#6B6B6B' }}
                    title={libraryDoc.file_name}
                  >
                    {libraryDoc.file_name.length > 28
                      ? libraryDoc.file_name.slice(0, 25) + '...'
                      : libraryDoc.file_name}
                  </span>

                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button
                      data-testid={`library-replace-${slotKey}`}
                      disabled={isUploading || isDeleting}
                      onClick={() => handleUploadClick(dt.type, dt.slot_number)}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        border: '1px solid #8B3A3A',
                        borderRadius: 4,
                        backgroundColor: 'transparent',
                        color: '#8B3A3A',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        cursor: isUploading || isDeleting ? 'default' : 'pointer',
                        opacity: isUploading || isDeleting ? 0.5 : 1,
                      }}
                    >
                      {isUploading ? 'Uploading...' : 'Replace'}
                    </button>

                    {confirmDeleteId === libraryDoc.id ? (
                      <>
                        <button
                          data-testid={`library-delete-confirm-${slotKey}`}
                          disabled={isDeleting}
                          onClick={() => handleDeleteConfirm(libraryDoc.id, libraryDoc.storage_path)}
                          style={{
                            padding: '6px 10px',
                            border: 'none',
                            borderRadius: 4,
                            backgroundColor: '#F44336',
                            color: '#FFFFFF',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: isDeleting ? 'default' : 'pointer',
                            opacity: isDeleting ? 0.5 : 1,
                          }}
                        >
                          {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          style={{
                            padding: '6px 8px',
                            border: '1px solid #D4D4D4',
                            borderRadius: 4,
                            backgroundColor: '#FFFFFF',
                            color: '#6B6B6B',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        data-testid={`library-delete-${slotKey}`}
                        disabled={isUploading || isDeleting}
                        onClick={() => setConfirmDeleteId(libraryDoc.id)}
                        style={{
                          padding: '6px 10px',
                          border: '1px solid #F44336',
                          borderRadius: 4,
                          backgroundColor: 'transparent',
                          color: '#F44336',
                          fontSize: '0.75rem',
                          cursor: isUploading || isDeleting ? 'default' : 'pointer',
                          opacity: isUploading || isDeleting ? 0.5 : 1,
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <button
                  data-testid={`library-upload-${slotKey}`}
                  disabled={isUploading}
                  onClick={() => handleUploadClick(dt.type, dt.slot_number)}
                  style={{
                    padding: '6px 12px',
                    border: '2px dashed #8B3A3A',
                    borderRadius: 4,
                    backgroundColor: 'transparent',
                    color: '#8B3A3A',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    cursor: isUploading ? 'default' : 'pointer',
                    opacity: isUploading ? 0.5 : 1,
                    marginTop: 4,
                  }}
                >
                  {isUploading ? 'Uploading...' : `+ ${dt.libraryButtonLabel}`}
                </button>
              )}
            </div>
          );
        })}
          </div>
        </div>
      )}
    </div>
  );
}
