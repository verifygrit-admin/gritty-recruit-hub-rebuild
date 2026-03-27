"""
import_bc_high_counselors.py
Full insert for all three BC High guidance counselors into Supabase.
Targets: public.users, public.profiles, hs_counselor_schools

Usage:
    SUPABASE_SERVICE_ROLE_KEY=<key> python scripts/import_bc_high_counselors.py

Prerequisites:
    - Each counselor's auth.users record must exist. UUIDs must be provided by Chris
      before this script can run. The script will prompt for them at runtime if not
      hardcoded, or fail with a clear message if the auth record is missing.
    - BC High hs_programs record must exist (UUID confirmed below).
    - Run from project root: C:\\Users\\chris\\dev\\gritty-recruit-hub-rebuild

Known values (from Google Sheet 1zW7vFntjyAmu0GB0g2ZoNuHzPkqepGz59DcWB_RxcIQ,
tab: users, gid=1538214005 — verified via GWS CLI, 2026-03-26):
    dbalfour@bchigh.edu  — Devon Balfour,    user_type=hs_guidance_counselor
    coconnell@bchigh.edu — Caitlin O'Connell, user_type=hs_guidance_counselor
    kswords@bchigh.edu   — Kyle Swords,       user_type=hs_guidance_counselor

    BC High hs_program_id: de54b9af-c03c-46b8-a312-b87585a06328

Counselor UUIDs: NOT YET KNOWN — must be supplied by Chris.
    Set them as environment variables before running:
        COUNSELOR_UUID_DBALFOUR=<uuid>
        COUNSELOR_UUID_COCONNELL=<uuid>
        COUNSELOR_UUID_KSWORDS=<uuid>
    Or provide via the Admin API query path (see note in main() below).

Target Supabase project: xyudnajzhuwdauwkwsbh

Schema references:
    public.users         — 0002_users_extended.sql
    public.profiles      — 0007_profiles.sql
    hs_counselor_schools — 0004_hs_counselor_schools.sql

Pattern: import_paul_zukauskas.py (Session 7, Task 2)
Authored by: David (Data Steward) 2026-03-26
Session:     Session 7, counselor diagnostic
"""

import json
import os
import sys
import urllib.request
import urllib.error

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://xyudnajzhuwdauwkwsbh.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_SERVICE_ROLE_KEY:
    print("ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required.")
    print("Usage: SUPABASE_SERVICE_ROLE_KEY=<key> python scripts/import_bc_high_counselors.py")
    sys.exit(1)

BC_HIGH_PROG_ID = "de54b9af-c03c-46b8-a312-b87585a06328"

# Counselor UUIDs — load from environment. Chris must supply these before running.
# They are the auth.users UUIDs from the Supabase project.
# To find them: Supabase dashboard > Authentication > Users, search by email.
# Or run the Admin API call in check_auth_users() below to retrieve them live.
COUNSELOR_UUID_DBALFOUR  = os.environ.get("COUNSELOR_UUID_DBALFOUR")
COUNSELOR_UUID_COCONNELL = os.environ.get("COUNSELOR_UUID_COCONNELL")
COUNSELOR_UUID_KSWORDS   = os.environ.get("COUNSELOR_UUID_KSWORDS")

# Counselor definitions — sheet-sourced values
COUNSELORS = [
    {
        "name":      "Devon Balfour",
        "email":     "dbalfour@bchigh.edu",
        "user_type": "hs_guidance_counselor",
        "uuid_env":  "COUNSELOR_UUID_DBALFOUR",
        "uuid":      COUNSELOR_UUID_DBALFOUR,
    },
    {
        "name":      "Caitlin O'Connell",
        "email":     "coconnell@bchigh.edu",
        "user_type": "hs_guidance_counselor",
        "uuid_env":  "COUNSELOR_UUID_COCONNELL",
        "uuid":      COUNSELOR_UUID_COCONNELL,
    },
    {
        "name":      "Kyle Swords",
        "email":     "kswords@bchigh.edu",
        "user_type": "hs_guidance_counselor",
        "uuid_env":  "COUNSELOR_UUID_KSWORDS",
        "uuid":      COUNSELOR_UUID_KSWORDS,
    },
]

HEADERS_SERVICE = {
    "apikey":        SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "return=representation",
}

# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

def supabase_get(path, params=None):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    if params:
        query = "&".join(f"{k}={v}" for k, v in params.items())
        url = f"{url}?{query}"
    req = urllib.request.Request(url, headers=HEADERS_SERVICE, method="GET")
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  GET {path} failed: HTTP {e.code} — {body}")
        return None


