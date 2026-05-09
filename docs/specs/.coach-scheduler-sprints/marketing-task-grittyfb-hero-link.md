---
task_id: MarketingTask-001
task_name: grittyfb.com Hero Link to /recruits
asset: GrittyFB Marketing Site (separate repo)
priority: Important, Not Urgent
effort: Low
mode: sprint-mode
date_start: TBD (parallelize with Sprint 011)
date_target_complete: TBD
repo: grittyfb-marketing-site (or wherever the marketing site lives — confirm path)
spec_location: C:\Users\chris\dev\gritty-recruit-hub-rebuild\docs\specs\.coach-scheduler-sprints
status: draft
---

# Marketing Task — grittyfb.com Hero Link to /recruits

> **Status: working draft.** This is not a full sprint — it's a small marketing-site task tracked alongside the coach-scheduler sprint series because it's the reciprocal half of the recruits page nav (Sprint 011's nav links go OUT to grittyfb.com; this task adds the link COMING IN from grittyfb.com).

## Task Objective

Add a CTA in the grittyfb.com homepage hero that points college coaches to the new `/recruits` page on the web app. The link is the inbound half of the cross-repo bridge established in Sprint 011.

## When This Should Ship

After Sprint 011 deploys (`/recruits` is publicly accessible). Can be done same-day or anytime after. Does not block any sprint in the coach-scheduler series.

## Hard Constraints

1. **Match existing GrittyFB hero design language.** The CTA blends with the hero, doesn't dominate it.
2. **Visible but secondary.** Main hero CTA still drives the partnership/founder conversion path. The recruits link is for college coaches, who are a smaller segment of marketing site visitors.
3. **External link with target tracking.** Link target should be `https://[recruit-hub-host]/recruits` — full URL, not relative path (different repos).
4. **No regressions on the marketing site.** Other sections, CTAs, and navigation continue to work unchanged.

## Deliverable

A small CTA element added to the grittyfb.com hero section, with copy approximately:

> "College coach? Browse our recruits →"

linking to `https://[recruit-hub-host]/recruits` (placeholder — confirm exact URL after Sprint 011 deploys).

Visual treatment: secondary button or text-link with arrow, in the GrittyFB lime accent color, positioned below or beside the existing primary CTAs in the hero. Should be clearly visible without competing with the main partnership CTA.

## Acceptance

- New CTA visible on grittyfb.com homepage hero
- Click navigates to the live `/recruits` page
- Mobile rendering doesn't disrupt the existing hero layout
- No regressions elsewhere on the marketing site

## Notes

- The marketing site is in a separate repo from `gritty-recruit-hub-rebuild`. This task ships in that repo, not in the web app.
- If the marketing site uses a CMS (Webflow, Framer, etc.) rather than a code repo, this task is editorial rather than developmental — confirm before opening as a sprint.
- Consider tracking the CTA's click-through rate to measure college-coach landing volume.
