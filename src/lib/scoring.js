/**
 * GRIT FIT Scoring Engine — ported from cfb-recruit-hub/src/lib/scoring.js
 * Adapted for Supabase snake_case column names (schools table: 0008_schools.sql)
 * Identity: user_id only — no SAID
 */
import {
  ATH_STANDARDS, RECRUIT_BUDGETS, TIER_ORDER,
  SAT_PERCENTILES, STATE_CENTROIDS, EFC_TABLE,
} from './constants.js';
import { GPA_DISTRIBUTIONS, GPA_DISTRIBUTIONS_TEST_OPT } from './gpaDistributions.js';
import { applyG9SubordinateStep } from './scoring/g9SubordinateStep.js';

/**
 * Determine the DB class-year label for a given gradYear.
 */
export function getClassLabel(gradYear) {
  const today = new Date();
  const yr = today.getFullYear();
  const sept1ThisYear = new Date(yr, 8, 1);
  const upcomingSept1Year = today < sept1ThisYear ? yr : yr + 1;
  const seniorGradYear = upcomingSept1Year + 1;

  const diff = (+gradYear) - seniorGradYear;
  if (diff <= 0) return 'Senior';
  if (diff === 1) return 'Junior';
  if (diff === 2) return 'Soph';
  if (diff === 3) return 'Freshman';
  return 'Freshman';
}

