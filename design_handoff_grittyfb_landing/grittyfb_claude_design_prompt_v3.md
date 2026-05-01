# Claude Design Prompt — GrittyFB.com Landing Page

## Project context

Design a single, scrolling marketing landing page for **grittyfb.com**, the home of **GrittyFB** — a recruiting intelligence company for high school football programs. GrittyFB is the company brand. **GrittyOS** is the platform / software product the company builds and operates. The page markets the GrittyOS web app (app.grittyfb.com), the Gritty Guides advisory content product, and the broader GrittyFB partnership offering. It is the primary acquisition surface for the company.

**Brand naming convention used throughout this prompt — follow it precisely in the output:**
- **GrittyFB** = the company, the team, the partnership, advisory engagements, "who the AD is hiring"
- **GrittyOS** = the platform, the software, the app, the screens and features that run on it
- When in doubt, use GrittyFB for relational/organizational nouns and GrittyOS for technical/product nouns.

**Target audience, in priority order:**
1. High school athletic directors (primary buyer)
2. High school head football coaches (primary user / influencer)
3. School administrators and principals (approver / budget holder)
4. Student-athletes and families (secondary trust signal — referenced as "who we serve," not pitched)

**Single primary CTA across the page:** *"Talk to the Founder"* — opens a contact form or scheduler that routes to the founder, Chris Conroy. There is no self-serve signup, no free trial download. Every CTA on the page resolves to this one action.

**Page goal:** When an AD finishes scrolling, they should think *"I need to talk to this person before our next recruiting cycle."* Not *"interesting tool."* The page must be a pitch, not a feature catalog.

## Brand system — locked

Use these exact tokens. Do not substitute, do not add new colors.

```css
:root {
  /* Forest greens */
  --forest-deep: #0A2818;
  --forest-dark: #123E28;
  --forest-mid: #14492F;
  --forest-surface: #17472F;

  /* Chartreuse — brand signature accent */
  --chartreuse: #C0FD72;
  --chartreuse-bright: #D0FF85;
  --chartreuse-muted: #A8E85A;

  /* Paper / surfaces */
  --paper: #FAF9F5;
  --paper-warm: #F4F2EA;

  /* Ink / type */
  --ink: #1A1A1A;
  --ink-soft: #3A3A3A;
  --ink-muted: #6A6A6A;
  --ink-ghost: #9A9A9A;

  /* Hairlines */
  --border-hairline: rgba(20, 73, 47, 0.12);
  --border-subtle: rgba(20, 73, 47, 0.20);

  /* Status (use sparingly) */
  --amber-warn: #C77A1B;
  --red-alert: #A63A35;
}
```

**Typography:**
- Display / headlines: `'Instrument Serif', Georgia, serif` — used for hero headline, section titles, and the big-number stats. Editorial weight.
- Body / UI: `'Inter', -apple-system, BlinkMacSystemFont, sans-serif` — used for everything else.
- Buttons / labels: Inter, with subtle letter-spacing (0.02em) on uppercase labels.

**Visual character:** Modern athletics SaaS energy executed with editorial restraint. Think *The Athletic* meets *Stripe* meets *Hudl*. Bold and confident, but typographically grown-up. ADs read this in their offices, not their locker rooms. Avoid: stock photo loud-loud, inflatable mascot energy, generic SaaS gradients, neon glow effects. Embrace: deep forest backgrounds with chartreuse accents, large serif headlines, generous white space on paper sections, subtle texture on dark sections (matching the gritty texture in our existing brand mark — gentle film-grain or asphalt-grain feel, never overpowering).

**Logo placement:** Top-left of nav, monochrome white-on-forest in the header, inverted to forest-on-paper in any paper-section context.

## Layout system

- **Desktop max-width:** 1280px content container, 1440px outer for full-bleed dark sections.
- **Mobile-first responsive:** every section must be specified for both. Mobile breakpoint: 768px. Margin presets: 24px gutter on mobile, 64px on desktop.
- **Section rhythm:** Alternate dark (forest) and light (paper) sections to create visual rhythm. Hero dark → Stakes dark → Problems light → Product Tour mixed → How We Partner light-warm → Proof dark → Testimonials light → Founder light-warm → Pricing dark → Final CTA dark.

