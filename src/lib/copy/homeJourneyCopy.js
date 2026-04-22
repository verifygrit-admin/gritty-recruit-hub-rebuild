/**
 * homeJourneyCopy — operator-editable copy for the Home view three-step
 * user journey introduced in Sprint 003 D2a.
 *
 * Each step renders a JourneyCard: heading + body + CTA → route.
 * Edit these constants to revise copy without touching components.
 */

export const HOME_JOURNEY_STEPS = [
  {
    id: 'profile',
    heading: 'My Profile',
    body:
      'Your Student Athlete Profile is where every GRIT FIT recommendation starts. Add your position, height, weight, 40 time, GPA, SAT, and graduation year so the algorithm can match you against 662 college programs. The more complete your profile, the sharper your matches.',
    cta: 'Go to My Profile',
    href: '/profile',
  },
  {
    id: 'gritfit',
    heading: 'My Grit Fit',
    body:
      'GRIT FIT reads your profile and scores every program on Athletic Fit, Academic Fit, Geographic Fit, and Financial Fit. You get up to 30 matched schools ranked by overall fit — a starting point for your recruiting strategy, not a ceiling.',
    cta: 'View My Grit Fit',
    href: '/gritfit',
  },
  {
    id: 'shortlist',
    heading: 'My Short List',
    body:
      'Your Short List is where the recruiting journey actually happens. Add schools from your Grit Fit results or anywhere else you are interested. Each school tracks a 15-step recruiting timeline — from first contact to written offer — so you always know your next move.',
    cta: 'Open My Short List',
    href: '/shortlist',
  },
];