def supabase_post(path, payload, upsert=False, on_conflict=None):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    if upsert and on_conflict:
        url = f"{url}?on_conflict={on_conflict}"
    headers = dict(HEADERS_SERVICE)
    if upsert:
        headers["Prefer"] = "resolution=merge-duplicates,return=representation"
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  POST {path} failed: HTTP {e.code} — {body}")
        return None


def admin_get_user_by_email(email):
    """
    Query auth.users via the Supabase Admin API.
    Returns the user dict if found, None otherwise.
    The Admin API returns a paginated list — filter by email client-side.
    """
    url = f"{SUPABASE_URL}/auth/v1/admin/users?per_page=1000"
    req = urllib.request.Request(url, headers=HEADERS_SERVICE, method="GET")
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            users = data.get("users", [])
            for u in users:
                if u.get("email", "").lower() == email.lower():
                    return u
            return None
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  Admin users query failed: HTTP {e.code} — {body}")
        return None


# ---------------------------------------------------------------------------
# Step 1: Resolve UUIDs from auth.users
# ---------------------------------------------------------------------------

def resolve_uuids():
    """
    Attempt to resolve any missing UUIDs from auth.users via the Admin API.
    Updates the COUNSELORS list in place.
    Returns True if all three UUIDs are resolved, False if any remain missing.
    """
    print("\n--- Step 1: Resolving UUIDs from auth.users ---")
    all_resolved = True

    for c in COUNSELORS:
        if c["uuid"]:
            print(f"  {c['email']}: UUID already set ({c['uuid']})")
            continue

        print(f"  {c['email']}: UUID not set — querying auth.users...")
        auth_user = admin_get_user_by_email(c["email"])
        if auth_user:
            c["uuid"] = auth_user["id"]
            print(f"  {c['email']}: FOUND in auth.users — UUID: {c['uuid']}")
        else:
            print(f"  {c['email']}: NOT FOUND in auth.users.")
            print(f"    Action required: Create auth user for {c['email']} in Supabase dashboard,")
            print(f"    then set env var {c['uuid_env']}=<uuid> or re-run after auth record exists.")
            all_resolved = False

    return all_resolved


# ---------------------------------------------------------------------------
# Step 2: Insert into public.users
# ---------------------------------------------------------------------------

def insert_users(c):
    print(f"\n  [public.users] {c['email']}")
    payload = {
        "user_id":        c["uuid"],
        "user_type":      c["user_type"],
        "account_status": "active",
        "email_verified": True,
    }
    result = supabase_post("users", payload, upsert=True, on_conflict="user_id")
    if result:
        print(f"    PASS: users row upserted")
        return True
    else:
        print(f"    FAIL: users insert returned None (see error above)")
        return False


# ---------------------------------------------------------------------------
# Step 3: Insert into public.profiles
# ---------------------------------------------------------------------------

def insert_profiles(c):
    print(f"\n  [public.profiles] {c['email']}")
    payload = {
        "user_id": c["uuid"],
        "name":    c["name"],
        "email":   c["email"],
    }
    result = supabase_post("profiles", payload, upsert=True, on_conflict="user_id")
    if result:
        print(f"    PASS: profiles row upserted")
        return True
    else:
        print(f"    FAIL: profiles insert returned None (see error above)")
        return False


# ---------------------------------------------------------------------------
# Step 4: Insert into public.hs_counselor_schools
# ---------------------------------------------------------------------------

def insert_hs_counselor_schools(c):
    print(f"\n  [public.hs_counselor_schools] {c['email']}")
    payload = {
        "counselor_user_id": c["uuid"],
        "hs_program_id":     BC_HIGH_PROG_ID,
    }
    result = supabase_post(
        "hs_counselor_schools",
        payload,
        upsert=True,
        on_conflict="counselor_user_id,hs_program_id"
    )
    if result:
        print(f"    PASS: hs_counselor_schools row upserted")
        return True
    else:
        print(f"    FAIL: hs_counselor_schools insert returned None (see error above)")
        return False


# ---------------------------------------------------------------------------
# Step 5: Verification
# ---------------------------------------------------------------------------

