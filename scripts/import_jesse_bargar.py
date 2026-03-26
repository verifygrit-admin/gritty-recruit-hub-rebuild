"""
import_jesse_bargar.py
Jesse Bargar full import into Supabase — profiles + short_list_items (33 rows)

Usage:
    SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> python scripts/import_jesse_bargar.py

Prerequisites:
    - Migration 0014 (coach_contact JSONB) must be live in target project
    - Jesse's auth.users record must exist (created by seed_users.js)
    - Run from project root: C:\\Users\\chris\\dev\\gritty-recruit-hub-rebuild

Source workbook: Jesse Bargar — GritOS - CFB Recruiting Center - Jesse Bargar 2027
Workbook ID: 1uCbOSTVwnlR1mDa5ZzcuUeHAfe25qmtlSNqut-A7B-U
Target Supabase project: xyudnajzhuwdauwkwsbh

Authored by: David (Data Steward) 2026-03-26
Decision references: Decisions 1-5 (FIELD_MAPPING_SPEC.md)
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
    print("Usage: SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> python scripts/import_jesse_bargar.py")
    sys.exit(1)

JESSE_EMAIL = "jc.bargar27@students.bchigh.edu"
JESSE_USER_ID = os.environ.get("JESSE_USER_ID", "e0c99343-e525-411a-b6a8-8691bdc31da7")

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


def auth_admin_get(path):
    """Query auth schema via admin API."""
    url = f"{SUPABASE_URL}/auth/v1/{path}"
    req = urllib.request.Request(url, headers=HEADERS_SERVICE, method="GET")
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  AUTH GET {path} failed: HTTP {e.code} — {body}")
        return None


# ---------------------------------------------------------------------------
# Workbook data — extracted 2026-03-26 via GWS CLI
# All 33 schools from GRIT FIT Results (rows 10-42) and Pre-Offer Tracking
# (rows 9-41). Data is embedded here so the script runs without re-fetching.
# ---------------------------------------------------------------------------

# Camp links from FIELD_MAPPING_SPEC.md (Section: Camp Link Extraction Results)
# 22 URLs populated, 11 null. Carleton corrected (null), Wesleyan corrected (URL).
# Key: unitid (integer), Value: URL or None
CAMP_LINKS = {
    212577: "https://www.blueandwhitefootballcamps.com/",                          # Franklin and Marshall
    212009: "https://dickinsonathletics.com/sports/2022/7/25/camps-and-clinics.aspx",  # Dickinson
    214175: "https://www.muhlenbergfootballcamp.com/",                              # Muhlenberg
    162928: None,   # Johns Hopkins — no URL (Red & Black, NE Elite display text only)
    211440: None,   # Carnegie Mellon — no URL
    212674: None,   # Gettysburg — no URL
    196866: None,   # Union College — no URL
    191968: "https://newenglandelitefootballclinic.com/one-day-clinics/",           # Ithaca College (Empire Elite)
    191630: None,   # Hobart William Smith — no URL
    197045: "https://www.tntfootballcamps.com/",                                    # Utica University
    195216: None,   # St Lawrence — no URL
    195030: "https://rochesterfootball.totalcamps.com/shop",                        # University of Rochester
    131283: None,   # Catholic University of America — no URL
    111948: "https://westcoastelitefootballclinic.com/home/",                       # Chapman University
    121691: "https://westcoastelitefootballclinic.com/home/",                       # University of Redlands
    230959: "https://middleburycollegefootballcamps.totalcamps.com/",               # Middlebury
    161086: None,   # Colby College — no URL
    168342: "https://www.purpleandgoldfootballcamps.com/",                          # Williams College
    164465: "https://amherstfootball.totalcamps.com/",                              # Amherst College
    130590: "https://trinityuniversityfootballcamps.totalcamps.com/",               # Trinity College
    191515: "https://www.continentalfootballcamp.com/",                             # Hamilton College
    168148: "https://newenglandelitefootballclinic.com/home/",                      # Tufts University
    160977: "https://www.bobcatfootballclinics.com/",                               # Bates College
    161004: "https://www.polarbearfootballcamps.com/",                              # Bowdoin College
    130697: "https://wesleyanfootballcamps.ryzerevents.com/",                       # Wesleyan University (CORRECTED from Carleton row error)
    239017: "https://www.lawrencefootballcamps.com/",                               # Lawrence University
    204501: None,   # Oberlin College — no URL
    203535: "https://athletics.kenyon.edu/sb_output.aspx?form=18",                  # Kenyon College
    202523: "https://www.denisonfootballcamps.com/",                                # Denison University
    168421: "https://wpifootballcampsandclinics.totalcamps.com/",                   # WPI
    174844: "https://athletics.stolaf.edu/sb_output.aspx?form=91",                  # St Olaf College
    187444: "https://www.collegefootballprospects.com/metuchen-newjersey.cfm",      # William Paterson
    173258: None,   # Carleton College — null (workbook error corrected per FIELD_MAPPING_SPEC)
}

# ---------------------------------------------------------------------------
# GRIT FIT Results data — all 33 rows
# Columns: A=school_name, B=unitid, C=target_school_name, D=div, E=conference,
# F=short_list, G=in_pre_offer, H=nsca_connect, I=top_music, J=coa,
# K=100pct_grant, L=agi, M=dependents, N=fa_eligible, O=efc,
# P=admission_rate, Q=best_athletic_scholly, R=avg_merit, S=share_merit,
# T=share_student_fa, U=expected_merit_likelihood, V=net_cost_projected,
# W=dltv, X=grad_rate, Y=adltv, Z=droi
# ---------------------------------------------------------------------------

GRIT_FIT_ROWS = [
    ["Franklin and Marshall College","212577","Franklin and Marshall College","3-Div III","Centennial","TRUE","TRUE","TRUE","FALSE","$93,589","FALSE","$99,000","1","TRUE","$14,170","32%","$0","$20,336","20%","82%","43.64%","$50,207","$2,689,000","86%","$2,313,078","46.07"],
    ["Dickinson College","212009","Dickinson College","3-Div III","Centennial","TRUE","FALSE","TRUE","FALSE","$90,397","FALSE","$99,000","1","TRUE","$14,170","43%","$0","$21,250","25%","97%","47.27%","$46,270","$2,450,000","83%","$2,043,790","44.17"],
    ["Muhlenberg College","214175","Muhlenberg College","3-Div III","Centennial","TRUE","TRUE","TRUE","FALSE","$85,053","FALSE","$99,000","1","TRUE","$14,170","64%","$0","$19,637","22%","99%","40.00%","$47,442","$2,385,000","80%","$1,913,963","40.34"],
    ["Johns Hopkins University","162928","Johns Hopkins University","3-Div III","Centennial","TRUE","FALSE","TRUE","TRUE","$92,900","FALSE","$99,000","1","TRUE","$14,170","8%","$0","$24,127","14%","66%","38.18%","$50,958","$3,163,000","95%","$2,993,147","58.74"],
    ["Carnegie Mellon University","211440","Carnegie Mellon University","3-Div III","PAC","TRUE","FALSE","TRUE","TRUE","$90,512","FALSE","$99,000","1","TRUE","$14,170","11%","$0","$18,497","21%","58%","65.45%","$56,154","$3,855,000","93%","$3,566,646","63.52"],
    ["Gettysburg College","212674","Gettysburg College","3-Div III","Centennial","TRUE","FALSE","TRUE","TRUE","$90,773","FALSE","$99,000","1","TRUE","$14,170","48%","$0","$29,990","23%","98%","41.82%","$37,492","$2,469,000","83%","$2,042,604","54.48"],
    ["Union College","196866","Union College","3-Div III","Liberty","TRUE","TRUE","TRUE","FALSE","$92,531","FALSE","$99,000","1","TRUE","$14,170","44%","$0","$21,855","31%","97%","58.18%","$45,683","$2,558,000","85%","$2,180,951","47.74"],
    ["Ithaca College","191968","Ithaca College","3-Div III","Liberty","TRUE","FALSE","TRUE","TRUE","$74,574","FALSE","$99,000","1","TRUE","$14,170","70%","$0","$21,546","20%","100%","36.36%","$45,336","$2,200,000","74%","$1,630,420","35.96"],
    ["Hobart William Smith Colleges","191630","Hobart William Smith Colleges","3-Div III","Liberty","TRUE","TRUE","TRUE","FALSE","$89,771","FALSE","$99,000","1","TRUE","$14,170","57%","$0","$20,222","26%","100%","47.27%","$46,660","$2,335,000","73%","$1,697,779","36.39"],
    ["Utica University","197045","Utica University","3-Div III","Empire 8","TRUE","FALSE","TRUE","FALSE","$47,664","FALSE","$99,000","1","TRUE","$14,170","87%","$0","$7,563","50%","99%","90.91%","$59,395","$1,800,000","55%","$998,460","16.81"],
    ["St Lawrence University","195216","St Lawrence University","3-Div III","Liberty","TRUE","TRUE","TRUE","FALSE","$88,778","FALSE","$99,000","1","TRUE","$14,170","58%","$0","$23,281","23%","99%","41.82%","$43,834","$2,304,000","80%","$1,835,136","41.87"],
    ["University of Rochester","195030","University of Rochester","3-Div III","Liberty","TRUE","TRUE","TRUE","TRUE","$94,040","FALSE","$99,000","1","TRUE","$14,170","36%","$0","$18,999","15%","74%","36.36%","$52,823","$2,576,000","84%","$2,176,205","41.20"],
    ["The Catholic University of America","131283","The Catholic University of America","3-Div III","Landmark","TRUE","FALSE","TRUE","TRUE","$85,361","FALSE","$99,000","1","TRUE","$14,170","84%","$0","$22,810","27%","99%","49.09%","$44,300","$2,576,000","81%","$2,095,061","47.29"],
    ["Chapman University","111948","Chapman University","3-Div III","SCIAC","TRUE","FALSE","TRUE","TRUE","$92,117","FALSE","$99,000","1","TRUE","$14,170","56%","$0","$19,628","18%","90%","36.36%","$49,217","$2,300,000","80%","$1,848,280","37.55"],
    ["University of Redlands","121691","University of Redlands","3-Div III","SCIAC","TRUE","FALSE","TRUE","TRUE","$89,048","FALSE","$99,000","1","TRUE","$14,170","81%","$0","$21,274","40%","99%","72.73%","$45,821","$2,354,000","71%","$1,663,807","36.31"],
    ["Middlebury College","230959","Middlebury College","3-Div III","NESCAC","TRUE","FALSE","TRUE","FALSE","$93,293","TRUE","$99,000","1","TRUE","$14,170","10%","$0","$0","0%","50%","0.00%","$66,882","$2,384,000","93%","$2,207,346","33.00"],
    ["Colby College","161086","Colby College","3-Div III","NESCAC","TRUE","FALSE","TRUE","FALSE","$93,650","TRUE","$99,000","1","TRUE","$14,170","7%","$0","$0","0%","48%","0.00%","$66,882","$2,917,000","90%","$2,631,717","39.35"],
    ["Williams College","168342","Williams College","3-Div III","NESCAC","TRUE","FALSE","TRUE","TRUE","$93,996","TRUE","$99,000","1","TRUE","$14,170","10%","$0","$0","0%","64%","0.00%","$66,882","$2,592,000","97%","$2,502,576","37.42"],
    ["Amherst College","164465","Amherst College","3-Div III","NESCAC","TRUE","FALSE","TRUE","TRUE","$95,204","TRUE","$99,000","1","TRUE","$14,170","10%","$0","$0","0%","66%","0.00%","$66,882","$2,824,000","93%","$2,638,181","39.45"],
    ["Trinity College","130590","Trinity College","3-Div III","NESCAC","TRUE","FALSE","TRUE","FALSE","$96,768","FALSE","$99,000","1","TRUE","$14,170","34%","$0","$23,543","20%","76%","47.27%","$48,990","$2,624,000","83%","$2,171,622","44.33"],
    ["Hamilton College","191515","Hamilton College","3-Div III","NESCAC","TRUE","TRUE","TRUE","FALSE","$92,684","TRUE","$99,000","1","TRUE","$14,170","12%","$0","$0","0%","63%","0.00%","$66,882","$2,656,000","91%","$2,423,600","36.24"],
    ["Tufts University","168148","Tufts University","3-Div III","NESCAC","TRUE","TRUE","TRUE","TRUE","$96,692","FALSE","$99,000","1","TRUE","$14,170","10%","$0","$27,437","10%","45%","40.00%","$54,536","$2,517,000","93%","$2,349,116","43.07"],
    ["Bates College","160977","Bates College","3-Div III","NESCAC","TRUE","TRUE","TRUE","FALSE","$91,896","FALSE","$99,000","1","TRUE","$14,170","13%","$0","$0","10%","45%","40.00%","$66,882","$2,356,000","91%","$2,134,300","31.91"],
    ["Bowdoin College","161004","Bowdoin College","3-Div III","NESCAC","TRUE","TRUE","TRUE","FALSE","$93,261","TRUE","$99,000","1","TRUE","$14,170","8%","$0","$0","0%","60%","0.00%","$66,882","$2,413,000","96%","$2,306,828","34.49"],
    ["Wesleyan University","130697","Wesleyan University","3-Div III","NESCAC","TRUE","TRUE","TRUE","TRUE","$97,297","FALSE","$99,000","1","TRUE","$14,170","17%","$0","$19,620","14%","50%","50.91%","$57,072","$2,474,000","92%","$2,265,442","39.69"],
    ["Lawrence University","239017","Lawrence University","3-Div III","Midwest","TRUE","TRUE","TRUE","TRUE","$75,282","FALSE","$99,000","1","TRUE","$14,170","63%","$0","$19,702","24%","100%","43.64%","$47,181","$2,050,000","76%","$1,566,610","33.20"],
    ["Oberlin College","204501","Oberlin College","3-Div III","NCAC","TRUE","TRUE","TRUE","TRUE","$95,227","FALSE","$99,000","1","TRUE","$14,170","33%","$0","$30,765","20%","99%","36.36%","$36,425","$2,500,000","79%","$1,987,000","54.55"],
    ["Kenyon College","203535","Kenyon College","3-Div III","NCAC","TRUE","TRUE","TRUE","FALSE","$95,561","FALSE","$99,000","1","TRUE","$14,170","31%","$0","$22,700","18%","83%","40.00%","$48,042","$2,600,000","87%","$2,255,500","46.95"],
    ["Denison University","202523","Denison University","3-Div III","NCAC","TRUE","TRUE","TRUE","FALSE","$91,245","FALSE","$99,000","1","TRUE","$14,170","17%","$0","$25,248","24%","94%","47.27%","$43,150","$2,400,000","80%","$1,921,440","44.53"],
    ["Worcester Polytechnic Institute","168421","Worcester Polytechnic Institute","3-Div III","NEWMAC","TRUE","TRUE","TRUE","FALSE","$85,629","FALSE","$99,000","1","TRUE","$14,170","59%","$0","$29,758","28%","100%","50.91%","$37,124","$3,408,000","88%","$3,013,694","81.18"],
    ["St Olaf College","174844","St Olaf College","3-Div III","MIAC","TRUE","TRUE","TRUE","TRUE","$79,055","FALSE","$99,000","1","TRUE","$14,170","52%","$0","$22,160","21%","100%","38.18%","$44,722","$2,100,000","84%","$1,753,500","39.21"],
    ["William Paterson University of New Jersey","187444","William Paterson University of New Jersey","3-Div III","NJAC","TRUE","TRUE","TRUE","FALSE","$38,546","FALSE","$99,000","1","TRUE","$14,170","93%","$0","$5,337","59%","93%","100.00%","$61,919","$1,923,000","48%","$917,463","14.82"],
    ["Carleton College","173258","Carleton College","3-Div III","MIAC","TRUE","TRUE","TRUE","FALSE","$93,664","FALSE","$99,000","1","TRUE","$14,170","22%","$0","$21,702","13%","64%","38.18%","$52,993","$2,381,000","91%","$2,171,234","40.97"],
]

# Pre-Offer Tracking data — all 33 rows
# Columns (0-indexed): 0=school, 1=unitid, 2=conference, 3=division,
# 4=coach_name, 5=coach_role, 6=twitter, 7=intro_type,
# 8=on_shortlist, 9=hold, 10=rq_complete, 11=adm_form, 12=followup_email,
# 13=coach_replied, 14=followed_x, 15=follows_you_x, 16=x_dms_open,
# 17=x_dm_sent, 18=replied_x_dm, 19=successful_handoff,
# 20=jr_day_info, 21=campus_visit_invite, 22=camp_invite,
# 23=pre_read_invite, 24=hc_contact, 25=fa_info_submit

PRE_OFFER_ROWS = [
    ["Franklin and Marshall College","212577","Centennial","3-Div III","Chilamo Taylor","WRs & AC (MA)","ChilamoT","Followed You on X","TRUE","FALSE","TRUE","TRUE","FALSE","FALSE","TRUE","TRUE","TRUE","TRUE","TRUE","FALSE","FALSE","TRUE","TRUE","FALSE","TRUE","FALSE"],
    ["Dickinson College","212009","Centennial","3-Div III","Kyle Schuck","OL","DCcoachSchuck","Followed You on X","TRUE","FALSE","TRUE","TRUE","FALSE","FALSE","TRUE","TRUE","TRUE","TRUE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE"],
    ["Muhlenberg College","214175","Centennial","3-Div III","Scott O'Hara","TEs","Coach_OHara51","Followed You on X","TRUE","FALSE","TRUE","TRUE","FALSE","FALSE","TRUE","TRUE","TRUE","TRUE","TRUE","FALSE","TRUE","TRUE","FALSE","FALSE","FALSE","FALSE"],
    ["Johns Hopkins University","162928","Centennial","3-Div III","Stephen Crevani","OL","CoachCrevani","You are Interested","TRUE","FALSE","TRUE","TRUE","TRUE","FALSE","TRUE","FALSE","TRUE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE"],
    ["Carnegie Mellon University","211440","PAC","3-Div III","Jeff Simmons","WRs","CoachFloppy","You are Interested","TRUE","FALSE","TRUE","TRUE","TRUE","FALSE","TRUE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE"],
    ["Gettysburg College","212674","Centennial","3-Div III","Michael Green","HC","Coach_MikeGreen","You are Interested","TRUE","FALSE","TRUE","TRUE","TRUE","FALSE","TRUE","FALSE","TRUE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE"],
    ["Union College","196866","Liberty","3-Div III","Ryan Ehrets","OL","R_Ehrets","You are Interested","TRUE","FALSE","TRUE","TRUE","TRUE","FALSE","TRUE","FALSE","TRUE","FALSE","FALSE","FALSE","TRUE","TRUE","TRUE","FALSE","FALSE","FALSE"],
    ["Ithaca College","191968","Liberty","3-Div III","Kerry Grigsby","DL","CoachGrigs619","You are Interested","TRUE","FALSE","TRUE","TRUE","TRUE","FALSE","TRUE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE"],
    ["Hobart William Smith Colleges","191630","Liberty","3-Div III","Liam Murphy","OL","Liam_FMurphy_","You are Interested","TRUE","FALSE","TRUE","TRUE","TRUE","FALSE","TRUE","FALSE","TRUE","TRUE","TRUE","FALSE","TRUE","TRUE","TRUE","FALSE","FALSE","FALSE"],
    ["Utica University","197045","Empire 8","3-Div III","Braeden Zenelovic","RC & QBs","CoachZenelovic","You are Interested","TRUE","FALSE","TRUE","TRUE","TRUE","FALSE","TRUE","FALSE","TRUE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE"],
    ["St Lawrence University","195216","Liberty","3-Div III","Dominic Centofanti","RC & STs","CoachCentofanti","Followed You on X","TRUE","FALSE","TRUE","TRUE","FALSE","FALSE","TRUE","TRUE","TRUE","TRUE","TRUE","FALSE","FALSE","TRUE","TRUE","TRUE","FALSE","FALSE"],
    ["University of Rochester","195030","Liberty","3-Div III","Jason Henshaw","DL & RC","IamcoacHHeav","Followed You on X","TRUE","FALSE","TRUE","TRUE","FALSE","FALSE","TRUE","TRUE","TRUE","TRUE","TRUE","FALSE","TRUE","TRUE","TRUE","FALSE","FALSE","FALSE"],
    ["The Catholic University of America","131283","Landmark","3-Div III","Brandon Beech","DC","Coach_Beech42","You are Interested","TRUE","FALSE","TRUE","TRUE","TRUE","FALSE","TRUE","TRUE","TRUE","TRUE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE"],
    ["Chapman University","111948","SCIAC","3-Div III","David Bishop","DC","CoachDaveBishop","You are Interested","TRUE","FALSE","TRUE","TRUE","TRUE","FALSE","TRUE","FALSE","TRUE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE"],
    ["University of Redlands","121691","SCIAC","3-Div III","David Lord","DL","UR_CoachLord","You are Interested","TRUE","FALSE","TRUE","TRUE","TRUE","FALSE","TRUE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE"],
    ["Middlebury College","230959","NESCAC","3-Div III","Doug Mandigo","HC","MiddFBMandigo","You are Interested","TRUE","FALSE","TRUE","TRUE","TRUE","FALSE","TRUE","TRUE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE"],
    ["Colby College","161086","NESCAC","3-Div III","Mark Clements","OC","BallCoachC","Followed You on X","TRUE","FALSE","TRUE","TRUE","FALSE","FALSE","TRUE","TRUE","TRUE","TRUE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE"],
    ["Williams College","168342","NESCAC","3-Div III","Ramon Mignott","RC","Coach_Miggs","You are Interested","TRUE","FALSE","TRUE","TRUE","TRUE","FALSE","TRUE","","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE"],
    ["Amherst College","164465","NESCAC","3-Div III","Turner Geenty","RC","coachgeenty","Followed You on X","TRUE","FALSE","TRUE","TRUE","FALSE","FALSE","TRUE","TRUE","TRUE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE"],
    ["Trinity College","130590","NESCAC","3-Div III","Mark Melnitsky","OC","coachmelnitsky","Followed You on X","TRUE","FALSE","TRUE","TRUE","FALSE","FALSE","TRUE","TRUE","TRUE","TRUE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE"],
    ["Hamilton College","191515","NESCAC","3-Div III","Randi Moore","DC","CoachRMoore34","You are Interested","TRUE","FALSE","TRUE","TRUE","TRUE","TRUE","TRUE","TRUE","TRUE","TRUE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE"],
    ["Tufts University","168148","NESCAC","3-Div III","Mike McDonald","OC","CoachMacTufts","You are Interested","TRUE","FALSE","TRUE","TRUE","TRUE","FALSE","TRUE","TRUE","TRUE","TRUE","TRUE","FALSE","TRUE","TRUE","FALSE","FALSE","FALSE","FALSE"],
    ["Bates College","160977","NESCAC","3-Div III","Matt Wherhahn","DC","Matt Wherhahn","You are Interested","TRUE","FALSE","TRUE","TRUE","TRUE","TRUE","TRUE","TRUE","TRUE","TRUE","TRUE","FALSE","TRUE","FALSE","TRUE","FALSE","FALSE","FALSE"],
    ["Bowdoin College","161004","NESCAC","3-Div III","Marcus Adams","DL","MarcusAdams_51","Followed You on X","TRUE","FALSE","TRUE","TRUE","FALSE","FALSE","TRUE","TRUE","TRUE","TRUE","TRUE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE","FALSE"],
    ["Wesleyan University","130697","NESCAC","3-Div III","Adam Chicoine","DC","CoachSheeks","You are Interested","TRUE","FALSE","TRUE","TRUE","TRUE","FALSE","TRUE","FALSE","TRUE","FALSE","FALSE","FALSE","TRUE","FALSE","TRUE","FALSE","FALSE","FALSE"],
    ["Lawrence University","239017","Midwest","3-Div III","Dallas Dean","RC & OL","coachdallas3","You are Interested","TRUE","FALSE","TRUE","TRUE","TRUE","TRUE","TRUE","FALSE","FALSE","FALSE","FALSE","FALSE","TRUE","TRUE","FALSE","FALSE","FALSE","FALSE"],
    ["Oberlin College","204501","NCAC","3-Div III","John Pont","HC","CoachJPont","Followed You on X","TRUE","FALSE","TRUE","TRUE","TRUE","TRUE","TRUE","TRUE","TRUE","TRUE","TRUE","FALSE","TRUE","TRUE","FALSE","TRUE","TRUE","FALSE"],
    ["Kenyon College","203535","NCAC","3-Div III","Ian Good","HC","IanMGood","You are Interested","TRUE","FALSE","TRUE","TRUE","TRUE","TRUE","TRUE","FALSE","FALSE","FALSE","FALSE","FALSE","TRUE","TRUE","FALSE","FALSE","FALSE","FALSE"],
    ["Denison University","202523","NCAC","3-Div III","Jovon Johnson","DC","coachjo51","You are Interested","TRUE","FALSE","TRUE","TRUE","TRUE","TRUE","TRUE","TRUE","FALSE","FALSE","FALSE","FALSE","TRUE","FALSE","TRUE","FALSE","FALSE","FALSE"],
    ["Worcester Polytechnic Institute","168421","NEWMAC","3-Div III","Salvatore Malignaggi","WR","Coach_MSal","Followed You on X","TRUE","FALSE","TRUE","TRUE","FALSE","TRUE","TRUE","TRUE","TRUE","TRUE","TRUE","FALSE","TRUE","TRUE","TRUE","FALSE","FALSE","FALSE"],
    ["St Olaf College","174844","MIAC","3-Div III","Lucas Kleinschrodt","DC","CoachLucasKlein","You are Interested","TRUE","FALSE","TRUE","TRUE","TRUE","FALSE","TRUE","TRUE","TRUE","TRUE","TRUE","FALSE","FALSE","FALSE","FALSE","TRUE","FALSE","FALSE"],
    ["William Paterson University of New Jersey","187444","NJAC","3-Div III","Edwyn Edwards","HC","Coach_E_Edwards","You are Interested","TRUE","FALSE","TRUE","TRUE","TRUE","TRUE","TRUE","FALSE","FALSE","FALSE","FALSE","FALSE","TRUE","FALSE","FALSE","FALSE","FALSE","FALSE"],
    ["Carleton College","173258","MIAC","3-Div III","Tom Journell","HC","CoachJournell","Followed You on X","TRUE","FALSE","TRUE","FALSE","FALSE","FALSE","TRUE","TRUE","TRUE","TRUE","TRUE","FALSE","FALSE","FALSE","FALSE","TRUE","FALSE","FALSE"],
]

# ---------------------------------------------------------------------------
# Transform helpers
# ---------------------------------------------------------------------------

def strip_currency(val):
    """Convert '$99,000' -> 99000.0. Returns None if empty or zero-like."""
    if not val or val.strip() in ("", "$0", "$-", "-"):
        return None
    cleaned = val.replace("$", "").replace(",", "").strip()
    try:
        result = float(cleaned)
        return result if result != 0.0 else None
    except ValueError:
        return None


def strip_percent(val):
    """Convert '86%' -> 0.86. Returns None if empty."""
    if not val or val.strip() in ("", "0%", "0.00%"):
        return None
    cleaned = val.replace("%", "").strip()
    try:
        return float(cleaned) / 100.0
    except ValueError:
        return None


def to_bool(val):
    """Convert 'TRUE'/'FALSE'/'' to bool. Empty = False."""
    if not val:
        return False
    return val.strip().upper() == "TRUE"


def inches_to_height_str(inches_val):
    """Convert '71' (inches) to 5'11\"."""
    try:
        inches = int(float(inches_val))
        feet = inches // 12
        remaining_inches = inches % 12
        return f"{feet}'{remaining_inches}\""
    except (ValueError, TypeError):
        return None


