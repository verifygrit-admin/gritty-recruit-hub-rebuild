"""
repair_shortlist_fields.py
==========================
Backfill and repair short_list_items + schools table.

PROBLEMS ADDRESSED
------------------
1. schools.type collision:
     Current values: "Power 4", "G6", "1-FCS", "2-Div II", "3-Div III"
     "1-FCS", "2-Div II", "3-Div III" are DIVISION values stored in the TYPE column.
     Correct type values: "Power 4", "G6", "FCS", "D2", "D3"
     NOTE: Run --migrate-type only after updating constants.js keys (see REPAIR SPEC below).

2. short_list_items.div stores a mix of values:
     "1-FBS" — wrong (that's ncaa_division, not type); should be "Power 4" or "G6"
     "1-FCS" — will become "FCS" after type migration
     "2-Div II" — will become "D2" after type migration
     "3-Div III" — will become "D3" after type migration

3. short_list_items NULL static fields (state, grad_rate, q_link, coach_link).

4. short_list_items NULL computed fields (dist, net_cost, droi, break_even) for
   Thomas and Ayden (imported students who never had scoring run).

REPAIR SPEC
-----------
STEP 1 — Update constants.js (MANUAL — Patch must do this before --migrate-type):
  ATH_STANDARDS keys:  "1-FCS" -> "FCS",  "2-Div II" -> "D2",  "3-Div III" -> "D3"
  RECRUIT_BUDGETS keys: same renames
  TIER_ORDER array: ["Power 4", "G6", "FCS", "D2", "D3"]
  TIER_LABELS keys: same renames, short labels already correct (FCS, D2, D3)
  TIER_COLORS keys: same renames

STEP 2 — Update scoring.js (MANUAL — no logic changes, just key name lookups follow automatically)
  No direct edits needed — scoring.js keys flow from TIER_ORDER and ATH_STANDARDS.
  Verify: school.type === topTier still works after DB + constants both renamed.

STEP 3 — Run this script (--migrate-type flag):
  UPDATE schools SET type = 'FCS'  WHERE type = '1-FCS'
  UPDATE schools SET type = 'D2'   WHERE type = '2-Div II'
  UPDATE schools SET type = 'D3'   WHERE type = '3-Div III'
  (Power 4 and G6 are unchanged)

STEP 4 — Run this script (default, no flag):
  Repair short_list_items.div for all students:
    "1-FBS" rows -> join schools table and write correct schools.type value
    "1-FCS" rows -> "FCS" (if --migrate-type has already run)
    "2-Div II" rows -> "D2" (if --migrate-type has already run)
    "3-Div III" rows -> "D3" (if --migrate-type has already run)
  Backfill NULL static fields from schools table
  Backfill NULL computed fields for Thomas and Ayden

STEP 5 — UI changes (MANUAL):
  GritFitActionBar.jsx: divisions array -> ["Power 4", "G6", "FCS", "D2", "D3"]
  ShortlistFilters.jsx: DIVISION_OPTIONS values -> "FCS", "D2", "D3"
  GritFitMapView.jsx: LEGEND_ITEMS labels -> "FCS", "D2", "D3"
  GritFitPage.jsx: handleAddToShortlist div: school.type (no change — source is already schools.type)
  GritFitTableView.jsx: TIER_LABELS lookup works automatically after constants.js update
  GritFitMapView.jsx: TIER_COLORS lookup works automatically after constants.js update

SCORING ENGINE SAFETY NOTE
---------------------------
Do NOT run --migrate-type before Step 1 (constants.js update) is complete and deployed.
If schools.type changes before TIER_ORDER changes, school.type === topTier will never match
for FCS/D2/D3 schools — scoring breaks silently for those tiers.
Safe order: constants.js first, then --migrate-type, then UI changes.

USAGE
-----
  python repair_shortlist_fields.py --dry-run                  # preview all changes
  python repair_shortlist_fields.py --migrate-type --dry-run   # preview type migration only
  python repair_shortlist_fields.py --migrate-type             # run schools.type migration
  python repair_shortlist_fields.py                            # repair shortlist items (all students)
  python repair_shortlist_fields.py --student jesse            # repair one student only

STUDENTS
--------
  Jesse Bargar   (6fb09c01-db56-4164-80be-da890040517d) — static backfill + div repair
  Thomas Girmay  (0cf42296-a1a8-43df-b6dd-c15ff7e0f353) — static + computed + div repair
  Ayden Watkins  (4effa4d5-a10f-487e-9e1d-b9e2e912c727) — static + computed + div repair

Requires: pip install requests
"""

