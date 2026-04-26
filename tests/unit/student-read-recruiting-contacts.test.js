/**
 * student-read-recruiting-contacts.test.js — Sprint 004 S3 Track C Wave 0
 *
 * Contract tests for the student-read-recruiting-contacts Edge Function.
 * Vitest unit-level — no live Supabase. Supabase client is mocked via DI
 * (createHandler accepts a createClient factory).
 *
 * Assertions (a–h from the Wave 0 scaffold scope):
 *   a) Missing Bearer token                                 → 401
 *   b) Wrong role (e.g. hs_coach)                           → 403
 *   c) student_athlete requesting other student_user_id     → 403
 *   d) admin requesting arbitrary student_user_id           → 200 shape
 *   e) student_athlete with coach + counselor linked        → both emails
 *   f) student_athlete with coach linked only               → counselor null
 *   g) student_athlete with neither linked                  → both null
 *   h) Response shape exact — no extra / missing keys
 *
 * Run: npm run test:unit
 */

import { describe, it, expect } from 'vitest';
import { createHandler } from '../../supabase/functions/student-read-recruiting-contacts/handler.js';

// ── Mock builder ──────────────────────────────────────────────────────────────
//
// Builds a fake supabase-js client whose .from(table).select().eq().limit()
// .maybeSingle() chain returns the row we pre-load in `tables`.
// Also stubs .auth.getUser(token) from `authByToken`.

function buildMockClient({ authByToken = {}, tables = {}, authAdminUsers = {} } = {}) {
  return function createClientMock(_url, _key, opts) {
    const authToken = opts?.global?.headers?.Authorization?.replace(/^Bearer\s+/i, '').trim();

    return {
      auth: {
        getUser: async (token) => {
          const useToken = token || authToken;
          const entry = authByToken[useToken];
          if (!entry) return { data: { user: null }, error: { message: 'invalid' } };
          return { data: { user: entry }, error: null };
        },
        admin: {
          getUserById: async (userId) => {
            const u = authAdminUsers[userId];
            if (!u) return { data: { user: null }, error: { message: 'not found' } };
            return { data: { user: u }, error: null };
          },
        },
      },
      from: (table) => makeQueryBuilder(tables[table] || []),
    };
  };
}