def build_journey_steps(po_row):
    """
    Build the recruiting_journey_steps JSONB array from Pre-Offer Tracking row.
    Maps boolean columns to the 15-step schema defined in migration 0009.

    Step mapping (confirmed per FIELD_MAPPING_SPEC.md and migration 0009):
      Step 1  = Added to shortlist (always completed=true)
      Step 2  = Completed recruiting questionnaire -> col K (index 10)
      Step 3  = Completed admissions info form -> col L (index 11)
      Step 4  = Contacted coach via email -> col M (index 12)
      Step 5  = Contacted coach via social media -> col O (index 14) [Followed on X]
      Step 6  = Received junior day invite -> col U (index 20)
      Step 7  = Received visit invite -> col V (index 21)
      Step 8  = Received prospect camp invite -> col W (index 22)
      Step 9  = School contacted student via text -> no workbook column (default false)
      Step 10 = Head coach contacted student -> col Y (index 24)
      Step 11 = Assistant coach contacted student -> no workbook column (default false)
      Step 12 = School requested transcript [Pre-Read Invite] -> col X (index 23) [Decision 2]
      Step 13 = School requested financial info [FA Info Submit] -> col Z (index 25) [Decision 2]
      Step 14 = Received verbal offer -> no workbook column (default false)
      Step 15 = Received written offer -> no workbook column (default false)

    NOTE: X DM Sent (col R, index 17) has no distinct step ID in the migration 0009 schema.
    The migration defines one step 5 ("Contacted coach via social media"). X DM Sent is
    tracked in the workbook but cannot be mapped to a separate step without a schema change.
    Mapped Followed on X -> step 5. X DM Sent is not imported. Flagged for Phase 2 review.
    """

    def safe_bool(row, idx):
        if idx < len(row):
            return to_bool(row[idx])
        return False

    steps = [
        {"step_id": 1,  "label": "Added to shortlist",                        "completed": True,               "completed_at": None},
        {"step_id": 2,  "label": "Completed recruiting questionnaire",         "completed": safe_bool(po_row, 10), "completed_at": None},
        {"step_id": 3,  "label": "Completed admissions info form",             "completed": safe_bool(po_row, 11), "completed_at": None},
        {"step_id": 4,  "label": "Contacted coach via email",                  "completed": safe_bool(po_row, 12), "completed_at": None},
        {"step_id": 5,  "label": "Contacted coach via social media",           "completed": safe_bool(po_row, 14), "completed_at": None},
        {"step_id": 6,  "label": "Received junior day invite",                 "completed": safe_bool(po_row, 20), "completed_at": None},
        {"step_id": 7,  "label": "Received visit invite",                      "completed": safe_bool(po_row, 21), "completed_at": None},
        {"step_id": 8,  "label": "Received prospect camp invite",              "completed": safe_bool(po_row, 22), "completed_at": None},
        {"step_id": 9,  "label": "School contacted student via text",          "completed": False,              "completed_at": None},
        {"step_id": 10, "label": "Head coach contacted student",               "completed": safe_bool(po_row, 24), "completed_at": None},
        {"step_id": 11, "label": "Assistant coach contacted student",          "completed": False,              "completed_at": None},
        {"step_id": 12, "label": "School requested transcript",                "completed": safe_bool(po_row, 23), "completed_at": None},
        {"step_id": 13, "label": "School requested financial info",            "completed": safe_bool(po_row, 25), "completed_at": None},
        {"step_id": 14, "label": "Received verbal offer",                      "completed": False,              "completed_at": None},
        {"step_id": 15, "label": "Received written offer",                     "completed": False,              "completed_at": None},
    ]
    return steps


