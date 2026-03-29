/**
 * NextStepsDashboard — Zero-match empty state for GritFitPage.
 * UX Spec: UX_SPEC_NEXT_STEPS_DASHBOARD.md (Quill, 2026-03-28)
 *
 * Appears when scoringResult.top30.length === 0.
 * Shows diagnosis, gap analysis, WOW callouts, training tips,
 * alternative positions, aspirational schools, and encouragement.
 *
 * Nova reads scoring.js/constants.js read-only (DEC-CFBRB-042).
 * All derived logic lives here.
 */
import { ATH_STANDARDS, TIER_ORDER, RECRUIT_BUDGETS } from '../lib/constants.js';
import { getClassLabel, calcAthleticFit } from '../lib/scoring.js';

// ── Helpers (cannot modify scoring.js per DEC-CFBRB-042) ──────────────────────

function normCDF(z) {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erfc = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? 1 - erfc / 2 : erfc / 2;
}

/** Decompose athletic fit into per-metric scores for display */
function getMetricScores(position, height, weight, speed40, tier) {
  const std = ATH_STANDARDS[tier]?.[position];
  if (!std) return { hScore: 0, wScore: 0, sScore: 0 };
  const hScore = normCDF((height - std.h50) / 1.5);
  const wScore = normCDF((weight - std.w50) / (std.w50 * 0.05));
  const sScore = 1 - normCDF((speed40 - std.s50) / 0.15);
  return { hScore, wScore, sScore, std };
}

/** NCAA approximate minimum GPA by class year */
const NCAA_MIN_GPA = {
  Senior: 2.3,
  Junior: 2.5,
  Soph: 2.5,
  Freshman: 2.8,
};

/** Position suggestion pools — analogous positions by group */
const SUGGESTION_POOLS = {
  QB:   ['WR', 'S', 'LB', 'TE'],
  RB:   ['WR', 'CB', 'S', 'LB'],
  FB:   ['TE', 'LB', 'DL', 'RB'],
  TE:   ['DE', 'LB', 'WR', 'FB'],
  WR:   ['CB', 'S', 'RB', 'QB'],
  OL:   ['DL', 'DT', 'G', 'T'],
  C:    ['G', 'OL', 'DL', 'LB'],
  G:    ['OL', 'C', 'DL', 'T'],
  T:    ['OL', 'DE', 'TE', 'G'],
  DL:   ['OL', 'DT', 'DE', 'LB'],
  DE:   ['EDGE', 'LB', 'TE', 'DL'],
  DT:   ['DL', 'OL', 'DE', 'G'],
  EDGE: ['DE', 'LB', 'S', 'TE'],
  LB:   ['S', 'DE', 'EDGE', 'RB'],
  CB:   ['S', 'WR', 'RB', 'LB'],
  S:    ['CB', 'LB', 'WR', 'RB'],
};

