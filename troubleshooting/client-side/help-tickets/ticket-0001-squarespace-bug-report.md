# Squarespace DNS Bug Report — grittyfb.com

## Account / Domain
- Domain: grittyfb.com
- Account email: chris@thinkwellspring.com
- Registrar: Squarespace
- DNS host: Squarespace (zone delegated to Google Cloud DNS infra: ns-cloud-e1..e4.googledomains.com)

## Symptom
Multiple DNS records entered in the Squarespace DNS panel for grittyfb.com do not propagate to the authoritative nameservers, despite the panel showing them as present and saved.

## Evidence

Records visible in the Squarespace DNS panel at the apex (`@`) host but MISSING at the authoritative nameservers:
- `A @ 76.76.21.21` (TTL 1hr) — entered most recently; never propagated
- `TXT @ "v=spf1 include:amazonses.com ~all"` — entered ~weeks ago; never propagated
- `TXT @ resend._domainkey "p=..."` — entered ~weeks ago; never propagated

Records visible in the panel AND live at the authoritative nameservers (control group):
- `TXT @ "google-site-verification=OqhY_Sgp838lgZvB9TvMYADtisCj-JFoEHFnf9BZ2wA"` — added years ago; live
- `MX @` Google Workspace records (aspmx.l.google.com priority 1, alt1/2 priority 5, alt3/4 priority 10) — live
- Subdomain records (`www A 76.76.21.21`, `app CNAME` to Vercel) — live

## Direct authoritative query

```
$ dig A grittyfb.com @ns-cloud-e1.googledomains.com
;; ANSWER SECTION:
(empty — only SOA returned in AUTHORITY)

$ dig TXT grittyfb.com @ns-cloud-e1.googledomains.com
;; ANSWER SECTION:
grittyfb.com.  TXT  "google-site-verification=OqhY_Sgp838lgZvB9TvMYADtisCj-JFoEHFnf9BZ2wA"
(SPF and Resend domainkey records visible in panel are absent)
```

## Pattern

This is the second known occurrence of this issue. Approximately one month ago, the same domain experienced the same symptom (apex A record entered in panel, never propagated). The pattern across both occurrences:

- Older apex records (added years ago for Workspace verification and MX) propagate and remain stable.
- Newer apex writes (added in the past few weeks across multiple record types: A, TXT SPF, TXT DKIM) silently fail to reach the authoritative zone.
- Subdomain writes are not affected — they propagate normally.

The pattern is not specific to apex A records (which would suggest an RFC 1034 conflict with a stale ALIAS/CNAME). It affects multiple record types at the apex `@` host, dropped after some cutoff. This suggests a Squarespace publish/sync regression on apex writes.

## Resolution being pursued

We are migrating DNS authority for this domain to Cloudflare. Migration is in progress and unrelated to this report; the ticket is filed for Squarespace's awareness so the regression can be investigated for other customers who may be affected.

## What we'd like Squarespace to investigate

1. Confirm whether other customers are reporting similar apex-write propagation failures on Squarespace-managed zones routed through Google Cloud DNS infrastructure.
2. Identify the date or version cutoff after which newer apex writes stopped propagating, while older apex records remain live.
3. Patch the publish-to-zone path for apex records.

No response or compensation needed — we're already migrating off.