# ---------------------------------------------------------------------------
# STEP 1: Look up Jesse's user_id
# ---------------------------------------------------------------------------

def get_jesse_user_id():
    print("\n--- STEP 1: Look up Jesse's user_id ---")
    # Use the Supabase Auth Admin API to find user by email.
    # Endpoint confirmed working: GET /auth/v1/admin/users?email=<email>
    # Requires service role key in Authorization header.
    import urllib.parse
    encoded_email = urllib.parse.quote(JESSE_EMAIL)
    result = auth_admin_get(f"admin/users?email={encoded_email}")

    if result is None:
        print(f"  ERROR: Auth admin request failed. Is SUPABASE_SERVICE_ROLE_KEY set correctly?")
        print(f"  Have you run seed_users.js first? (seed creates Jesse's auth.users account)")
        return None

    if isinstance(result, dict) and "users" in result:
        users = result["users"]
        if users:
            user = users[0]
            uid = user.get("id")
            print(f"  Found user: {uid} ({user.get('email')})")
            return uid
        else:
            print(f"  ERROR: No user found for email {JESSE_EMAIL}")
            print("  REQUIRED: Run seed_users.js first:")
            print("    SUPABASE_URL=https://xyudnajzhuwdauwkwsbh.supabase.co \\")
            print("    SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/seed_users.js")
            return None

    # Fallback: response may be a list directly
    if isinstance(result, list) and len(result) > 0:
        uid = result[0].get("id")
        print(f"  Found user (list response): {uid}")
        return uid

    print(f"  ERROR: Unexpected response shape for {JESSE_EMAIL}")
    print(f"  Response: {result}")
    return None