/** Derive zero-match reason from scoring result and profile */
function deriveReason(scoringResult, profile, classLabel) {
  const { topTier, gates } = scoringResult;
  const requiredGpa = NCAA_MIN_GPA[classLabel] || 2.3;
  const gpa = profile.gpa ? +profile.gpa : 0;

  if (!topTier) return 'athletic';
  if (gpa < requiredGpa) return 'academic';
  if (gates.passAll === 0) return 'combined';
  return 'combined';
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

function parseHeight(h) {
  if (h == null) return 0;
  if (typeof h === 'number') return h;
  const s = String(h).trim();
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  const m = s.match(/(\d+)['\-]\s*(\d+)/);
  if (m) return parseInt(m[1]) * 12 + parseInt(m[2]);
  return parseFloat(s) || 0;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  container: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '0 12px',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#8B3A3A',
    margin: '0 0 8px',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#6B6B6B',
    lineHeight: 1.6,
    maxWidth: 560,
    margin: '0 0 12px',
  },
  diagnosisText: {
    fontSize: '1rem',
    color: '#2C2C2C',
    lineHeight: 1.6,
    margin: '0 0 24px',
  },
  boldGold: {
    fontWeight: 700,
    color: '#D4AF37',
  },
  boldMaroon: {
    fontWeight: 700,
    color: '#8B3A3A',
  },
  sectionLabel: {
    fontSize: 12,
    color: '#6B6B6B',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 10,
    fontWeight: 600,
  },
  sectionLabelGold: {
    fontSize: 12,
    color: '#D4AF37',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 10,
    fontWeight: 600,
  },
  sectionLabelOrange: {
    fontSize: 12,
    color: '#F5A623',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
    fontWeight: 600,
  },
  card: {
    background: '#F5EFE0',
    border: '1px solid #E8E8E8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  whiteCard: {
    background: '#FFFFFF',
    border: '1px solid #E8E8E8',
    borderRadius: 4,
    padding: '14px 16px',
    marginBottom: 16,
  },
  whyCard: {
    background: '#FFFFFF',
    border: '1px solid #E8E8E8',
    padding: '12px 16px',
    borderRadius: 4,
    marginTop: 12,
  },
  bodySmall: {
    fontSize: 14,
    color: '#6B6B6B',
    lineHeight: 1.6,
  },
  bodyTiny: {
    fontSize: 12,
    color: '#6B6B6B',
    lineHeight: 1.5,
  },
  primaryBtn: {
    flex: 1,
    padding: '10px 20px',
    background: '#8B3A3A',
    color: '#F5EFE0',
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 1,
    border: '1px solid #D4AF37',
    borderRadius: 3,
    cursor: 'pointer',
    transition: 'background 150ms',
  },
  secondaryBtn: {
    padding: '10px 20px',
    background: 'transparent',
    color: '#6B6B6B',
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 1,
    border: '1px solid #E8E8E8',
    borderRadius: 3,
    cursor: 'pointer',
    transition: 'border-color 150ms, color 150ms',
  },
};

// ── Training Tips Data ────────────────────────────────────────────────────────

const WEIGHT_TIPS = [
  { title: 'Eat in a daily caloric surplus', text: 'Add 300–500 calories above your maintenance level. Focus on lean protein (chicken, eggs, tuna, beans), complex carbs (rice, oats, sweet potato), and healthy fats (peanut butter, avocado, whole eggs). Aim for 0.8–1g of protein per lb of bodyweight every day.' },
  { title: 'Compound lifts 3–4x per week', text: 'Squat, deadlift, bench press, and power clean recruit the most muscle mass in the least time. Start with a 5x5 program (free at stronglifts.com) and add weight to the bar each session. Consistency beats intensity.' },
  { title: 'Eat within 30 minutes post-workout', text: 'Protein + carbs immediately after lifting accelerates muscle synthesis. Two eggs and a banana, a glass of chocolate milk, or Greek yogurt with fruit are cheap and highly effective options.' },
  { title: 'Prioritize sleep — 8 to 9 hours', text: 'The majority of muscle growth happens during sleep, not in the gym. Cutting sleep short limits the gains from every workout. This is the highest-ROI, zero-cost training variable most athletes underuse.' },
  { title: 'Track your food for two weeks', text: 'Most athletes significantly underestimate their daily intake. Use a free app like Cronometer or MyFitnessPal for two weeks to confirm you are actually eating above maintenance — not just thinking you are.' },
];

const SPEED_TIPS = [
  { title: 'Fix your sprint mechanics first', text: 'Most speed gains come from technique, not fitness. Focus on a powerful drive phase, tall hips, and straight arm drive. Film yourself or ask a coach to review one session. Bad mechanics permanently cap your ceiling regardless of conditioning.' },
  { title: 'Hill sprints or resistance sprints 2x per week', text: 'Find a moderate incline and sprint up it at 100% effort with full recovery between reps. Uphill and resistance sprinting builds the explosive acceleration phase that most directly reduces 40 time. 6–8 reps per session is enough.' },
  { title: 'Plyometrics 2x per week', text: 'Box jumps, broad jumps, and bounding drills train your fast-twitch muscle fibers — the same fibers that drive sprint speed. Three sets of 5 reps twice weekly is sufficient stimulus. Quality of effort matters more than volume.' },
  { title: 'Power cleans and trap bar deadlifts', text: 'Research consistently shows hip-dominant explosive lifts have the strongest correlation with sprint speed. If these are not in your program, add them. Even one day per week produces measurable speed improvements over 8–12 weeks.' },
  { title: 'Sprint at full speed every rep in practice', text: 'Speed is a skill trained at the speed you practice. Jogging through reps teaches your nervous system to jog. Sprint every drill that calls for it — your nervous system adapts to the stimulus you give it.' },
];

const HEIGHT_TIPS = [
  { title: "Height is genetic — focus on what you can control", text: "The height score reflects the position median, not a hard cutoff. Meaningful improvements to your speed or weight scores can raise your overall athletic score enough to qualify even with the same height. Those are your levers." },
  { title: 'Posture and core work can maximize your measured height', text: 'Dead hangs (hang from a bar 30–60 seconds daily), thoracic mobility drills, and plank progressions correct forward lean over time. Athletes with poor posture can gain 0.5–1 inch in measured standing height through consistent postural work.' },
  { title: 'Consider positions with a lower height median', text: "The alternative positions shown below were selected partly because their height medians are closer to yours. Your overall score is naturally stronger there with identical measurables — and those are real options, not consolation prizes." },
  { title: "Technique closes the gap that inches can't", text: "Route precision, hand fighting, leverage, and positional IQ are things coaches weigh heavily but pre-recruit metrics don't capture. Developing elite technique at your position makes height a smaller factor than it appears on paper." },
];

const ACADEMIC_STRATEGIES = [
  { title: 'Ask your teachers directly', text: 'Go to each teacher and ask: "What is the single most impactful thing I can do to improve my grade?" Teachers respect athletes who take initiative — and they often have options that aren\'t advertised.' },
  { title: 'Prioritize your lowest-grade classes first', text: 'A point gained in a D has far more GPA impact than a point gained in a B. Focus energy where the math works in your favor.' },
  { title: 'Ask about late work and extra credit', text: 'Many teachers allow late or redone assignments for partial credit. Just ask. The worst they can say is no — and most say yes.' },
  { title: 'Use Khan Academy (free)', text: 'khanacademy.org covers math, science, and SAT prep at every level. Free, self-paced, and used by millions of students. 20 minutes a day adds up fast.' },
  { title: "Find your school's free tutoring", text: 'Most schools offer peer tutoring or teacher-led help sessions at lunch or after school. Your counselor can point you to them.' },
  { title: 'Study in short focused blocks', text: '30 minutes of focused, phone-free study beats 2 hours of distracted work. Remove distractions first — then open the books.' },
  { title: 'Review notes within 24 hours', text: 'The forgetting curve is real. Reviewing your notes the same day you take them dramatically improves retention without extra time.' },
  { title: 'Talk to your school counselor', text: "Ask specifically about grade forgiveness policies, course retakes, or summer school options. Counselors can open doors you don't know exist." },
];

const WOW_CALLOUTS = {
  height: "Height is one of the first things coaches evaluate at your position. Standing above the positional median signals natural physical upside that can't be developed in a weight room — and it separates your profile from the crowd before you ever step on a field.",
  weight: "Playing at or above the positional weight median signals physical readiness and the ability to compete from day one. Coaches don't want to wait years for a recruit to develop the frame to handle contact. Your weight tells them you're ready now.",
  speed: "Elite speed is one of the rarest and most coveted traits in college football recruiting. Coaches can develop strength and technique — they cannot coach speed. A top-tier 40 time travels fast through recruiting networks and is the single most attention-grabbing number on a recruiting profile.",
  academic: "Academic strength directly affects a program's ability to admit you. Coaches don't just want talent — they need recruits who clear the admissions bar and stay eligible. A strong academic profile gives a coach confidence that offering you won't fall apart in the admissions office.",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function AcademicSnapshot({ gpa, classLabel, requiredGpa, reason }) {
  const gap = (requiredGpa - gpa).toFixed(2);
  const hasGap = gpa < requiredGpa;

  return (
    <div style={styles.card}>
      <div style={styles.sectionLabel}>ACADEMIC ELIGIBILITY SNAPSHOT</div>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 14, color: '#6B6B6B' }}>Your GPA</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#8B3A3A' }}>{gpa?.toFixed(2) || '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: 14, color: '#6B6B6B' }}>{classLabel} Minimum</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#D4AF37' }}>{requiredGpa.toFixed(2)}</div>
        </div>
        {hasGap && (
          <div>
            <div style={{ fontSize: 14, color: '#6B6B6B' }}>Gap to Close</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#D4AF37' }}>+{gap}</div>
          </div>
        )}
      </div>

      {reason === 'academic' && (
        <div style={styles.whyCard}>
          <div style={{ fontSize: 12, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>
            WHY IT MATTERS
          </div>
          <div style={styles.bodySmall}>
            The NCAA requires a minimum GPA to certify initial academic eligibility — without it,
            no program can offer you a spot. The good news: GPA is one of the most improvable
            metrics, and the best strategies are free.
          </div>
        </div>
      )}
    </div>
  );
}

function MetricBar({ name, score, yours, median, unit, isWeakest }) {
  const pct = Math.min(100, Math.round(score * 100));
  const barColor = pct >= 50 ? '#4CAF50' : '#F44336';
  const labelColor = isWeakest ? '#8B3A3A' : '#6B6B6B';

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 14, color: labelColor, fontWeight: isWeakest ? 700 : 400, width: 88 }}>
          {name}{isWeakest ? ' ↓' : ''}
        </span>
        <div style={{ flex: 1, margin: '0 8px', height: 5, background: '#E8E8E8', borderRadius: 2 }}>
          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 2, transition: 'width 400ms ease' }}
          />
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: barColor, width: 36, textAlign: 'right' }}>{pct}%</span>
      </div>
      <div style={{ fontSize: 12, color: '#3A5A3E', paddingLeft: 88 }}>
        Yours: {yours}{unit} · Tier median: {median}{unit}
      </div>
    </div>
  );
}

