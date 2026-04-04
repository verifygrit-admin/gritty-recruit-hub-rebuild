"""
execute_short_list_items_coach_link_update.py

Step 6 — Execute UPDATE on short_list_items.coach_link from schools.coach_link.

SQL:
  UPDATE short_list_items sli
  SET coach_link = s.coach_link, updated_at = now()
  FROM schools s
  WHERE sli.unitid = s.unitid
    AND s.coach_link IS NOT NULL
    AND sli.coach_link IS DISTINCT FROM s.coach_link;

Verification:
  SELECT COUNT(*) AS remaining_stale
  FROM short_list_items sli
  INNER JOIN schools s ON sli.unitid = s.unitid
  WHERE s.coach_link IS NOT NULL
    AND sli.coach_link IS DISTINCT FROM s.coach_link;
  Expected: 0

Reference: update_short_list_items_coach_link.sql
Auth: SUPABASE_SERVICE_ROLE_KEY from .env (service role required)
"""

import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
    sys.exit(1)

RPC_ENDPOINT = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"

HEADERS = {
    "apikey":        SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "return=representation",
}

UPDATE_SQL = """
UPDATE short_list_items sli
SET
  coach_link = s.coach_link,
  updated_at = now()
FROM schools s
WHERE sli.unitid = s.unitid
  AND s.coach_link IS NOT NULL
  AND sli.coach_link IS DISTINCT FROM s.coach_link;
"""

VERIFY_SQL = """
SELECT COUNT(*) AS remaining_stale
FROM short_list_items sli
INNER JOIN schools s ON sli.unitid = s.unitid
WHERE s.coach_link IS NOT NULL
  AND sli.coach_link IS DISTINCT FROM s.coach_link;
"""

COUNT_SQL = """
SELECT COUNT(*) AS rows_updated
FROM short_list_items sli
INNER JOIN schools s ON sli.unitid = s.unitid
WHERE s.coach_link IS NOT NULL;
"""


def run_sql_via_rpc(sql: str, label: str) -> dict | list | None:
    """
    Attempt to run SQL via Supabase RPC exec_sql endpoint.
    Returns parsed JSON response or None on error.
    """
    try:
        resp = requests.post(
            RPC_ENDPOINT,
            headers=HEADERS,
            json={"sql": sql.strip()},
            timeout=30,
        )
        if resp.status_code in (200, 204):
            try:
                return resp.json()
            except Exception:
                return {}
        else:
            print(f"  WARN: {label} — HTTP {resp.status_code}: {resp.text[:500]}")
            return None
    except requests.RequestException as e:
        print(f"  ERROR: {label} — {e}")
        return None


def run_update_via_patch() -> tuple[bool, str]:
    """
    Execute the UPDATE via the Supabase PostgREST endpoint.
    PostgREST does not support multi-table UPDATE with FROM directly,
    so we use the RPC path (exec_sql) if available, otherwise report
    that direct SQL execution is required via Supabase dashboard.
    """
    print("Executing UPDATE via RPC exec_sql...")
    result = run_sql_via_rpc(UPDATE_SQL, "UPDATE short_list_items")

    if result is None:
        return False, "RPC exec_sql endpoint not available or returned error"

    return True, str(result)


def run_verify() -> int | None:
    """
    Run the verification query.
    Returns remaining_stale count or None on failure.
    """
    print("Running verification query...")
    result = run_sql_via_rpc(VERIFY_SQL, "VERIFY remaining_stale")

    if result is None:
        return None

    # exec_sql returns rows as list of dicts
    if isinstance(result, list) and len(result) > 0:
        row = result[0]
        val = row.get("remaining_stale")
        if val is not None:
            try:
                return int(val)
            except (TypeError, ValueError):
                pass

    # Some Supabase setups return count differently
    print(f"  Raw verify result: {result}")
    return None


def main() -> None:
    print("=" * 60)
    print("STEP 6 — short_list_items.coach_link UPDATE (PRODUCTION)")
    print("=" * 60)
    print()
    print(f"Target instance: {SUPABASE_URL}")
    print()

    # --- Execute UPDATE ---
    print("--- UPDATE ---")
    success, msg = run_update_via_patch()

    if not success:
        print()
        print("UPDATE via RPC exec_sql failed. This is expected if the")
        print("exec_sql function is not exposed in this Supabase instance.")
        print()
        print("FALLBACK: The UPDATE must be run manually via the Supabase")
        print("SQL editor at:")
        print(f"  https://supabase.com/dashboard/project/{SUPABASE_URL.split('.')[0].split('//')[1]}/sql")
        print()
        print("SQL to execute:")
        print("-" * 40)
        print(UPDATE_SQL.strip())
        print("-" * 40)
        print()
        print("After executing, run the verification query:")
        print(VERIFY_SQL.strip())
        print()
        print("Expected result: remaining_stale = 0")
        sys.exit(1)

    print(f"  UPDATE result: {msg}")
    print()

    # --- Verify ---
    print("--- VERIFICATION ---")
    remaining = run_verify()

    if remaining is None:
        print("  Could not parse verification result. Raw output logged above.")
        print("  Run verification manually:")
        print(VERIFY_SQL.strip())
        sys.exit(1)

    print(f"  remaining_stale = {remaining}")
    print()

    if remaining == 0:
        print("RESULT: PASS — 0 stale rows remaining. short_list_items is in sync.")
    else:
        print(f"RESULT: FAIL — {remaining} stale rows still present. Investigation required.")
        sys.exit(1)


if __name__ == "__main__":
    main()
