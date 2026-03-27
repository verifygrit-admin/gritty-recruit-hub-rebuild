/**
 * Pure button state logic for Pre-Read Documents share buttons.
 * No React dependency — used by DocumentsSection.
 *
 * States:
 *   A — No library doc for this slot (disabled, tooltip)
 *   B — Library doc exists, not shared to this school (enabled "Share X")
 *   C — Already shared to this school (maroon bg, gold text, "X Shared")
 *   D — Share in progress (disabled, "Sharing...")
 */

/**
 * @param {string} documentType
 * @param {number} slotNumber
 * @param {object[]} libraryDocs - all document_library rows for this user
 * @param {object[]} shares - all document_shares rows for this user
 * @param {number} unitid - school being evaluated
 * @param {object} sharingSlots - { [slotKey]: true } for in-flight shares
 * @returns {'A'|'B'|'C'|'D'}
 */
export function getButtonState(documentType, slotNumber, libraryDocs, shares, unitid, sharingSlots) {
  const slotKey = `${documentType}_${slotNumber}`;

  if (sharingSlots && sharingSlots[slotKey]) return 'D';

  const libraryDoc = libraryDocs.find(
    d => d.document_type === documentType && d.slot_number === slotNumber
  );
  if (!libraryDoc) return 'A';

  const alreadyShared = shares.some(
    s => s.library_doc_id === libraryDoc.id && s.unitid === unitid
  );
  if (alreadyShared) return 'C';

  return 'B';
}

/**
 * Get the library doc ID for a given slot.
 * @param {string} documentType
 * @param {number} slotNumber
 * @param {object[]} libraryDocs
 * @returns {string|null}
 */
export function getLibraryDocId(documentType, slotNumber, libraryDocs) {
  const doc = libraryDocs.find(
    d => d.document_type === documentType && d.slot_number === slotNumber
  );
  return doc ? doc.id : null;
}