function ClosestTierSection({ position, height, weight, speed40, closestTier, athFit }) {
  if (!closestTier) return null;

  const fitScore = athFit[closestTier] || 0;
  const pct = Math.round(fitScore * 100);
  const gap = Math.max(0, 50 - pct);
  const { hScore, wScore, sScore, std } = getMetricScores(position, height, weight, speed40, closestTier);

  const weakest = hScore <= wScore && hScore <= sScore ? 'height'
    : wScore <= sScore ? 'weight' : 'speed';

  return (
    <div style={styles.whiteCard}>
      <div style={styles.sectionLabelOrange}>CLOSEST FIT: {closestTier.toUpperCase()}</div>
      <div style={{ fontSize: 16, color: '#6B6B6B', marginBottom: 14 }}>
        You scored <span style={styles.boldMaroon}>{pct}%</span> as {position} at{' '}
        {closestTier} level — just{' '}
        <span style={gap <= 15 ? styles.boldGold : { color: '#6B6B6B' }}>{gap}%</span> from qualifying.
      </div>

      <MetricBar
        name="Height"
        score={hScore}
        yours={height}
        median={std?.h50}
        unit=" in"
        isWeakest={weakest === 'height'}
      />
      <MetricBar
        name="Weight"
        score={wScore}
        yours={weight}
        median={std?.w50}
        unit=" lbs"
        isWeakest={weakest === 'weight'}
      />
      <MetricBar
        name="40-Yard Dash"
        score={sScore}
        yours={speed40}
        median={std?.s50}
        unit="s"
        isWeakest={weakest === 'speed'}
      />
    </div>
  );
}