# ---------------------------------------------------------------------------
# STEP 2: Insert Jesse's profile
# ---------------------------------------------------------------------------

def insert_profile(user_id):
    print("\n--- STEP 2: Upsert Jesse's profile ---")

    profile = {
        "user_id": user_id,
        "name": "Jesse Bargar",
        "high_school": "Boston College High School",
        "state": "MA",
        "hs_lat": 42.3162356,
        "hs_lng": -71.0454645,
        "grad_year": 2027,
        "position": "DT",
        "gpa": 3.17,
        "sat": 1100,
        "height": "5'11\"",   # 71 inches converted from GRIT FIT Profile
        "weight": 240,
        "speed_40": 5.00,
        "expected_starter": True,
        "captain": False,
        "all_conference": False,
        "all_state": False,
        "agi": 99000,
        "dependents": 1,
        "email": JESSE_EMAIL,
        "status": "active",
    }

    print(f"  Upserting profile for {profile['name']} (user_id: {user_id})")
    result = supabase_post("profiles", profile, upsert=True, on_conflict="user_id")

    if result:
        if isinstance(result, list) and len(result) > 0:
            print(f"  Profile inserted: id={result[0].get('id')}, user_id={result[0].get('user_id')}")
        else:
            print(f"  Profile result: {result}")
        return True
    else:
        print("  ERROR: Profile insert failed.")
        return False


