/**
 * Tutorial — modal walkthrough with two slide decks (Browse + GRIT FIT).
 * Light theme adaptation from cfb-recruit-hub.
 *
 * Tour-step placeholder images (H2, Sprint 004, Wave 3a):
 * Each slide references a PNG staged at the aspect ratio of the viewport
 * that step documents, per Operator Ruling A-7. Finals drop post-sprint
 * without layout reflow.
 * TODO(tour-screenshots): swap placeholder PNGs in public/tour/ for finals.
 */
import { useState } from 'react';

/**
 * Per-step viewport map (A-7). Exported so tests can assert on it directly
 * instead of scraping JSX comments. Parallel to the annotation comments in
 * the slide render block below.
 */
export const TOUR_STEP_VIEWPORTS = [
  { deck: 'browse',  step: 1, viewport: 'desktop',  width: 1440, height: 900, src: '/tour/browse-step-1-placeholder.png' },
  { deck: 'browse',  step: 2, viewport: 'slideout', width:  560, height: 900, src: '/tour/browse-step-2-placeholder.png' },
  { deck: 'browse',  step: 3, viewport: 'desktop',  width: 1440, height: 900, src: '/tour/browse-step-3-placeholder.png' },
  { deck: 'browse',  step: 4, viewport: 'desktop',  width: 1440, height: 900, src: '/tour/browse-step-4-placeholder.png' },
  { deck: 'browse',  step: 5, viewport: 'desktop',  width: 1440, height: 900, src: '/tour/browse-step-5-placeholder.png' },
  { deck: 'gritfit', step: 1, viewport: 'desktop',  width: 1440, height: 900, src: '/tour/gritfit-step-1-placeholder.png' },
  { deck: 'gritfit', step: 2, viewport: 'desktop',  width: 1440, height: 900, src: '/tour/gritfit-step-2-placeholder.png' },
  { deck: 'gritfit', step: 3, viewport: 'desktop',  width: 1440, height: 900, src: '/tour/gritfit-step-3-placeholder.png' },
  { deck: 'gritfit', step: 4, viewport: 'slideout', width:  560, height: 900, src: '/tour/gritfit-step-4-placeholder.png' },
  { deck: 'gritfit', step: 5, viewport: 'desktop',  width: 1440, height: 900, src: '/tour/gritfit-step-5-placeholder.png' },
];

const BROWSE_SLIDES = [
  {
    num: '01/05',
    title: 'Welcome to Your Recruit Hub',
    body: 'Explore a map of 662 college football programs across all divisions. Each school is color-coded by division tier and filterable by conference, division, and state.',
    tip: 'Click on any school marker to see detailed stats, recruiting questionnaire links, and coaching staff pages.',
    img: { src: '/tour/browse-step-1-placeholder.png', alt: 'Desktop map view showing 662 college football program markers color-coded by division tier.' },
  },
  {
    num: '02/05',
    title: 'Understanding the Data',
    body: 'Each school card shows key financial and academic metrics:',
    list: [
      'COA (Out-of-State): Cost of Attendance for non-residents',
      'ADTLV: Adjusted Degree Lifetime Value (earning potential post-graduation)',
      'Acceptance Rate: How selective the school is',
      'Graduation Rate: Percentage of students who complete their degree',
    ],
    img: { src: '/tour/browse-step-2-placeholder.png', alt: 'School detail slide-out panel showing COA, ADTLV, acceptance rate, and graduation rate metrics.' },
  },
  {
    num: '03/05',
    title: 'Filtering & Browsing',
    body: 'Use the filter bar above the map to narrow your search:',
    list: [
      'Division Tier (Power 4, G6, FCS, D2, D3)',
      'Conference',
      'State',
      'Search by school name or city',
    ],
    img: { src: '/tour/browse-step-3-placeholder.png', alt: 'Desktop view of the filter bar above the map with Division Tier, Conference, State, and search controls.' },
  },
  {
    num: '04/05',
    title: 'Your GRIT FIT Score',
    body: 'After you complete your profile (GPA, test scores, athletic stats, and financial info), the GRIT FIT engine matches you against all 662 programs. Your results show up to 30 schools ranked by overall match quality across athletic, academic, geographic, and financial fit.',
    tip: 'Your profile saves securely — coaches can only see what you share with them.',
    img: { src: '/tour/browse-step-4-placeholder.png', alt: 'Desktop GRIT FIT results view showing up to 30 schools ranked by match quality.' },
  },
  {
    num: '05/05',
    title: 'Choose Your Path',
    body: 'Browse the map to explore casually, or head to MY GRIT FIT to see your personalized match results. Add schools to your Shortlist to track your recruiting journey with each program.',
    img: { src: '/tour/browse-step-5-placeholder.png', alt: 'Desktop view of the main hub with Browse Map, MY GRIT FIT, and Shortlist entry points.' },
  },
];