---

## Page sections — top to bottom

### 1. Navigation bar

- Sticky on scroll, slight backdrop-blur when not at top.
- Background: `--forest-deep` with a 1px `--border-subtle` bottom edge.
- Left: GrittyFB wordmark + G monogram (chartreuse arrow on white circle, sized ~32px height).
- Center (desktop) / hamburger (mobile): Anchors — *Why GrittyFB · Product · Partnership · Outcomes · Founder · Pricing*
- Right: Primary CTA button — *"Talk to the Founder"* — chartreuse fill, forest-deep text, slight shadow on hover.

### 2. Hero

Full-bleed dark section. `--forest-deep` background with a subtle gritty texture overlay (film-grain or asphalt-grain at 6–8% opacity). Generous vertical padding — 120px top/96px bottom on desktop.

**Layout:** Two-column on desktop (60/40 split), stacked on mobile.

**Left column — copy:**
- **Eyebrow** (Inter, uppercase, chartreuse, letter-spaced): *"Recruiting intelligence for high school football"*
- **Headline** (Instrument Serif, ~72px desktop / 44px mobile, paper color, tight leading):
  > *"A football scholarship offer is a pitch. A Grit Fit is a decision."*
- **Subhead** (Inter, ~20px, paper at 80% opacity, max 580px width):
  > *"GrittyFB partners with high school athletic departments — combining recruiting intelligence software with founder-led advisory — so every football student-athlete on your roster lands at the right college, on the right team, with the right financial fit."*
- **CTA group:** Primary button *"Talk to the Founder"* (chartreuse fill, forest-deep text, ~56px tall) + secondary text link *"See the platform →"* (chartreuse, scrolls to Product Tour).
- **Trust line below CTAs** (small, Inter, paper at 55% opacity): *"Built by a former BC High coach. Used by athletes committing to selective programs across the Northeast."*

**Right column — hero product visual:**
- Placeholder ID: `HERO_GRIT_FIT_MAP` — a large product screenshot of the **Grit Fit Map** showing a US map with dozens of school markers color-coded by Grit Fit status (Grit Fit School / Academic Stretch / Athletic Stretch / Below Academic Fit / Highly Recruitable / Outside Geographic Reach). Dense and data-rich. Set inside a tilted forest-dark frame with a thin chartreuse hairline border. Add a subtle drop shadow. Apply a slight diagonal tilt (~3 degrees) for movement.
- Below the screenshot, a small floating "tag" — chartreuse pill with forest-deep text — that reads *"Live data on 661 NCAA football programs."*
- Above the screenshot, a small floating "active filter" UI element — paper-colored pill with a chartreuse dot and small text reading *"Showing: Grit Fit matches for Class of 2027 DT, 3.2 GPA"* — to make the screenshot feel alive, not static.

### 3. The Stakes — the $1M conviction band

Full-bleed dark section. `--forest-dark` background. This is the band that earns the rest of the page.

**Layout:** Single centered column, 720px max-width on desktop, generous padding.

**Headline** (Instrument Serif, ~64px desktop / 40px mobile, paper):
> *"The most expensive financial decision a family will ever make isn't a house."*
> *"It's a college."*

(Set on two lines, the second line in chartreuse.)

**Big stat row** (3 columns desktop, stacked mobile, with hairline dividers between):
- **$1M** — *Lifetime net worth destroyed by a wrong-fit college, per peer-reviewed research*
- **5–10×** — *Larger than the average loss from a housing crash*
- **0** — *Other major debts that survive bankruptcy. Student debt is the only one.*

(Stat numbers: Instrument Serif, ~88px, chartreuse. Captions: Inter, ~15px, paper at 75%.)

**Body copy** (Inter, ~18px, paper at 88%, max 640px):
> *"Choosing the wrong college — attending a low-value institution, taking on debt, not completing — destroys roughly $1M in lifetime net worth compared to a strong-fit, completed degree.*
>
> *Every other catastrophe has an exit. A bad mortgage is dischargeable. A failed business goes through bankruptcy. Markets recover.*
>
> *Student debt is the only major household debt that survives bankruptcy. The credential gap is permanent. The lost cohort years can't be recovered. There is no walk-away. There is no reset.*
>
> *For a football student-athlete, the stakes compound. Recruiting decisions made at 16 and 17 — often with incomplete information, manufactured urgency, and no independent advocate — set the trajectory for the rest of their lives.*
>
> **This is why GrittyFB exists.**"

