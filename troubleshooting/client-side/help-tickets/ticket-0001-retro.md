# Ticket 0001 — Retro

## Summary
Belmont Hill HS head coach Frank Roche reported he could not access the platform from campus WiFi. Off-network access was confirmed working. The investigation surfaced two distinct failure surfaces — one of which turned out to be a Squarespace DNS regression, not a simple config gap — and ended with a full migration of authoritative DNS to Cloudflare.

## Verdict
Mixed, with one finding more serious than the initial framing suggested:

- **Our side (root cause was deeper than expected):** Apex `grittyfb.com` returned SOA-only at every public resolver. The first diagnostic pass framed this as a missing A record. Attempting to add the A record via Squarespace's DNS panel **failed silently** — the record showed in the panel but never reached the authoritative nameservers. A second diagnostic pass revealed the real failure: a **Squarespace publish/sync regression** silently swallowing newer apex writes. Three records visible in the panel were missing at the authoritative NS: apex A, apex SPF TXT (`v=spf1 include:amazonses.com ~all`), and apex Resend DKIM TXT. Older apex records added years ago (Google Workspace site-verification TXT, Workspace MX) had landed and were stable. Subdomain writes (`www`, `app`) propagated normally. The pattern — newer apex writes dropped, older apex records live, subdomains unaffected — pointed at a Squarespace-side publish path defect, not anything fixable on our side.
- **Their side (still suspected, pending Frank's reply):** If Frank's URL was `app.grittyfb.com`, the most likely cause remains a Belmont Hill content filter or IP-reputation block on the Vercel anycast range or `*.supabase.co`. The whitelist block in the reply draft addresses this.

## What shipped

- `ticket-0001-rootcause.md` — initial three-subagent diagnostic synthesis (DNS, reachability/TLS, Vercel surface + external origins)
- `ticket-0001-reply.md` — coach-to-coach reply to Frank with the whitelist block for Belmont Hill IT
- `ticket-0001-apex-bug-diagnostic.md` — second three-subagent pass that surfaced the Squarespace publish/sync regression as root cause and enumerated Vercel apex options
- `ticket-0001-squarespace-bug-report.md` — bug report draft for Chris to submit via Squarespace's support form
- **Authoritative DNS migrated from Squarespace to Cloudflare.** Cloudflare zone `grittyfb.com` on the Free plan. Records reconciled: apex CNAME → `cname.vercel-dns.com` (auto-flattened to A by Cloudflare), www A, app CNAME to Vercel, Workspace MX (x5), Resend MX + DKIM + SPF, google-site-verification TXT, `_domainconnect` CNAME. All proxy toggles OFF (Vercel manages TLS). Squarespace registrar nameservers flipped to `giancarlo.ns.cloudflare.com` + `ligia.ns.cloudflare.com`. Cloudflare activation polling underway at retro write.
- `ticket-0001-retro.md` (this file)

## Architecture note — DNS authority moved

**Cloudflare is now the authoritative DNS host for grittyfb.com.** Squarespace remains the registrar; only the nameservers moved. The apex resolves via Cloudflare's CNAME-flattening on `grittyfb.com CNAME cname.vercel-dns.com` — the canonical modern pattern for pointing an apex at Vercel.

This replaces the previous (now-corrected and now-superseded) architecture note from this ticket's earlier closeout, which captured that Squarespace controlled the DNS panel even though the nameservers were Google infrastructure. That observation was accurate at the time, but it is no longer the operating reality — both panel-level and nameserver-level authority now sit with Cloudflare.

**Spec amendments needed:** wherever the Sprint 008 marketing-site launch note (or any other doc) describes the DNS architecture for `grittyfb.com`, replace "Squarespace-managed / Google Cloud DNS authoritative" with "Cloudflare-authoritative (Free plan), Squarespace remains registrar only." Note also that record changes are now made through the Cloudflare dashboard or API — not the Squarespace panel.

## Carry-forward

- **(a) Confirm Cloudflare activation + apex resolution.** Once Cloudflare's activation polling completes, re-run the apex check against the new Cloudflare nameservers: `Resolve-DnsName grittyfb.com -Type A -Server giancarlo.ns.cloudflare.com`. Expect `76.76.21.21` (the flattened result). Then `curl.exe -I https://grittyfb.com` should return 200 or 3xx to www. Full global NS propagation: 24-48hr.
- **(b) Submit Squarespace bug report.** Draft is committed; Chris submits via the Squarespace support form when convenient. No response or fix is needed for our purposes — we've already migrated off.
- **(c) Re-auth MCP Vercel scope** to close the binding-verification audit gap noted in the rootcause doc. The MCP token returned 403 on `verifygrit-admins-projects`. Confirming `app.grittyfb.com -> production deployment` binding directly closes the audit. Not blocking.
- **(d) Frank reply follow-up.** Once Cloudflare propagation completes, send the reply draft. If Frank still cannot reach `app.grittyfb.com` from Belmont Hill after that, the school-filter diagnosis is locked in and the whitelist request goes to their IT.
- **(e) Install Cloudflare MCP** for any future DNS automation in this account. Track 1 of the migration had to be operator-driven this sprint because no Cloudflare MCP was wired into the session. With the MCP installed, future record edits can be done agent-side.

## Architectural learnings worth keeping

1. **Always query the authoritative nameservers directly before trusting a DNS panel.** The Squarespace UI reported success while the zone never received the writes. A two-line `Resolve-DnsName ... -Server ns-cloud-e1.googledomains.com` would have caught the regression on the first attempt instead of the third.
2. **Apex CNAME flattening is the right primitive for pointing a root domain at a CDN-hosted app.** Direct A records at apex are the awkward case in DNS — they can't co-exist with CNAMEs and they hardcode an IP that the CDN can change. Flattening (Cloudflare, Route 53 ALIAS, NS1 ANAME) is what every modern host expects.
3. **Recurrence is the diagnostic signal.** This was the second known Squarespace apex-write failure on this domain. A single instance might be a fluke; a second instance from the same vendor on the same record class is a pattern, and the right response to a pattern is to remove the vendor from the failure surface, not to file another ticket.

## Exchange count
8 exchanges. Above the ≤5 ideal target — the overage came from the second diagnostic pass (which uncovered the Squarespace regression) and the migration execution. Both were necessary; neither was wasted. Not flagging as a retro miss.

1. Initial ticket framing + first parallel-subagent dispatch
2. First three-subagent synthesis → ROOT_CAUSE.md filed
3. Track 1 (gcloud apex fix) + Track 2 (Frank reply commit) parallel dispatch
4. Track 1 BLOCKED (no gcloud zone access) + Track 2 PUSHED relayed
5. First closeout — DNS poll + stray file cleanup + first retro write
6. DNS poll definitive negative → apex bug diagnostic dispatched
7. Second three-subagent synthesis → Squarespace publish/sync regression identified → Cloudflare migration recommended
8. Cloudflare migration executed (Track 1 attempted via MCP — halted, no Cloudflare MCP available; Chris executed manually) + Squarespace bug report drafted and committed + this retro update
