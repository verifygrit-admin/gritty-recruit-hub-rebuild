/**
 * DocumentsSection — collapsible file upload/management per school.
 * UX Spec: UX_SPEC_SHORTLIST.md — Documents Section
 *
 * Props:
 *   files: array of file_uploads rows for this school (user_id + unitid)
 *   unitid: number — the school's UNITID
 *   userId: string — authenticated user_id
 *   onUpload: (unitid, documentType, file) => Promise<void>
 *   onDelete: (fileId, storagePath) => Promise<void>
 *   uploading: string|null — document_type currently uploading
 */
import { useState, useRef } from 'react';

const DOCUMENT_TYPES = [
  { type: 'transcript', label: 'Transcript', buttonLabel: '+ Upload Transcript' },
  { type: 'senior_course_list', label: 'Course List', buttonLabel: '+ Upload Course List' },
  { type: 'writing_example', label: 'Writing Sample', buttonLabel: '+ Upload Writing Sample' },
  { type: 'student_resume', label: 'Resume', buttonLabel: '+ Upload Resume' },
  { type: 'school_profile_pdf', label: 'School Profile', buttonLabel: '+ Upload School Profile' },
  { type: 'sat_act_scores', label: 'Test Scores', buttonLabel: '+ Upload Test Scores' },
];

const uploadBtnStyle = {
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
};

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function DocumentsSection({ files, unitid, userId, onUpload, onDelete, uploading }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const fileInputRef = useRef(null);
  const [pendingType, setPendingType] = useState(null);

  const uploadedCount = (files || []).length;

  const handleUploadClick = (docType) => {
    setPendingType(docType);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !pendingType) return;
    await onUpload(unitid, pendingType, file);
    setPendingType(null);
  };

  const handleDeleteConfirm = async (fileId, storagePath) => {
    await onDelete(fileId, storagePath);
    setConfirmDeleteId(null);
  };

  return (
    <div data-testid="documents-section">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
        onChange={handleFileSelected}
      />

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
          Documents
        </span>
        <span style={{ fontSize: '0.875rem', color: '#6B6B6B' }}>
          ({uploadedCount} uploaded)
        </span>
      </button>

      {expanded && (
        <div style={{ paddingLeft: 24, marginTop: 8 }}>
          {/* Uploaded files list */}
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
                      <>
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
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload buttons grid */}
          <div
            data-testid="upload-buttons-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 8,
              marginBottom: 8,
            }}
          >
            {DOCUMENT_TYPES.map(dt => {
              const isUploading = uploading === dt.type;
              return (
                <button
                  key={dt.type}
                  data-testid={`upload-btn-${dt.type}`}
                  aria-label={`Upload ${dt.label}`}
                  disabled={isUploading}
                  onClick={() => handleUploadClick(dt.type)}
                  style={{
                    ...uploadBtnStyle,
                    opacity: isUploading ? 0.5 : 1,
                  }}
                >
                  {isUploading ? 'Uploading...' : dt.buttonLabel}
                </button>
              );
            })}
          </div>

          {/* Coach visibility note */}
          <p style={{ fontSize: '0.6875rem', color: '#6B6B6B', margin: '4px 0 0', fontStyle: 'italic' }}>
            Note: Coach cannot see Financial Aid Info documents
          </p>
        </div>
      )}
    </div>
  );
}