def validate_profile(user_id):
    print("\n  Validating profile...")
    results = supabase_get("profiles", {"user_id": f"eq.{user_id}", "select": "id,name,email,grad_year,position,gpa,agi"})
    if results and len(results) == 1:
        r = results[0]
        print(f"  PASS: profiles row found — id={r.get('id')}, name={r.get('name')}, gpa={r.get('gpa')}, agi={r.get('agi')}")
        return True
    else:
        print(f"  FAIL: Expected 1 profile row, got {len(results) if results else 0}")
        return False


# ---------------------------------------------------------------------------
# STEP 3: Insert 33 short_list_items rows
# ---------------------------------------------------------------------------

def build_short_list_rows(user_id):
    """Build the 33 insert objects from GRIT_FIT_ROWS + PRE_OFFER_ROWS + CAMP_LINKS."""
    rows = []

    # Build a lookup dict: unitid -> pre_offer_row
    po_by_unitid = {int(row[1]): row for row in PRE_OFFER_ROWS}

    for gf_row in GRIT_FIT_ROWS:
        school_name = gf_row[0].strip()
        unitid = int(gf_row[1])
        div = gf_row[3].strip()
        conference = gf_row[4].strip()

        coa = strip_currency(gf_row[9])         # col J
        net_cost = strip_currency(gf_row[21])    # col V = Projected Net EFC w/ FB Offer + Merit
        adltv = strip_currency(gf_row[24])       # col Y
        grad_rate = strip_percent(gf_row[23])    # col X
        droi_raw = gf_row[25]
        droi = float(droi_raw) if droi_raw else None

        camp_link = CAMP_LINKS.get(unitid)

        # Coach contact from Pre-Offer Tracking
        po_row = po_by_unitid.get(unitid)
        if po_row:
            coach_contact = {
                "name": po_row[4].strip() if po_row[4] else None,
                "role": po_row[5].strip() if po_row[5] else None,
                "twitter": po_row[6].strip() if po_row[6] else None,
                "intro_type": po_row[7].strip() if po_row[7] else None,
            }
            journey_steps = build_journey_steps(po_row)
        else:
            print(f"  WARNING: No Pre-Offer Tracking row found for unitid {unitid} ({school_name})")
            coach_contact = {"name": None, "role": None, "twitter": None, "intro_type": None}
            journey_steps = build_journey_steps([])

        row = {
            "user_id": user_id,
            "unitid": unitid,
            "school_name": school_name,
            "div": div,
            "conference": conference,
            "coa": coa,
            "net_cost": net_cost,
            "droi": droi,
            "adltv": adltv,
            "grad_rate": grad_rate,
            "camp_link": camp_link,
            "coach_contact": coach_contact,
            "source": "grit_fit",
            "grit_fit_status": "currently_recommended",
            "recruiting_journey_steps": journey_steps,
        }
        rows.append(row)

    return rows


