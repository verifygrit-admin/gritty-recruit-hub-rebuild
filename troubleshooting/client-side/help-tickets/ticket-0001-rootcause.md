# Ticket 0001 — Root Cause Analysis

**Reporter:** Frank Roche, Belmont Hill HS Head Coach
**Symptom:** Cannot reach "these webpages" from Belmont Hill campus WiFi. Off-network reachability confirmed (received email, viewed test access elsewhere).
**Analyzed:** 2026-05-11
**Method:** Three parallel diagnostic agents — DNS inspection, reachability/TLS from control host, Vercel surface + external-origin enumeration.

---

## Verdict: MIXED — one real configuration bug on our side, plus a likely school-network filter

There are **two distinct failure surfaces**, and which one is hitting Frank depends on the exact URL he typed:

### Failure 1 — `grittyfb.com` (bare apex) is broken for everyone, everywhere

This is on our side. Independent of Belmont Hill.

- Apex `grittyfb.com` has **no A, AAAA, or CNAME record**. Google Cloud DNS returns SOA-only.
- Vercel's required apex A record `76.76.21.21` is configured on `www.grittyfb.com` instead of the apex.
- Both Google (8.8.8.8) and Cloudflare (1.1.1.1) resolvers agree: apex does not resolve.
- Vercel's edge **is** provisioned to serve apex content (forced-resolve test returns 200 with the same Etag as www), but no traffic reaches it because DNS doesn't point there.
- `www.grittyfb.com` and `app.grittyfb.com` resolve cleanly and serve 200.

**If Frank typed `grittyfb.com` (no www, no app), the apex DNS gap is the cause and it would fail on any network on Earth.**

### Failure 2 — `app.grittyfb.com` from Belmont Hill specifically (suspected school filter)

If Frank's failure URL is `app.grittyfb.com`, our side is clean. The failure is almost certainly Belmont Hill's network filter.

- DNS: `app.grittyfb.com` → CNAME `a524f2e27bb1b845.vercel-dns-017.com` → A records `216.198.79.65`, `64.29.17.65`. Clean, consistent across resolvers.
- TLS: TLS 1.3 negotiated cleanly, valid cert (Vercel/Let's Encrypt upstream — local control-host cert inspection was distorted by ESET SSL Filter MITM on Chris's laptop, not relevant to upstream).
- HSTS: standard `max-age=63072000`, no preload, no `includeSubDomains` — does **not** conflict with school MITM proxies.
- Redirects: single 308 hop HTTP→HTTPS, same-host. No multi-hop chain to trip a strict proxy.
- HTTP HEAD: 200 OK from Vercel edge (X-Vercel-Cache: HIT).
- Vercel binding: not directly verifiable in this session (MCP Vercel token returned 403 for the `verifygrit-admins-projects` scope), but repo + CI configuration is clean and the production deploy pipeline (GitHub Actions → `vercel --prod` on push to master) shows no preview-channel anomaly.

**The Belmont Hill failure is most plausibly one of:**

1. **DNS-level block at the school resolver** — common K-12 filter behavior; the resolver returns NXDOMAIN or a sinkhole for unknown SaaS apex hostnames.
2. **IP-reputation / CDN-category block** — Vercel anycast IPs `64.29.17.65`, `216.198.79.65`, `76.76.21.21` may be in an "unknown CDN" category that the school filter drops.
3. **`*.supabase.co` blocked while the app shell loads** — partial failure mode. App HTML/JS/CSS loads from app.grittyfb.com, then every auth/data call dies because the app shell needs to reach `<project-ref>.supabase.co` for login, profile, shortlist, admin, and all dynamic data. Frank would see the page load but not function. This is a critical possibility we can't rule out without asking him what he sees on screen.
4. **SNI inspection / TLS proxy mismatch** — older transparent TLS proxies sometimes strip SNI; Vercel requires it. Less likely with TLS 1.3 but possible.

---

## Evidence

