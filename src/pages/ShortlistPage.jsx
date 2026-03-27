/**
 * Shortlist Page — student's persistent curated school collection with recruiting journey tracking.
 * UX Spec: UX_SPEC_SHORTLIST.md
 *
 * Data flow:
 *   1. Load shortlist items from short_list_items (via user_id)
 *   2. Load file_uploads for all shortlisted schools
 *   3. Render cards with journey steps, documents, metrics
 *   4. Support filtering, sorting, step toggling, file upload/delete, remove from shortlist
 *
 * Identity: user_id is the sole key — NO SAID
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase } from '../lib/supabaseClient.js';
import { runGritFitScoring } from '../lib/scoring.js';
import { computeGritFitStatuses } from '../lib/gritFitStatus.js';
import ShortlistFilters from '../components/ShortlistFilters.jsx';
import ShortlistCard from '../components/ShortlistCard.jsx';
import PreReadLibrary from '../components/PreReadLibrary.jsx';

/**
 * Re-runs GRIT FIT scoring and patches shortlist rows with scored fields and status labels.
 */
async function backfillScoredFields(userId, profile, allSchools, currentItems) {
  const result = runGritFitScoring(profile, allSchools);

  const scoredByUnitid = {};
  for (const s of result.scored) {
    scoredByUnitid[s.unitid] = s;
  }

  let updated = 0;
  const errors = [];

  for (const item of currentItems) {
    const scored = scoredByUnitid[item.unitid];

    if (!scored) {
      // School not in schools table — mark as not_evaluated
      const { error } = await supabase
        .from('short_list_items')
        .update({
          grit_fit_status: 'not_evaluated',
          grit_fit_labels: ['not_evaluated'],
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id)
        .eq('user_id', userId);
      if (!error) updated++;
      else errors.push({ unitid: item.unitid, school_name: item.school_name, error });
      continue;
    }

    // Compute multi-label status
    const labels = computeGritFitStatuses(scored, result.topTier, result.recruitReach);
    const primaryStatus = labels[0];

    // Always write ALL scored fields — numeric fields are engine-derived and must
    // stay in sync with the current profile. No null-gate: stale values are overwritten.
    const patch = {
      grit_fit_status:  primaryStatus,
      grit_fit_labels:  labels,
      updated_at:       new Date().toISOString(),
      match_rank:       scored.matchRank  ?? null,
      match_tier:       scored.matchTier  ?? null,
      net_cost:         scored.netCost    ?? null,
      droi:             scored.droi       ?? null,
      break_even:       scored.breakEven  ?? null,
      adltv:            scored.adltv      ?? null,
      grad_rate:        scored.gradRate   ?? null,
      coa:              scored.coa_out_of_state ? parseFloat(scored.coa_out_of_state) : null,
      dist:             scored.dist       ?? null,
    };

    const { error } = await supabase
      .from('short_list_items')
      .update(patch)
      .eq('id', item.id)
      .eq('user_id', userId);

    if (error) {
      errors.push({ unitid: item.unitid, school_name: item.school_name, error });
    } else {
      updated++;
    }
  }

  return { updated, errors };
}
import {
  uploadToLibrary,
  deleteFromLibrary,
  shareDocToSchool,
  loadLibraryDocs,
  loadSharesForUser,
} from '../lib/preReadLibrary.js';

export default function ShortlistPage() {
  const { session } = useAuth();

  // Data state
  const [items, setItems] = useState([]);
  const [filesByUnitid, setFilesByUnitid] = useState({});
  const [libraryDocs, setLibraryDocs] = useState([]);
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state
  const [filters, setFilters] = useState({ status: '', division: '', conference: '' });
  const [sortBy, setSortBy] = useState('name_asc');
  const [toast, setToast] = useState(null);
  const [updatingStep, setUpdatingStep] = useState({}); // { [itemId]: stepId }
  const [uploadingDoc, setUploadingDoc] = useState({}); // { [unitid]: docType }
  const [uploadingLibrarySlot, setUploadingLibrarySlot] = useState(null);
  const [deletingLibrarySlot, setDeletingLibrarySlot] = useState(null);
  const [sharingSlot, setSharingSlot] = useState({});
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Data loading ──
  useEffect(() => {
    if (!session) return;
    loadData();
  }, [session]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const userId = session.user.id;

      // Parallel fetch: shortlist items + file uploads + library docs + shares
      const [itemsRes, filesRes, libraryRes, sharesRes] = await Promise.all([
        supabase
          .from('short_list_items')
          .select('*')
          .eq('user_id', userId)
          .order('added_at', { ascending: false }),
        supabase
          .from('file_uploads')
          .select('*')
          .eq('user_id', userId),
        loadLibraryDocs(userId),
        loadSharesForUser(userId),
      ]);

      if (itemsRes.error) {
        setError('Failed to load your shortlist. Please try again.');
        setLoading(false);
        return;
      }

      setItems(itemsRes.data || []);

      // Group files by unitid
      const grouped = {};
      for (const f of (filesRes.data || [])) {
        if (!grouped[f.unitid]) grouped[f.unitid] = [];
        grouped[f.unitid].push(f);
      }
      setFilesByUnitid(grouped);

      // Library docs and shares
      if (!libraryRes.error) setLibraryDocs(libraryRes.data);
      if (!sharesRes.error) setShares(sharesRes.data);

      // Auto-refresh: if profile was updated after the most recent shortlist scoring,
      // re-run scoring in the background to keep labels and metrics current.
      const loadedItems = itemsRes.data || [];
      if (loadedItems.length > 0) {
        try {
          const profileRes = await supabase.from('profiles').select('updated_at').eq('user_id', userId).single();
          if (profileRes.data?.updated_at) {
            const profileTime = new Date(profileRes.data.updated_at).getTime();
            const latestItemTime = Math.max(...loadedItems.map(i => new Date(i.updated_at).getTime()));
            if (profileTime > latestItemTime) {
              // Profile is newer — auto-backfill in background
              const [pRes, sRes] = await Promise.all([
                supabase.from('profiles').select('*').eq('user_id', userId).single(),
                supabase.from('schools').select('*'),
              ]);
              if (pRes.data && sRes.data && pRes.data.position && pRes.data.gpa) {
                const { updated } = await backfillScoredFields(userId, pRes.data, sRes.data, loadedItems);
                if (updated > 0) {
                  const { data: freshItems } = await supabase
                    .from('short_list_items')
                    .select('*')
                    .eq('user_id', userId)
                    .order('added_at', { ascending: false });
                  if (freshItems) setItems(freshItems);
                  setToast({ msg: `Scores updated for ${updated} school${updated !== 1 ? 's' : ''} based on your latest profile`, type: 'success' });
                  setTimeout(() => setToast(null), 4000);
                }
              }
            }
          }
        } catch (autoErr) {
          console.error('Auto-refresh error (non-blocking):', autoErr);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('ShortlistPage loadData error:', err);
    }

    setLoading(false);
  };

  // ── Toast ──
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Toggle journey step ──
  const handleToggleStep = useCallback(async (itemId, stepId, completed) => {
    setUpdatingStep(prev => ({ ...prev, [itemId]: stepId }));

    // Find current item
    const item = items.find(i => i.id === itemId);
    if (!item) {
      setUpdatingStep(prev => ({ ...prev, [itemId]: null }));
      return;
    }

    // Clone and update the step
    const updatedSteps = item.recruiting_journey_steps.map(s => {
      if (s.step_id === stepId) {
        return {
          ...s,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        };
      }
      return s;
    });

    const { error } = await supabase
      .from('short_list_items')
      .update({
        recruiting_journey_steps: updatedSteps,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .eq('user_id', session.user.id);

    if (error) {
      showToast('Failed to update step. Please try again.', 'error');
      console.error('Step toggle error:', error);
    } else {
      // Update local state
      setItems(prev => prev.map(i =>
        i.id === itemId ? { ...i, recruiting_journey_steps: updatedSteps } : i
      ));
    }

    setUpdatingStep(prev => ({ ...prev, [itemId]: null }));
  }, [items, session]);

  // ── Remove from shortlist ──
  const handleRemove = useCallback(async (itemId) => {
    if (confirmRemoveId !== itemId) {
      setConfirmRemoveId(itemId);
      return;
    }

    const item = items.find(i => i.id === itemId);
    const { error } = await supabase
      .from('short_list_items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', session.user.id);

    if (error) {
      showToast('Failed to remove school. Please try again.', 'error');
      console.error('Remove error:', error);
    } else {
      setItems(prev => prev.filter(i => i.id !== itemId));
      showToast(`Removed ${item?.school_name || 'school'} from your shortlist`, 'success');
    }

    setConfirmRemoveId(null);
  }, [items, session, confirmRemoveId]);

  // ── File upload ──
  const handleUploadFile = useCallback(async (unitid, documentType, file) => {
    setUploadingDoc(prev => ({ ...prev, [unitid]: documentType }));

    const userId = session.user.id;
    const storagePath = `${userId}/${unitid}/${Date.now()}_${file.name}`;

    try {
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('recruit-files')
        .upload(storagePath, file);

      if (uploadError) {
        showToast('Failed to upload file. Please try again.', 'error');
        console.error('Upload error:', uploadError);
        setUploadingDoc(prev => ({ ...prev, [unitid]: null }));
        return;
      }

      // Derive file_label from document_type
      const LABEL_MAP = {
        transcript: 'Transcript',
        senior_course_list: 'Senior Course List',
        writing_example: 'Writing Example',
        student_resume: 'Student Resume',
        school_profile_pdf: 'School Profile PDF',
        sat_act_scores: 'SAT/ACT Scores',
        financial_aid_info: 'Financial Aid Info',
      };

      // Insert metadata row
      const { data: fileRow, error: insertError } = await supabase
        .from('file_uploads')
        .insert({
          user_id: userId,
          unitid,
          file_name: file.name,
          file_label: LABEL_MAP[documentType] || documentType,
          storage_path: storagePath,
          document_type: documentType,
          file_type: file.type || null,
          file_size_bytes: file.size || null,
        })
        .select()
        .single();

      if (insertError) {
        showToast('File uploaded but metadata failed. Please try again.', 'error');
        console.error('File metadata insert error:', insertError);
      } else {
        // Update local state
        setFilesByUnitid(prev => ({
          ...prev,
          [unitid]: [...(prev[unitid] || []), fileRow],
        }));
        showToast(`${LABEL_MAP[documentType] || 'Document'} uploaded successfully`, 'success');
      }
    } catch (err) {
      showToast('Upload failed unexpectedly.', 'error');
      console.error('Upload exception:', err);
    }

    setUploadingDoc(prev => ({ ...prev, [unitid]: null }));
  }, [session]);

  // ── File delete ──
  const handleDeleteFile = useCallback(async (fileId, storagePath) => {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('recruit-files')
      .remove([storagePath]);

    if (storageError) {
      console.error('Storage delete error (non-blocking):', storageError);
    }

    // Delete metadata row
    const { error: dbError } = await supabase
      .from('file_uploads')
      .delete()
      .eq('id', fileId)
      .eq('user_id', session.user.id);

    if (dbError) {
      showToast('Failed to delete file record.', 'error');
      console.error('File delete error:', dbError);
      return;
    }

    // Update local state
    setFilesByUnitid(prev => {
      const updated = {};
      for (const [uid, fArr] of Object.entries(prev)) {
        updated[uid] = fArr.filter(f => f.id !== fileId);
      }
      return updated;
    });
    showToast('File deleted', 'success');
  }, [session]);

  // ── File download ──
  const handleDownloadFile = useCallback(async (storagePath, fileName) => {
    const { data, error } = await supabase.storage
      .from('recruit-files')
      .createSignedUrl(storagePath, 60);
    if (error || !data?.signedUrl) {
      showToast('Failed to generate download link.', 'error');
      console.error('Download URL error:', error);
      return;
    }
    window.open(data.signedUrl, '_blank');
  }, []);

  // ── Library upload ──
  const handleLibraryUpload = useCallback(async (documentType, slotNumber, file) => {
    const slotKey = `${documentType}_${slotNumber}`;
    setUploadingLibrarySlot(slotKey);

    const { data: row, error: err } = await uploadToLibrary(
      session.user.id, documentType, slotNumber, file
    );

    if (err) {
      showToast('Failed to upload to library. Please try again.', 'error');
      console.error('handleLibraryUpload error:', err);
    } else {
      setLibraryDocs(prev => {
        const filtered = prev.filter(
          d => !(d.document_type === documentType && d.slot_number === slotNumber)
        );
        return [...filtered, row];
      });
      showToast('Uploaded to library', 'success');
    }

    setUploadingLibrarySlot(null);
  }, [session]);

  // ── Library delete ──
  const handleLibraryDelete = useCallback(async (libraryDocId, storagePath) => {
    const doc = libraryDocs.find(d => d.id === libraryDocId);
    const slotKey = doc ? `${doc.document_type}_${doc.slot_number}` : null;
    if (slotKey) setDeletingLibrarySlot(slotKey);

    const { error: err } = await deleteFromLibrary(session.user.id, libraryDocId, storagePath);

    if (err) {
      showToast('Failed to delete library document.', 'error');
      console.error('handleLibraryDelete error:', err);
    } else {
      setLibraryDocs(prev => prev.filter(d => d.id !== libraryDocId));
      setShares(prev => prev.filter(s => s.library_doc_id !== libraryDocId));
      showToast('Document deleted from library', 'success');
    }

    setDeletingLibrarySlot(null);
  }, [libraryDocs, session]);

  // ── Share doc to school ──
  const handleShareDoc = useCallback(async (libraryDocId, unitid, documentType, slotNumber) => {
    const slotKey = `${documentType}_${slotNumber}`;
    setSharingSlot(prev => ({ ...prev, [slotKey]: true }));

    const { data: shareRow, error: err } = await shareDocToSchool(
      session.user.id, libraryDocId, unitid
    );

    if (err) {
      showToast('Failed to share document. Please try again.', 'error');
      console.error('handleShareDoc error:', err);
    } else if (shareRow) {
      setShares(prev => {
        const exists = prev.some(s => s.library_doc_id === libraryDocId && s.unitid === unitid);
        return exists ? prev : [...prev, shareRow];
      });
      showToast('Document shared', 'success');
    }

    setSharingSlot(prev => ({ ...prev, [slotKey]: false }));
  }, [session]);

  // ── Refresh GRIT FIT status ──
  const handleRefreshStatus = useCallback(async () => {
    if (refreshing || items.length === 0) return;
    setRefreshing(true);

    try {
      const userId = session.user.id;

      const [profileRes, schoolsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).single(),
        supabase.from('schools').select('*'),
      ]);

      if (profileRes.error || !profileRes.data) {
        showToast('Could not load profile for status refresh.', 'error');
        setRefreshing(false);
        return;
      }

      if (schoolsRes.error || !schoolsRes.data) {
        showToast('Could not load school data for refresh.', 'error');
        setRefreshing(false);
        return;
      }

      const profile = profileRes.data;
      const allSchools = schoolsRes.data;

      if (!profile.position || !profile.gpa) {
        showToast('Complete your profile (position and GPA required) before refreshing.', 'error');
        setRefreshing(false);
        return;
      }

      const { updated, errors } = await backfillScoredFields(userId, profile, allSchools, items);

      if (errors.length > 0) {
        console.error('backfillScoredFields partial errors:', errors);
      }

      // Reload shortlist from DB to pick up patched values
      const { data: freshItems, error: fetchError } = await supabase
        .from('short_list_items')
        .select('*')
        .eq('user_id', userId)
        .order('added_at', { ascending: false });

      if (!fetchError && freshItems) {
        setItems(freshItems);
      }

      if (updated > 0) {
        showToast(`Updated GRIT FIT scores for ${updated} school${updated !== 1 ? 's' : ''}`, 'success');
      } else {
        showToast('All schools are already up to date', 'success');
      }
    } catch (err) {
      showToast('Refresh failed. Please try again.', 'error');
      console.error('handleRefreshStatus error:', err);
    }

    setRefreshing(false);
  }, [session, items, refreshing]);

  // ── Filtering ──
  const filteredItems = useMemo(() => {
    let arr = [...items];

    if (filters.status) {
      arr = arr.filter(i =>
        i.grit_fit_status === filters.status ||
        (Array.isArray(i.grit_fit_labels) && i.grit_fit_labels.includes(filters.status))
      );
    }
    if (filters.division) {
      arr = arr.filter(i => i.div === filters.division);
    }
    if (filters.conference) {
      arr = arr.filter(i => i.conference === filters.conference);
    }

    return arr;
  }, [items, filters]);

  // ── Sorting ──
  const sortedItems = useMemo(() => {
    const arr = [...filteredItems];

    switch (sortBy) {
      case 'name_asc':
        arr.sort((a, b) => (a.school_name || '').localeCompare(b.school_name || ''));
        break;
      case 'name_desc':
        arr.sort((a, b) => (b.school_name || '').localeCompare(a.school_name || ''));
        break;
      case 'added_newest':
        arr.sort((a, b) => new Date(b.added_at) - new Date(a.added_at));
        break;
      case 'added_oldest':
        arr.sort((a, b) => new Date(a.added_at) - new Date(b.added_at));
        break;
      case 'dist_asc':
        arr.sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity));
        break;
      case 'dist_desc':
        arr.sort((a, b) => (b.dist ?? -Infinity) - (a.dist ?? -Infinity));
        break;
      case 'droi_desc':
        arr.sort((a, b) => (b.droi ?? -Infinity) - (a.droi ?? -Infinity));
        break;
      case 'net_cost_asc':
        arr.sort((a, b) => (a.net_cost ?? Infinity) - (b.net_cost ?? Infinity));
        break;
      case 'payback_asc':
        arr.sort((a, b) => (a.break_even ?? Infinity) - (b.break_even ?? Infinity));
        break;
      default:
        break;
    }

    return arr;
  }, [filteredItems, sortBy]);

  // ── Loading state ──
  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#6B6B6B' }}>
        Loading your shortlist...
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ color: '#8B3A3A', fontSize: '1.125rem', marginBottom: 16 }}>{error}</p>
        <button
          onClick={loadData}
          style={{
            padding: '12px 24px', backgroundColor: '#8B3A3A', color: '#FFFFFF',
            border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Empty state ──
  if (items.length === 0) {
    return (
      <div data-testid="shortlist-empty" style={{ padding: 48, textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#8B3A3A', margin: '0 0 8px' }}>
          Your Shortlist (0 schools)
        </h2>
        <h3 style={{ fontSize: '1.25rem', color: '#2C2C2C', margin: '24px 0 8px' }}>
          You haven't added any schools yet.
        </h3>
        <p style={{ fontSize: '1rem', color: '#6B6B6B', margin: '0 0 24px' }}>
          Get started by viewing your personalized GRIT FIT matches or exploring the full map.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          <a
            href="/gritfit"
            data-testid="cta-gritfit"
            style={{
              display: 'inline-block', padding: '12px 24px',
              border: '2px solid #8B3A3A', borderRadius: 4,
              color: '#8B3A3A', textDecoration: 'none', fontWeight: 600,
            }}
          >
            View GRIT FIT Matches
          </a>
        </div>
      </div>
    );
  }

  // ── Main render ──
  return (
    <div data-testid="shortlist-page">
      {/* Toast */}
      {toast && (
        <div
          role="alert"
          style={{
            position: 'fixed', top: 16, right: 16, zIndex: 9999,
            padding: '12px 24px', borderRadius: 4, fontSize: '0.875rem',
            color: '#FFFFFF', boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            backgroundColor: toast.type === 'success' ? '#4CAF50' : '#F44336',
            transition: 'opacity 300ms',
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: 12, marginBottom: 8,
      }}>
        <div>
          <h2
            data-testid="shortlist-page-title"
            style={{ fontSize: '2rem', fontWeight: 700, color: '#8B3A3A', margin: '0 0 4px' }}
          >
            Your Shortlist
          </h2>
          <p
            data-testid="shortlist-count"
            style={{ fontSize: '1.125rem', color: '#6B6B6B', margin: 0 }}
          >
            {filteredItems.length === items.length
              ? `${items.length} school${items.length !== 1 ? 's' : ''}`
              : `${filteredItems.length} of ${items.length} schools`}
          </p>
        </div>

        <button
          data-testid="refresh-status-btn"
          onClick={handleRefreshStatus}
          disabled={refreshing}
          style={{
            padding: '8px 16px',
            border: '2px solid #8B3A3A',
            borderRadius: 4,
            backgroundColor: 'transparent',
            color: '#8B3A3A',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: refreshing ? 'default' : 'pointer',
            opacity: refreshing ? 0.5 : 1,
          }}
        >
          {refreshing ? 'Refreshing...' : '\u27F2 Refresh Status'}
        </button>
      </div>

      {/* Pre-Read Docs Library */}
      <PreReadLibrary
        userId={session.user.id}
        libraryDocs={libraryDocs}
        onUpload={handleLibraryUpload}
        onDelete={handleLibraryDelete}
        uploadingSlot={uploadingLibrarySlot}
        deletingSlot={deletingLibrarySlot}
      />

      {/* Filter Bar */}
      <ShortlistFilters
        items={items}
        filters={filters}
        sortBy={sortBy}
        onFilterChange={setFilters}
        onSortChange={setSortBy}
        filteredCount={filteredItems.length}
        totalCount={items.length}
      />

      {/* Confirm Remove Modal (inline) */}
      {confirmRemoveId && (
        <div
          data-testid="remove-confirmation"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmRemoveId(null); }}
        >
          <div style={{
            backgroundColor: '#FFFFFF', borderRadius: 8, padding: 32,
            maxWidth: 420, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ margin: '0 0 8px', color: '#2C2C2C', fontSize: '1.125rem' }}>
              Remove from Shortlist?
            </h3>
            <p style={{ color: '#6B6B6B', fontSize: '0.875rem', margin: '0 0 24px' }}>
              Remove <strong>{items.find(i => i.id === confirmRemoveId)?.school_name}</strong> from your shortlist? This cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                data-testid="remove-cancel"
                onClick={() => setConfirmRemoveId(null)}
                style={{
                  padding: '8px 20px', border: '1px solid #D4D4D4', borderRadius: 4,
                  backgroundColor: '#FFFFFF', color: '#2C2C2C', cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                Cancel
              </button>
              <button
                data-testid="remove-confirm"
                onClick={() => handleRemove(confirmRemoveId)}
                style={{
                  padding: '8px 20px', border: 'none', borderRadius: 4,
                  backgroundColor: '#F44336', color: '#FFFFFF', cursor: 'pointer',
                  fontSize: '0.875rem', fontWeight: 600,
                }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cards */}
      <div data-testid="shortlist-cards">
        {sortedItems.map(item => (
          <ShortlistCard
            key={item.id}
            item={item}
            files={filesByUnitid[item.unitid] || []}
            userId={session.user.id}
            onToggleStep={handleToggleStep}
            onRemove={(itemId) => setConfirmRemoveId(itemId)}
            onUploadFile={handleUploadFile}
            onDeleteFile={handleDeleteFile}
            onDownloadFile={handleDownloadFile}
            updatingStep={updatingStep[item.id] || null}
            uploadingDoc={uploadingDoc[item.unitid] || null}
            libraryDocs={libraryDocs}
            shares={shares}
            sharingSlot={sharingSlot}
            onShareDoc={handleShareDoc}
          />
        ))}
      </div>

      {/* No results after filtering */}
      {sortedItems.length === 0 && items.length > 0 && (
        <div style={{ textAlign: 'center', padding: 32, color: '#6B6B6B' }}>
          <p>No schools match your filters.</p>
          <button
            data-testid="clear-filters-inline"
            onClick={() => setFilters({ status: '', division: '', conference: '' })}
            style={{
              background: 'none', border: 'none', color: '#8B3A3A',
              textDecoration: 'underline', cursor: 'pointer', fontSize: '1rem',
            }}
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
