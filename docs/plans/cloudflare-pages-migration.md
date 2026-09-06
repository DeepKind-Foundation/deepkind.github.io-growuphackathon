# Plan: Migrate growuphackathon.pl from GitHub Pages to Cloudflare Pages

## Goal

Move hosting from GitHub Pages to Cloudflare Pages to cut TTFB (currently ~730ms baseline,
confirmed via Lighthouse on the live site) via Cloudflare's edge network, with zero regression
to AI crawler access, existing SEO signals, or the current CI pipeline — measured, not assumed.

## Current state (confirmed 2026-09-06)

- DNS: nameservers at `cyberfolks.pl` (Polish registrar), A records point directly at GitHub
  Pages (`185.199.108-111.153`). No Cloudflare proxy sits in front of the site today — the
  existing "Cloudflare Web Analytics" beacon is a standalone script tag, unrelated to DNS/CDN.
- Site is 100% static output (`output: 'static'` in `astro.config.mjs`); no `src/pages/admin`
  or Keystatic routes remain in this repo (admin app lives in the separate `growup-webcrew`
  repo per [[project_growup_hackathon]]). The `@astrojs/node` adapter in `astro.config.mjs` is
  therefore vestigial — confirm before migration whether it's still needed for anything, or
  drop it to simplify the build.
- CI (`static.yml`) builds with the existing `pnpm build` and deploys `dist/client` via
  `actions/deploy-pages@v4` — a GitHub-native action, not portable to Cloudflare as-is.
- GSC is verified via an HTML verification file; sitemap submitted 2026-09-05.

## Correction to a claim made earlier in conversation

I said migrating growuphackathon.pl to Cloudflare would "fix the CI 403 on deepkind.org too."
That's wrong — deepkind.org's Cloudflare zone and growuphackathon.pl's would be two separate
zones under two separate domains. Moving this site's hosting has no effect on deepkind.org's
bot protection. Flagging the correction rather than letting it stand uncorrected.

## Constraints

- **DNS is a shared, hard-to-reverse resource.** Every step that touches nameservers or DNS
  records requires explicit confirmation before executing — this plan stops at checkpoints for
  that reason, not because the technical steps are unclear.
- **Cloudflare blocks AI crawlers by default since Jul 2025** on any domain added to a
  Cloudflare account (per `.claude/rules/seo.md` / `seo-ai-search.md`, and already flagged as a
  known gotcha in [[project_seo_campaign_status]]). This must be explicitly configured before
  cutover, not after — an AI-search visibility gap between cutover and noticing the gap is a
  real regression, not a theoretical one.
- **Zero-downtime requirement**: growuphackathon.pl is an active recruiting funnel (registration
  open, countdown timer on the homepage) — no outage window is acceptable.
- Must preserve: GSC verification, the current CI's SEO gates (structured data, linkinator,
  Lighthouse), and the existing PR-based workflow (worktrees, `seo-checks.yml`).

## Known unknowns (confirm before starting)

- [ ] Full nameserver delegation to Cloudflare vs. a partial CNAME-only setup — full delegation
      gets the complete edge/caching benefit and the AI-crawler dashboard toggle; partial setup
      is less disruptive to existing DNS records (MX for `kontakt@`/`rodo@` addresses, if any
      live at this registrar) but may not deliver the full TTFB win. Needs a decision, not an
      assumption — check what other DNS records exist at cyberfolks.pl first (MX, TXT/SPF/DKIM
      for email) so nothing breaks silently.
- [ ] Whether to let Cloudflare Pages build directly from the GitHub repo (its own CI) or keep
      building in GitHub Actions and `wrangler pages deploy dist/client` as a publish step.
      Recommend the latter — it reuses the already-tested `seo-checks.yml` gates verbatim and
      avoids running two divergent build pipelines.

## Tasks

- [ ] 1. Audit all existing DNS records at cyberfolks.pl (A, MX, TXT, CNAME) — export/screenshot
      before touching anything, so there's a known-good rollback reference.
- [ ] 2. Add growuphackathon.pl to a Cloudflare account (free plan, confirmed $0/mo at this
      site's traffic scale per prior conversation).
- [ ] 3. Create the Cloudflare Pages project, connected via `wrangler pages deploy` from CI
      (not Cloudflare's own Git integration, per the decision above) — get a `*.pages.dev`
      preview URL working and verified correct (visual + Lighthouse) before touching DNS at all.
- [ ] 4. **Before any DNS cutover**: in the Cloudflare dashboard, explicitly allow search-stage
      AI crawlers (Google-Extended, PerplexityBot, Perplexity-User, OAI-SearchBot, ChatGPT-User,
      Claude-SearchBot) — do not rely on robots.txt alone; Cloudflare's bot-blocking happens at
      the network edge, before robots.txt is ever consulted.
- [ ] 5. Update `.github/workflows/static.yml` (or a new `cloudflare-deploy.yml`) to publish via
      `wrangler pages deploy dist/client` using a Cloudflare API token stored as a GitHub secret,
      keeping the existing `seo-checks.yml` gates unchanged and running first.
- [ ] 6. Re-run the full technical audit (robots.txt, sitemap, meta tags, structured data,
      Lighthouse) against the `*.pages.dev` preview URL — confirm nothing regressed before DNS
      touches anything.
- [ ] 7. **Checkpoint — get explicit go-ahead before this step.** Lower DNS TTL on the current
      A records at cyberfolks.pl 24-48h in advance, then either delegate nameservers to
      Cloudflare or add the CNAME/A records Cloudflare Pages requires for the custom domain,
      per the decision in Known Unknowns.
- [ ] 8. Monitor propagation (`dig`, multiple resolvers) and confirm: site resolves, HTTPS cert
      issues correctly, GSC still shows the property verified, sitemap still fetches clean.
- [ ] 9. Re-measure TTFB and full Lighthouse mobile run against the live domain post-cutover —
      compare against the ~730ms GitHub Pages baseline captured 2026-09-06. Report the actual
      number, not the expected one.
- [ ] 10. Keep the GitHub Pages `static.yml` deploy path intact (do not delete) for at least one
      full week post-cutover as a fast rollback option (revert DNS, GitHub Pages is still
      serving the last-deployed build). Remove only after that window with no issues.
- [ ] 11. Update [[project_seo_campaign_status]] memory once stable.

## Review Criteria

- TTFB measurably lower than the ~730ms GitHub Pages baseline — measured on the live domain,
  not the `*.pages.dev` preview.
- Zero AI-crawler regression: `curl` each of the six bot user-agents against the live domain
  post-cutover and confirm 200s, not blocks/challenges.
- GSC property still verified, sitemap still submitted and fetching clean.
- No MX/email regression if the registrar's DNS carried mail records — confirmed against the
  Task 1 audit.
- `seo-checks.yml` and `static.yml`-successor both green on the deploying branch before this is
  considered done.