**Source footnote** (Inter, ~12px, paper at 50%): *"Sources: Chetty et al., admin earnings data; peer-reviewed higher-education ROI research. Full citations available on request."*

### 4. Problems Solved — three pillars

Light section. `--paper` background.

**Section eyebrow:** *"What GrittyFB solves"* (uppercase, forest-mid, letter-spaced).

**Section headline** (Instrument Serif, ~56px, ink): *"Three problems your recruiting program has right now."*

**Three-card grid** (3 across desktop, stacked mobile). Each card: `--paper-warm` background, generous interior padding (~48px), 12px corner radius, `--border-hairline` 1px border. Each card has a small chartreuse-on-forest icon block (custom icon, ~48px), a serif title, and Inter body.

**Card 1 — A Gameplan for Every Student**
> *"Every student-athlete's college fit is different. The cost of getting it wrong is generational. GrittyFB replaces guesswork with the same institutional-grade analysis used by families with the deepest cultural capital — athletic fit, academic percentile, true out-of-pocket cost, and long-term ROI for every program in NCAA Divisions I-FBS, I-FCS, II, and III."*

**Card 2 — No Balls Dropped**
> *"Coordinating communication across high school administrators, guidance counselors, coaches, families, college admissions officers, and college coaches is the work that breaks down. GrittyOS makes sure the right checkpoint happens at the right time, with the right information, every time."*

**Card 3 — The Platinum Opportunity**
> *"The conventional wisdom in recruiting points families toward a single Division I scholarship offer — statistically unavailable to most. GrittyFB surfaces the Platinum Opportunity: a selective institution, even at D-III or FCS, that produces stronger lifetime earnings, deeper alumni networks, and better long-term outcomes than waiting on a D-I offer to a less selective school. We focus on 40 over 4."*

### 5. Product Tour — features with real screenshots

Mixed section. Alternating paper and forest backgrounds in sub-bands for visual rhythm.

**Section eyebrow:** *"The platform"*

**Section headline:** *"Built like the systems athletic departments already trust."*

**Subhead** (Inter, 18px, ink-soft, max 720px): *"GrittyOS sits alongside the tools your students already use — Hudl, NCAA profiles, College Board — and gives your department the layer none of them provide: decision intelligence built around your roster."*

**Four feature blocks**, alternating image-left / image-right on desktop, stacked on mobile. Each block has:
- A real product screenshot in a tilted forest-deep frame (same treatment as hero)
- Eyebrow tag (chartreuse, uppercase, small)
- Serif feature title (~36px)
- Inter body description (~17px, max 480px)
- A small list of 2–3 bullet "what it does" lines

**Block 1 (image left, paper bg) — Grit Fit Map & Table**
- Placeholder ID: `PRODUCT_GRIT_FIT_MAP` (operator will provide a different angle/zoom of the same map view used in hero — full US map, status legend visible, division legend visible)
- Eyebrow: *"COLLEGE MATCHING"*
- Title: *"Athletic fit. Academic fit. Recruitable reach. One score."*
- Body: *"Our proprietary Grit Fit algorithm scores every NCAA football program against the student-athlete's profile. Map every match. See every fit. No more random Twitter outreach."*
- Bullets: 661 programs scored · Athletic + academic + financial dimensions · Real-time updates

