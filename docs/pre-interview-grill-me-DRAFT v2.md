# Gritty Recruit Hub Rebuild — Pre-Interview Document

> **Purpose**: This document prepares Claude.ai for a "grill-me" interview session about the Gritty Recruit Hub rebuild. Sections 1-6 are authored by Chris Conroy (Operator). Sections 5 ("The scoring logic") and 6 ("The data") contain answers drafted by Nova (Orchestrator) from the existing cfb-recruit-hub codebase — specifically `scoring.js`, `constants.js`, and the Supabase migration files — to communicate the algorithm and data architecture in a format optimized for AI comprehension.

---

## 1. The Objective

Our objective is to rebuild a mobile-friendly web application for student-athletes and their parents, high school coaches, high school guidance counselors, high school administrators, college coaches, and college admissions counselors to organize and strategically execute a (1) college football recruiting and (2) college admissions process. At the institutional level, these two processes both compete with and support one another.

The app should achieve the intended roadmap of the original dev/CFB-Recruit-Hub and additional features that support the communication and information relationships between those various user cohorts and the tools they use consistently (Hudl, SCOIR, Canvas, ARMS Software, Sidearm, JumpForward, FrontRush, RecruitSpot, PrestoSports, TFAForms, ARI, Google Docs, Microsoft OneDrive, and MSFT cloud apps).

The app's development should establish a foundation for the future development of two additional versions of the mobile-friendly web app:

- A pure mobile app
- Desktop app

(See the Intended Development Pathway below.)

### Intended Development Pathway

1. A mobile-friendly web app is the priority and the primary development goal.
2. The secondary development goal is a mobile version of the app.
3. The tertiary goal is a desktop app.

### Our Foundation High School-to-College Sport Pipeline

High school and college football.

---

## 2. Current Development Environment

These two documents are different file versions of the same documentation process: We mapped a real-time hierarchical file map for Claude (online) context. It can be used by Claude.ai to locate source files for the cfb-recruit-hub rebuild or cross-repo work. These will be attached in a chat prompt with Claude.ai when Claude requests them.

- **TEXT FILE**: `C:\Users\chris\dev\dev-map\dev-map.txt`
- **HTML FILE**: `C:\Users\chris\dev\dev-map\dev-map.html`

---

## 3. The User

### The Primary Users

- The high school football student-athlete (freshman through senior year)
- The student-athlete's parents
- The student-athlete's high school coach
- All college football coaches (head coaches and any assistant coaches or athletics staff involved in football recruiting)

All other users generally help support these users with the supply of documentation and generally only need read access to the application.

### Who is the Student-Athlete?

The initial student-athlete of this web application will fit a particular student-athlete profile who requires a sales pipeline and College Football Recruiting CRM tool to:

- **Establish a Target Market** — Strategically and quickly establish or adjust a set of target schools, as well as the football programs and their respective coaches that they wish to be recruited by (customers)
- **Manage the Recruiting Journey** — Organize, curate, and share all of their key athletic information, events, communication channels, and next steps relative to the unique recruiting process for those target schools
- **Track and Manage "Closing the Deal"** — Track their athletic, academic, and recruiting fit as well as their likelihood of admissions support for those schools as they progress through their recruiting journey

This type of tool will be necessary for some football student-athletes more than others at first, but we anticipate that continued use of the tool will eventually lead to all student-athletes across all sports wanting to utilize the tool as it continues to gather additional users and information.

We will explain this initial football student-athlete profile below.

### Understanding the Big Pipeline

There are roughly 250,000 high school football players in each high school grade level.

In any given annual cohort of about 225,000 seniors, only about 14,000 of these players will go on to be successfully recruited and receive a combination of admissions support and athletic aid at a school with an NCAA football program at the Division 1-FBS, Division 1-FCS, 2, or 3 level.

#### Available Roster Spots by NCAA Division Level

- **D1-FBS** = 136 schools in total = ~3,800 annual roster spots available for high school recruits
- **D1-FCS** = 129 schools in total = ~2,600 annual roster spots available for high school recruits
- **D2** = 161 schools in total = <3,100 annual roster spots available for high school recruits (this number will continue to decrease each year until it reaches, by my estimates, ~1,500 high school recruits each year)
- **D3** = 239 schools in total = ~4,300 annual roster spots available for high school recruits

#### General Admissions & Financial Aid Profile by NCAA Division Level

