// admin-reject-bulk-pds — Deno tests
// Run: deno test --allow-all supabase/functions/admin-reject-bulk-pds/index.test.ts

Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { installSupabaseFetchMock, bearer } from "../_shared/testHelpers.ts";

const ADMIN_TOKEN = "admin-token";
const COACH_TOKEN = "coach-token";
const BATCH_A = "44444444-4444-4444-4444-444444444444";
const SUB_A = "55555555-5555-5555-5555-555555555555";

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
        student_user_id: "stu-1",
        approval_status: "pending",
      },
    ],
  },
});

const { handler } = await import("./index.ts");

Deno.test("admin-reject-bulk-pds — 401 without bearer", async () => {
  const req = new Request("http://x/functions/v1/admin-reject-bulk-pds", {
    method: "POST",
    body: JSON.stringify({ batch_id: BATCH_A, rejection_reason: "x" }),
  });
  const res = await handler(req);
  assertEquals(res.status, 401);
});

Deno.test("admin-reject-bulk-pds — 403 when not admin", async () => {
  const req = new Request("http://x/functions/v1/admin-reject-bulk-pds", {
    method: "POST",
    headers: { ...bearer(COACH_TOKEN), "Content-Type": "application/json" },
    body: JSON.stringify({ batch_id: BATCH_A, rejection_reason: "x" }),
  });
  const res = await handler(req);
  assertEquals(res.status, 403);
});

Deno.test("admin-reject-bulk-pds — 400 when rejection_reason missing", async () => {
  const req = new Request("http://x/functions/v1/admin-reject-bulk-pds", {
    method: "POST",
    headers: { ...bearer(ADMIN_TOKEN), "Content-Type": "application/json" },
    body: JSON.stringify({ batch_id: BATCH_A }),
  });
  const res = await handler(req);
  assertEquals(res.status, 400);
});

Deno.test("admin-reject-bulk-pds — 200 happy path rejects + audits + notifies", async () => {
  const req = new Request("http://x/functions/v1/admin-reject-bulk-pds", {
    method: "POST",
    headers: { ...bearer(ADMIN_TOKEN), "Content-Type": "application/json" },
    body: JSON.stringify({
      batch_id: BATCH_A,
      rejection_reason: "Measurables look swapped between players.",
    }),
  });
  const res = await handler(req);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.success, true);
  assertEquals(body.rejected, 1);

  const stagingUpdate = state.updates.find((u) => u.table === "bulk_pds_submissions");
  assert(stagingUpdate !== undefined, "staging update fired");
  assertEquals((stagingUpdate!.patch as Record<string, unknown>).approval_status, "rejected");

  const auditInsert = state.inserts.find((i) => i.table === "admin_audit_log");
  assert(auditInsert !== undefined, "audit insert fired");
  assertEquals((auditInsert!.row as Record<string, unknown>).action, "bulk_pds_reject");

  assertEquals(state.notifyCalls.length, 1);
  assertEquals(state.notifyCalls[0].event_type, "rejection");
});