**Block 2 (image right, forest bg) — Recruiting Scoreboard & Shortlist**
- Placeholder IDs: `PRODUCT_RECRUITING_SCOREBOARD` (primary, larger) and `PRODUCT_SHORTLIST_PROGRESS` (secondary, smaller inset overlapping the bottom-left of the primary). The primary shows the Recruiting Scoreboard table with 7 Key Recruiting Journey Steps columns, Verbal Offer badges visible on top rows, Quality Offer Score and Compound Profile columns. The secondary shows the My Shortlist view with ranked progress bars (X/15 steps) and color-coded status pills (Grit Fit School, Academic Stretch, etc.).
- Both screenshots in tilted forest-deep frames with chartreuse hairline borders. The smaller inset offset down-left from primary, suggesting layered views of the same data.
- Eyebrow: *"PROCESS TRACKING"*
- Title: *"Every kid. Every school. Every step."*
- Body: *"The Recruiting Scoreboard tracks where every student-athlete stands with every target school across the 15-step recruiting journey. Coaches see their roster at a glance. Families see progress. ADs see outcomes."*
- Bullets: 15-step journey tracker · Per-school progress bars · Verbal & written offer badges
- (Note for designer: forest section uses paper-color text; both screenshot frames use chartreuse hairline.)

**Block 3 (image left, paper bg) — Coach Communication Guides + Gritty Guides**
- Eyebrow: *"PLAYBOOK CONTENT"*
- Title: *"Strategy snapshots families can act on in 90 seconds."*
- Body: *"Coach Communication Guides give student-athletes the right script for every step. Gritty Guides give families a playbook for every junction in the recruiting cycle — from first questionnaire to verbal offer to early-read."*
- Bullets: Step-by-step scripts · NCAA-aligned recruiting calendar · Pre-read materials library

- **Visual: Render a stylized in-product mock** of a Coach Communication Guide template, NOT a real screenshot. The mock should look like a card or modal in the GrittyOS app, in the brand system. Specifically:

  - A "card" mock with `--paper-warm` background, 12px corner radius, `--border-hairline` 1px border, generous internal padding (~32px)
  - Top of card: small chartreuse-on-forest tag pill reading *"TEMPLATE 02 · POST-CAMP FOLLOW-UP"*
  - Below tag: a serif title (Instrument Serif, ~24px, ink): *"The Camp Follow-Up Email"*
  - Below title: small Inter caption (14px, ink-muted): *"Use 24–48 hours after attending a camp where the coach was present"*
  - Hairline divider
  - A "subject line" field rendered as a labeled input (small Inter label "SUBJECT", then forest-mid box with text inside): *"Nice to meet you at [Camp Name] | [Player Name] '27 [Position] | [High School]"*
  - Below that, a "body" preview area showing 3–4 lines of the templated email with placeholder-style highlighting on the variables. Use chartreuse-tinted backgrounds (~15% opacity) on placeholder tokens like `[Camp Name]`, `[Coach Name]`, `[School]`, `[Position]`, `[GPA]`. Body text in Inter, 14px, ink-soft.
  - Sample body text:
    > *"Hi Coach [Last Name], it was great to see [School Name] at the [Camp Name] last week. I wanted to let you know that I recently submitted the recruiting questionnaire for [School Name]. My school counselor, coaches, parents, and I have been discussing my college plans..."*
  - Bottom of card: a subtle action bar with two small buttons — chartreuse fill *"Copy template"* and outlined *"View full guide"*. Don't make these functional, just visual.
  - Floating slightly behind the main card, render two more partial card edges (paper-warm with hairlines) to suggest a stack of templates beneath. This communicates *"there are more of these"* without showing them all.

- Set this stylized mock inside a tilted forest-dark frame with chartreuse hairline, same treatment as the real screenshots in other blocks. The visual through-line keeps Block 3 feeling like the same product family.

**Block 4 (image right, forest bg) — Coach Dashboard & Reports**
- Eyebrow: *"FOR YOUR COACHES"*
- Title: *"Your head coach gets a recruiting program, not a spreadsheet."*
- Body: *"Coach Recruiting Dashboard surfaces every athlete's status, every camp registration, every junior day, every coach contact — without your head coach having to maintain it manually."*
- Bullets: Roster-wide visibility · Auto-coordinated calendar · Event registration tracking

### 6. How We Partner — software + advisory

Light section. `--paper-warm` background. This is the band that distinguishes GrittyFB from a SaaS purchase.

**Section eyebrow:** *"More than software"*

**Section headline** (Instrument Serif, ~56px, ink): *"A partnership, not a purchase order."*

**Subhead** (Inter, 18px, ink-soft, max 720px): *"GrittyFB engagements pair the platform with founder-led advisory. Athletic departments don't just buy access — they get a recruiting program, a strategic partner, and a system their coaches and counselors can run with confidence."*