import argparse
import math
import os
import re
import sys

import requests
from dotenv import load_dotenv

load_dotenv()

# ── Config ──────────────────────────────────────────────────────────────────

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL")
if not SUPABASE_URL:
    raise ValueError("VITE_SUPABASE_URL not set in .env")

SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not SERVICE_ROLE_KEY:
    raise ValueError("SUPABASE_SERVICE_ROLE_KEY not set in .env")

# Type migration map: old value -> new value
# Only the three that are wrong. Power 4 and G6 are correct.
TYPE_MIGRATION = {
    "1-FCS":    "FCS",
    "2-Div II": "D2",
    "3-Div III":"D3",
}

# Student config
STUDENTS = {
    "jesse": {
        "name": "Jesse Bargar",
        "user_id": "6fb09c01-db56-4164-80be-da890040517d",
        "backfill_scoring": False,  # Added via GritFit — scoring already ran
        "hs_lat": 42.3162356,
        "hs_lng": -71.0454645,
        "agi": 99000,
        "dependents": 1,
    },
    "thomas": {
        "name": "Thomas Girmay",
        "user_id": "0cf42296-a1a8-43df-b6dd-c15ff7e0f353",
        "backfill_scoring": True,
        "hs_lat": 42.3097,
        "hs_lng": -71.0527,
        "agi": 80000,
        "dependents": 2,
    },
    "ayden": {
        "name": "Ayden Watkins",
        "user_id": "4effa4d5-a10f-487e-9e1d-b9e2e912c727",
        "backfill_scoring": True,
        "hs_lat": 42.3097,
        "hs_lng": -71.0527,
        "agi": 200000,
        "dependents": 1,
    },
}

