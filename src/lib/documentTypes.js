/**
 * Shared document type definitions for Pre-Read Docs Library.
 * 7 slots: 5 single-slot types + writing_example slots 1 and 2.
 * financial_aid_info excluded (D5 — separate secure page planned).
 */

export const DOCUMENT_TYPES = [
  {
    type: 'transcript',
    slot_number: 1,
    libraryLabel: 'Transcript',
    libraryButtonLabel: 'Upload Transcript',
    shareLabel: 'Share Transcript',
    sharedLabel: 'Transcript Shared',
  },
  {
    type: 'senior_course_list',
    slot_number: 1,
    libraryLabel: 'Course List',
    libraryButtonLabel: 'Upload Course List',
    shareLabel: 'Share Course List',
    sharedLabel: 'Course List Shared',
  },
  {
    type: 'writing_example',
    slot_number: 1,
    libraryLabel: 'Writing Sample #1',
    libraryButtonLabel: 'Upload Writing Sample #1',
    shareLabel: 'Share Writing Sample #1',
    sharedLabel: 'Writing Sample #1 Shared',
  },
  {
    type: 'writing_example',
    slot_number: 2,
    libraryLabel: 'Writing Sample #2',
    libraryButtonLabel: 'Upload Writing Sample #2',
    shareLabel: 'Share Writing Sample #2',
    sharedLabel: 'Writing Sample #2 Shared',
  },
  {
    type: 'student_resume',
    slot_number: 1,
    libraryLabel: 'Resume',
    libraryButtonLabel: 'Upload Resume',
    shareLabel: 'Share Resume',
    sharedLabel: 'Resume Shared',
  },
  {
    type: 'school_profile_pdf',
    slot_number: 1,
    libraryLabel: 'School Profile',
    libraryButtonLabel: 'Upload School Profile',
    shareLabel: 'Share School Profile',
    sharedLabel: 'School Profile Shared',
  },
  {
    type: 'sat_act_scores',
    slot_number: 1,
    libraryLabel: 'Test Scores',
    libraryButtonLabel: 'Upload Test Scores',
    shareLabel: 'Share Test Scores',
    sharedLabel: 'Test Scores Shared',
  },
];

/** Lookup helper — finds a slot entry by type + slot_number */
export function getDocSlot(documentType, slotNumber = 1) {
  return DOCUMENT_TYPES.find(
    d => d.type === documentType && d.slot_number === slotNumber
  ) || null;
}