**Three-card grid** (3 across desktop, stacked mobile). Each card uses `--paper` background (lighter than the section background to create depth), 48px interior padding, 12px corner radius, `--border-hairline` 1px border. Each card has:
- A small chartreuse-on-forest icon block (~48px, custom icon — no stock imagery)
- An eyebrow tag (uppercase, forest-mid, letter-spaced)
- A serif title (Instrument Serif, ~28px)
- Inter body copy (~16px, ink-soft)
- A 2–3 item list at the bottom of what's included

**Card 1 — Onboarding & Integration**
- Eyebrow: *"PHASE ONE"*
- Title: *"Set up your athletic department, end to end."*
- Body: *"We onboard your AD office, head coach, college counseling team, and student-athletes onto the platform. We integrate GrittyOS with the systems you already use — Hudl, NCAA profiles, your SIS — so the data flows where it needs to go without your staff lifting a finger."*
- List: Hudl + NCAA integration · Roster import & profile setup · Department-wide training

**Card 2 — Gritty Guides Advisory**
- Eyebrow: *"DIRECT-TO-FAMILY"*
- Title: *"Strategic guidance through every recruiting juncture."*
- Body: *"Gritty Guides is the advisory layer for student-athletes and families. From first questionnaire to camp strategy to verbal offer to financial pre-read, families get direct, founder-informed guidance at the moments that matter most. No more guessing what comes next."*
- List: 1:1 family advisory sessions · Recruiting cycle planning · Camp & junior day strategy

**Card 3 — Coach & Counselor Enablement**
- Eyebrow: *"OPERATING THE SYSTEM"*
- Title: *"Your staff runs it. We make sure they can."*
- Body: *"Your head football coach gets a recruiting system that works without becoming a second job. Your college counselors get visibility into every athlete's process. We train, we coach, and we stay engaged through the recruiting cycle so your team operates with confidence."*
- List: Coach training & dashboard onboarding · Counselor portal walkthrough · Mid-season check-ins

**Below the cards — partnership callout:**

A horizontal callout band, full-width within the section, `--forest-deep` background with chartreuse hairline.
- Center copy (Instrument Serif, 26px, paper):
  > *"Every GrittyFB partnership starts with a 15-minute call with the founder. We scope the engagement to your department's roster, calendar, and goals."*
- Below copy: small CTA *"Talk to the Founder →"* (chartreuse text link)

### 7. Proof — Class of 2027 outcomes

Full-bleed dark. `--forest-deep` background. This is the receipts band.

**Eyebrow:** *"From our Class of 2027 trial"*

**Headline** (Instrument Serif, ~56px, paper):
> *"What a single recruiting cycle on GrittyFB looks like."*

**Big-stat grid** (4 columns desktop, 2x2 mobile):

- **35** *Schools targeted and recruiting questionnaires completed per player*
- **15** *Junior Day events completed per player at academically selective conferences*
- **8** *Camp registrations per player with target-school coach attendance*
- **25%** *Of players received verbal offers of admissions support within 3 months*

(Numbers: Instrument Serif, ~96px, chartreuse. Captions: Inter, 14px, paper at 75%.)

**Conference name strip** (Inter, 13px, paper at 60%, single line, hairline above and below):
> *"Verbal offers from programs in the Liberty League · NESCAC · North Coast Athletic Conference · Patriot League · Coastal Athletic · Northeast Conference · Ivy League · NE10 · NEWMAC"*

**Caption below** (Inter, 13px, paper at 50%): *"Cycle measured: January 17, 2026 – April 20, 2026. Players had no prior college coach contact at start of cycle."*

### 8. Testimonials

Light section. `--paper` background.

**Eyebrow:** *"From the families using GrittyFB"*

**Headline** (Instrument Serif, ~56px, ink): *"Why parents trust the system."*