- **D1-FBS** = Full-athletic scholarship granted to the SA through the athletic department budget, provided the SA meets the minimum NCAA GPA and high school credit requirements for admission. Only about a dozen schools have higher academic requirements for football student-athletes, like Stanford, Army, Navy, Air Force, Duke, Wake Forest, and a handful of others.
- **D1-FCS** = Partial and equivalency-based athletic scholarships granted to the SA through the athletic department budget, provided the SA meets the minimum NCAA GPA and high school credit requirements for admission, except for the Ivy League and Patriot League. A significantly greater share of FCS schools have higher academic admissions requirements that student-athletes must achieve in addition to their qualifying athletic talent. Several conferences and schools have higher academic and admissions requirements for student-athletes, including the Ivy League, Patriot League, and Pioneer League.
- **D2** = Partial and equivalency-based athletic scholarship granted to admitted SA through the athletic department budget, provided the SA meets the minimum NCAA GPA and high school credit requirements for admission.
- **D3** = Non-scholarship schools. Admission support for student-athletes is typically based on an academic index (and potentially a financial aid need profile) that is unique to each school's admissions office and/or its current athletic conference. There is some flexibility for coaches to advocate for the SA's admission to the school and the provision of a generous financial aid package. This admissions flexibility is unique to each school and/or its athletic conference. Football coaches at D3 have significantly less influence over admissions than D1 or D2 coaches, who are typically constrained only by roster spot limits and athletic department budgets, provided they are not subject to the academic and admissions requirements of those select D-1 FBS schools and D1-FCS conferences already mentioned.

#### General Institutional Profile

- **D1-FBS** = Massive, flagship state universities, land-grant institutions, and/or large private R1 research institutions with significant athletic department budgets that allow them to spend between $5,000 - $15,000 per player relative to their recruitment budget. Thus, can travel nationally to recruit.
- **D1-FCS** = Large state or regional universities, land-grant institutions, R2 research universities, or (in the Northeast) prestigious, selective, private research universities that are non-scholarship-granting or maintain a focus on academics over athletics. Athletic department budgets allow them to spend between $1,000 - $8,000 per player relative to their recruitment budget, but typically closer to $2,500 per player successfully recruited to a roster spot. Can travel regionally to recruit.
- **D2** = Mid-sized, regional, niche professional degree-granting institutions (like Bentley or Colorado School of Mines) with less selective admissions requirements (accept 60%+ of applicants and typically closer to 80%+). Athletic department budgets allow them to spend between $500 - $1,500 per player per player successfully recruited to a roster spot relative to their athletic department. Can travel semi-regionally to recruit but typically remain within neighboring states that are no more than a day's drive from their home campus.
- **D3** = Small, liberal arts institutions of widely varying admissions standards. Athletic department budgets allow them to spend between $50 - $1,000 per player per player successfully recruited to a roster spot relative to their athletic department. The typical average is $400 per player. All D3 schools, except the most prestigious Division 3 schools in the country (NESCAC, SCIAC, Johns Hopkins, Wash U), travel semi-regionally to recruit and typically remain within neighboring states that are no more than a day's drive from their home campus.

### The Initial Student-Athlete User

- **Which Schools?** — Underclassmen (freshman - junior year football SAs) who are attempting to determine what kinds of schools they are most likely to be successfully recruited by
- **Where do I stand?** — SAs who want to understand where they truly are located in terms of the timeline of college football recruiting events and developmental timelines for various schools, and what next steps they need to take relative to those recruiting timelines and events to be recruited by those schools
- **How do I optimize for the best results?** — SAs and parents who want a way to better organize their academic and athletic life — and share this information with college coaches and admissions staff — to optimize it for college football recruiting success, which we equate with targeted college football options that fit your college interests, athletic interests, and qualifications in both academics and athletics.
- **How do I decide?** — SAs and parents who want objective answers for how to make decisions at various junctures of the recruitment and admissions process in order to achieve optimal outcomes for their SAs college career and future earning potential.

Given this college football landscape and these general user goals, the type of high school football student-athlete we are describing, who will most need these services in their high school years, will likely be:

