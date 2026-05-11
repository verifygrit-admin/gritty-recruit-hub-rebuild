# Ticket 0001 — Apex Bug Diagnostic

**Analyzed:** 2026-05-11
**Method:** Three parallel read-only diagnostic agents (full apex zone dump, partial-write pattern detection, Vercel apex option enumeration).
**Status:** Diagnosis complete. No DNS changes made. No commits. Awaiting decision on path forward.

---

## TL;DR

The apex zone has no conflicting record (no CNAME, ALIAS, ANAME, DNAME) that would block an A insert. The bug is a **Squarespace publish/sync regression on newer apex writes**. Older apex records are live; multiple newer ones — not just the A — are stuck in the panel and never reach the authoritative Google Cloud DNS zone.

**Recommendation: migrate authoritative DNS to Cloudflare.** ~30min, free tier, unblocks the apex permanently via CNAME flattening, removes the recurring Squarespace failure mode for the long term, gains API access for future automation.

---

## What the authoritative zone actually contains at apex

Queried `ns-cloud-e1..e4.googledomains.com` directly. All four nameservers agree.

| Type | Value |
|---|---|
| SOA | `ns-cloud-e1.googledomains.com cloud-dns-hostmaster.google.com` (serial=1, Google flattens serials externally) |
| NS | ns-cloud-e1/e2/e3/e4.googledomains.com |
| MX | Full Google Workspace set (aspmx.l.google.com pri 1, alt1/2 pri 5, alt3/4 pri 10) |
| TXT | **`google-site-verification=OqhY_Sgp838lgZvB9TvMYADtisCj-JFoEHFnf9BZ2wA`** — that is the ONLY TXT record live |
| A | **NONE** (NODATA — SOA returned in authority section) |
| AAAA | NONE |
| CNAME | NONE |
| DNAME | NONE |
| SRV | NONE |
| Wildcard `*.grittyfb.com` | NONE |
| ALIAS/ANAME | Not natively supported by Google Cloud DNS — would have been flattened to A or surfaced as CNAME if Squarespace had pushed one; neither exists |

**RFC 1034 conflict check: clean.** There is no CNAME or DNAME at apex that would forbid an A record at the same name. The A insert is not being rejected by any zone-level conflict.

---

## The load-bearing finding — apex partial-write pattern

Comparison of what's in the Squarespace panel (per user's screenshot) vs what reached the authoritative NS:

| Record (panel says present at @) | Authoritative NS shows? |
|---|---|
| Subdomain `www` A → 76.76.21.21 | ✅ live |
| Subdomain `app` CNAME → vercel-dns | ✅ live |
| Apex MX (Google Workspace) | ✅ live (full set) |
| Apex TXT `google-site-verification=...` | ✅ live |
| Apex TXT `v=spf1 ...` (SPF) | ❌ **MISSING** |
| Apex TXT Resend domainkey | ❌ **MISSING** |
| Apex A → 76.76.21.21 | ❌ **MISSING** |

**The pattern is not "apex A specifically fails."** It's "Squarespace's push-to-zone has dropped multiple apex writes." The Google-site-verification TXT (added years ago when the domain was first verified for Workspace) is live. SPF and Resend TXT records — added more recently — are stuck. The A record is the latest casualty.

Subdomain pushes work. Apex MX (presumably written long ago when Workspace mail was set up) works. **Newer apex writes — across multiple record types — silently fail to propagate.** This is a Squarespace publish/sync regression, not a config error on our side.

---

## Available paths forward — ranked

### Option 1 (RECOMMENDED): Migrate authoritative DNS to Cloudflare

**Why:** Cloudflare's apex CNAME flattening is the canonical modern pattern for pointing a root domain at a CDN-hosted app. Free tier is sufficient. The migration eliminates the recurring Squarespace failure mode permanently (this is at least the second occurrence per user — same symptom a month ago).

**Steps (high level):**
1. Create Cloudflare account, add `grittyfb.com` as a site, accept the free plan.
2. Cloudflare scans existing DNS and imports current records — review the import for any gaps (notably the SPF and Resend TXT that Squarespace dropped; re-add manually from the Squarespace panel screenshot).
3. Configure apex CNAME flattening: `grittyfb.com CNAME cname.vercel-dns.com` (Cloudflare flattens this to A automatically). Keep `www CNAME` to Vercel as a sibling.
4. Change nameservers at the registrar (Squarespace, since they hold the registrar role) to Cloudflare's assigned NS pair.
5. Wait 24–48hr for full propagation. Old Google NS will continue serving until TTL/cache flush completes.
6. Once cut over: Squarespace's DNS panel becomes inactive for this domain. The registrar role remains at Squarespace.