**Three-card layout** (3 across desktop, stacked mobile). Each card:
- `--paper-warm` background, 12px corner radius, `--border-hairline` 1px border, ~40px interior padding
- Five chartreuse star icons at top
- Pull-quote in Instrument Serif, ~20px, ink, ~140% line height
- Hairline divider below quote
- **Attribution row** at bottom: school logo badge on the left + attribution text on the right
  - **Logo badge spec:** ~64px circular badge, `--paper` background (lighter than card), 1px `--border-hairline` border, school logo rendered native full-color centered inside with ~10px internal padding. Standardize the *container*, not the logo color.
  - Attribution text: Inter, 14px, ink-soft, two lines — first line bold (*Parent*), second line lighter (school name). Example:
    > **Parent**
    > *Boston College High School*

**Card 1 — advisory + clarity theme (Belmont Hill):**
> *"GrittyFB's strategic guidance was a game-changer for our family. We always knew which step came next, what to say to which coach, and which schools genuinely fit our son academically and athletically. The Gritty Guides made hard decisions feel grounded in real analysis, not guesswork."*
> — Parent, Belmont Hill School

**Card 2 — platform + outcomes theme (BC High):**
> *"My son has had verbal offers from selective schools we never thought were within reach. GrittyOS surfaced colleges we'd never have considered on our own — and the data made the case for why they were genuinely strong fits. The recruiting picture finally felt understandable instead of overwhelming."*
> — Parent, Boston College High School

**Card 3 — integrated platform + advisory theme (Abington):**
> *"GrittyFB gave our family more than a tool — it gave us a partner through one of the biggest decisions a teenager will ever make. Between the platform's clarity and the direct guidance from the team, our son went from overwhelmed to in control of his recruiting process."*
> — Parent, Abington High School

(Note for designer: render each card identically. Logo badges are the unifying visual element. School logos are rendered native full-color: Belmont Hill is navy/red/white circular seal; BC High is gold/maroon/blue/white crest; Abington is single-color green eagle/A. The standardized circular badge container with paper background creates cohesion despite the logos being visually different.)

**Below the testimonials cards — small caption** (Inter, 13px, ink-muted, centered): *"Testimonials anonymized at parents' request. Each family has a son in the GrittyFB Class of 2027 cohort."*

### 9. Founder — origin story

Light section. `--paper-warm` background. This is where the founder-led page earns its CTA.

**Two-column layout** (50/50 desktop, stacked mobile, photo above text).

**Left column — photos:**
- Primary: a portrait headshot of Chris Conroy in a coach's cap on a sideline. Placeholder ID: `FOUNDER_HEADSHOT`. Render in a forest-deep frame with chartreuse hairline. Slight tilt or asymmetric crop to keep the page's energy. Keep image size meaningful — at least 480px wide on desktop.
- Secondary inset: a smaller photo of Chris coaching in a huddle of BC High players (maroon and gold helmets visible). Placeholder ID: `FOUNDER_BC_HIGH_HUDDLE`. Render this as a smaller image (~240px wide) overlapping the bottom-right of the primary headshot, in its own forest-deep frame with chartreuse hairline. The two photos together communicate *"this is who built it"* and *"this is where it came from"* simultaneously.
- Below photos, a small "signature" element — handwritten-style script of Chris's signature, in forest-mid. Placeholder ID: `FOUNDER_SIGNATURE`.

**Right column — copy:**

**Eyebrow** (uppercase, chartreuse-muted on paper-warm, letter-spaced): *"Why I built GrittyFB"*

**Headline** (Instrument Serif, ~44px, ink):
> *"I'm a BC High graduate. I coached football at BC High. I built the platform I wished I'd had — for the families who deserve it."*

**Body** (Inter, 17px, ink-soft, ~480px max):
> *"Most of the kids in my locker room weren't going to get a Division I scholarship. The ones with parents who could navigate the system landed at selective schools that changed their lives. The ones without spent years chasing a label that wasn't coming.*
>
> *I built GrittyFB to close that gap.*
>
> *The recruiting intelligence that the most prepared families have always had — fit modeling, financial analysis, process coordination, conference-by-conference timing — should be available to every student-athlete at every high school. Especially the ones the system routes away from.*
>
> *That's the company. That's the mission. If your athletic department serves kids who deserve better than the default path, I'd like to talk."*

**Signature line** (Inter, 14px, ink-soft):
> *"— Chris Conroy, Founder, GrittyFB"*