const GRITFIT_SLIDES = [
  {
    num: '01/05',
    title: 'What is GRIT FIT?',
    body: 'GRIT FIT is your personalized college recruiting match score. It measures three dimensions:',
    list: [
      'Athletic Fit Score: Your athletic performance vs. program recruiting targets',
      'Academic Rigor Score: Your GPA + test scores vs. admitted student profiles',
      'Test Optional Score: Your GPA-only score for test-optional schools',
    ],
    img: { src: '/tour/gritfit-step-1-placeholder.png', alt: 'Desktop GRIT FIT overview page introducing the three score dimensions.' },
  },
  {
    num: '02/05',
    title: 'Your Score Dashboard',
    body: 'At the top of your results, you see your three scores as percentages (0–100%). These represent your strength in each dimension compared to your matched schools.',
    tip: 'A 95% Athletic Fit Score means you\'re in the top tier of recruit profiles for your matched schools.',
    img: { src: '/tour/gritfit-step-2-placeholder.png', alt: 'Desktop results page showing the three GRIT FIT score tiles at the top of the dashboard.' },
  },
  {
    num: '03/05',
    title: 'Reading Your Results',
    body: 'Your results table shows schools ranked by match strength. Each row includes:',
    list: [
      'Rank: Your match rank at that school (1 = best fit)',
      'Your Annual Cost: Estimated annual out-of-pocket cost after aid',
      'ADTLV: School\'s adjusted degree lifetime value',
      'Distance: Miles from your high school',
    ],
    tip: 'Click column headers to sort by any metric.',
    img: { src: '/tour/gritfit-step-3-placeholder.png', alt: 'Desktop GRIT FIT results table with Rank, Annual Cost, ADTLV, and Distance columns.' },
  },
  {
    num: '04/05',
    title: 'Taking Action',
    body: 'From each school\'s detail card, you can:',
    list: [
      'Fill out the recruiting questionnaire directly',
      'View the coaching staff page and contact coaches',
      'Add the school to your Shortlist to track your recruiting journey',
      'Edit your profile if your stats change — GRIT FIT recalculates automatically',
    ],
    img: { src: '/tour/gritfit-step-4-placeholder.png', alt: 'School detail slide-out panel with recruiting questionnaire, coaching staff, and shortlist actions.' },
  },
  {
    num: '05/05',
    title: 'Refine Your Results',
    body: 'The accuracy of your GRIT FIT depends on honest inputs. If your GPA, test scores, or athletic stats change, save your profile and your matches recalculate automatically. Your Shortlist persists and your recruiting journey progress is always saved.',
    img: { src: '/tour/gritfit-step-5-placeholder.png', alt: 'Desktop profile-and-results view showing recalculated GRIT FIT matches after profile save.' },
  },
];

