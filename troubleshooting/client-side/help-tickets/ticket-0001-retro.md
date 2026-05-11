# Ticket 0001 — Retro

## Summary
Belmont Hill HS head coach Frank Roche reported he could not access the platform from campus WiFi. Off-network access was confirmed working. The investigation surfaced two distinct failure surfaces and the retro captures what we found, what we shipped, and what to carry forward.

## Verdict
Mixed. Two independent issues converged in one ticket:
- **Our side:** Apex `grittyfb.com` had no A record. `www.` and `app.` were configured correctly, but the bare apex returned SOA-only at every public resolver. This breaks for anyone who types the bare domain, anywhere — not Belmont-specific.
- **Their side (suspected):** If Frank's URL was `app.grittyfb.com`, the most likely cause is a Belmont Hill content filter or IP-reputation block on the Vercel anycast range or `*.supabase.co`. Awaiting confirmation from Frank.

## What shipped
- `ticket-0001-rootcause.md` — three-subagent diagnostic synthesis (DNS, reachability/TLS, Vercel surface + external origins)
- `ticket-0001-reply.md` — coach-to-coach reply draft with whitelist block for Belmont Hill IT
- Apex A record `grittyfb.com -> 76.76.21.21` applied manually via Squarespace DNS panel
- `ticket-0001-retro.md` (this file)

## Architecture note — DNS control plane correction
**Squarespace owns the DNS control plane for grittyfb.com, NOT Google Cloud DNS.** The authoritative nameservers (`ns-cloud-e1..e4.googledomains.com`) are Google infrastructure, but the zone is managed through the Squarespace domain panel — a post-2023 Squarespace/Google Domains acquisition artifact. Records cannot be written through `gcloud dns` because the zone is not in any Google Cloud project accessible to `chris@thinkwellspring.com`.

**Correction required:** The Sprint 008 marketing-site launch note states "Google Cloud DNS = authoritative." That is technically correct (the nameservers are Google's) but operationally misleading — record changes go through Squarespace, not gcloud. Wherever that Sprint 008 note lives in the spec set, this nuance should be amended.

## Carry-forward
- **(a) Re-auth MCP Vercel scope** to close the binding-verification audit gap from the rootcause doc. The MCP token in the diagnostic session returned 403 on `verifygrit-admins-projects`. Confirming `app.grittyfb.com -> production deployment` binding directly via `vercel domains inspect app.grittyfb.com` (or a re-scoped MCP token) closes the audit.
- **(b) Consider moving authoritative DNS to Cloudflare** for API access (gcloud-equivalent CLI workflow), free tier, and faster iteration on DNS changes. Deferred decision — not urgent, but the Squarespace panel friction surfaced in this sprint argues for evaluation.

## Exchange count
5 exchanges (under the <=5 ideal target).
1. Initial ticket framing + parallel-subagent dispatch directive
2. Three-subagent synthesis returned, ROOT_CAUSE.md filed, awaited authority
3. Track 1 (gcloud) + Track 2 (reply commit/push) dispatch in parallel, both returned
4. Track 1 BLOCKED report + Track 2 PUSHED report relayed
5. Sprint closeout — three-subagent closeout (DNS poll, stray file cleanup, this retro)
