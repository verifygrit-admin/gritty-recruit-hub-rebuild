# Handoff: GrittyFB Marketing Landing Page

## Overview

This is the production marketing site for **GrittyFB** — a recruiting intelligence platform and advisory partnership for high school football athletic departments. The site's job is to:

1. Convince athletic directors and head coaches that the college recruiting process is broken for their student-athletes.
2. Show what GrittyFB's combined software + advisory partnership delivers (Recruit Hub, Gritty Guides, Coach Dashboard, Founder advisory).
3. Drive a single primary conversion: **"Talk to the Founder"** — a 15-minute call with Chris Conroy (`mailto:chris@grittyfb.com`).

The page is one long scroll with anchor-linked sections in the top nav.

---

## About the Design Files

The files in this bundle are **design references created in HTML** — a working hi-fidelity prototype that demonstrates the intended look, copy, layout, and interaction. They are **not production code to copy directly.**

Your task is to **recreate this design in the target codebase's existing environment** (Next.js, Astro, Remix, etc.) using its established components, design tokens, and content/CMS conventions. If no environment exists yet, choose the most appropriate marketing-site framework (Next.js + Tailwind is a reasonable default) and implement the design there.

The HTML reference uses inline `<style>` and a single Babel-compiled JSX file for an in-page "Tweaks" panel — neither belongs in production. Lift the **design**, not the **scaffolding**.

---

## Fidelity

**High-fidelity (hifi).** Every color, font, size, and spacing value in the prototype is intentional and final. The developer should recreate the UI pixel-perfectly using the codebase's existing libraries and patterns, matching the design tokens listed below.

---

## Files in this bundle

| File | Purpose |
|---|---|
| `index.html` | The full landing page — all markup, CSS, and the React-based Tweaks panel |
| `tweaks-panel.jsx` | In-design tweak controls (NOT for production — design-time only) |
| `assets/grittyfb-logo.png` | Brand mark (used as `background-image` in `.brand-mark`) |
| `assets/chris-headshot.jpg` | Founder portrait (used in Founder section + small founder huddle photo) |
| `assets/chris-huddle.jpg` | Founder coaching BC High players (Founder section secondary photo) |
| `assets/coach-dash.png` | Reference screenshot of the coach dashboard product |
| `assets/belmont-hill.png` | School badge — Belmont Hill (testimonial 1) |
| `assets/bc-high.jpg` | School badge — Boston College High (testimonial 2) |
| `assets/abington.jpg` | School badge — Abington High (testimonial 3) |
| `assets/twitter-header.png` | Social/OG image (not yet referenced in markup) |

---

## Design Tokens

These are defined as CSS custom properties at the top of `index.html` (`:root`). Move them into the codebase's design-token system (Tailwind config, CSS variables, theme file, etc.).

### Colors

| Token | Hex | Usage |
|---|---|---|
| `--forest-deep` | `#0A2818` | Hero, Proof, Pricing, Final CTA backgrounds — the darkest brand green |
| `--forest-dark` | `#123E28` | Stakes section background — slightly lighter than forest-deep |
| `--forest-mid` | `#14492F` | Card surfaces on dark sections (rare) |
| `--forest-surface` | `#17472F` | Subtle inner surfaces on dark sections |
| `--chartreuse` | `#C0FD72` | **Primary accent.** Buttons, links, key numbers, brand pop |
| `--chartreuse-bright` | `#D0FF85` | Hover state for chartreuse |
| `--chartreuse-muted` | `#A8E85A` | Subtle chartreuse usage |
| `--paper` | `#FAF9F5` | Light section background ("paper") + light text on dark |
| `--paper-warm` | `#F4F2EA` | Slightly warmer paper — used for Partnership and Founder sections |
| `--ink` | `#1A1A1A` | Body text on paper |
| `--ink-soft` | `#3A3A3A` | Secondary body text on paper |
| `--ink-muted` | `#6A6A6A` | Tertiary text on paper |
| `--ink-ghost` | `#9A9A9A` | Captions, fine print |
| `--border-hairline` | `rgba(20,73,47,0.12)` | 1px hairline borders on light sections |
| `--border-subtle` | `rgba(20,73,47,0.20)` | Slightly stronger borders |
| `--amber-warn` | `#C77A1B` | Warning state in mocked dashboards |
| `--red-alert` | `#A63A35` | Alert state in mocked dashboards |