function makeQueryBuilder(rows) {
  const state = { rows: [...rows], filters: [] };
  const api = {
    select: () => api,
    eq: (col, val) => {
      state.rows = state.rows.filter((r) => r[col] === val);
      state.filters.push([col, val]);
      return api;
    },
    limit: (_n) => api,
    maybeSingle: async () => {
      if (state.rows.length === 0) return { data: null, error: null };
      return { data: state.rows[0], error: null };
    },
  };
  return api;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const STUDENT_ID = '00000000-0000-0000-0000-000000000001';
const OTHER_STUDENT_ID = '00000000-0000-0000-0000-000000000002';
const COACH_ID = '00000000-0000-0000-0000-0000000000c1';
const COUNSELOR_ID = '00000000-0000-0000-0000-0000000000cc';
const ADMIN_ID = '00000000-0000-0000-0000-0000000000ad';

const STUDENT_TOKEN = 'tok-student';
const COACH_TOKEN = 'tok-coach';
const ADMIN_TOKEN = 'tok-admin';

function authBase() {
  return {
    [STUDENT_TOKEN]: {
      id: STUDENT_ID,
      app_metadata: { role: 'student_athlete' },
    },
    [COACH_TOKEN]: {
      id: COACH_ID,
      app_metadata: { role: 'hs_coach' },
    },
    [ADMIN_TOKEN]: {
      id: ADMIN_ID,
      app_metadata: { role: 'admin' },
    },
  };
}

function makeHandler({ authByToken = authBase(), tables = {}, authAdminUsers = {} } = {}) {
  return createHandler({
    createClient: buildMockClient({ authByToken, tables, authAdminUsers }),
    supabaseUrl: 'http://mock',
    serviceRoleKey: 'mock-service-key',
  });
}

function getReq({ token, studentUserId } = {}) {
  const url = new URL('http://mock/functions/v1/student-read-recruiting-contacts');
  if (studentUserId) url.searchParams.set('student_user_id', studentUserId);
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  return new Request(url.toString(), { method: 'GET', headers });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('student-read-recruiting-contacts — Sprint 004 S3 Track C', () => {
  it('a) returns 401 when Bearer token is missing', async () => {
    const handler = makeHandler();
    const res = await handler(getReq({ token: undefined }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(typeof body.error).toBe('string');
  });

  it('b) returns 403 when role is not student_athlete or admin', async () => {
    const handler = makeHandler();
    const res = await handler(getReq({ token: COACH_TOKEN }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('c) returns 403 when student_athlete requests a different student_user_id', async () => {
    const handler = makeHandler();
    const res = await handler(
      getReq({ token: STUDENT_TOKEN, studentUserId: OTHER_STUDENT_ID }),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('d) admin may request any student_user_id and receives the correct shape (Sprint 007 — names added)', async () => {
    const handler = makeHandler({
      tables: {
        hs_coach_students: [
          { student_user_id: OTHER_STUDENT_ID, coach_user_id: COACH_ID },
        ],
        hs_counselor_students: [
          { student_user_id: OTHER_STUDENT_ID, counselor_user_id: COUNSELOR_ID },
        ],
        profiles: [
          { user_id: COACH_ID, email: 'coach@example.com', name: 'Coach Smith' },
          { user_id: COUNSELOR_ID, email: 'counselor@example.com', name: 'Mr. Jones' },
        ],
      },
    });

    const res = await handler(
      getReq({ token: ADMIN_TOKEN, studentUserId: OTHER_STUDENT_ID }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      success: true,
      contacts: {
        hs_head_coach_email: 'coach@example.com',
        hs_guidance_counselor_email: 'counselor@example.com',
        hs_head_coach_name: 'Coach Smith',
        hs_guidance_counselor_name: 'Mr. Jones',
      },
    });
  });

  it('e) student_athlete with both coach + counselor linked returns both emails', async () => {
    const handler = makeHandler({
      tables: {
        hs_coach_students: [
          { student_user_id: STUDENT_ID, coach_user_id: COACH_ID },
        ],
        hs_counselor_students: [
          { student_user_id: STUDENT_ID, counselor_user_id: COUNSELOR_ID },
        ],
        profiles: [
          { user_id: COACH_ID, email: 'coach@example.com' },
          { user_id: COUNSELOR_ID, email: 'counselor@example.com' },
        ],
      },
    });

    const res = await handler(getReq({ token: STUDENT_TOKEN }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.contacts.hs_head_coach_email).toBe('coach@example.com');
    expect(body.contacts.hs_guidance_counselor_email).toBe('counselor@example.com');
  });

  it('f) student_athlete with only coach linked returns coach email + null counselor', async () => {
    const handler = makeHandler({
      tables: {
        hs_coach_students: [
          { student_user_id: STUDENT_ID, coach_user_id: COACH_ID },
        ],
        hs_counselor_students: [],
        profiles: [{ user_id: COACH_ID, email: 'coach@example.com' }],
      },
    });

    const res = await handler(getReq({ token: STUDENT_TOKEN }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.contacts.hs_head_coach_email).toBe('coach@example.com');
    expect(body.contacts.hs_guidance_counselor_email).toBeNull();
  });

  it('g) student_athlete with neither linked returns all four contact fields null', async () => {
    const handler = makeHandler({
      tables: {
        hs_coach_students: [],
        hs_counselor_students: [],
        profiles: [],
      },
    });

    const res = await handler(getReq({ token: STUDENT_TOKEN }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      success: true,
      contacts: {
        hs_head_coach_email: null,
        hs_guidance_counselor_email: null,
        hs_head_coach_name: null,
        hs_guidance_counselor_name: null,
      },
    });
  });

  it('h) success response shape is exact — no extra or missing keys (Sprint 007 — 4-field shape)', async () => {
    const handler = makeHandler({
      tables: {
        hs_coach_students: [{ student_user_id: STUDENT_ID, coach_user_id: COACH_ID }],
        hs_counselor_students: [
          { student_user_id: STUDENT_ID, counselor_user_id: COUNSELOR_ID },
        ],
        profiles: [
          { user_id: COACH_ID, email: 'coach@example.com', name: 'Coach Smith' },
          { user_id: COUNSELOR_ID, email: 'counselor@example.com', name: 'Mr. Jones' },
        ],
      },
    });

    const res = await handler(getReq({ token: STUDENT_TOKEN }));
    const body = await res.json();

    expect(Object.keys(body).sort()).toEqual(['contacts', 'success']);
    expect(Object.keys(body.contacts).sort()).toEqual([
      'hs_guidance_counselor_email',
      'hs_guidance_counselor_name',
      'hs_head_coach_email',
      'hs_head_coach_name',
    ]);
  });

  it('bonus: falls back to auth.admin.getUserById when profile row is missing', async () => {
    const handler = makeHandler({
      tables: {
        hs_coach_students: [{ student_user_id: STUDENT_ID, coach_user_id: COACH_ID }],
        hs_counselor_students: [],
        profiles: [], // no profile row for coach
      },
      authAdminUsers: {
        [COACH_ID]: { id: COACH_ID, email: 'coach-fallback@example.com' },
      },
    });

    const res = await handler(getReq({ token: STUDENT_TOKEN }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.contacts.hs_head_coach_email).toBe('coach-fallback@example.com');
    expect(body.contacts.hs_guidance_counselor_email).toBeNull();
    // Names: profile row missing → name resolves to null even when email
    // falls back via auth.admin.getUserById (which returns email only).
    expect(body.contacts.hs_head_coach_name).toBeNull();
    expect(body.contacts.hs_guidance_counselor_name).toBeNull();
  });

  it('bonus: rejects non-GET methods with 405', async () => {
    const handler = makeHandler();
    const url = new URL('http://mock/functions/v1/student-read-recruiting-contacts');
    const req = new Request(url.toString(), { method: 'POST' });
    const res = await handler(req);
    expect(res.status).toBe(405);
  });
});
