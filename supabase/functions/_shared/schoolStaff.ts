// _shared/schoolStaff.ts
// Sprint 026 — Server-side mirror of src/data/school-staff.js so Edge Functions
// can resolve coach identity for Bulk PDS email notifications without a DB
// round-trip (coaches/counselors do NOT have public.profiles rows — see
// Sprint 017 D5 notes in src/data/school-staff.js).
//
// Keep this file in sync with src/data/school-staff.js. The shape mirrors
// SCHOOL_STAFF + findStaffByUserId from that module.

export interface StaffMember {
  user_id: string;
  name: string;
  email: string;
  title?: string;
}

export interface SchoolStaff {
  head_coach: StaffMember;
  counselors: StaffMember[];
}

export const SCHOOL_STAFF: Record<string, SchoolStaff> = {
  "bc-high": {
    head_coach: {
      user_id: "9177ba55-eb83-4bce-b4cd-01ce3078d4a3",
      name: "Paul Zukauskas",
      title: "Head Coach, Boston College High School",
      email: "pzukauskas@bchigh.edu",
    },
    counselors: [
      { user_id: "92dbdc93-18b6-4361-8925-2d0e1fbd68ad", name: "Devon Balfour",     email: "dbalfour@bchigh.edu" },
      { user_id: "b80f1b4c-c5c3-4285-a88a-0cc39e650e02", name: "Caitlin O'Connell", email: "coconnell@bchigh.edu" },
      { user_id: "e0c99343-e525-411a-b6a8-8691bdc31da7", name: "Kyle Swords",       email: "kswords@bchigh.edu" },
    ],
  },
  "belmont-hill": {
    head_coach: {
      user_id: "4c1e43c4-3bf7-49ef-b5c9-17b7be94bfeb",
      name: "Frank Roche",
      title: "Head Coach, Belmont Hill School",
      email: "roche@belmonthill.org",
    },
    counselors: [
      { user_id: "4a48c09f-5f5c-411b-9d00-8aa7213e4eef", name: "June Schmunk", email: "schmunk@belmonthill.org" },
    ],
  },
};

export function findStaffByUserId(userId: string | null | undefined): StaffMember | null {
  if (!userId) return null;
  for (const staff of Object.values(SCHOOL_STAFF)) {
    if (staff.head_coach?.user_id === userId) return staff.head_coach;
    const counselor = staff.counselors?.find((c) => c.user_id === userId);
    if (counselor) return counselor;
  }
  return null;
}