- An above-average academic background. They will likely possess a 3.0+ GPA, which makes them an automatic qualifier for many less prestigious and selective institutions, but an academic "tweener" for many more selective institutions. Creates uncertainty in their targeting, recruitment, and selection process.
- They may be surrounded by family, friends, and social networks that present a high amount of football and athletic interest, but they will not be connected to expert-level football recruiting knowledge or networks (not a coach's son). Creates uncertainty in their targeting, recruitment, and selection process.
- May be struggling to compete for playing time at a very high level of regional high school athletics, and have some confidence issues associated with that, and question their ability to get enough opportunity at the high school level to get noticed by college coaches despite their athletic talent. May be a projected starter on their varsity team during their senior year but have not earned any significant football accolades yet beyond a few downs of varsity playing time. Creates uncertainty in their targeting, recruitment, and selection process.
- Has athletic fit measurables (height, weight, and speed) that place them in the 40th - 60th percentile of the typical recruit between Divisions 1-FCS, Division 2, and Division 3. As a result, they are unsure of what level of play they should target, which compounds their confusion by introducing various recruiting policies, timelines, and standards of these different types of schools. Creates uncertainty in their targeting, recruitment, and selection process.

Estimated conservatively, this represents a potential annual TAM of roughly 8,000 annual high school football student-athlete accounts, 12,000 annual parent accounts, with an additional 1,000 permanent high school coaches, 1,000 permanent college coach/recruiter accounts, and 1,000 permanent guidance counselor accounts.

### What Do They Know When They Arrive at the Webapp?

When they first arrive, they only need to know:

- Their Name
- Name of their High School
- High School State
- Their graduation year
- Their email
- Their primary phone number
- Their primary football position
- Height
- Weight
- Speed
- Their estimated cumulative high school GPA
- Any football accolades they have earned (team captain, all-conference, all-state)
- Whether or not they are expected to be a "starter" at their primary position on their varsity high school football team in their upcoming or current football season
- Optional — their PSAT/ACT or SAT/ACT scores
- Optional — Parent/Household Income and Number of Dependents

This information will — through our proprietary algorithm — give us:

- An **"Athletic Fit"** value, which provides an initial gate for the competitiveness of their athletic profile, which filters the number of schools they qualify for as a student-athlete
- Two types of **"Academic Fit"** values, which provide a secondary filtering and sorting mechanism for up to 30 of the schools for which they athletically qualify and possess the best possible academic profile, given their current academic achievement in high school
- A **"Recruit Reach"** value, which provides a tertiary filtering mechanism to determine which schools within that "athletic fit" and "academic fit" cohort are most likely to actively recruit them as student-athletes, given their recruiting budget and therefore regional recruiting reach.

These three values will — through our proprietary algo — then be used to determine a **"Grit Fit"** score, which will provide us with a Target List of up to 30 schools they are best positioned to target as "Short List" recruitable school options. Alternatively, if the student-athletes' athletic fit, academic fit, and recruitable reach values fall outside of their recruitability, even at the less academically selective Division 3 level, the app will generate some practical next steps for how they can increase their opportunities to be recruited for college football, given their current graduating year.

### What Do They Need When They Leave?

After their first use:

1. An authenticated and password-protected unique user account on the platform that — in some cases — is updateable with new information
2. A Grit Fit list of up to 30 Target Schools with external links to the undergraduate admissions websites and college football athletics department webpages
3. The option to create and compare a Short List of schools based on projected costs, academic outcomes, and financial outcomes from this target list
4. Have the ability to access coach contact information and social media profiles, recruiting questionnaires, recruiting events (camps and "Junior Days" and "Game Day Visits") through external links unique to each respective school. Coaching information that is particularly important to be accessed will be the head coach, their position coach, and the area recruiting coach at each one of their short-listed schools. These roles may overlap within one or two coaches.
5. Have the ability to strategically schedule and be notified of recruiting events at their short list schools or events at which their short list school coaches
6. Have the ability to track their progress through a pipeline of relationship-building and athletic qualifying events in the "Pre-Offer" Recruiting Journey that compound upon one another in a pipeline to increase their likelihood of receiving an offer of admission and financial support (scholarship) from each one of their short-listed schools. (Recruiting Questionnaire > Contact via Email > Contact via Social Media > Invitation to a Recruiting Event > Invitation to an On-Campus Recruiting Event > Invitation to a Prospect Camp > Invitation to Submit Academic Information > Invitation for a Personal, Individual Visit to the School > Verbal Offer of Support > Invitation to Submit Financial Aid Information > Official or "Committable" Offer of Admissions Support)
7. A Recruiting Scoreboard that aggregates their progress through the pipeline and compares their likelihood of receiving an offer from each of their short-listed schools
8. The ability to contact and have their accounts contacted by college coaches with user accounts
9. The ability to upload academic and recruiting information to a secure file system and dropbox
10. A tracker for the academic information they need to submit to schools and a place to store it in their folder structure
11. A tracker for their financial aid information and place to store it in their folder structure and compare potential and actual financial aid offers from various schools
12. A place where they can link APIs for different recruiting sites, social media profiles, and college search sites (Optional)
13. A connection to their Hudl account and Twitter/X account (optional)
14. The ability to link their accounts to their parents' user accounts (Optional)
15. The ability to be connected as a cohort to other players at their high school, and thus searchable, sortable, and aggregatable through high school coach user accounts (Required for coaches accounts, natural result of user account and high school assignment during student account creation process)

---

## 4. The Workflow

What happens in sequence from a user's first visit to a returning user?

1. See the general, filterable map of all 662 NCAA programs in the Gritty OS DB. Be able to access school detail cards, which include recruiting questionnaires and coaches' contact information. Get access to Gritty City Limits (our free, public-facing tutorial page with tips for how to navigate the recruiting process using GrittyOS)
2. Set up a Student-Athlete Profile and account by filling out the Grit Fit form, which should include creating a Student-Athlete account and password, or prompts/informational incentives to create a user account and password.
3. Once you have set up a student-athlete account using the Grit Fit form, you will have access to Gritty City Core (select, premium tutorials and tips on how to navigate the college football recruiting process using GrittyOS, insider recruiting tips on how to become an attractive prospect for various schools and conferences, and how to make the most out of the various recruiting events and processes you will encounter on your Recruiting Journey.)
4. Once your user account has been created, instantly be provided with your Grit Fit scores (Athletic and Two Academic Fits) and your Grit Fit schools in both a Map View and a Table View. See where your Grit Fit schools are located on the map or see them compared to one another in a Grit Fit table ranked by their Grit Fit, which has sortable and tool-tipped field headers describing the athletic and financial outcomes aspects of each school and provides links to recruiting questionnaires and coach contact information for those schools. Be able to add any of these Grit Fit schools to your "Short List" table page, either from your Map View or Table View.
5. Once you have added at least one school to your Short List, you are then provided with another table view for that Short List with more focused, sortable, and tool-tipped field headers describing the athletic and financial outcomes aspects of each school, and comparable charts of outcomes-based data showing how your Short List schools stack up to one another in terms of projected costs and outcomes.
6. Once you have added at least one school to your Short List, you will also be provided with a Recruiting Next Steps view, which will provide you with a set of steps and a timeline by which you need to complete those steps to remain recruitable by those schools on your short list.
7. (Optional, if available, given your parent/guardian and coach account status) Once you have added at least one school to your short list and been connected to a coach or parent account, this will open up your File Folder view, which will allow you to upload academic information from your guidance department and College Board account, which will verify your academic information and help you plan for the unique admissions and financial aid process at your short list schools.
8. (Optional, if you decide to complete a recruiting questionnaire during your first visit) Once you have added schools to your short list and certified that you have completed a recruiting questionnaire for those schools, this will open up your Pre-Offer Tracking and Recruiting Scoreboard views, which you can use to track your progress on the Recruiting Journey with each school and compare your progress between them.

---

## 5. The Scoring Logic

### How does GRIT FIT work?

GRIT FIT is a three-gate sequential filter that takes an athlete's self-reported profile and scores it against every school in the 662-school GrittyOS database. A school must pass all three gates to appear on the athlete's Target List. The gates execute in order — a school eliminated at Gate 1 never reaches Gate 2.

**Gate 1 — Athletic Fit (Tier Match)**

The athlete's position, height, weight, and 40-yard dash time are compared to median recruit standards for that position at each competitive tier. There are five tiers, evaluated in descending order of competitiveness:

| Tier | Internal Key | Example |
|------|-------------|---------|
| Power 4 | `"Power 4"` | SEC, Big Ten, ACC, Big 12 |
| Group of 6 | `"G6"` | AAC, Sun Belt, MAC, MW, C-USA, independent FBS |
| FCS | `"1-FCS"` | Ivy League, Patriot League, Pioneer League, etc. |
| Division II | `"2-Div II"` | All D2 conferences |
| Division III | `"3-Div III"` | All D3 conferences |

For each tier, the algorithm computes three z-scores using a **standard normal CDF** (matching Google Sheets' `NORM.DIST`):

- **Height score** = `normCDF((athlete_height - tier_median_height) / 1.5)`
- **Weight score** = `normCDF((athlete_weight - tier_median_weight) / (tier_median_weight * 0.05))`
- **Speed score** = `1 - normCDF((athlete_40_time - tier_median_40) / 0.15)` (inverted because lower is better)

The Athletic Fit for that tier = average of these three scores (0.0 to 1.0 scale).

**Award Boosts** are added after the base score is calculated:

| Award | Boost |
|-------|-------|
| Expected Starter | +0.05 |
| Team Captain | +0.05 |
| All-Conference | +0.10 |
| All-State | +0.15 |

The boosted score is capped at 1.0. The algorithm then finds the highest tier where the athlete's score exceeds 0.50 — this becomes their **Top Tier**. Only schools matching this tier pass Gate 1.

**Position standards** are defined for all 16 positions (QB, RB, FB, TE, WR, OL, C, G, T, DL, DE, DT, EDGE, LB, CB, S) across all 5 tiers. The standards are stored in `constants.js` as the `ATH_STANDARDS` object with median height (`h50`, in inches), weight (`w50`, in pounds), and 40-yard dash time (`s50`, in seconds) for each tier-position combination.

**Gate 2 — Recruit Reach (Geographic Filter)**

Once the Top Tier is determined, the algorithm assigns a **recruiting radius** in miles based on how far schools at that tier typically travel to recruit:

| Tier | Recruiting Radius (miles) |
|------|--------------------------|
| Power 4 | 2,500 |
| Group of 6 | 1,500 |
| FCS | 1,000 |
| Division II | 600 |
| Division III | 450 |

The distance between the athlete's high school (latitude/longitude, or state centroid fallback) and each school's campus coordinates is calculated using the **Haversine formula** (great-circle distance). Schools beyond the recruiting radius for the athlete's Top Tier are eliminated.

**Gate 3 — Academic Fit (GPA + SAT Threshold)**

Academic fit uses two scoring pathways depending on whether a school is test-optional:

**Standard pathway** (school requires test scores):
- SAT Percentile = lookup from a nationally-representative percentile table (e.g., SAT 1250 = 86th percentile = 0.86)
- GPA Percentile = linear scale from 1.0 (= 0.0) to 3.7+ (= 1.0), formula: `(gpa - 1.0) / 2.7`
- Academic Rigor Score = `(SAT_percentile + GPA_percentile) / 2`

**Test-optional pathway** (school does not require test scores):
- Academic Rigor Score = GPA Percentile only

Each school has a **pre-computed academic rigor threshold** that varies by the athlete's class year (Senior, Junior, Sophomore, Freshman). This threshold represents the minimum academic profile needed for admission at that school. If the athlete's academic rigor score meets or exceeds the school's threshold, the school passes Gate 3.

The class year is dynamically calculated: the "Senior" class is the graduating class whose May 1 graduation follows the next upcoming September 1. Each earlier graduation year maps to Junior, Sophomore, Freshman.

**Result: Target List**

Schools that pass all three gates are ranked by their academic rigor threshold (highest threshold first — meaning the most academically demanding qualifying schools rank highest). The top 30 form the **Target List** ("top" tier), positions 31-40 are "good" matches, and 41-50 are "borderline." Beyond 50, schools are excluded.

### How does the algorithm actually work?

The algorithm is implemented in a single entry-point function, `runQuickList(athlete, schools, trackerMap)`, in `src/lib/scoring.js`. Here is the execution sequence:

```
INPUT: athlete object (form data) + schools array (662 rows from GrittyOS DB)

STEP 1: Determine class label from gradYear
  → getClassLabel(gradYear) → "Senior" | "Junior" | "Soph" | "Freshman"

STEP 2: Compute base Athletic Fit for all 5 tiers
  → For each tier: calcAthleticFit(position, height, weight, speed40, tier)
    → Looks up ATH_STANDARDS[tier][position] → { h50, w50, s50 }
    → Computes 3 z-scores via normCDF → averages → [0..1]

STEP 3: Apply award boosts
  → calcAthleticBoost(awards) → sum of applicable boosts (max +0.35)
  → Add boost to each tier's base score, cap at 1.0

STEP 4: Determine Top Tier
  → First tier (in descending order) where boosted score > 0.50
  → If none > 0.50, topTier = null → athlete qualifies for zero schools

STEP 5: Set Recruit Reach radius from RECRUIT_BUDGETS[topTier]

STEP 6: Compute athlete's academic scores
  → SAT percentile (lookup table) + GPA percentile (linear scale)
  → acadRigorScore = (SAT + GPA) / 2
  → acadTestOptScore = GPA only

STEP 7: Score every school (662 iterations)
  For each school:
    a. Compute distance via Haversine(athlete_coords, school_coords)
    b. Gate 1: Does school.Type === topTier? → gateAthletic
    c. Gate 2: Is distance <= recruitReach? → gateDist
    d. Gate 3: Is athlete's academic score >= school's rigor threshold
       for their class year? → gateAcad
    e. eligible = gateAthletic AND gateDist AND gateAcad
    f. Compute financial metrics (EFC, merit likelihood, net cost,
       DLTV, ADLTV, DROI, break-even years)

STEP 8: Rank eligible schools by acadScore descending
  → Assign matchRank (1..N) and matchTier ("top"/"good"/"borderline")
  → Cap at 50 schools

STEP 9: Compute gate diagnostics
  → passAthletic: how many schools matched the tier
  → passDist: of those, how many were within reach
  → passAcad: of those, how many met academic threshold
  → passAll: final eligible count

OUTPUT: { top30, top50, scored (all 662), athFit, athFitBase, boost,
          topTier, recruitReach, acadRigorScore, acadTestOptScore, gates }
```

**Financial calculations** (computed per school but not part of the gating logic — used for display and comparison on the Short List):

- **EFC (Expected Family Contribution)**: Lookup from an income/dependents table (`EFC_TABLE`). Eligibility varies by school selectivity tier (elite, private, public) and family size.
- **Athletic Scholarship estimate**: FBS = full COA, FCS = 60% of COA, D2 = 30% of COA. Ivy League and Pioneer League = $0 (non-scholarship).
- **Merit Likelihood**: Based on the school's share of students receiving aid, share receiving need-based aid, and need-blind status. Need-blind schools show 0 merit likelihood.
- **Net Cost**: `(EFC * 4 years * 1.18 inflation factor) - merit deductions`
- **DLTV (Degree Lifetime Value)**: Pre-computed per school in the database.
- **ADLTV (Adjusted DLTV)**: `DLTV * graduation_rate`
- **DROI (Degree Return on Investment)**: `ADLTV / net_cost` (or 100 if net cost is $0)
- **Break-Even**: `40 / DROI` (years to recoup investment from career earnings differential)

---

## 6. The Data

### What fields matter?

There are three data domains: **School Data** (662 rows, read-only), **Athlete Profile Data** (user-created), and **Short List Data** (user-created, per school).

#### School Data (38 fields — `schools` table)

These are the 662 NCAA football programs in the GrittyOS database. Source of truth: Google Sheet (ID: `1Pc4LOnD1fhQz-9pI_CUEDaAMDfTkUXcCRTVDfoDWvqo`, tab: `GrittyOS DB`). Schools data is **public read, all writes blocked** via RLS. Data is synced from the Google Sheet to Supabase via `sync_schools.py`.

| Field | Type | Gate? | Used For |
|-------|------|-------|----------|
| `unitid` | integer PK | -- | IPEDS join key across all systems |
| `school_name` | text | -- | Display |
| `state`, `city` | text | -- | Display, geographic context |
| `control` | text | -- | Financial calc (Public vs Private affects EFC eligibility) |
| `school_type` | text | -- | Financial calc (Super Elite/Elite/Very Selective = different EFC rules) |
| `type` | text | **Gate 1** | Athletic tier classification (Power 4, G6, 1-FCS, 2-Div II, 3-Div III) |
| `ncaa_division` | text | -- | Athletic scholarship calculation (FBS=full, FCS=60%, D2=30%) |
| `conference` | text | -- | Scholarship rules (Ivy/Pioneer = $0 athletic scholarship) |
| `latitude`, `longitude` | numeric | **Gate 2** | Haversine distance to athlete's high school |
| `coa_out_of_state` | numeric | -- | Financial: Cost of Attendance baseline |
| `est_avg_merit`, `avg_merit_award` | numeric | -- | Financial: merit aid estimation |
| `share_stu_any_aid` | numeric | -- | Financial: % students receiving any aid |
| `share_stu_need_aid` | numeric | -- | Financial: % students receiving need-based aid |
| `need_blind_school` | boolean | -- | Financial: need-blind schools show $0 merit likelihood |
| `dltv` | numeric | -- | Financial: Degree Lifetime Value (pre-computed) |
| `acad_rigor_senior` through `_freshman` | numeric (x4) | **Gate 3** | Academic threshold per class year (standard pathway) |
| `acad_rigor_test_opt_senior` through `_freshman` | numeric (x4) | **Gate 3** | Academic threshold per class year (test-optional pathway) |
| `is_test_optional` | boolean | **Gate 3** | Routes to test-optional academic pathway |
| `graduation_rate` | numeric | -- | Financial: ADLTV = DLTV * grad_rate |
| `recruiting_q_link` | text | -- | External link: recruiting questionnaire URL (592/662 populated) |
| `coach_link` | text | -- | External link: coaching staff page (552/662 populated) |
| `prospect_camp_link` | text | -- | External link: prospect camp page (in progress) |
| `field_level_questionnaire` | text | -- | External link: FieldLevel platform questionnaire |
| `avg_gpa`, `avg_sat` | numeric | -- | Display: school's average admitted student profile |
| `adltv`, `adltv_rank` | numeric, integer | -- | Financial: pre-computed ADLTV + national rank |
| `admissions_rate` | numeric | -- | Display: school selectivity |
| `last_updated` | timestamptz | -- | Data freshness tracking |

#### Athlete Profile Data (31 fields — `profiles` table)

Created when an athlete submits the Grit Fit form. Each profile gets a unique **SAID** (Student Athlete ID, format: `GRIT-YYYY-NNNN`) generated automatically by a Postgres trigger. Linked to a Supabase Auth `user_id` for authentication. RLS enforces owner-only access (SELECT, UPDATE via `auth_said() = said`). INSERT is open (for account creation). DELETE is blocked.

| Field | Type | Grit Fit Input? | Used For |
|-------|------|----------------|----------|
| `id` | uuid PK | -- | Internal row identifier |
| `user_id` | uuid FK → auth.users | -- | Supabase Auth link |
| `said` | text UNIQUE | -- | Auto-generated athlete ID (GRIT-YYYY-NNNN) |
| `created_at` | timestamptz | -- | Account creation timestamp |
| `name` | text | Yes | Display, recruiting communications |
| `high_school` | text | Yes | Display, coach account grouping |
| `grad_year` | integer | Yes | Class label calculation (Senior/Junior/Soph/Freshman) |
| `state` | text | Yes | State centroid fallback for distance calc |
| `email` | text | Yes | Auth, communications |
| `phone` | text | Yes | Recruiting communications |
| `twitter` | text | Optional | Social media link for coaches |
| `position` | text | Yes | **Gate 1**: determines which ATH_STANDARDS row to use |
| `height` | text | Yes | **Gate 1**: athletic fit z-score input |
| `weight` | numeric | Yes | **Gate 1**: athletic fit z-score input |
| `speed_40` | numeric | Yes | **Gate 1**: athletic fit z-score input (lower = better) |
| `gpa` | numeric | Yes | **Gate 3**: GPA percentile input |
| `sat` | integer | Optional | **Gate 3**: SAT percentile input (defaults to 1000 if blank) |
| `hs_lat`, `hs_lng` | numeric | Auto/Optional | **Gate 2**: high school coordinates for distance calc |
| `agi` | numeric | Optional | Financial: household adjusted gross income for EFC |
| `dependents` | integer | Optional | Financial: household size for EFC lookup |
| `expected_starter` | boolean | Yes | **Gate 1**: +0.05 athletic boost |
| `captain` | boolean | Yes | **Gate 1**: +0.05 athletic boost |
| `all_conference` | boolean | Yes | **Gate 1**: +0.10 athletic boost |
| `all_state` | boolean | Yes | **Gate 1**: +0.15 athletic boost |
| `status` | text | -- | Account state ("pending" or "active") |
| `pending_token`, `pending_token_expiry` | text, timestamptz | -- | Account activation flow |
| `last_login`, `last_logout` | timestamptz | -- | Session tracking |
| `login_count` | integer | -- | Usage analytics |

#### Short List Data (23 fields — `short_list_items` table)

Created when an athlete adds a school to their Short List from the Target List. One row per athlete-school pair (enforced by UNIQUE constraint on `said + unitid`). RLS enforces full CRUD owner-only access. The save pattern is DELETE-all-then-INSERT-all (atomic replacement of the entire short list).

| Field | Type | Source |
|-------|------|--------|
| `id` | bigint PK | Auto-generated |
| `said` | text | From athlete's profile (RLS anchor) |
| `unitid` | integer | From school data |
| `school_name`, `div`, `conference`, `state` | text | Denormalized from school for fast reads |
| `match_rank`, `match_tier` | integer, text | From Grit Fit scoring output |
| `net_cost`, `droi`, `break_even`, `adltv`, `grad_rate`, `coa` | numeric | From financial calculations |
| `dist` | numeric | Haversine distance from Grit Fit |
| `q_link`, `coach_link` | text | External links from school data |
| `crm_contacted`, `crm_applied`, `crm_offer`, `crm_committed` | boolean | User-toggled CRM pipeline tracking |
| `added_at` | timestamptz | When school was added to short list |

### Why do they matter?

Each field falls into one of these functional categories:

1. **Gating fields** (determine whether a school appears on the Target List at all):
   - `type` (school), `position`, `height`, `weight`, `speed_40`, award booleans (athlete) → Gate 1
   - `latitude`, `longitude` (school), `hs_lat`, `hs_lng`, `state` (athlete) → Gate 2
   - `acad_rigor_*`, `is_test_optional` (school), `gpa`, `sat`, `grad_year` (athlete) → Gate 3

2. **Financial comparison fields** (determine the cost/value proposition shown on Short List):
   - `coa_out_of_state`, `est_avg_merit`, `share_stu_any_aid`, `share_stu_need_aid`, `need_blind_school`, `dltv`, `graduation_rate` (school) + `agi`, `dependents` (athlete) → Net Cost, DROI, Break-Even, Merit Likelihood

3. **Display and navigation fields** (surface information to the user):
   - `school_name`, `state`, `city`, `conference`, `ncaa_division`, `admissions_rate`, `avg_gpa`, `avg_sat` → School cards, table headers
   - `recruiting_q_link`, `coach_link`, `prospect_camp_link`, `field_level_questionnaire` → External action links

4. **CRM pipeline fields** (track the recruiting journey):
   - `crm_contacted`, `crm_applied`, `crm_offer`, `crm_committed` → Progressive tracking of the Pre-Offer pipeline per school

5. **Identity and auth fields** (manage the user account):
   - `said`, `user_id`, `email`, `status`, `pending_token`, `login_count` → Account lifecycle from creation through active use

### How do they relate to each other?

The data flows through a chain of relationships:

```
ATHLETE PROFILE (profiles)
  │
  ├─[position, height, weight, speed_40, awards]
  │   └──→ ATH_STANDARDS[tier][position] ──→ Athletic Fit Score per Tier
  │         └──→ topTier (highest tier where score > 0.50)
  │               └──→ RECRUIT_BUDGETS[topTier] ──→ recruitReach (miles)
  │
  ├─[hs_lat, hs_lng, state]
  │   └──→ Haversine distance to each SCHOOL[latitude, longitude]
  │         └──→ compared against recruitReach ──→ Gate 2 pass/fail
  │
  ├─[gpa, sat, grad_year]
  │   └──→ acadRigorScore (or acadTestOptScore if school is test-optional)
  │         └──→ compared against SCHOOL[acad_rigor_{classLabel}] ──→ Gate 3 pass/fail
  │
  ├─[agi, dependents]
  │   └──→ EFC_TABLE lookup ──→ EFC + eligibility per school control/selectivity
  │
  └─[said]
      └──→ RLS anchor for profiles, short_list_items
            └──→ auth_said() JWT function extracts SAID from user_metadata

SCHOOL DATA (schools)
  │
  ├─[type] ──→ Gate 1 tier match
  ├─[latitude, longitude] ──→ Gate 2 distance calc
  ├─[acad_rigor_*, is_test_optional] ──→ Gate 3 academic threshold
  ├─[coa, dltv, graduation_rate, merit fields] ──→ Financial output columns
  ├─[recruiting_q_link, coach_link] ──→ External action links
  └─[unitid] ──→ Join key to short_list_items, CFB-mapping HTML, IPEDS

SHORT LIST ITEMS (short_list_items)
  │
  ├─[said] ──→ FK back to profiles (RLS-enforced)
  ├─[unitid] ──→ Logical link to schools (no FK constraint — data pipeline tolerance)
  ├─[match_rank, match_tier] ──→ Snapshot of Grit Fit ranking at time of save
  ├─[financial columns] ──→ Snapshot of financial calc at time of save
  └─[crm_* booleans] ──→ User-driven recruiting pipeline progression
```

**Key relationships**:
- `unitid` is the universal join key (IPEDS UNITID) that links school data across the Google Sheet, Supabase `schools` table, CFB-mapping HTML, and recruitingq-url-extract CSVs.
- `said` is the athlete identity anchor. It links `profiles` to `short_list_items` and is embedded in the JWT `user_metadata` for RLS enforcement via the `auth_said()` function.
- Short list items are **denormalized snapshots** — they copy school display fields and financial calculations at the time of save, so the short list renders without a join to the schools table.
- The athlete's `grad_year` dynamically selects which of the 4 class-year-specific academic rigor columns to use for Gate 3, meaning the same athlete could qualify for different schools at different stages of their high school career.
- Financial fields (`agi`, `dependents`) are optional — if provided, the system computes EFC and net cost; if not, financial columns show as null and the athlete still gets their Grit Fit Target List.

---

## 7. The Business Model

### How does GrittyOS make money from this?

**Monthly or Annual Site Access Fees** — Automatic Gritty City Core qualifiers:

- Parent accounts
- High School Coach accounts
- College coach accounts
- High School Guidance Accounts
- College Admissions Accounts
- Student-athlete accounts are **free** (no cost)

**Gritty City Events**:

- Tickets to online and in-person events are only for Gritty City Core members

### What does the operator-facing side look like?

Need help with this. I need an easily visualizable database and account access for reporting, security, and marketing, for sure.

---

## 8. Key Areas of Development Focus from the Beginning

Data integrity, data security, data compliance, data architecture, auth and user account scalability, user experience.