export function haversine(lat1, lng1, lat2, lng2) {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.pow(Math.sin(dLat / 2), 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.pow(Math.sin(dLng / 2), 2);
  return R * 2 * Math.asin(Math.sqrt(a));
}

// Standard normal CDF — A&S 7.1.26 approximation
function normCDF(z) {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erfc = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? 1 - erfc / 2 : erfc / 2;
}

function parseMoney(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  return parseFloat(String(v).replace(/[$,\s]/g, '')) || 0;
}

function parsePct(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v > 1 ? v / 100 : v;
  const s = String(v).trim();
  if (s.endsWith('%')) return parseFloat(s) / 100;
  return parseFloat(s) || 0;
}

export function calcAthleticFit(position, height, weight, speed40, tier) {
  const std = ATH_STANDARDS[tier]?.[position];
  if (!std) return 0;
  const hScore = normCDF((height - std.h50) / 1.5);
  const wScore = normCDF((weight - std.w50) / (std.w50 * 0.05));
  // speed40 = 0 means no 40 time on file — score as 0 (worst-case) per Item 4 decision.
  // Passing 0 through the CDF produces sScore ≈ 1.0 (near-perfect), which is wrong.
  const sScore = speed40 ? 1 - normCDF((speed40 - std.s50) / 0.15) : 0;
  return (hScore + wScore + sScore) / 3;
}

export function calcAthleticBoost(awards) {
  let boost = 0;
  if (awards.expected_starter) boost += 0.05;
  if (awards.captain) boost += 0.05;
  if (awards.all_conference) boost += 0.10;
  if (awards.all_state) boost += 0.15;
  return boost;
}

export function getSATPercentile(sat) {
  const rounded = Math.round(sat / 10) * 10;
  const keys = Object.keys(SAT_PERCENTILES).map(Number).sort((a, b) => b - a);
  for (const k of keys) { if (rounded >= k) return SAT_PERCENTILES[k]; }
  return 0.01;
}

/**
 * PERCENTRANK.INC — matches Google Sheets PERCENTRANK.INC behavior.
 * count of values <= x, divided by (n - 1). Cap at 1 if x >= max.
 */
function percentRankINC(sortedArr, x) {
  if (!sortedArr || sortedArr.length === 0) return 0;
  if (x >= sortedArr[sortedArr.length - 1]) return 1;
  if (x <= sortedArr[0]) return 0;
  const countLE = sortedArr.filter(v => v <= x).length;
  return countLE / (sortedArr.length - 1);
}

/**
 * PERCENTRANK.EXC — matches Google Sheets PERCENTRANK.EXC behavior.
 * (count of values < x + 1) / (n + 1).
 */
function percentRankEXC(sortedArr, x) {
  if (!sortedArr || sortedArr.length === 0) return 0;
  if (x >= sortedArr[sortedArr.length - 1]) return 1;
  if (x <= sortedArr[0]) return 0;
  const countLT = sortedArr.filter(v => v < x).length;
  return (countLT + 1) / (sortedArr.length + 1);
}

/**
 * GPA percentile ranked against school Min_GPA distribution for the class year.
 * Falls back to linear approximation if distribution data is unavailable.
 */
export function getGPAPercentile(gpa, classLabel) {
  const dist = GPA_DISTRIBUTIONS[classLabel];
  if (dist && dist.length > 0) return percentRankINC(dist, gpa);
  return Math.min(1, Math.max(0, (gpa - 1.0) / 2.7));
}

/**
 * GPA percentile ranked against test-optional schools only (PERCENTRANK.EXC).
 */
export function getGPAPercentileTestOpt(gpa, classLabel) {
  const dist = GPA_DISTRIBUTIONS_TEST_OPT[classLabel];
  if (dist && dist.length > 0) return percentRankEXC(dist, gpa);
  return Math.min(1, Math.max(0, (gpa - 1.0) / 2.7));
}

export function calcEFC(agi, deps, control, schoolType) {
  const isElite = ['Super Elite', 'Elite', 'Very Selective'].includes(schoolType);
  const depNum = deps === '4+' ? 4 : (+deps || 1);
  const depIdx = Math.min(Math.max(depNum - 1, 0), 3);
  let row = EFC_TABLE[0];
  for (const r of EFC_TABLE) {
    if (r.agi <= agi) row = r; else break;
  }
  const eligible = isElite
    ? row.elite[depIdx] === 1
    : control === 'Public'
      ? row.pub[depIdx] === 1
      : row.priv[depIdx] === 1;
  return { eligible, efc: eligible ? row.sai[depIdx] : null };
}

/**
 * Parse height string (e.g. "5'10\"", "5-10", "70") to inches.
 * Returns numeric inches or NaN if unparseable.
 */
function parseHeight(h) {
  if (h == null) return NaN;
  if (typeof h === 'number') return h;
  const s = String(h).trim();
  // Already inches (plain number)
  const plain = parseFloat(s);
  if (/^\d+(\.\d+)?$/.test(s)) return plain;
  // 5'10" or 5'10 or 5-10
  const m = s.match(/(\d+)['\-]\s*(\d+)/);
  if (m) return parseInt(m[1]) * 12 + parseInt(m[2]);
  return plain;
}

/**
 * Main scoring function — adapted for Supabase snake_case columns.
 *
 * @param {Object} profile - Student profile from profiles table (snake_case keys)
 * @param {Array} schools - Schools from schools table (snake_case keys)
 * @returns {Object} { top30, top50, scored, athFit, topTier, recruitReach, gates }
 */
export function runGritFitScoring(profile, schools) {
  const {
    position, height, weight, speed_40, gpa, sat,
    hs_lat, hs_lng, state, agi, dependents, grad_year,
    expected_starter, captain, all_conference, all_state,
  } = profile;

  const classLabel = getClassLabel(grad_year);
  const heightInches = parseHeight(height);
  const weightNum = weight ? +weight : 0;
  const speedNum = speed_40 ? +speed_40 : 0;

  // Step 1 — base athletic fit per tier
  const athFitBase = {};
  TIER_ORDER.forEach(tier => {
    athFitBase[tier] = calcAthleticFit(position, heightInches, weightNum, speedNum, tier);
  });

  // Step 2 — apply award boosts
  const boost = calcAthleticBoost({ expected_starter, captain, all_conference, all_state });
  const athFit = {};
  TIER_ORDER.forEach(tier => {
    athFit[tier] = Math.min(1, athFitBase[tier] + boost);
  });

  const topTier = TIER_ORDER.find(t => athFit[t] > 0.5) || null;
  const recruitReach = topTier ? RECRUIT_BUDGETS[topTier] : 450;

  // Academic scores — GPA percentile ranked against school distribution (matches Google Sheet)
  const satScore = sat ? +sat : 1000;
  const satAchieve = getSATPercentile(satScore);
  const gpaPct = gpa ? getGPAPercentile(+gpa, classLabel) : 0.3;
  const gpaPctTestOpt = gpa ? getGPAPercentileTestOpt(+gpa, classLabel) : 0.3;
  const acadRigorScore = (satAchieve + gpaPct) / 2;
  const acadTestOptScore = gpaPctTestOpt;

  // Resolve lat/lng
  let refLat = hs_lat ? +hs_lat : 0;
  let refLng = hs_lng ? +hs_lng : 0;
  if ((!refLat || !refLng) && state) {
    const centroid = STATE_CENTROIDS[state.toUpperCase().trim()];
    if (centroid) { refLat = centroid[0]; refLng = centroid[1]; }
  }

  const scored = schools.map(school => {
    const lat = parseFloat(school.latitude);
    const lng = parseFloat(school.longitude);
    const dist = (lat && lng && refLat && refLng)
      ? haversine(refLat, refLng, lat, lng) : 9999;

    // Athletic tier match
    const tierMatch = topTier !== null && school.type === topTier;

    // Academic fit — class-year-specific columns (snake_case from Supabase)
    const isTestOpt = school.is_test_optional === true;
    const classLabelLower = classLabel.toLowerCase(); // senior, junior, soph, freshman
    const rigorKey = `acad_rigor_${classLabelLower}`;
    const rigorOptKey = `acad_rigor_test_opt_${classLabelLower}`;
    const schoolRigor = isTestOpt
      ? parseFloat(school[rigorOptKey]) || 0
      : parseFloat(school[rigorKey]) || 0;
    const athleteAcad = isTestOpt ? acadTestOptScore : acadRigorScore;
    const acadScore = schoolRigor > 0 && schoolRigor <= athleteAcad ? schoolRigor : 0;

    const gateAthletic = tierMatch;
    const gateDist = dist <= recruitReach;
    const gateAcad = acadScore > 0;
    const eligible = gateAthletic && gateDist && gateAcad;

    // Financial calculations
    const coa = parseMoney(school.coa_out_of_state);
    const efcResult = (agi && dependents)
      ? calcEFC(+agi, +dependents, school.control, school.school_type)
      : { eligible: false, efc: null };

    const avgMerit = parseMoney(school.est_avg_merit || school.avg_merit_award);
    const shareFA = parsePct(school.share_stu_any_aid);
    const sharePureNeed = parsePct(school.share_stu_need_aid);
    const isNeedBlind = school.need_blind_school === true;

    const shareOfMerit = isNeedBlind ? 0
      : shareFA * sharePureNeed * (sharePureNeed < 0.2 ? 2 : 1);

    const meritLikelihood = shareFA > 0 ? Math.min(1, shareOfMerit / (shareFA * 0.55)) : 0;

    // Athletic scholarship
    const div = school.ncaa_division || '';
    const conf = school.conference || '';
    let athSchol = 0;
    if (!['Ivy League', 'Pioneer'].includes(conf)) {
      if (div === '1-FBS') athSchol = coa;
      else if (div === '1-FCS') athSchol = coa * 0.6;
      else if (div === '2-Div II') athSchol = coa * 0.3;
    }

    // Net cost
    const efc = efcResult.efc || 0;
    const meritDeduct = (coa - efc) > (avgMerit * shareFA) ? avgMerit * shareFA : 0;
    const netCost = efcResult.eligible
      ? (efc * 4 * 1.18) - meritDeduct
      : null;

    // DLTV, Grad Rate, ADLTV
    const dltv = parseMoney(school.dltv);
    const gradRate = parsePct(school.graduation_rate);
    const adltvCalc = dltv * gradRate;

    // DROI
    const droi = (netCost != null && netCost > 0)
      ? adltvCalc / netCost
      : (netCost != null ? 100 : null);

    // Break-Even — floors to 0 when netCost <= 0 (full scholarship / athletic aid covers cost)
    const breakEven = netCost == null
      ? null
      : netCost <= 0
        ? 0
        : Math.max(0, 40 / droi);

    return {
      ...school,
      dist: Math.round(dist),
      eligible,
      acadScore,
      schoolRigor,
      athleteAcad,
      isTestOpt,
      athFitScore: athFit[school.type] || 0,
      efcEligible: efcResult.eligible,
      efc,
      athSchol,
      avgMerit,
      meritLikelihood: Math.round(meritLikelihood * 100),
      netCost,
      dltv,
      gradRate,
      adltv: adltvCalc,
      droi,
      breakEven,
    };
  });

  // Rank eligible schools by acadScore, assign match tiers, cap at 50
  const eligibleRanked = scored
    .filter(s => s.eligible)
    .sort((a, b) => b.acadScore - a.acadScore);

  eligibleRanked.forEach((s, i) => {
    s.matchRank = i + 1;
    if (i < 30) s.matchTier = 'top';
    else if (i < 40) s.matchTier = 'good';
    else if (i < 50) s.matchTier = 'borderline';
    else { s.matchTier = null; s.eligible = false; }
  });

  const top50 = eligibleRanked.slice(0, 50);
  const top30 = top50.slice(0, 30);

  // Gate diagnostics
  const passAthletic = scored.filter(s => s.type === topTier).length;
  const passDist = scored.filter(s => s.type === topTier && s.dist <= recruitReach).length;
  const passAcad = scored.filter(s => s.type === topTier && s.acadScore > 0).length;
  const passAll = top50.length;

  const baseResult = {
    top30, top50, scored, athFit, athFitBase, boost, topTier, recruitReach,
    acadRigorScore, acadTestOptScore,
    gates: { passAthletic, passDist, passAcad, passAll },
  };

  // G9 subordinate step — pass-through unless all three trigger conditions
  // hold (AF@D2 ≥ 0.50 AND AF@D3 ≥ 0.50, acadRigorScore ≥ 0.85, D2 pool ≥ 30).
  return applyG9SubordinateStep(baseResult, profile, schools);
}