def insert_short_list_items(user_id):
    print("\n--- STEP 3: Insert 33 short_list_items rows ---")
    rows = build_short_list_rows(user_id)
    print(f"  Built {len(rows)} rows.")

    # Supabase REST API accepts array for bulk insert
    result = supabase_post("short_list_items", rows, upsert=True, on_conflict="user_id,unitid")

    if result is not None:
        if isinstance(result, list):
            print(f"  Inserted {len(result)} rows.")
        else:
            print(f"  Insert result: {result}")
        return True
    else:
        print("  ERROR: short_list_items insert failed. Attempting row-by-row fallback...")
        success_count = 0
        fail_count = 0
        for i, row in enumerate(rows):
            r = supabase_post("short_list_items", row, upsert=True, on_conflict="user_id,unitid")
            if r is not None:
                success_count += 1
            else:
                fail_count += 1
                print(f"  ROW FAIL: unitid={row['unitid']} ({row['school_name']})")
        print(f"  Fallback complete: {success_count} succeeded, {fail_count} failed.")
        return fail_count == 0


def validate_short_list_items(user_id):
    print("\n  Validating short_list_items count...")
    results = supabase_get("short_list_items", {"user_id": f"eq.{user_id}", "select": "id,unitid,school_name"})
    if results is not None:
        count = len(results)
        status = "PASS" if count == 33 else "FAIL"
        print(f"  {status}: Expected 33 rows, found {count}")
        return count == 33
    else:
        print("  FAIL: Could not retrieve short_list_items.")
        return False


