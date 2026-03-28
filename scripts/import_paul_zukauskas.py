"""
import_paul_zukauskas.py
Paul Zukauskas full insert into Supabase — users + profiles + hs_coach_schools

Usage:
    SUPABASE_SERVICE_ROLE_KEY=<key> python scripts/import_paul_zukauskas.py

Prerequisites:
    - Paul's auth.users record must exist (UUID provided by Chris)
    - BC High hs_programs record must exist (UUID provided by Chris)
    - Run from project root: C:\\Users\\chris\\dev\\gritty-recruit-hub-rebuild

Known values (provided by Chris, Session 7 Task 2):
    Paul UUID:        9177ba55-eb83-4bce-b4cd-01ce3078d4a3
    BC High prog ID:  de54b9af-c03c-46b8-a312-b87585a06328
    Email:            pzukauskas@bchigh.edu

Source sheet: 1zW7vFntjyAmu0GB0g2ZoNuHzPkqepGz59DcWB_RxcIQ
Sheet tab:    users (gid=1538214005)
Paul's row:   name=Paul Zukauskas, email=pzukauskas@bchigh.edu, user_type=hs_coach
              (verified via GWS CLI, 2026-03-26)

Target Supabase project: xyudnajzhuwdauwkwsbh

Authored by: David (Data Steward) 2026-03-26
Session:     Session 7, Task 2
"""

import json
import os
import sys
import urllib.request
import urllib.error

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://xyudnajzhuwdauwkwsbh.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_SERVICE_ROLE_KEY:
    print("ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required.")
    print("Usage: SUPABASE_SERVICE_ROLE_KEY=<key> python scripts/import_paul_zukauskas.py")
    sys.exit(1)

# Paul's known values (confirmed by Chris + GWS CLI read)
PAUL_USER_ID    = "9177ba55-eb83-4bce-b4cd-01ce3078d4a3"
PAUL_NAME       = "Paul Zukauskas"
PAUL_EMAIL      = "pzukauskas@bchigh.edu"
PAUL_USER_TYPE  = "hs_coach"
BC_HIGH_PROG_ID = "de54b9af-c03c-46b8-a312-b87585a06328"

HEADERS_SERVICE = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
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


# ---------------------------------------------------------------------------
# Step 1: Insert into public.users
# ---------------------------------------------------------------------------

def insert_users():
    print("\n--- Step 1: public.users ---")
    payload = {
        "user_id":        PAUL_USER_ID,
        "user_type":      PAUL_USER_TYPE,
        "account_status": "active",
        "email_verified": True,
    }
    result = supabase_post(
        "users",
        payload,
        upsert=True,
        on_conflict="user_id"
    )
    if result:
        print(f"  PASS: users row upserted")
        print(f"  Returned: {json.dumps(result, indent=2)}")
        return True
    else:
        print("  FAIL: users insert returned None (see error above)")
        return False


# ---------------------------------------------------------------------------
# Step 2: Insert into public.profiles
# ---------------------------------------------------------------------------

def insert_profiles():
    print("\n--- Step 2: public.profiles ---")
    payload = {
        "user_id": PAUL_USER_ID,
        "name":    PAUL_NAME,
        "email":   PAUL_EMAIL,
    }
    result = supabase_post(
        "profiles",
        payload,
        upsert=True,
        on_conflict="user_id"
    )
    if result:
        print(f"  PASS: profiles row upserted")
        print(f"  Returned: {json.dumps(result, indent=2)}")
        return True
    else:
        print("  FAIL: profiles insert returned None (see error above)")
        return False


# ---------------------------------------------------------------------------
# Step 3: Insert into public.hs_coach_schools
# ---------------------------------------------------------------------------

