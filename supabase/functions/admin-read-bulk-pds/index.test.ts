// admin-read-bulk-pds — Deno tests
// Run: deno test --allow-all supabase/functions/admin-read-bulk-pds/index.test.ts

// Set env BEFORE importing the handler so the module-level reads succeed.
Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { installSupabaseFetchMock, bearer } from "../_shared/testHelpers.ts";

// Install fetch mock BEFORE importing handler — handler closure captures fetch
// at call time so timing here is fine, but install once for the whole file.
const ADMIN_TOKEN = "admin-token";
const COACH_TOKEN = "coach-token";

const BATCH_A = "11111111-1111-1111-1111-111111111111";
const STUDENT_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

installSupabaseFetchMock({
  users: {
    [ADMIN_TOKEN]: {
      id: "admin-uid",
      email: "chris@grittyfb.com",
      app_metadata: { role: "admin" },
    },
    [COACH_TOKEN]: {
      id: "coach-uid",
      email: "coach@bchigh.edu",
      app_metadata: {},
    },
  },
  tables: {
    bulk_pds_submissions: [
      {
        id: "sub-1",
        batch_id: BATCH_A,
        coach_user_id: "coach-uid",
        student_user_id: STUDENT_A,
        height: "6-2",
        weight: 200,
        speed_40: 4.7,
        time_5_10_5: 4.5,
        time_l_drill: 7.1,
        bench_press: 225,
        squat: 315,
        clean: 225,
        submitted_at: "2026-05-12T18:00:00Z",
        approval_status: "pending",
      },
    ],
    profiles: [
      { user_id: STUDENT_A, name: "Test Player", email: "p@bchigh.edu", height: "6-1" },
    ],
  },
});

const { handler } = await import("./index.ts");

Deno.test("admin-read-bulk-pds — 401 when no bearer token", async () => {
  const req = new Request("http://x/functions/v1/admin-read-bulk-pds", { method: "GET" });
  const res = await handler(req);
  assertEquals(res.status, 401);
});

Deno.test("admin-read-bulk-pds — 403 when caller is not admin", async () => {
  const req = new Request("http://x/functions/v1/admin-read-bulk-pds", {
    method: "GET",
    headers: bearer(COACH_TOKEN),
  });
  const res = await handler(req);
  assertEquals(res.status, 403);
});

Deno.test("admin-read-bulk-pds — 200 returns pending batch list", async () => {
  const req = new Request("http://x/functions/v1/admin-read-bulk-pds", {
    method: "GET",
    headers: bearer(ADMIN_TOKEN),
  });
  const res = await handler(req);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.success, true);
  assert(Array.isArray(body.batches));
  assertEquals(body.batches.length, 1);
  assertEquals(body.batches[0].batch_id, BATCH_A);
  assertEquals(body.batches[0].row_count, 1);
});

Deno.test("admin-read-bulk-pds — 200 returns batch detail with profile join", async () => {
  const req = new Request(
    `http://x/functions/v1/admin-read-bulk-pds?batch_id=${BATCH_A}`,
    { method: "GET", headers: bearer(ADMIN_TOKEN) },
  );
  const res = await handler(req);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.success, true);
  assertEquals(body.batch_id, BATCH_A);
  assertEquals(body.rows.length, 1);
  assertEquals(body.rows[0].submission.id, "sub-1");
  assert(body.rows[0].profile !== null, "profile should be joined");
});

Deno.test("admin-read-bulk-pds — 400 on malformed batch_id", async () => {
  const req = new Request(
    "http://x/functions/v1/admin-read-bulk-pds?batch_id=not-a-uuid",
    { method: "GET", headers: bearer(ADMIN_TOKEN) },
  );
  const res = await handler(req);
  assertEquals(res.status, 400);
});
