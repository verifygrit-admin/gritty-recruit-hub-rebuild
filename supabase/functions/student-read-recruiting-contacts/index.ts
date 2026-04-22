// student-read-recruiting-contacts Edge Function
// Sprint 004 — Deliverable S3 (Track C) — Shortlist slide-out contacts lookup
//
// Returns the student's resolved HS head coach + HS guidance counselor email
// addresses, derived from the Sprint 001 link tables:
//   - hs_coach_students        (student_user_id -> coach_user_id)
//   - hs_counselor_students    (student_user_id -> counselor_user_id)
// Emails live on the coach's / counselor's own profiles row
// (profiles.user_id -> profiles.email). Fallback to auth.users.email via
// auth.admin.getUserById when the profile row is missing.
//
// Auth contract:
//   - Bearer JWT required.
//   - getUser(accessToken) — stateless, NOT getSession (DEC 016-C WT-B).
//   - Allowed roles: 'student_athlete' (own id only) or 'admin' (any id).
//
// Why an EF instead of direct client RLS read:
//   The coach/counselor email is sensitive cross-user data. Exposing
//   profiles.email under a broad RLS policy would leak emails to any student
//   who could name a user_id. Scoping through this EF keeps the read path
//   narrow: student → own link rows → linked user's email, and nothing else.
//
// Response shape:
//   200 { success: true, contacts: {
//       hs_head_coach_email: string | null,
//       hs_guidance_counselor_email: string | null
//   }}
//   401/403/405/500 { success: false, error: string }
//
// NO DEPLOY in Sprint 004 Wave 0. Scaffold scope only.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHandler } from "./handler.js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const handler = createHandler({
  createClient,
  supabaseUrl: SUPABASE_URL,
  serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
});

Deno.serve(handler);