**Time:** ~30min active work + 24–48hr propagation.
**Cost:** $0 (Cloudflare free tier).
**Side benefits:** API access (terraform/CLI workflow), analytics, DDoS protection, faster global resolution, no more Squarespace publish/sync mystery.
**Risk:** During the NS cutover window, some clients may briefly see stale records — schedule when traffic is low. Email is the main concern (MX records must be intact in Cloudflare before cutover) — verify Workspace MX is in Cloudflare's import before flipping nameservers.

### Option 2: Squarespace support ticket

**Why considered:** Lowest-effort if it works. Doesn't change architecture.

**Reality:** Slow (24–72hr response typical), uncertain outcome, and even if fixed, leaves us exposed to the same regression next time. The recurrence pattern (same bug a month ago) argues against trusting a ticket fix to be durable. Worth filing as a parallel action regardless of which option we pick — but not as the primary path.

### Option 3: Delegate nameservers to Vercel DNS

**Why considered:** Vercel auto-creates the apex A record when their DNS hosts the zone. No flattening trick needed.

**Trade-off:** All DNS management moves into Vercel's dashboard. MX, SPF, Resend TXT, and any other non-Vercel records must be re-added there manually. Vercel's DNS UI is functional but less feature-rich than Cloudflare (no analytics, no DDoS posture, weaker API ergonomics for non-Vercel records). Acceptable if we want to keep the surface area small, but Cloudflare is the broader-utility move.

### Option 4 (workaround — explicitly rejected): Squarespace domain forwarding from apex to www

Squarespace offers a "Domain Forwarding" feature at the registrar level that can 301 the bare apex to `www.grittyfb.com`. **But this still requires apex DNS to resolve to Squarespace's forwarding IP** — which means it depends on the same broken apex-A-write path that's failing now. Even if it worked, it routes through Squarespace's redirect infrastructure rather than Vercel's, which is slower and less reliable. Not a real workaround.

---

## Recommendation

**Migrate DNS to Cloudflare (Option 1).** Strongest rationale:

1. **Fixes the recurring problem class, not just this instance.** Squarespace has now failed at apex writes twice that we know of. A support ticket fixes the symptom; a DNS migration removes the failure mode.
2. **Apex CNAME flattening is the right primitive.** Direct A records at apex have always been the awkward case in DNS because they can't co-exist with CNAMEs. Flattening solves it cleanly and is the pattern Vercel, Netlify, and most modern hosts assume.
3. **Cost is zero, time is ~30min active work.**
4. **Free upgrades come along.** API access for future automation, faster resolution, optional DDoS/proxy posture if we ever want it.
5. **The Sprint 008 architecture note we already flagged for amendment can be replaced with something durable.** Instead of "Squarespace controls DNS through Google Domains backend — register/inspect via panel," we get "Cloudflare is the DNS authority; records managed via dashboard or API; registrar remains Squarespace."

**Parallel action:** File the Squarespace support ticket anyway, documenting the partial-write pattern (older apex records live, newer apex records dropped). Cost is ~5min and it gives Squarespace a chance to acknowledge the regression for other customers. Do not block the Cloudflare migration on the ticket.

---

## Open items if this recommendation is accepted

1. Confirm Workspace email continuity — verify Cloudflare's record import correctly captures all current MX, SPF, DKIM, and DMARC records before NS cutover.
2. Capture every current Squarespace panel record (full screenshot or text export) before the migration so we have a clean restore point.
3. Plan the cutover window for low-traffic timing (Sunday night or weekday off-hours).
4. Update Sprint 008 architecture note + any other docs that reference "Squarespace = DNS authority" or "Google Cloud DNS = authoritative" with the post-migration reality.
5. After cutover, return to Ticket 0001 reply and confirm with Frank that apex now resolves — at which point if `app.grittyfb.com` is still failing for him, it's definitively his school's filter.

---

## Files

- `troubleshooting/client-side/help-tickets/ticket-0001-rootcause.md` — original three-subagent diagnosis (pushed)
- `troubleshooting/client-side/help-tickets/ticket-0001-reply.md` — Frank reply draft (pushed)
- `troubleshooting/client-side/help-tickets/ticket-0001-retro.md` — sprint retro (pushed)
- `troubleshooting/client-side/help-tickets/ticket-0001-apex-bug-diagnostic.md` — this file (NOT committed per stop instruction)
