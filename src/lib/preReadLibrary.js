/**
 * Pre-Read Docs Library API functions.
 * Tables: document_library, document_shares (David spec — 0017/0018 migrations)
 * Bucket: recruit-files (existing)
 * Path convention: {user_id}/library/{slot_number}/{timestamp}_{filename}
 */
import { supabase } from './supabaseClient.js';

/**
 * Upload a document to the student's library, replacing any existing doc in that slot.
 * @param {string} userId
 * @param {string} documentType
 * @param {number} slotNumber - 1 for all types; 1 or 2 for writing_example
 * @param {File} file
 * @returns {{ data: object|null, error: object|null }}
 */
export async function uploadToLibrary(userId, documentType, slotNumber, file) {
  // Check for existing slot
  const { data: existing, error: fetchError } = await supabase
    .from('document_library')
    .select('id, storage_path')
    .eq('user_id', userId)
    .eq('document_type', documentType)
    .eq('slot_number', slotNumber)
    .maybeSingle();

  if (fetchError) return { data: null, error: fetchError };

  // Evict existing slot if present
  if (existing) {
    const { error: storageDeleteError } = await supabase.storage
      .from('recruit-files')
      .remove([existing.storage_path]);
    if (storageDeleteError) {
      console.warn('uploadToLibrary: old storage delete failed (non-blocking)', storageDeleteError);
    }

    const { error: dbDeleteError } = await supabase
      .from('document_library')
      .delete()
      .eq('id', existing.id)
      .eq('user_id', userId);
    if (dbDeleteError) return { data: null, error: dbDeleteError };
  }

  // Upload new file
  const storagePath = `${userId}/library/${slotNumber}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from('recruit-files')
    .upload(storagePath, file);

  if (uploadError) return { data: null, error: uploadError };

  // Insert new row
  const { data: row, error: insertError } = await supabase
    .from('document_library')
    .insert({
      user_id: userId,
      document_type: documentType,
      slot_number: slotNumber,
      file_name: file.name,
      storage_path: storagePath,
      file_type: file.type || null,
      file_size_bytes: file.size || null,
    })
    .select()
    .single();

  if (insertError) return { data: null, error: insertError };
  return { data: row, error: null };
}

/**
 * Delete a library document and its storage object.
 * Cascade on document_shares FK handles share row cleanup automatically.
 * @param {string} userId
 * @param {string} libraryDocId
 * @param {string} storagePath
 * @returns {{ error: object|null }}
 */
export async function deleteFromLibrary(userId, libraryDocId, storagePath) {
  const { error: storageError } = await supabase.storage
    .from('recruit-files')
    .remove([storagePath]);
  if (storageError) {
    console.warn('deleteFromLibrary: storage delete failed (non-blocking)', storageError);
  }

  const { error: dbError } = await supabase
    .from('document_library')
    .delete()
    .eq('id', libraryDocId)
    .eq('user_id', userId);

  return { error: dbError || null };
}

/**
 * Share a library document to a specific school.
 * Idempotent — duplicate shares are silently ignored.
 * @param {string} userId
 * @param {string} libraryDocId
 * @param {number} unitid
 * @returns {{ data: object|null, error: object|null }}
 */
export async function shareDocToSchool(userId, libraryDocId, unitid) {
  const { data: row, error } = await supabase
    .from('document_shares')
    .upsert(
      {
        user_id: userId,
        library_doc_id: libraryDocId,
        unitid,
        shared_at: new Date().toISOString(),
      },
      {
        onConflict: 'library_doc_id,unitid',
        ignoreDuplicates: true,
      }
    )
    .select()
    .maybeSingle();

  if (error) return { data: null, error };
  return { data: row, error: null };
}

/**
 * Load all library docs for a user.
 * @param {string} userId
 * @returns {{ data: object[]|null, error: object|null }}
 */
export async function loadLibraryDocs(userId) {
  const { data, error } = await supabase
    .from('document_library')
    .select('*')
    .eq('user_id', userId)
    .order('document_type', { ascending: true })
    .order('slot_number', { ascending: true });

  if (error) return { data: null, error };
  return { data: data || [], error: null };
}

/**
 * Load all share records for a user.
 * @param {string} userId
 * @returns {{ data: object[]|null, error: object|null }}
 */
export async function loadSharesForUser(userId) {
  const { data, error } = await supabase
    .from('document_shares')
    .select('*')
    .eq('user_id', userId)
    .order('shared_at', { ascending: false });

  if (error) return { data: null, error };
  return { data: data || [], error: null };
}
