// admin-approve-bulk-pds — Deno tests
// Run: deno test --allow-all supabase/functions/admin-approve-bulk-pds/index.test.ts

Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { installSupabaseFetchMock, bearer } from "../_shared/testHelpers.ts";

// supabase-js's auth + realtime clients install module-level setInterval handles
// (token auto-refresh, socket heartbeat) that the fetch mock cannot dismantle.
// Disable Deno's per-test op/resource sanitizer so those leaks don't fail tests.
// Production runtime (Supabase hosted Deno) does not run the sanitizer.
function test(name: string, fn: () => Promise<void>): void {
  Deno.test({ name, fn, sanitizeOps: false, sanitizeResources: false });
}

const ADMIN_TOKEN = "admin-token";
const COACH_TOKEN = "coach-token";
const BATCH_A = "22222222-2222-2222-2222-222222222222";
const STUDENT_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const SUB_A = "33333333-3333-3333-3333-333333333333";

const state = installSupabaseFetchMock({
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
        id: SUB_A,
        batch_id: BATCH_A,
        coach_user_id: "coach-uid",
        student_user_id: STUDENT_A,
        height: "6-2",
        weight: 205,
        speed_40: 4.65,
        time_5_10_5: 4.5,
        time_l_drill: 7.1,
        bench_press: 245,
        squat: 335,
        clean: 240,
        approval_status: "pending",
      },
    ],
    profiles: [
      {
        user_id: STUDENT_A,
        height: "6-1",
        weight: 195,
        speed_40: 4.8,
        time_5_10_5: null,
        time_l_drill: null,
        bench_press: 200,
        squat: 300,
        clean: 215,
      },
    ],
  },
});

const { handler } = await import("./index.ts");

test("admin-approve-bulk-pds — 401 without bearer", async () => {
  const req = new Request("http://x/functions/v1/admin-approve-bulk-pds", {
    method: "POST",
    body: JSON.stringify({ batch_id: BATCH_A }),
  });
  const res = await handler(req);
  assertEquals(res.status, 401);
});

test("admin-approve-bulk-pds — 403 when not admin", async () => {
  const req = new Request("http://x/functions/v1/admin-approve-bulk-pds", {
    method: "POST",
    headers: { ...bearer(COACH_TOKEN), "Content-Type": "application/json" },
    body: JSON.stringify({ batch_id: BATCH_A }),
  });
  const res = await handler(req);
  assertEquals(res.status, 403);
});

test("admin-approve-bulk-pds — 400 when both batch_id and submission_id provided", async () => {
  const req = new Request("http://x/functions/v1/admin-approve-bulk-pds", {
    method: "POST",
    headers: { ...bearer(ADMIN_TOKEN), "Content-Type": "application/json" },
    body: JSON.stringify({ batch_id: BATCH_A, submission_id: SUB_A }),
  });
  const res = await handler(req);
  assertEquals(res.status, 400);
});

test("admin-approve-bulk-pds — 200 happy path approves and writes audit log", async () => {
  const req = new Request("http://x/functions/v1/admin-approve-bulk-pds", {
    method: "POST",
    headers: { ...bearer(ADMIN_TOKEN), "Content-Type": "application/json" },
    body: JSON.stringify({ batch_id: BATCH_A }),
  });
  const res = await handler(req);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.success, true);
  assertEquals(body.approved, 1);
  // Profiles update + staging update both fired.
  const profilesUpdate = state.updates.find((u) => u.table === "profiles");
  const stagingUpdate = state.updates.find((u) => u.table === "bulk_pds_submissions");
  assert(profilesUpdate !== undefined, "profiles update fired");
  assert(stagingUpdate !== undefined, "staging update fired");
  assertEquals((profilesUpdate!.patch as Record<string, unknown>).bench_press, 245);
  assertEquals((stagingUpdate!.patch as Record<string, unknown>).approval_status, "approved");
  // Audit log insert.
  const auditInsert = state.inserts.find((i) => i.table === "admin_audit_log");
  assert(auditInsert !== undefined, "audit insert fired");
  assertEquals((auditInsert!.row as Record<string, unknown>).action, "bulk_pds_approve");
  // Notify EF was invoked.
  assertEquals(state.notifyCalls.length, 1);
  assertEquals(state.notifyCalls[0].event_type, "approval");
});
