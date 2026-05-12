// _shared/testHelpers.ts
// Sprint 026 — Shared test scaffolding for the four Bulk PDS Edge Functions.
//
// Provides a Supabase-aware fetch stub that intercepts the HTTP calls the
// @supabase/supabase-js v2 client makes against the Supabase REST endpoint
// (auth + PostgREST), so handler tests can run hermetically without any
// network access or live DB.
//
// Pre-test environment guard: tests MUST set SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY BEFORE importing the handler module — the EF
// modules read these at module load time.

export interface FakeUser {
  id: string;
  email: string;
  app_metadata?: { role?: string };
}

export interface MockSpec {
  // Map of bearer-token → user. Anything else → 401.
  users?: Record<string, FakeUser>;
  // user_type lookup for public.users (notify-bulk-pds-event auth path).
  publicUserTypes?: Record<string, string>;
  // Table → array of rows.
  tables?: Record<string, Array<Record<string, unknown>>>;
  // Tag to identify this mock in errors.
  label?: string;
}

export interface MockState {
  inserts: Array<{ table: string; row: Record<string, unknown> }>;
  updates: Array<{ table: string; patch: Record<string, unknown>; match: Record<string, unknown> }>;
  selects: number;
  notifyCalls: Array<Record<string, unknown>>;
}

export function installSupabaseFetchMock(spec: MockSpec): MockState {
  const state: MockState = { inserts: [], updates: [], selects: 0, notifyCalls: [] };
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const urlStr = input instanceof Request ? input.url : input.toString();
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));

    // Auth — /auth/v1/user
    if (urlStr.includes("/auth/v1/user")) {
      const auth = headers.get("authorization") ?? "";
      const token = auth.replace(/^Bearer\s+/i, "");
      const user = spec.users?.[token];
      if (!user) {
        return new Response(JSON.stringify({ error: "invalid" }), { status: 401 });
      }
      return new Response(JSON.stringify({ user }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // notify-bulk-pds-event internal fan-out from approve/reject EFs.
    if (urlStr.includes("/functions/v1/notify-bulk-pds-event")) {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      state.notifyCalls.push(body);
      return new Response(
        JSON.stringify({ success: true, emails_attempted: 0, emails_sent: 0, emails_disabled: true }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // Resend send — never actually hit during tests.
    if (urlStr.includes("api.resend.com")) {
      return new Response(JSON.stringify({ id: "test" }), { status: 200 });
    }

    // PostgREST — /rest/v1/<table>
    const restMatch = urlStr.match(/\/rest\/v1\/([^?]+)/);
    if (restMatch) {
      const table = restMatch[1];
      const params = new URL(urlStr, "http://x").searchParams;

      if (method === "GET") {
        state.selects += 1;
        let rows = spec.tables?.[table] ?? [];
        // Honor eq.<field>=<value> filters that supabase-js emits as "field=eq.value".
        for (const [k, v] of params.entries()) {
          if (v.startsWith("eq.")) {
            const want = v.slice(3);
            rows = rows.filter((r) => String(r[k]) === want);
          } else if (v.startsWith("in.")) {
            const list = v.slice(3).replace(/^\(/, "").replace(/\)$/, "").split(",").map((s) => s.replace(/^"|"$/g, ""));
            rows = rows.filter((r) => list.includes(String(r[k])));
          }
        }
        // public.users.user_type lookup (notify EF).
        if (table === "users" && spec.publicUserTypes) {
          const userIdParam = params.get("user_id");
          if (userIdParam?.startsWith("eq.")) {
            const want = userIdParam.slice(3);
            const ut = spec.publicUserTypes[want];
            rows = ut ? [{ user_id: want, user_type: ut }] : [];
          }
        }
        return new Response(JSON.stringify(rows), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (method === "POST") {
        const row = init?.body ? JSON.parse(init.body as string) : {};
        state.inserts.push({ table, row });
        return new Response(JSON.stringify([row]), { status: 201 });
      }

      if (method === "PATCH") {
        const patch = init?.body ? JSON.parse(init.body as string) : {};
        const match: Record<string, unknown> = {};
        for (const [k, v] of params.entries()) {
          if (v.startsWith("eq.")) match[k] = v.slice(3);
        }
        state.updates.push({ table, patch, match });
        return new Response(JSON.stringify([{ ...match, ...patch }]), { status: 200 });
      }
    }

    // Pass-through for anything else we didn't anticipate.
    if (originalFetch) {
      return originalFetch(input, init);
    }
    return new Response("Not Found", { status: 404 });
  };

  return state;
}

export function restoreFetch(original: typeof fetch) {
  globalThis.fetch = original;
}

export function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