def verify(c):
    print(f"\n  [verification] {c['email']}")
    passed = 0
    total = 3

    # Check public.users
    rows = supabase_get("users", {
        "user_id": f"eq.{c['uuid']}",
        "select":  "user_id,user_type,account_status,email_verified",
    })
    if rows and len(rows) == 1:
        r = rows[0]
        ok = (
            r.get("user_id") == c["uuid"] and
            r.get("user_type") == "hs_guidance_counselor" and
            r.get("account_status") == "active" and
            r.get("email_verified") is True
        )
        status = "PASS" if ok else "FAIL (unexpected values)"
        print(f"    users:                  {status} — {r}")
        if ok:
            passed += 1
    else:
        print(f"    users:                  FAIL — row not found or multiple rows: {rows}")

    # Check public.profiles
    rows = supabase_get("profiles", {
        "user_id": f"eq.{c['uuid']}",
        "select":  "user_id,name,email",
    })
    if rows and len(rows) == 1:
        r = rows[0]
        ok = (
            r.get("user_id") == c["uuid"] and
            r.get("name") == c["name"] and
            r.get("email") == c["email"]
        )
        status = "PASS" if ok else "FAIL (unexpected values)"
        print(f"    profiles:               {status} — {r}")
        if ok:
            passed += 1
    else:
        print(f"    profiles:               FAIL — row not found or multiple rows: {rows}")

    # Check hs_counselor_schools
    rows = supabase_get("hs_counselor_schools", {
        "counselor_user_id": f"eq.{c['uuid']}",
        "select":            "counselor_user_id,hs_program_id",
    })
    if rows and len(rows) == 1:
        r = rows[0]
        ok = (
            r.get("counselor_user_id") == c["uuid"] and
            r.get("hs_program_id") == BC_HIGH_PROG_ID
        )
        status = "PASS" if ok else "FAIL (unexpected values)"
        print(f"    hs_counselor_schools:   {status} — {r}")
        if ok:
            passed += 1
    else:
        print(f"    hs_counselor_schools:   FAIL — row not found or multiple rows: {rows}")

    result = "PASS" if passed == total else f"PARTIAL ({passed}/{total})"
    print(f"    Verification: {result}")
    return passed == total


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 60)
    print("import_bc_high_counselors.py")
    print(f"Target: {SUPABASE_URL}")
    print(f"BC High prog ID: {BC_HIGH_PROG_ID}")
    print(f"Counselors: {len(COUNSELORS)}")
    for c in COUNSELORS:
        uuid_display = c["uuid"] if c["uuid"] else f"MISSING — set {c['uuid_env']}"
        print(f"  {c['email']} ({c['name']}) — UUID: {uuid_display}")
    print("=" * 60)

    # Step 1: Resolve UUIDs (from env or live auth.users query)
    uuids_ok = resolve_uuids()

    if not uuids_ok:
        print("\nBLOCKED: One or more counselors have no auth.users record.")
        print("Create auth records first, then re-run.")
        print("Script will attempt inserts only for counselors with resolved UUIDs.")
        print()

    # Process each counselor independently — a failure on one does not block the others
    summary = {}

    for c in COUNSELORS:
        email = c["email"]
        print(f"\n{'=' * 50}")
        print(f"Processing: {c['name']} ({email})")
        print(f"{'=' * 50}")

        if not c["uuid"]:
            print(f"  SKIP: No UUID — auth.users record missing. Cannot insert.")
            summary[email] = "SKIP — no auth record"
            continue

        insert_results = {}
        insert_results["users"]                = insert_users(c)
        insert_results["profiles"]             = insert_profiles(c)
        insert_results["hs_counselor_schools"] = insert_hs_counselor_schools(c)

        all_inserts = all(insert_results.values())

        if all_inserts:
            print(f"\n  All 3 inserts: PASS — running verification...")
            verify_ok = verify(c)
            summary[email] = "PASS" if verify_ok else "PARTIAL (verify mismatch)"
        else:
            failed = [k for k, v in insert_results.items() if not v]
            print(f"\n  Insert FAIL on: {', '.join(failed)}")
            summary[email] = f"FAIL — insert error on {', '.join(failed)}"

    # Final summary
    print(f"\n{'=' * 60}")
    print("FINAL SUMMARY")
    print(f"{'=' * 60}")
    for email, result in summary.items():
        print(f"  {email}: {result}")

    all_passed = all(v == "PASS" for v in summary.values())
    if all_passed:
        print("\nALL THREE COUNSELORS: PASS")
    else:
        print("\nREVIEW REQUIRED — see per-counselor results above.")
