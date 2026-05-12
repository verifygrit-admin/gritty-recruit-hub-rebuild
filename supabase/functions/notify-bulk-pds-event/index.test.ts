// notify-bulk-pds-event — Deno tests
// Run: deno test --allow-all supabase/functions/notify-bulk-pds-event/index.test.ts

Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
// Deliberately leave RESEND_API_KEY unset so the EMAIL_DISABLED path fires.

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { installSupabaseFetchMock, bearer } from "../_shared/testHelpers.ts";

const ADMIN_TOKEN = "admin-token";
const COACH_TOKEN = "coach-token";
const SERVICE_TOKEN = "test-service-role-key"; // matches SUPABASE_SERVICE_ROLE_KEY

// Belmont Hill head coach user_id from src/data/school-staff.js — used so the
// notify EF can resolve the coach via findStaffByUserId.
const BELMONT_COACH_UID = "4c1e43c4-3bf7-49ef-b5c9-17b7be94bfeb";

installSupabaseFetchMock({
  users: {
    [ADMIN_TOKEN]: {
      id: "admin-uid",
      email: "chris@grittyfb.com",
      app_metadata: { role: "admin" },
    },
    [COACH_TOKEN]: {
      id: BELMONT_COACH_UID,
      email: "roche@belmonthill.org",
      app_metadata: {},
    },
  },
  publicUserTypes: {
    [BELMONT_COACH_UID]: "hs_coach",
  },
  tables: {
    bulk_pds_submissions: [
      {
        id: "sub-1",
        coach_user_id: BELMONT_COACH_UID,
        student_user_id: "stu-1",
        student_name_snapshot: "Test Player",
        student_email_snapshot: "p@school.edu",
        height: "6-2",
        weight: 210,
      },
    ],
    profiles: [
      { user_id: "stu-1", name: "Test Player", email: "p@school.edu" },
    ],
  },
});

const { handler } = await import("./index.ts");

Deno.test("notify-bulk-pds-event — 401 without bearer", async () => {
  const req = new Request("http://x/functions/v1/notify-bulk-pds-event", {
    method: "POST",
    body: JSON.stringify({ event_type: "submission" }),
  });
  const res = await handler(req);
  assertEquals(res.status, 401);
});

Deno.test("notify-bulk-pds-event — 400 on invalid event_type", async () => {
  const req = new Request("http://x/functions/v1/notify-bulk-pds-event", {
    method: "POST",
    headers: { ...bearer(ADMIN_TOKEN), "Content-Type": "application/json" },
    body: JSON.stringify({ event_type: "garbage" }),
  });
  const res = await handler(req);
  assertEquals(res.status, 400);
});

Deno.test("notify-bulk-pds-event — 403 when admin tries to fire submission", async () => {
  const req = new Request("http://x/functions/v1/notify-bulk-pds-event", {
    method: "POST",
    headers: { ...bearer(ADMIN_TOKEN), "Content-Type": "application/json" },
    body: JSON.stringify({
      event_type: "submission",
      coach_user_id: BELMONT_COACH_UID,
      student_count: 1,
    }),
  });
  const res = await handler(req);
  assertEquals(res.status, 403);
});

Deno.test("notify-bulk-pds-event — 403 when coach tries to fire approval", async () => {
  const req = new Request("http://x/functions/v1/notify-bulk-pds-event", {
    method: "POST",
    headers: { ...bearer(COACH_TOKEN), "Content-Type": "application/json" },
    body: JSON.stringify({ event_type: "approval", submission_ids: ["sub-1"] }),
  });
  const res = await handler(req);
  assertEquals(res.status, 403);
});

Deno.test("notify-bulk-pds-event — 200 coach submission, EMAIL_DISABLED fallback", async () => {
  const req = new Request("http://x/functions/v1/notify-bulk-pds-event", {
    method: "POST",
    headers: { ...bearer(COACH_TOKEN), "Content-Type": "application/json" },
    body: JSON.stringify({
      event_type: "submission",
      batch_id: "11111111-1111-1111-1111-111111111111",
      coach_user_id: BELMONT_COACH_UID,
      submitted_at: "2026-05-12T18:00:00Z",
      student_count: 1,
    }),
  });
  const res = await handler(req);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.success, true);
  assertEquals(body.event_type, "submission");
  assert(body.emails_attempted >= 1, "should attempt at least 1 email");
  assertEquals(body.emails_disabled, true);
});

Deno.test("notify-bulk-pds-event — 200 service-role approval composes coach + student emails", async () => {
  const req = new Request("http://x/functions/v1/notify-bulk-pds-event", {
    method: "POST",
    headers: { ...bearer(SERVICE_TOKEN), "Content-Type": "application/json" },
    body: JSON.stringify({
      event_type: "approval",
      submission_ids: ["sub-1"],
      approved_by: "admin-uid",
      approved_at: "2026-05-12T19:00:00Z",
    }),
  });
  const res = await handler(req);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.success, true);
  // Coach email + student email = 2 attempted.
  assertEquals(body.emails_attempted, 2);
  assertEquals(body.emails_disabled, true);
});