**Inline CTA button**: *"Talk to Chris"* — chartreuse fill, forest-deep text, ~48px tall.

### 10. Pricing

Full-bleed dark. `--forest-deep` background.

**Eyebrow:** *"Founding partner pricing"*

**Headline** (Instrument Serif, ~56px, paper):
> *"Software access. Advisory partnership. Founding-partner terms."*

**Subhead** (Inter, 17px, paper at 80%, max 720px, centered): *"Per-athlete software pricing is below. Advisory engagements are scoped per athletic department — we'll talk through the right partnership structure on the founder call."*

**Two-card pricing layout** (side by side desktop, stacked mobile). Forest-surface card backgrounds, chartreuse hairline borders.

**Card 1 — Annual (recommended):**
- Tag at top: *"BEST VALUE"* (chartreuse pill on forest-deep)
- Big price: *$197* (Instrument Serif, ~80px, paper)
- Sub: *per student-athlete / year*
- Hairline divider
- Inclusion list (Inter, 15px, paper at 85%, with chartreuse checkmarks):
  - Full GrittyOS Recruit Hub access
  - All Gritty Guides included
  - Coach Communication Guides
  - Recruiting Scoreboard + Journey Tracker
  - Pre-read materials library
- CTA button: *"Talk to the Founder"* — chartreuse fill

**Card 2 — Monthly:**
- Big price: *$19.99* (Instrument Serif, ~80px, paper at 85%)
- Sub: *per student-athlete / month*
- Hairline divider
- *"Same software access. Pay as you go."*
- CTA button: *"Talk to the Founder"* — outline only, chartreuse stroke

**Below cards — Founding Partner banner:**
A horizontal callout band, full-width within the section, `--forest-mid` background with chartreuse hairline.
- Left: Chartreuse icon (small, simple — a flag or arrow)
- Center copy (Instrument Serif, 28px, paper):
  > *"Founding Partners: unlimited coach and administrator accounts at no cost — through July 1, 2026."*
- Right: Small CTA *"Claim founding partner status →"* (chartreuse text link)

**Below founding partner banner — advisory pricing footnote:**
A simple typographic block, centered, max 720px width.
- Small eyebrow (Inter uppercase, chartreuse-muted): *"ADVISORY ENGAGEMENTS"*
- Body (Inter, 16px, paper at 75%): *"Onboarding, integration, family advisory, and coach enablement engagements are scoped to your athletic department's roster size, recruiting calendar, and goals. Most partnerships start at the department level. We'll walk through scope and pricing on the founder call."*

### 11. Final CTA

Full-bleed dark. `--forest-deep` background. Generous padding — 120px top and bottom.

**Layout:** Centered, single-column, 640px max width.

**Eyebrow:** *"Next step"*

**Headline** (Instrument Serif, ~64px, paper):
> *"You don't need another recruiting service."*
> *"You need a recruiting system."*

(Second line in chartreuse.)

**Subhead** (Inter, 18px, paper at 85%):
> *"15-minute call. I'll walk you through GrittyFB — software, advisory, and how the two work together — share what we're seeing in the Class of 2027 cycle, and we'll figure out together whether your athletic department is a fit for founding partnership."*

**Primary CTA button** (large, ~64px tall): *"Talk to Chris Conroy"*

**Below button** (Inter, 14px, paper at 60%): *"Or email chris@grittyfb.com directly. No sales team. Just me."*

### 12. Footer

`--forest-deep` background, 1px chartreuse hairline at top.

- Logo + wordmark (left)
- Three columns of small links: Product (Recruit Hub, Gritty Guides, Coach Dashboard) · Company (About, Founder, Contact) · Legal (Privacy, Terms)
- Far right: Social icons (X, LinkedIn) — chartreuse on hover
- Bottom strip: copyright, "Built in Boston" tagline

---

## Specific design instructions