export default function Tutorial({ type = 'browse', onClose }) {
  const [idx, setIdx] = useState(0);
  const slides = type === 'gritfit' ? GRITFIT_SLIDES : BROWSE_SLIDES;
  const slide = slides[idx];
  const isLast = idx === slides.length - 1;
  const deck = type === 'gritfit' ? 'gritfit' : 'browse';
  const vp = TOUR_STEP_VIEWPORTS.find(v => v.deck === deck && v.step === idx + 1);

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        backgroundColor: '#FFFFFF', borderRadius: 12, width: '100%', maxWidth: 520,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        padding: '28px 28px 20px', position: 'relative', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }}>
        {/* Close button */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 12, right: 14, background: 'transparent',
          border: 'none', color: '#6B6B6B', fontSize: 20, cursor: 'pointer', padding: '4px 8px',
        }}>&times;</button>

        {/* Slide content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: '0.6875rem', fontWeight: 600,
            letterSpacing: '2px', textTransform: 'uppercase', color: '#6B6B6B', marginBottom: 8,
          }}>
            {slide.num}
          </div>
          {/* tour-step-1: target viewport = desktop, placeholder 1440x900 */}
          {/* tour-step-2: target viewport = slideout (browse) / desktop (gritfit), placeholder 560x900 or 1440x900 */}
          {/* tour-step-3: target viewport = desktop, placeholder 1440x900 */}
          {/* tour-step-4: target viewport = desktop (browse) / slideout (gritfit), placeholder 1440x900 or 560x900 */}
          {/* tour-step-5: target viewport = desktop, placeholder 1440x900 */}
          {/* TODO(tour-screenshots): drop final PNGs into public/tour/ at the dimensions above; placeholders preserve aspect ratio so no layout reflow. */}
          {slide.img && vp && (
            <div style={{
              width: '100%', marginBottom: 14, backgroundColor: '#F4F4F4',
              borderRadius: 6, overflow: 'hidden', border: '1px solid #E8E8E8',
              aspectRatio: `${vp.width} / ${vp.height}`,
            }}>
              <img
                src={slide.img.src}
                alt={slide.img.alt}
                data-tour-step={vp.step}
                data-tour-deck={vp.deck}
                data-tour-viewport={vp.viewport}
                data-tour-target-width={vp.width}
                data-tour-target-height={vp.height}
                style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
              />
            </div>
          )}
          <h3 style={{
            fontFamily: 'var(--font-heading)', fontSize: '1.375rem', fontWeight: 700,
            color: '#2C2C2C', marginBottom: 12, lineHeight: 1.2, margin: '0 0 12px',
          }}>
            {slide.title}
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#2C2C2C', lineHeight: 1.6, marginBottom: 14 }}>
            {slide.body}
          </p>
          {slide.list && (
            <ul style={{ paddingLeft: 18, margin: '0 0 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {slide.list.map((item, i) => (
                <li key={i} style={{ fontSize: '0.8125rem', color: '#2C2C2C', lineHeight: 1.5 }}>{item}</li>
              ))}
            </ul>
          )}
          {slide.tip && (
            <div style={{
              fontSize: '0.8125rem', color: '#6B6B6B', backgroundColor: '#FFF8DC',
              borderLeft: '3px solid #D4AF37', padding: '8px 12px', borderRadius: '0 4px 4px 0',
              marginTop: 12, lineHeight: 1.5,
            }}>
              {slide.tip}
            </div>
          )}
        </div>

        {/* Support line */}
        <div style={{
          textAlign: 'center', fontSize: '0.6875rem', color: '#6B6B6B',
          paddingTop: 16, borderTop: '1px solid #E8E8E8', marginTop: 12,
        }}>
          Support: <a href="mailto:support@grittyfb.com" style={{ color: '#8B3A3A' }}>support@grittyfb.com</a>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16 }}>
          <button
            onClick={() => setIdx(i => Math.max(0, i - 1))}
            disabled={idx === 0}
            style={{
              padding: '7px 18px', background: 'transparent', border: '1px solid #D4D4D4',
              borderRadius: 4, color: idx === 0 ? '#D4D4D4' : '#6B6B6B',
              cursor: idx === 0 ? 'default' : 'pointer', fontSize: '0.8125rem',
            }}
          >
            &larr; Back
          </button>
          <div style={{ display: 'flex', gap: 6 }}>
            {slides.map((_, i) => (
              <div key={i} onClick={() => setIdx(i)} style={{
                width: 8, height: 8, borderRadius: '50%', cursor: 'pointer',
                backgroundColor: i === idx ? '#8B3A3A' : '#D4D4D4',
              }} />
            ))}
          </div>
          <button
            onClick={isLast ? onClose : () => setIdx(i => i + 1)}
            style={{
              padding: '7px 18px', border: 'none', borderRadius: 4, cursor: 'pointer',
              fontSize: '0.8125rem', fontWeight: 600,
              backgroundColor: '#8B3A3A', color: '#FFFFFF',
            }}
          >
            {isLast ? 'Get Started \u2192' : 'Next \u2192'}
          </button>
        </div>
      </div>
    </div>
  );
}