| Surface | Result | Source |
|---|---|---|
| `grittyfb.com` apex A record | **None — SOA only** | Subagent 1 (DNS) |
| `www.grittyfb.com` A | 76.76.21.21 (correct Vercel apex IP, on the wrong host) | Subagent 1 |
| `app.grittyfb.com` CNAME | `a524f2e27bb1b845.vercel-dns-017.com` → 216.198.79.65 / 64.29.17.65 | Subagent 1 |
| NS chain | Google Cloud DNS authoritative end-to-end. No Squarespace. No split horizon. | Subagent 1 |
| `app.grittyfb.com` HTTPS | 200, Vercel edge, TLS 1.3, single-hop HSTS | Subagent 2 |
| `www.grittyfb.com` HTTPS | 200, Vercel edge, TLS 1.3 | Subagent 2 |
| `grittyfb.com` HTTPS (forced resolve) | 200, same Etag as www — Vercel ready to serve, no DNS pointed at it | Subagent 2 |
| Vercel binding (live) | **UNVERIFIED** — MCP token 403 on `verifygrit-admins-projects`. Repo + CI clean. | Subagent 3 |
| External origins on first paint | REQUIRED: `app.grittyfb.com`, `*.supabase.co`. OPTIONAL: `fonts.googleapis.com`, `fonts.gstatic.com`, `*.basemaps.cartocdn.com` | Subagent 3 |
| No analytics/Sentry/extra CDNs | Confirmed clean | Subagent 3 |

---

## Recommended Next Action — BOTH

### Track 1 — Fix the apex DNS (our side, deploy)

Add an A record at the apex of grittyfb.com in Google Cloud DNS:

```
grittyfb.com.  A  76.76.21.21
```

(Optional but recommended: also add an `ALIAS`/`ANAME` or set up a 301 redirect at the apex pointing to `https://www.grittyfb.com` in Vercel — whichever the marketing-site team prefers. The apex currently serves the same content as www when forced, so a direct A record is functionally fine.)

This fix lives in the **marketing-site project's DNS** (Google Cloud DNS console), not in this repo. No code change here.

### Track 2 — Draft reply to Frank (their side workaround + whitelist request)

We need one clarifying question from Frank before drafting a finished reply:

> "Frank — quick clarifier so I can route this right: when you tried, did you see (a) a browser error / 'this site can't be reached' page, (b) a blank white page, or (c) the app screen loaded but login/data wouldn't work? And which URL did you use — `grittyfb.com`, `www.grittyfb.com`, or `app.grittyfb.com`?"

The answer maps directly to a known cause:

- **Browser error + URL was `grittyfb.com`** → apex DNS gap (we fix on our side, ETA short).
- **Browser error + URL was `app.grittyfb.com` or `www.grittyfb.com`** → school filter blocks the hostname or the Vercel IP range. Workaround: cellular hotspot. IT whitelist request below.
- **App loads but login fails** → school filter blocks `*.supabase.co`. Most likely culprit. IT whitelist request below.

**Whitelist list for Belmont Hill IT (when reply is drafted):**

REQUIRED (app will not function without these):
- `grittyfb.com`
- `www.grittyfb.com`
- `app.grittyfb.com`
- `*.supabase.co` (auth, REST API, realtime, storage, edge functions all live under this apex)

OPTIONAL (functional degradation only):
- `fonts.googleapis.com`, `fonts.gstatic.com` (Google Fonts — falls back to system fonts)
- `*.basemaps.cartocdn.com` (Carto map tiles — only used on the GritFit map view)

---

## Open Items Before Closing This Ticket

1. **Apex DNS fix** — Track 1 above. Authorization: needs Chris. Touches marketing-site DNS, not this repo.
2. **Frank clarifier reply** — Track 2 above. Draft pending Frank's answer to the clarifying question. Will live at `troubleshooting/client-side/help-tickets/ticket-0001-reply.md` once the failure mode is locked in.
3. **Vercel binding verification** — re-authenticate MCP Vercel scope OR run `npx vercel domains inspect app.grittyfb.com` from a logged-in terminal. Not blocking — repo + CI are clean — but completes the audit.

---

## Files

- `troubleshooting/client-side/help-tickets/ticket-0001-rootcause.md` (this file)
- `troubleshooting/client-side/help-tickets/ticket 0001.png` (original ticket screenshot — pre-existing)
- `troubleshooting/client-side/help-tickets/ticket-0001-reply.md` (NOT YET DRAFTED — pending Frank's clarifier answer)