- **Mobile responsiveness is non-optional.** Every section must specify mobile layout. Use 24px gutters on mobile, 64px on desktop. Hero stacks single-column on mobile with screenshot below copy. Stat grids collapse 4-up to 2x2 to 1-up cleanly.
- **Avoid these failure patterns:** generic SaaS gradients, neon glows, stock photo libraries, mascot illustrations, kid-friendly cartoon UI, anything that screams "youth sports website."
- **Match the existing brand mark texture.** Apply a subtle gritty/asphalt texture overlay to dark sections at 6–8% opacity. This is the visual through-line back to the existing Twitter header brand asset.
- **Do not use AI-generated illustrations of people.** Real photo only for the founder block. Product screenshots only for product blocks. Placeholder rectangles where assets aren't yet provided.
- **Treat chartreuse like Tabasco.** It's the accent that makes the page distinctive. Use it on CTAs, big stat numbers, hairlines on screenshot frames, eyebrow text, and the "rising arrow" energy throughout. Do not flood the page with it.

## Output format

Return a single self-contained HTML file with all CSS inline in a `<style>` block in the head. Use semantic HTML5. No external JavaScript dependencies. No image hosts — use placeholder rectangles labeled clearly (`HERO_SCREENSHOT`, `FOUNDER_PHOTO`, `LOGO_BELMONT_HILL`, etc.) for all images so the operator can swap them in the Code phase.

Include a top-of-file comment block listing every placeholder image by ID and recommended dimensions, so the handoff to Claude Code is unambiguous.

Use CSS custom properties from the locked `:root` block above. No utility frameworks, no Tailwind. Pure hand-written CSS.

Mobile-first media queries.

---

## Asset manifest — placeholders the operator will provide in Code phase

The Design output should use clearly-labeled placeholder rectangles for every image asset. The operator will swap real assets in during the Claude Code handoff. Required placeholder IDs:

**Brand:**
- `LOGO_GRITTYFB_WORDMARK` — full logo, white-on-forest preferred (nav)
- `LOGO_G_MONOGRAM` — chartreuse-arrow-on-circle G mark (favicon, footer)

**Hero:**
- `HERO_GRIT_FIT_MAP` — full Grit Fit Map screenshot, ~1200×900px, forest-deep tilted frame

**Product Tour:**
- `PRODUCT_GRIT_FIT_MAP` — Grit Fit Map at different zoom/angle from hero
- `PRODUCT_RECRUITING_SCOREBOARD` — full Scoreboard table with 8 rows visible
- `PRODUCT_SHORTLIST_PROGRESS` — Shortlist ranked-list view with progress bars (smaller, inset)
- `PRODUCT_COACH_DASHBOARD` — coach roster view (operator may supply later; placeholder OK)

**Founder:**
- `FOUNDER_HEADSHOT` — sideline cap headshot
- `FOUNDER_BC_HIGH_HUDDLE` — Chris coaching in BC High player huddle
- `FOUNDER_SIGNATURE` — handwritten-style signature

**Testimonials (rendered native full-color in standardized circular badges):**
- `LOGO_BELMONT_HILL` — Belmont Hill School circular seal, navy/red/white, transparent or paper-color background
- `LOGO_BC_HIGH` — Boston College High School crest with "BC HIGH" wordmark, gold/maroon/blue/white, transparent or paper-color background
- `LOGO_ABINGTON` — Abington High School Green Wave eagle/A logo, single-color green, transparent background

For all placeholders, render as forest-deep rectangles with chartreuse hairline, with the placeholder ID rendered in monospace font centered inside, plus the recommended dimensions. Example:
```
[ HERO_GRIT_FIT_MAP ]
[ 1200 × 900 ]
```
This makes Code-phase swap unambiguous.

---

## Output handoff notes

- This file will be passed to Claude Code immediately after design approval. Code's job is to take the HTML, integrate it into the grittyfb.com production environment (Vercel/Next.js stack matching app.grittyfb.com), wire up the Talk-to-Founder CTA to the founder's email or scheduler, swap in real assets, and link to app.grittyfb.com from any "See the platform" or "Sign in" affordances.
- Keep the HTML semantic and accessible (proper heading hierarchy, alt text on images, sufficient color contrast).
- Do not introduce JavaScript dependencies, animation libraries, or third-party CSS frameworks. Pure HTML + CSS.
- Optimize for Lighthouse performance. No web fonts beyond Inter and Instrument Serif (use Google Fonts or self-host — operator will decide).