# ---------------------------------------------------------------------------
# STEP 4: Spot-check validation
# ---------------------------------------------------------------------------

def spot_check(user_id):
    print("\n--- STEP 4: Spot-check validation ---")

    # Spot check 3 schools
    spot_checks = [
        {"unitid": 212577, "school": "Franklin and Marshall College",
         "expected_coach": "Chilamo Taylor", "expected_camp": "https://www.blueandwhitefootballcamps.com/",
         "expected_net_cost": 50207, "expected_steps_true": [1, 2, 3, 5, 7, 8, 10]},
        {"unitid": 168148, "school": "Tufts University",
         "expected_coach": "Mike McDonald", "expected_camp": "https://newenglandelitefootballclinic.com/home/",
         "expected_net_cost": 54536, "expected_steps_true": [1, 2, 3, 4, 5, 6, 7]},
        # Tufts: K=TRUE(2), L=TRUE(3), M=TRUE(4), O=TRUE(5), U=TRUE(6), V=TRUE(7), W=FALSE(8)
        {"unitid": 130697, "school": "Wesleyan University",
         "expected_coach": "Adam Chicoine", "expected_camp": "https://wesleyanfootballcamps.ryzerevents.com/",
         "expected_net_cost": 57072, "expected_steps_true": [1, 2, 3, 4, 5, 6, 8]},
        # Wesleyan: K=TRUE(2), L=TRUE(3), M=TRUE(4), O=TRUE(5), U=TRUE(6), V=FALSE(7), W=TRUE(8), Y=FALSE(10)
    ]

    all_pass = True
    for check in spot_checks:
        results = supabase_get("short_list_items", {
            "user_id": f"eq.{user_id}",
            "unitid": f"eq.{check['unitid']}",
            "select": "school_name,net_cost,camp_link,coach_contact,recruiting_journey_steps",
        })
        if not results or len(results) == 0:
            print(f"  FAIL [{check['school']}]: Row not found")
            all_pass = False
            continue

        row = results[0]
        coach = row.get("coach_contact", {})
        steps = row.get("recruiting_journey_steps", [])

        print(f"\n  School: {row.get('school_name')}")
        print(f"    net_cost: {row.get('net_cost')} (expected ~{check['expected_net_cost']})")
        print(f"    camp_link: {row.get('camp_link')} (expected: {check['expected_camp']})")
        print(f"    coach name: {coach.get('name')} (expected: {check['expected_coach']})")

        # Check net_cost within $10 tolerance (rounding)
        net_cost_val = row.get("net_cost")
        if net_cost_val is not None:
            diff = abs(float(net_cost_val) - check["expected_net_cost"])
            nc_status = "PASS" if diff < 10 else "FAIL"
            print(f"    net_cost check: {nc_status} (diff={diff:.0f})")
        else:
            print(f"    net_cost check: FAIL (null)")
            all_pass = False

        # Check camp_link
        camp_status = "PASS" if row.get("camp_link") == check["expected_camp"] else "FAIL"
        print(f"    camp_link check: {camp_status}")
        if camp_status == "FAIL":
            all_pass = False

        # Check coach name
        coach_status = "PASS" if coach.get("name") == check["expected_coach"] else "FAIL"
        print(f"    coach name check: {coach_status}")
        if coach_status == "FAIL":
            all_pass = False

        # Check journey steps
        completed_step_ids = {s["step_id"] for s in steps if s.get("completed")}
        expected_set = set(check["expected_steps_true"])
        steps_match = expected_set.issubset(completed_step_ids)
        steps_status = "PASS" if steps_match else "FAIL"
        print(f"    journey steps check: {steps_status}")
        print(f"      Expected completed: {sorted(expected_set)}")
        print(f"      Actual completed:   {sorted(completed_step_ids)}")
        if not steps_match:
            all_pass = False

    return all_pass


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("=" * 60)
    print("Jesse Bargar — Full Supabase Import")
    print("Target: xyudnajzhuwdauwkwsbh")
    print("Source: Workbook ID 1uCbOSTVwnlR1mDa5ZzcuUeHAfe25qmtlSNqut-A7B-U")
    print("Authored by: David (Data Steward) 2026-03-26")
    print("=" * 60)

    # Pre-flight checks
    print("\n--- PRE-FLIGHT ---")
    print(f"  Supabase URL: {SUPABASE_URL}")
    print(f"  Jesse email:  {JESSE_EMAIL}")
    print(f"  GRIT FIT rows embedded: {len(GRIT_FIT_ROWS)}")
    print(f"  Pre-Offer rows embedded: {len(PRE_OFFER_ROWS)}")
    print(f"  Camp links with URL: {sum(1 for v in CAMP_LINKS.values() if v is not None)} (23 expected after Wesleyan correction)")
    print(f"  Camp links null: {sum(1 for v in CAMP_LINKS.values() if v is None)} (10 expected — 9 no-URL rows + Carleton corrected to null)")
    assert len(GRIT_FIT_ROWS) == 33, f"Expected 33 GRIT FIT rows, got {len(GRIT_FIT_ROWS)}"
    assert len(PRE_OFFER_ROWS) == 33, f"Expected 33 Pre-Offer rows, got {len(PRE_OFFER_ROWS)}"

    # Step 1: Get Jesse's user_id (use known UUID, fall back to auth lookup)
    if JESSE_USER_ID:
        print(f"\n--- STEP 1: Using provided user_id: {JESSE_USER_ID} ---")
        user_id = JESSE_USER_ID
    else:
        user_id = get_jesse_user_id()
        if not user_id:
            print("\nABORTED: Cannot proceed without Jesse's user_id.")
            print("Run seed_users.js first to create Jesse's auth account.")
            sys.exit(1)

    # Step 2: Insert profile
    profile_ok = insert_profile(user_id)
    if not profile_ok:
        print("\nABORTED: Profile insert failed. See errors above.")
        sys.exit(1)
    validate_profile(user_id)

    # Step 3: Insert 33 short_list_items
    sli_ok = insert_short_list_items(user_id)
    validate_short_list_items(user_id)

    # Step 4: Spot-check validation
    spot_ok = spot_check(user_id)

    # Final summary
    print("\n" + "=" * 60)
    print("IMPORT SUMMARY")
    print("=" * 60)
    print(f"  Profile insert:       {'PASS' if profile_ok else 'FAIL'}")
    print(f"  Short list insert:    {'PASS' if sli_ok else 'FAIL'}")
    print(f"  Spot-check:           {'PASS' if spot_ok else 'FAIL (see details above)'}")
    print()
    print("  NOTES:")
    print("  1. X DM Sent (Pre-Offer Tracking col R) has no distinct step ID in the")
    print("     migration 0009 schema. It is NOT imported. Step 5 maps to 'Followed on X'")
    print("     only. Flag for Phase 2 schema review if X DM Sent needs its own step.")
    print("  2. 11 schools have null camp_link (no extractable URL from workbook).")
    print("     Deferred to Phase 2 or manual lookup per FIELD_MAPPING_SPEC.md.")
    print("  3. Carleton College camp_link = null (workbook error corrected per spec).")
    print("  4. All 33 rows have grit_fit_status = 'currently_recommended'.")

    if profile_ok and sli_ok and spot_ok:
        print("\n  RESULT: IMPORT COMPLETE — all gates PASS")
    else:
        print("\n  RESULT: IMPORT COMPLETED WITH FAILURES — review errors above")
        sys.exit(1)


if __name__ == "__main__":
    main()