### Typography

Three Google Fonts. Load with `<link>` or self-host:

```
Instrument Serif — italic 0;1 — used for ALL display headlines and large numbers
Inter — 400, 500, 600, 700 — used for body, eyebrows, buttons, UI
Homemade Apple — 400 — used ONLY for the founder's signature
```

**Type scale (final, production values):**

| Element | Family | Size | Line height | Weight | Letter-spacing |
|---|---|---|---|---|---|
| Hero H1 | Instrument Serif | `clamp(44px, 5.5vw, 76px)` | 1.04 | 400 | -0.02em |
| Stakes H2 | Instrument Serif | `clamp(36px, 5vw, 64px)` | 1.06 | 400 | -0.015em |
| Section title (`.s-title`) | Instrument Serif | `clamp(36px, 4.4vw, 56px)` | 1.05 | 400 | -0.015em |
| Final CTA H2 | Instrument Serif | `clamp(40px, 5.5vw, 72px)` | 1.05 | 400 | -0.02em |
| Feature title | Instrument Serif | `clamp(28px, 3vw, 38px)` | 1.1 | 400 | -0.01em |
| Founder headline | Instrument Serif | `clamp(30px, 3.4vw, 44px)` | 1.1 | 400 | -0.015em |
| Big stat number | Instrument Serif | `clamp(44px, 5.4vw, 72px)` (stakes) / `clamp(56px, 7vw, 96px)` (proof) / `clamp(60px, 7vw, 84px)` (price) | 1 | 400 | normal |
| Hero subhead | Inter | 19px | 1.55 | 400 | normal |
| Founder body | Instrument Serif | 19px | 1.55 | 400 | normal |
| Body / paragraph | Inter | 16–17px | 1.55 | 400 | normal |
| Eyebrow | Inter | 13px | 1.5 | 600 | 0.14em uppercase |
| Button | Inter | 15px (default) / 17px (large) / 14px (small) | 1.4 | 600 | 0.01em |
| Founder signature | Homemade Apple | 38px | 1 | 400 | normal |

### Spacing

The page uses a coarse, deliberate vertical rhythm — not a strict 4/8 scale. Follow these:

| Token | Value | Usage |
|---|---|---|
| Section vertical padding | `96px 64px` | Default section. Reduces to `72px 24px` at ≤768px |
| Hero padding | `120px 64px 96px` | Reduces to `80px 24px 64px` at ≤768px |
| Final CTA padding | `120px 64px` | Reduces to `80px 24px` at ≤768px |
| Section max-width | `1280px` | `.section-inner` |
| Stakes inner max-width | `920px` | Centered, narrower readable column |
| Hero subhead max-width | `580px` | |
| Section sub paragraph max-width | `720–880px` | |
| Founder body column max-width | (flex 5fr/7fr split) | |
| Card padding | `44px 36px` | Standard problem/feature card |
| Button height | 44 (small) / 52 (default) / 64 (large) | |
| Border radius | 8px (buttons, cards), 12px (panels), 16px (large panels) | |

### Shadows

Used sparingly:

| Element | Shadow |
|---|---|
| Primary button hover | `0 6px 18px rgba(192,253,114,0.25)` |
| Primary button rest | `0 1px 0 rgba(0,0,0,0.05)` |

---

## Sections (top to bottom)

For each section the layout, content, and notable behaviors are described below. Reference the corresponding HTML block in `index.html` for exact markup.

### 1. Nav (sticky, top of page)