def insert_hs_coach_schools():
    print("\n--- Step 3: public.hs_coach_schools ---")
    payload = {
        "coach_user_id": PAUL_USER_ID,
        "hs_program_id": BC_HIGH_PROG_ID,
        "is_head_coach": True,
    }
    result = supabase_post(
        "hs_coach_schools",
        payload,
        upsert=True,
        on_conflict="coach_user_id,hs_program_id"
    )
    if result:
        print(f"  PASS: hs_coach_schools row upserted")
        print(f"  Returned: {json.dumps(result, indent=2)}")
        return True
    else:
        print("  FAIL: hs_coach_schools insert returned None (see error above)")
        return False


# ---------------------------------------------------------------------------
# Step 4: Verification join query (three separate reads, spot-check)
# ---------------------------------------------------------------------------

def verify():
    print("\n--- Step 4: Verification ---")
    passed = 0
    total = 3

    # Check users
    rows = supabase_get("users", {"user_id": f"eq.{PAUL_USER_ID}", "select": "user_id,user_type,account_status,email_verified"})
    if rows and len(rows) == 1:
        r = rows[0]
        ok = (
            r.get("user_id") == PAUL_USER_ID and
            r.get("user_type") == "hs_coach" and
            r.get("account_status") == "active" and
            r.get("email_verified") is True
        )
        status = "PASS" if ok else "FAIL (unexpected values)"
        print(f"  users:            {status} — {r}")
        if ok:
            passed += 1
    else:
        print(f"  users:            FAIL — row not found or multiple rows returned: {rows}")

    # Check profiles
    rows = supabase_get("profiles", {"user_id": f"eq.{PAUL_USER_ID}", "select": "user_id,name,email"})
    if rows and len(rows) == 1:
        r = rows[0]
        ok = (
            r.get("user_id") == PAUL_USER_ID and
            r.get("name") == PAUL_NAME and
            r.get("email") == PAUL_EMAIL
        )
        status = "PASS" if ok else "FAIL (unexpected values)"
        print(f"  profiles:         {status} — {r}")
        if ok:
            passed += 1
    else:
        print(f"  profiles:         FAIL — row not found or multiple rows returned: {rows}")

    # Check hs_coach_schools
    rows = supabase_get("hs_coach_schools", {"coach_user_id": f"eq.{PAUL_USER_ID}", "select": "coach_user_id,hs_program_id,is_head_coach"})
    if rows and len(rows) == 1:
        r = rows[0]
        ok = (
            r.get("coach_user_id") == PAUL_USER_ID and
            r.get("hs_program_id") == BC_HIGH_PROG_ID and
            r.get("is_head_coach") is True
        )
        status = "PASS" if ok else "FAIL (unexpected values)"
        print(f"  hs_coach_schools: {status} — {r}")
        if ok:
            passed += 1
    else:
        print(f"  hs_coach_schools: FAIL — row not found or multiple rows returned: {rows}")

    print(f"\n--- Verification result: {passed}/{total} tables confirmed ---")
    return passed == total


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 60)
    print("import_paul_zukauskas.py")
    print(f"Target: {SUPABASE_URL}")
    print(f"Paul UUID: {PAUL_USER_ID}")
    print(f"BC High prog ID: {BC_HIGH_PROG_ID}")
    print("=" * 60)

    results = {}

    results["users"]           = insert_users()
    results["profiles"]        = insert_profiles()
    results["hs_coach_schools"] = insert_hs_coach_schools()

    all_inserts = all(results.values())
    if all_inserts:
        print("\n--- All 3 inserts: PASS ---")
        verify_ok = verify()
        if verify_ok:
            print("\nFINAL RESULT: PASS — Paul Zukauskas is live in all 3 tables with is_head_coach=True")
        else:
            print("\nFINAL RESULT: PARTIAL — Inserts reported success but verification found discrepancies. Review output above.")
    else:
        failed = [k for k, v in results.items() if not v]
        print(f"\nFINAL RESULT: FAIL — {len(failed)} insert(s) failed: {', '.join(failed)}")
        print("Review HTTP error output above. Do not proceed with verification until all 3 inserts pass.")