function WowCallout({ metricName, score, calloutText }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #0E1F10, #0A1A0C)',
      border: '1px solid #D4AF37',
      padding: '14px 16px',
      borderRadius: 4,
      marginBottom: 10,
    }}>
      <div style={{ marginBottom: 6 }}>
        <span role="presentation" aria-hidden="true" style={{ fontSize: 20 }}>🔥</span>{' '}
        <span style={{ fontSize: 18, fontWeight: 700, color: '#D4AF37' }}>WOW!</span>{' '}
        <span style={{ fontSize: 12, color: '#F5EFE0' }}>{metricName}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#F5EFE0', marginBottom: 6 }}>
        You're performing better than {Math.round(score * 100)}% of student-athletes in this area.
      </div>
      <div style={{ fontSize: 12, color: '#6B8C72', lineHeight: 1.6 }}>
        {calloutText}{' '}
        <span style={{ fontWeight: 700, color: '#F5EFE0' }}>
          Lock in your focus on this and it becomes a headline on your profile.
        </span>
      </div>
    </div>
  );
}

function TipsList({ tips, header }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={styles.sectionLabelGold}>{header}</div>
      {tips.map((tip, i) => (
        <div key={i} style={{ paddingLeft: 12, borderLeft: '2px solid #2E6B18', marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#F5EFE0', marginBottom: 2 }}>
            {tip.title}
          </div>
          <div style={{ fontSize: 12, color: '#6B8C72', lineHeight: 1.5 }}>
            {tip.text}
          </div>
        </div>
      ))}
    </div>
  );
}

function StayGrittyFocus({ weakestMetric, closestTier }) {
  const metricLabel = weakestMetric === 'height' ? 'Height'
    : weakestMetric === 'weight' ? 'Weight' : '40-Yard Dash';
  const tips = weakestMetric === 'height' ? HEIGHT_TIPS
    : weakestMetric === 'weight' ? WEIGHT_TIPS : SPEED_TIPS;

  return (
    <div>
      <div style={styles.whiteCard}>
        <div style={styles.sectionLabelOrange}>STAY GRITTY FOCUS: {metricLabel.toUpperCase()}</div>
        <div style={styles.bodySmall}>
          Your {metricLabel.toLowerCase()} is the primary metric holding you back. Close the gap between
          your current number and the {closestTier || 'closest tier'} median and your qualifying score
          will follow. Update your profile when you've made progress — your results will refresh automatically.
        </div>
      </div>
      <TipsList tips={tips} header={`HOW TO IMPROVE YOUR ${metricLabel.toUpperCase()}`} />
    </div>
  );
}

function AlternativePositions({ position, height, weight, speed40, closestTier }) {
  if (!closestTier) return null;

  const pool = SUGGESTION_POOLS[position] || [];
  const qualifying = pool
    .map(pos => {
      const fit = calcAthleticFit(pos, height, weight, speed40, closestTier);
      return { position: pos, fit };
    })
    .filter(p => p.fit > 0.5)
    .sort((a, b) => b.fit - a.fit)
    .slice(0, 4);

  if (qualifying.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={styles.sectionLabelGold}>POSITIONS YOU ALREADY QUALIFY FOR</div>
      <div style={{ fontSize: 16, color: '#6B6B6B', marginBottom: 10 }}>
        Based on your current measurables, you score above 50% at the {closestTier} level in these positions:
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {qualifying.map(p => (
          <span key={p.position} style={{
            padding: '5px 12px',
            background: '#F5EFE0',
            border: '1px solid #D4AF37',
            borderRadius: 3,
            fontSize: 16,
            fontWeight: 700,
            color: '#8B3A3A',
            letterSpacing: 1,
          }}>
            {p.position}
          </span>
        ))}
      </div>
    </div>
  );
}

function AspirationalSchools({ scored, closestTier }) {
  if (!closestTier || !scored?.length) return null;

  // Schools that pass distance + academic gates but fail athletic gate
  let aspirational = scored.filter(s =>
    s.type === closestTier &&
    s.dist <= (RECRUIT_BUDGETS[closestTier] || 450) &&
    s.acadScore > 0 &&
    (s.athFitScore || 0) < 0.5
  );

  // Sort by ADLTV descending
  aspirational.sort((a, b) => (b.adltv || 0) - (a.adltv || 0));

  // Relax criteria if fewer than 3
  if (aspirational.length < 3) {
    aspirational = scored.filter(s =>
      s.type === closestTier &&
      s.dist <= (RECRUIT_BUDGETS[closestTier] || 450)
    );
    aspirational.sort((a, b) => (b.adltv || 0) - (a.adltv || 0));
  }

  aspirational = aspirational.slice(0, 5);
  if (aspirational.length === 0) return null;

  const formatMoney = (v) => {
    const n = parseMoney(v);
    if (n === 0) return '—';
    return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  };

  return (
    <div style={styles.whiteCard}>
      <div style={styles.sectionLabelGold}>SCHOOLS TO WORK TOWARD</div>
      <div style={{ fontSize: 14, color: '#6B6B6B', marginBottom: 10 }}>
        These {closestTier} programs already match your academic profile and location. Hit the
        qualifying athletic threshold and they move straight into your Top Matches.
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#F5F5F5', borderBottom: '1px solid #E8E8E8' }}>
              {['School', 'State', 'ADLTV', 'ADLTV Rank', 'Dist (mi)'].map(col => (
                <th key={col} style={{
                  padding: '6px 10px', textAlign: 'left', fontSize: 10,
                  color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600,
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {aspirational.map((s, i) => (
              <tr key={s.unitid || i} style={{ background: i % 2 === 0 ? 'transparent' : '#F5F5F5' }}>
                <td style={{ padding: '6px 10px', color: '#E8EDF0' }}>{s.school_name}</td>
                <td style={{ padding: '6px 10px', color: '#6B6B6B' }}>{s.state}</td>
                <td style={{ padding: '6px 10px', color: '#6B6B6B' }}>{formatMoney(s.adltv)}</td>
                <td style={{ padding: '6px 10px', color: '#6B6B6B' }}>#{i + 1}</td>
                <td style={{ padding: '6px 10px', color: '#6B6B6B' }}>{s.dist} mi</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function NextStepsDashboard({ scoringResult, profile, onEditProfile, onBrowseAllSchools }) {
  const classLabel = getClassLabel(profile.grad_year);
  const requiredGpa = NCAA_MIN_GPA[classLabel] || 2.3;
  const reason = deriveReason(scoringResult, profile, classLabel);
  const firstName = profile.name ? profile.name.split(' ')[0] : 'Athlete';
  const gpa = profile.gpa ? +profile.gpa : 0;
  const heightInches = parseHeight(profile.height);
  const weightNum = profile.weight ? +profile.weight : 0;
  const speedNum = profile.speed_40 ? +profile.speed_40 : 0;
  const position = profile.position || '';

  // Closest tier — use topTier if available, otherwise find closest
  const closestTier = scoringResult.topTier ||
    TIER_ORDER.reduce((best, tier) => {
      const fit = scoringResult.athFit?.[tier] || 0;
      return fit > (best.fit || 0) ? { tier, fit } : best;
    }, { tier: 'D3', fit: 0 }).tier;

  const closestFit = scoringResult.athFit?.[closestTier] || 0;
  const closestPct = Math.round(closestFit * 100);
  const gap = Math.max(0, 50 - closestPct);

  // Per-metric scores for WOW callouts and weakest metric
  const { hScore, wScore, sScore } = getMetricScores(position, heightInches, weightNum, speedNum, closestTier);
  const weakestMetric = hScore <= wScore && hScore <= sScore ? 'height'
    : wScore <= sScore ? 'weight' : 'speed';

  // WOW metrics (≥ 0.75)
  const wowMetrics = [];
  if (hScore >= 0.75) wowMetrics.push({ name: 'Height', score: hScore, callout: WOW_CALLOUTS.height });
  if (wScore >= 0.75) wowMetrics.push({ name: 'Weight', score: wScore, callout: WOW_CALLOUTS.weight });
  if (sScore >= 0.75) wowMetrics.push({ name: '40-Yard Dash', score: sScore, callout: WOW_CALLOUTS.speed });
  if ((scoringResult.acadRigorScore || 0) >= 0.75) {
    wowMetrics.push({ name: 'Academic Rigor', score: scoringResult.acadRigorScore, callout: WOW_CALLOUTS.academic });
  }

  // Determine which sections appear per scenario
  const showAcademicStrategies = reason === 'academic' || reason === 'combined';
  const showAspirational = reason === 'athletic' || reason === 'combined';
  const academicTipsCount = reason === 'combined' ? 3 : ACADEMIC_STRATEGIES.length;

  return (
    <div style={styles.container} data-testid="next-steps-dashboard">

      {/* ── Section 1: Header + Diagnosis ── */}
      <h2 style={styles.title}>Stay Gritty, {firstName}!</h2>
      <p style={styles.subtitle}>
        We couldn't find qualifying schools for you right now — but you're
        closer than you think. Here's what the data shows and where to focus next.
      </p>

      {reason === 'academic' && (
        <p style={styles.diagnosisText}>
          Your current GPA is {gpa.toFixed(2)} but the NCAA requires a minimum of{' '}
          <span style={styles.boldGold}>{requiredGpa.toFixed(2)}</span> for a{' '}
          <span style={styles.boldGold}>{classLabel}</span> to be eligible. This is fixable — and
          the steps to get there don't cost anything.
        </p>
      )}

      {reason === 'athletic' && (
        <p style={styles.diagnosisText}>
          As a {position}, you scored <span style={styles.boldMaroon}>{closestPct}%</span> at the {closestTier} level —{' '}
          <span style={styles.boldGold}>{gap}%</span> from qualifying. You're closer than you think.
          Here's where to focus.
        </p>
      )}

      {reason === 'combined' && (
        <p style={styles.diagnosisText}>
          As a {position}, your closest fit is {closestTier} — but no schools in that tier
          fall within your geographic reach or match your academic profile right now.
          Both are improvable.
        </p>
      )}

      {/* ── Section 2: Academic Snapshot ── */}
      <AcademicSnapshot gpa={gpa} classLabel={classLabel} requiredGpa={requiredGpa} reason={reason} />

      {/* ── Section 3: Closest Athletic Tier & Metric Breakdown ── */}
      <ClosestTierSection
        position={position}
        height={heightInches}
        weight={weightNum}
        speed40={speedNum}
        closestTier={closestTier}
        athFit={scoringResult.athFit || {}}
      />

      {/* ── Section 4: WOW Callouts ── */}
      {wowMetrics.length > 0 && wowMetrics.map(w => (
        <WowCallout key={w.name} metricName={w.name} score={w.score} calloutText={w.callout} />
      ))}

      {/* ── Section 5: Stay Gritty Focus + Training Tips ── */}
      <StayGrittyFocus weakestMetric={weakestMetric} closestTier={closestTier} />

      {/* ── Section 6: Academic Improvement Strategies ── */}
      {showAcademicStrategies && (
        <TipsList
          tips={ACADEMIC_STRATEGIES.slice(0, academicTipsCount)}
          header="FREE STRATEGIES TO MOVE THE NEEDLE"
        />
      )}

      {/* ── Section 7: Alternative Qualifying Positions ── */}
      <AlternativePositions
        position={position}
        height={heightInches}
        weight={weightNum}
        speed40={speedNum}
        closestTier={closestTier}
      />

      {/* ── Section 8: Aspirational Schools ── */}
      {showAspirational && (
        <AspirationalSchools scored={scoringResult.scored} closestTier={closestTier} />
      )}

      {/* ── Section 9: Encouragement Closing ── */}
      <div style={{ ...styles.card, marginTop: 16 }}>
        <div style={styles.bodySmall}>
          {reason === 'academic' ? (
            <>When your GPA improves, come back and update your profile.</>
          ) : reason === 'athletic' ? (
            <>When your athletic metrics improve, come back and update your profile.</>
          ) : (
            <>When your GPA or athletic metrics improve, come back and update your profile.</>
          )}{' '}
          The GRIT FIT Formula will run immediately and show you every program you qualify for.
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#8B3A3A', marginTop: 8 }}>
          One semester of focused work can change your entire recruiting picture.
        </div>
      </div>

      {/* ── Section 10: Support Footer ── */}
      <div style={{ textAlign: 'center', margin: '16px 0' }}>
        <span style={{ fontSize: 11, color: '#3A5A3E' }}>
          Support:{' '}
          <a href="mailto:verifygrit@gmail.com" style={{ color: '#3A5A3E', textDecoration: 'none' }}>
            verifygrit@gmail.com
          </a>
        </span>
      </div>

      {/* ── Section 11: Action Buttons ── */}
      <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
        <button
          onClick={onEditProfile}
          style={styles.primaryBtn}
          onMouseEnter={e => { e.target.style.background = '#6B2C2C'; }}
          onMouseLeave={e => { e.target.style.background = '#8B3A3A'; }}
        >
          Update My Profile →
        </button>
        <button
          onClick={onBrowseAllSchools}
          style={styles.secondaryBtn}
          onMouseEnter={e => { e.target.style.borderColor = '#8B3A3A'; e.target.style.color = '#8B3A3A'; }}
          onMouseLeave={e => { e.target.style.borderColor = '#E8E8E8'; e.target.style.color = '#6B6B6B'; }}
        >
          Home
        </button>
      </div>
    </div>
  );
}