- 64px tall on mobile / 72px on desktop, `position: sticky; top: 0`, dark forest background with subtle bottom hairline.
- Left: `.brand-mark` (logo image background, 36×36, 8px radius) + wordmark "Gritty**FB**" (FB rendered in chartreuse).
- Center: `<nav.nav-links>` with anchor links: `Why GrittyFB`, `Product`, `Partnership`, `Outcomes`, `Founder`, `Pricing`. Hidden at ≤1024px.
- Right: `Sign in` text link (→ `https://app.grittyfb.com`) + chartreuse `Talk to the Founder` button (→ `mailto:chris@grittyfb.com`).
- **Mobile gap to flag for the developer:** at ≤768px the nav links are simply hidden — there is no hamburger / drawer replacement in the prototype. Implement a mobile drawer in production.

### 2. Hero

- Full-bleed forest-deep section with grit texture overlay (radial-gradient dot pattern, see `.section-dark::before`).
- Two-column grid (1fr text / 1fr visual) collapsing to single column at ≤1024px.
- **Left column:** small chartreuse eyebrow → 4–5 line H1 ("Football is the bridge to the school, the degree, and the network…") → 19px paper-soft subhead → button row (primary "Talk to the Founder" + chartreuse text-link "See the platform →") → trust line in `--ink-ghost`.
- **Right column:** layered visual composition. The hero composition has been iterated heavily — current version is a stylized US map SVG with chartreuse "fit" and "live commit" markers. Above and below the map sit two pill labels (`.hero-tag-active`, `.hero-tag-live`) positioned absolutely.
- A `.mock-shortlist` floats off the bottom-right of the visual on desktop (mini "school shortlist" UI showing fit %, distance, etc.); collapses inline at ≤768px.

### 3. Stakes

- `--forest-dark` background. Centered single column, max-width 920px.
- Display H2 in Instrument Serif: "**The most expensive financial decision a family will ever make isn't a house. It's a college.**" — the second sentence is rendered as a chartreuse `<span class="alt">` with `display: block`.
- Below: a 3-column row (`.stakes-stat`) of large statistics — number in chartreuse Instrument Serif (clamp 44–72px), label in Inter eyebrow caps below.
- Stats: `~$280k`/Sticker price for 4 years at a private college, `60%`/Decline in college aid quality without strategy, `7 in 10`/Families who overpay because they didn't have a plan.

### 4. Problems (paper section)

- Paper background, dark ink. 3-column grid (collapses to 1 at ≤1024px) of `.problem-card` elements: 44px×36px chartreuse-filled square icon block + `.feature-title` headline + body paragraph.
- Cards: "**The default path is built around the school, not the athlete.**", "**Recruiting intelligence is gated by who you know.**", "**Recruiting timelines are speeding up.**"

### 5. Product Tour (paper-warm)

The longest section. Heading on top (`Product` eyebrow + section title). Then 3 stacked **`.feature-block`** rows, each a 2-column grid (collapses to 1 at ≤1024px), padding `56px`, paper background, hairline border, 16px radius.

Order: **Recruit Hub → Gritty Guides → Coach Dashboard.**

For each feature-block:
- **Left column:** chartreuse eyebrow ("Recruit Hub" etc.) → Instrument Serif feature title → 17px body paragraph → bulleted list of capabilities with chartreuse check markers.
- **Right column:** a hi-fidelity in-page UI mock built in HTML/CSS — these are bespoke layouts (a school shortlist with bars, a guide library card grid, a multi-pane coach dashboard). They are **decorative product previews**, not interactive — render them as static React components or replace with screenshots/MP4 in production.

### 6. Partnership (paper-warm)

- Section title "**More than software.**" + subhead.
- Below: a `.partner-callout` card — flex row (column at ≤768px), forest-deep background, paper text, 28px padding, 16px radius. Inner copy + chartreuse text-link "Talk to the Founder →".

### 7. Proof (forest-deep)