# ── EFC_TABLE (ported from src/lib/constants.js) ─────────────────────────────
EFC_TABLE = [
    {"agi":  30000, "sai":[    0,    0,    0,    0], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi":  32500, "sai":[    0,    0,    0,    0], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi":  35000, "sai":[    0,    0,    0,    0], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi":  37500, "sai":[    0,    0,    0,    0], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi":  40000, "sai":[    0,    0,    0,    0], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi":  42500, "sai":[ 1680,    0,    0,    0], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi":  45000, "sai":[ 2122,    0,    0,    0], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi":  47500, "sai":[ 2564,    0,    0,    0], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi":  50000, "sai":[ 3066, 1504,    0,    0], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi":  52500, "sai":[ 3448, 2387,    0,    0], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi":  55000, "sai":[ 3890, 2387,    0,    0], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi":  57500, "sai":[ 4332, 2829, 1410,    0], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi":  60000, "sai":[ 4774, 3271, 1852,    0], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi":  62500, "sai":[ 5216, 3713, 2294,    0], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi":  65000, "sai":[ 5703, 4155, 2736,    0], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi":  67500, "sai":[ 6205, 4597, 3178, 1598], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi":  70000, "sai":[ 6752, 5039, 3620, 2040], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi":  72500, "sai":[ 7334, 5502, 4062, 2482], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi":  75000, "sai":[ 7953, 6004, 4504, 2924], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi":  80000, "sai":[ 9334, 7101, 5396, 3808], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi":  85000, "sai":[10883, 8314, 6364, 4660], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi":  90000, "sai":[12517, 9558, 7374, 5448], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi":  95000, "sai":[14170,10965, 8513, 6328], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi": 100000, "sai":[15824,12614, 9792, 7332], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi": 105000, "sai":[17477,14267,11235, 8463], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi": 110000, "sai":[19130,15920,12889, 9734], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi": 115000, "sai":[20783,17573,14542,11167], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi": 120000, "sai":[22437,19227,16195,12820], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi": 125000, "sai":[24090,20880,17848,14474], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi": 130000, "sai":[25743,22533,19501,16127], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi": 135000, "sai":[27396,24186,21155,17780], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi": 140000, "sai":[29050,25839,22808,19433], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi": 145000, "sai":[30703,27493,24461,21087], "pub":[1,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi": 150000, "sai":[32356,29146,26114,22740], "pub":[0,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi": 155000, "sai":[34009,30799,27768,24393], "pub":[0,1,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi": 160000, "sai":[35662,32452,29421,26046], "pub":[0,0,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi": 165000, "sai":[37316,34106,31074,27699], "pub":[0,0,1,1], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi": 170000, "sai":[38969,35759,32727,29353], "pub":[0,0,0,0], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi": 175000, "sai":[40622,37412,34380,31006], "pub":[0,0,0,0], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi": 180000, "sai":[42258,39048,36016,32642], "pub":[0,0,0,0], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi": 185000, "sai":[43864,40654,37623,34248], "pub":[0,0,0,0], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi": 190000, "sai":[45470,42260,39229,35854], "pub":[0,0,0,0], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi": 195000, "sai":[47077,43867,40835,37460], "pub":[0,0,0,0], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi": 200000, "sai":[48683,45473,42441,39067], "pub":[0,0,0,0], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi": 205000, "sai":[50289,47079,44047,40673], "pub":[0,0,0,0], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi": 210000, "sai":[51895,48685,45654,42279], "pub":[0,0,0,0], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi": 215000, "sai":[53502,50291,47260,43885], "pub":[0,0,0,0], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi": 220000, "sai":[55108,51898,48866,45492], "pub":[0,0,0,0], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi": 225000, "sai":[56714,53504,50572,47098], "pub":[0,0,0,0], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi": 230000, "sai":[58320,55110,52079,48708], "pub":[0,0,0,0], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi": 235000, "sai":[59926,56716,53685,50310], "pub":[0,0,0,0], "priv":[1,1,1,1], "elite":[1,1,1,1]},
    {"agi": 240000, "sai":[61533,58323,55291,51196], "pub":[0,0,0,0], "priv":[0,1,1,1], "elite":[1,1,1,1]},
    {"agi": 245000, "sai":[63139,59929,56879,53523], "pub":[0,0,0,0], "priv":[0,1,1,1], "elite":[1,1,1,1]},
    {"agi": 250000, "sai":[64745,61535,58503,55129], "pub":[0,0,0,0], "priv":[0,0,1,1], "elite":[1,1,1,1]},
    {"agi": 275000, "sai":[72776,69566,66535,63160], "pub":[0,0,0,0], "priv":[0,0,0,0], "elite":[0,1,1,1]},
    {"agi": 300000, "sai":[80982,77772,74741,71366], "pub":[0,0,0,0], "priv":[0,0,0,0], "elite":[0,0,0,0]},
]

ELITE_TYPES = {"Super Elite", "Elite", "Very Selective"}

# ── Helpers ──────────────────────────────────────────────────────────────────

def haversine(lat1, lng1, lat2, lng2):
    """Great-circle distance in miles. Matches scoring.js exactly."""
    R = 3959
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(d_lng / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


def parse_money(v):
    if v is None or v == "":
        return 0.0
    if isinstance(v, (int, float)):
        return float(v)
    return float(re.sub(r"[$,\s]", "", str(v)) or 0)


def parse_pct(v):
    if v is None or v == "":
        return 0.0
    if isinstance(v, (int, float)):
        return float(v) / 100.0 if float(v) > 1 else float(v)
    s = str(v).strip()
    if s.endswith("%"):
        return float(s[:-1]) / 100.0
    return float(s) or 0.0


def calc_efc(agi, dependents, control, school_type):
    """Returns (eligible: bool, efc: float|None). Mirrors scoring.js calcEFC."""
    is_elite = school_type in ELITE_TYPES
    dep_num = min(max(int(dependents or 1), 1), 4)
    dep_idx = dep_num - 1

    row = EFC_TABLE[0]
    for r in EFC_TABLE:
        if r["agi"] <= agi:
            row = r
        else:
            break

    if is_elite:
        eligible = bool(row["elite"][dep_idx])
    elif control == "Public":
        eligible = bool(row["pub"][dep_idx])
    else:
        eligible = bool(row["priv"][dep_idx])

    return eligible, (row["sai"][dep_idx] if eligible else None)


def compute_financials(school, agi, dependents):
    """
    Compute net_cost, droi, break_even for one school given student financials.
    Mirrors the scoring.js financial block exactly.
    """
    coa = parse_money(school.get("coa_out_of_state"))
    control = school.get("control", "")
    school_type = school.get("school_type", "")

    efc_eligible, efc = calc_efc(agi, dependents, control, school_type)
    efc = efc or 0

    avg_merit = parse_money(school.get("est_avg_merit") or school.get("avg_merit_award"))
    share_fa = parse_pct(school.get("share_stu_any_aid"))
    share_pure_need = parse_pct(school.get("share_stu_need_aid"))

    merit_deduct = (
        (avg_merit * share_fa)
        if (coa - efc) > (avg_merit * share_fa)
        else 0
    )

    net_cost = (
        (efc * 4 * 1.18) - merit_deduct
        if efc_eligible
        else None
    )

    dltv = parse_money(school.get("dltv"))
    grad_rate = parse_pct(school.get("graduation_rate"))
    adltv_calc = dltv * grad_rate

    if net_cost is None:
        droi = None
        break_even = None
    elif net_cost <= 0:
        droi = 100.0
        break_even = 0.0
    else:
        droi = adltv_calc / net_cost if net_cost > 0 else None
        break_even = max(0.0, 40.0 / droi) if droi and droi > 0 else None

    return {
        "net_cost": round(net_cost, 2) if net_cost is not None else None,
        "droi": round(droi, 4) if droi is not None else None,
        "break_even": round(break_even, 4) if break_even is not None else None,
    }


# ── Supabase REST helpers ─────────────────────────────────────────────────────

HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}


def sb_get(path, params=None):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    r = requests.get(url, headers={**HEADERS, "Prefer": "return=representation"}, params=params)
    r.raise_for_status()
    return r.json()


def sb_patch(path, params, body, dry_run=False):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    if dry_run:
        return None
    r = requests.patch(url, headers=HEADERS, params=params, json=body)
    r.raise_for_status()
    return r


# ── Phase 1: schools.type migration ──────────────────────────────────────────

def migrate_schools_type(dry_run):
    """
    Renames schools.type values from division-style labels to clean type labels.
    MUST run after constants.js keys are updated and deployed.

    1-FCS    -> FCS
    2-Div II -> D2
    3-Div III-> D3
    """
    print("=" * 60)
    print("PHASE 1: schools.type migration")
    print("WARNING: Run only after constants.js TIER_ORDER/ATH_STANDARDS keys are updated.")
    print()

    total = 0
    for old_val, new_val in TYPE_MIGRATION.items():
        # Count how many schools have this type value
        params = {"type": f"eq.{old_val}", "select": "unitid"}
        schools = sb_get("schools", params=params)
        count = len(schools)

        if count == 0:
            print(f"  [SKIP] type='{old_val}' — 0 rows found (already migrated?)")
            continue

        print(f"  {'[DRY]' if dry_run else '[PATCH]'} schools.type '{old_val}' -> '{new_val}'  ({count} rows)")

        if not dry_run:
            try:
                sb_patch(
                    "schools",
                    params={"type": f"eq.{old_val}"},
                    body={"type": new_val},
                )
                total += count
                print(f"    OK — {count} rows updated")
            except requests.HTTPError as e:
                print(f"    [ERROR] {e.response.status_code}: {e.response.text}")
        else:
            total += count

    print()
    if dry_run:
        print(f"DRY RUN: would update {total} schools rows.")
    else:
        print(f"Done. Updated {total} schools rows.")
    print()
    return total


# ── Phase 2: short_list_items repair ─────────────────────────────────────────

def process_student(student, schools_by_unitid, dry_run, post_migration):
    """
    Repair one student's short_list_items rows.

    post_migration: bool — True if schools.type has already been migrated to
                   FCS/D2/D3. Affects what div values we write for FCS/D2/D3 rows.
    """
    name = student["name"]
    user_id = student["user_id"]
    hs_lat = student["hs_lat"]
    hs_lng = student["hs_lng"]
    agi = student["agi"]
    dependents = student["dependents"]
    backfill_scoring = student["backfill_scoring"]

    print(f"{'=' * 60}")
    print(f"Student: {name}  ({user_id})")
    if backfill_scoring:
        print(f"  hs_lat={hs_lat}, hs_lng={hs_lng}, agi={agi}, dependents={dependents}")
    print()

    items = sb_get("short_list_items", params={
        "user_id": f"eq.{user_id}",
        "select": (
            "id,unitid,school_name,div,state,grad_rate,q_link,coach_link,"
            "dist,net_cost,droi,break_even,grit_fit_status,updated_at"
        ),
    })
    print(f"  Found {len(items)} shortlist items.")

    patched = 0
    skipped = 0
    errors = 0

    for item in items:
        row_id = item["id"]
        unitid = item["unitid"]
        school = schools_by_unitid.get(unitid)

        if school is None:
            print(f"  [SKIP] unitid={unitid} ({item.get('school_name', '?')}) — not in schools table")
            skipped += 1
            continue

        patch = {}
        current_div = item.get("div")

        # ── div repair ────────────────────────────────────────────────────────
        # schools.type is the authoritative source for short_list_items.div.
        # The live school's type after migration is what we want here.
        correct_div = school.get("type")  # already the new value if migration ran

        if current_div != correct_div and correct_div:
            # Report what we're fixing and why
            if current_div == "1-FBS":
                reason = "was '1-FBS' (ncaa_division value, not type)"
            elif current_div in TYPE_MIGRATION:
                reason = f"old type label (was '{current_div}', now '{correct_div}')"
            else:
                reason = f"mismatch: stored '{current_div}', schools.type is '{correct_div}'"
            patch["div"] = correct_div
            print(f"    div fix: {reason}")

        # ── Static backfills from schools table ──────────────────────────────

        if item.get("state") is None and school.get("state"):
            patch["state"] = school["state"]

        # graduation_rate: normalize to 0-1
        if item.get("grad_rate") is None and school.get("graduation_rate") is not None:
            gr = float(school["graduation_rate"])
            patch["grad_rate"] = gr / 100.0 if gr > 1 else gr

        if item.get("q_link") is None and school.get("recruiting_q_link"):
            patch["q_link"] = school["recruiting_q_link"]

        if item.get("coach_link") is None and school.get("coach_link"):
            patch["coach_link"] = school["coach_link"]

        # ── Computed: dist ────────────────────────────────────────────────────
        if backfill_scoring and item.get("dist") is None:
            lat = school.get("latitude")
            lng = school.get("longitude")
            if lat is not None and lng is not None and hs_lat and hs_lng:
                dist_miles = haversine(hs_lat, hs_lng, float(lat), float(lng))
                patch["dist"] = round(dist_miles)

        # ── Computed: net_cost, droi, break_even ──────────────────────────────
        if backfill_scoring and agi is not None and dependents is not None:
            needs_financials = (
                item.get("net_cost") is None or
                item.get("droi") is None or
                item.get("break_even") is None
            )
            if needs_financials:
                financials = compute_financials(school, agi, dependents)
                if item.get("net_cost") is None:
                    patch["net_cost"] = financials["net_cost"]
                if item.get("droi") is None:
                    patch["droi"] = financials["droi"]
                if item.get("break_even") is None:
                    patch["break_even"] = financials["break_even"]

        # ── Back-date to trigger ShortlistPage auto-backfill ─────────────────
        # For Thomas and Ayden: grit_fit_status was set to 'not_evaluated' at import.
        # Back-dating updated_at ensures profile's updated_at > item's updated_at,
        # which fires backfillScoredFields automatically on next ShortlistPage load.
        if backfill_scoring and patch:
            patch["updated_at"] = "2026-01-01T00:00:00.000Z"

        if not patch:
            school_label = item.get("school_name") or f"unitid={unitid}"
            print(f"  [OK]   {school_label} — nothing to update")
            continue

        school_label = item.get("school_name") or f"unitid={unitid}"
        field_summary = ", ".join(
            f"{k}={repr(v) if not isinstance(v, float) else round(v, 4)}"
            for k, v in patch.items()
        )
        print(f"  {'[DRY]' if dry_run else '[PATCH]'} {school_label}")
        print(f"    Fields: {field_summary}")

        if not dry_run:
            try:
                sb_patch(
                    "short_list_items",
                    params={"id": f"eq.{row_id}", "user_id": f"eq.{user_id}"},
                    body=patch,
                )
                patched += 1
            except requests.HTTPError as e:
                print(f"    [ERROR] {e.response.status_code}: {e.response.text}")
                errors += 1
                continue
        else:
            patched += 1

    print()
    return patched, skipped, errors


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Repair schools.type and short_list_items fields",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Safe run order:
  1. Update src/lib/constants.js keys (FCS/D2/D3) — manual
  2. python repair_shortlist_fields.py --migrate-type --dry-run
  3. python repair_shortlist_fields.py --migrate-type
  4. python repair_shortlist_fields.py --dry-run
  5. python repair_shortlist_fields.py
  6. Update UI components — manual (see REPAIR SPEC in script header)
""",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would change, no writes",
    )
    parser.add_argument(
        "--migrate-type",
        action="store_true",
        help=(
            "Run Phase 1: migrate schools.type values (1-FCS->FCS, 2-Div II->D2, "
            "3-Div III->D3). ONLY run after constants.js keys are updated."
        ),
    )
    parser.add_argument(
        "--student",
        choices=["jesse", "thomas", "ayden"],
        default=None,
        help="Repair one student only (default: all three)",
    )
    parser.add_argument(
        "--post-migration",
        action="store_true",
        help=(
            "Pass this flag if --migrate-type has already run. Tells the shortlist "
            "repair to expect FCS/D2/D3 as correct div values instead of 1-FCS/2-Div II/3-Div III."
        ),
    )
    args = parser.parse_args()

    dry_run = args.dry_run
    if dry_run:
        print("[DRY RUN] No writes will be made.\n")

    # ── Phase 1 optional: migrate schools.type ────────────────────────────────
    if args.migrate_type:
        migrate_schools_type(dry_run)
        if not dry_run:
            print("schools.type migration complete.")
            print("Re-run without --migrate-type to repair short_list_items.")
            print("Add --post-migration to the next run so div values are correct.")
        return

    # ── Phase 2: short_list_items repair ─────────────────────────────────────
    print("PHASE 2: short_list_items repair")
    print()

    # Load all schools once, keyed by unitid
    print("Loading schools table...")
    schools_raw = sb_get("schools", params={"select": (
        "unitid,school_name,state,type,ncaa_division,control,school_type,"
        "graduation_rate,recruiting_q_link,coach_link,latitude,longitude,"
        "coa_out_of_state,est_avg_merit,avg_merit_award,"
        "share_stu_any_aid,share_stu_need_aid,need_blind_school,"
        "dltv,adltv"
    )})
    schools_by_unitid = {s["unitid"]: s for s in schools_raw}
    print(f"  Loaded {len(schools_by_unitid)} schools.\n")

    # Confirm type values in the DB so we know which era we're in
    type_vals = sorted(set(s["type"] for s in schools_raw if s.get("type")))
    print(f"  Current schools.type distinct values: {type_vals}")
    post_migration = args.post_migration or not any(v in type_vals for v in TYPE_MIGRATION)
    if post_migration:
        print("  Status: post-migration (FCS/D2/D3 values detected)")
    else:
        print("  Status: pre-migration (1-FCS/2-Div II/3-Div III still present)")
    print()

    target_keys = [args.student] if args.student else list(STUDENTS.keys())

    total_patched = 0
    total_skipped = 0
    total_errors = 0

    for key in target_keys:
        student = STUDENTS[key]
        p, s, e = process_student(student, schools_by_unitid, dry_run, post_migration)
        total_patched += p
        total_skipped += s
        total_errors += e

    print("=" * 60)
    if dry_run:
        print(f"DRY RUN complete. Would patch: {total_patched}  |  Skipped: {total_skipped}")
    else:
        print(f"Done. Patched: {total_patched}  |  Skipped: {total_skipped}  |  Errors: {total_errors}")
        if total_patched > 0:
            print()
            print("Next step: have Thomas and Ayden log in and visit their Shortlist page.")
            print("ShortlistPage will detect profile newer than items and auto-run scoring,")
            print("which backfills grit_fit_status, match_rank, and all remaining metrics.")


if __name__ == "__main__":
    main()