- Centered title "**What a single recruiting cycle on GrittyFB looks like.**"
- 3-column `.proof-stats` grid — each stat is huge chartreuse number (clamp 56–96px Instrument Serif) over an Inter caps label.

### 8. Testimonials (paper)

- Section title + 3-column grid of `.t-card` testimonial cards (collapses to 1 at ≤1024px).
- Each card: Instrument Serif quote → school badge image (24×24, image-circle) + role + name attribution.

### 9. Founder ("Why I built GrittyFB") — paper-warm

- 2-column grid `5fr / 7fr` (text wider). Collapses to single column at ≤1024px.
- **Left column:** founder photos. Top: square 16px-radius headshot (`.founder-headshot-frame`). Below: smaller framed photo of Chris coaching BC High (`.founder-huddle-frame`). On desktop the photo column is `position: sticky; top: 96px` so the headshot stays in view while the long letter scrolls.
- **Right column:** chartreuse eyebrow → Instrument Serif headline "**Why I built GrittyFB**" → long letter in Instrument Serif 19px / 1.55 line-height. Opening line is emphasized at 22px in solid `--ink`.
- After the letter: a `.founder-signature` (Homemade Apple, 38px, dark ink) — "Chris Conroy" — followed by attribution line and a primary "Talk to Chris" button.

### 10. Pricing (forest-deep)

- Centered title "**Software access. Advisory partnership. Founding-partner terms.**"
- 2-column `.pricing-grid` of `.price-card` cards (collapses to 1 at ≤1024px). Each card: tier name, price line (`.price-num` clamp 60–84px Instrument Serif chartreuse), included list with chartreuse SVG check marks (CSS-mask), CTA button.
- Below the cards: a `.founding-banner` (flex row, paper-warm, dark ink) calling out Founding Partner status with a chartreuse text-link CTA.

### 11. Final CTA (forest-deep)

- Single centered column max-width 720px.
- Eyebrow → Instrument Serif H2 "**Not another recruiting service. We're a student-athlete college admissions platform.**" (second sentence in chartreuse `<span>`) → 17px paragraph → large primary button "Talk to Chris Conroy" → fine-print line.

### 12. Footer

- 4-column grid (`Brand | Product | Company | Legal | Follow` — collapses to 1fr 1fr at ≤1024px, single col at ≤768px).
- Brand block has logo + 1-line tagline. Other columns have `<h4>` heading + link list. Follow column has X (`https://x.com/CoachCConroy`) and LinkedIn (`https://www.linkedin.com/in/christopherconroy/`) icon links.
- Bottom row: copyright + email link, centered/stacked at ≤768px.

---

## Interactions & Behavior

The page is mostly static. Notable behaviors:

| Behavior | Implementation in prototype |
|---|---|
| Anchor scroll | Plain `<a href="#stakes">` etc. — let the framework or `scroll-behavior: smooth` on `html` handle it. |
| Button hover | Primary button: `transform: translateY(-1px)` + chartreuse glow shadow. Outline: 10% chartreuse fill background. 150ms ease. |
| Sticky nav | `.nav { position: sticky; top: 0; z-index: 50; }` |
| Founder photo column | `position: sticky; top: 96px` on `.founder-photos` — only at ≥1025px. |
| Hero map markers | Static SVG with `filter: url(#markerGlow)` — no animation in current state. |
| All conversions | `<a href="mailto:chris@grittyfb.com">` — there is no form. **Do not add a form** unless the product team asks for it; the founder explicitly wants every inquiry to be a direct email. |

### What the prototype does NOT have (gaps for production)

1. **Mobile navigation drawer** — nav links are hidden, not replaced. Add a hamburger + drawer.
2. **Form submission** — site uses `mailto:` only by design. Confirm with stakeholders before adding any web form.
3. **CMS integration** — testimonials, stats, pricing tiers are hardcoded. If the product team needs to edit copy without redeploys, wire these to a CMS (Sanity/Contentful/MDX).
4. **OG/social meta** — `assets/twitter-header.png` exists but isn't referenced. Add full OG/Twitter card meta tags.
5. **Analytics** — no tracking is wired. Add per the org's analytics stack; the **single conversion event** is "click any `mailto:chris@grittyfb.com` link."
6. **Real product screenshots** — the Recruit Hub / Gritty Guides / Coach Dashboard mocks are CSS recreations, not real product. Replace with actual product screenshots or short MP4 loops once the product is shippable.

---

## Responsive Behavior

Two breakpoints in the prototype:

- **≤1024px:** All 2-/3-column grids collapse to single-column. Nav links hidden. Founder photos lose `sticky`. Hero visual stacks below text.
- **≤768px:** Section padding tightens to `72–80px / 24px`. Footer collapses to single column. Mock dashboards reflow (`grid-template-columns: repeat(2, 1fr)` for the dashboard inner grid).

**The developer should treat mobile as a fresh design pass**, not a literal port — particularly the hero composition (the layered map + tags + shortlist) and the Coach Dashboard mock, which need rework at sub-400px widths.

---

## State Management

None required for the static landing page. If forms or interactive product demos are added later, follow the codebase's conventions (e.g., React Server Actions, form libraries, etc.).

---

## Assets — sourcing & licensing

| Asset | Source | Notes |
|---|---|---|
| `grittyfb-logo.png` | Provided by founder | Use as-is. Replace with SVG if available. |
| `chris-headshot.jpg`, `chris-huddle.jpg` | Provided by founder (Chris Conroy) | Cleared for marketing use. |
| School badges (`belmont-hill.png`, `bc-high.jpg`, `abington.jpg`) | Public school logos used in testimonial attribution | Confirm with each school before launch — it is best practice to get explicit testimonial approval from the family AND school logo usage permission. |
| `coach-dash.png` | Internal reference shot of the GrittyFB product | Replace with up-to-date product screenshot at launch. |
| `twitter-header.png` | Social card asset | Wire into `<meta property="og:image">` and `<meta name="twitter:image">`. |

---

## Accessibility checklist for the developer

- [ ] All `<a>` and `<button>` interactive elements have visible focus states (the prototype has minimal focus styling — add).
- [ ] Color contrast: chartreuse on forest-deep passes WCAG AA at large text only. Body copy on dark sections must use `--paper` (not chartreuse).
- [ ] All decorative imagery (`grittyfb-logo` brand mark, mock dashboards) should be `aria-hidden="true"` or have empty alt where appropriate.
- [ ] All meaningful images have descriptive `alt` (founder photos do; school badges do).
- [ ] Verify the `.hero-tag-active` / `.hero-tag-live` pill labels on the hero visual are not announced as content if they are decorative — currently they read as live region text.
- [ ] Confirm tab order matches visual order through the founder section's two-column grid.
- [ ] Add `prefers-reduced-motion` handling — current button hover translates by 1px; reduced-motion users should see no transform.

---

## Things to ask the product team before implementing

1. Should the page be statically generated (SSG) or server-rendered? (Recommend SSG — no dynamic data.)
2. Is there a CMS preference for testimonials / pricing copy? Or is hardcoded acceptable for v1?
3. Do they want a mobile navigation drawer, or is the page short enough that scrolling is fine without one?
4. Confirm that all conversion CTAs should remain `mailto:` and not move to a form.
5. Any analytics events beyond "Talk to Founder" mailto click?
6. Confirm school logo usage rights before deploying testimonials live.

---

## Files to remove from this bundle when implementing

- `tweaks-panel.jsx` — design-time only
- The `<script type="text/babel">` block at the bottom of `index.html` that handles tweak persistence
- The `/*EDITMODE-BEGIN*/.../*EDITMODE-END*/` comment markers
- All inline `<style>` should move to the codebase's CSS pipeline (CSS Modules / Tailwind / styled-components / etc. per the codebase's convention).
