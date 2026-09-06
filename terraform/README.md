# Terraform — Cloudflare infrastructure

Manages the Cloudflare-side infrastructure for the growuphackathon.pl migration
(see `docs/plans/cloudflare-pages-migration.md`): the zone, baseline TLS
settings, and the Pages project + custom domain. It does **not** deploy the
site itself — that stays `wrangler pages deploy` from CI, so the existing
`seo-checks.yml` build/gate pipeline remains the single source of truth for
what gets built.

## Setup

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars   # fill in the real account ID
export CLOUDFLARE_API_TOKEN="..."               # never committed, never logged
terraform init
terraform plan
```

## State

Local state (`terraform.tfstate`), gitignored. This is a single-operator
project at its current scale — a remote backend (e.g. R2, see the `cloudflare`
skill's terraform patterns reference) is a reasonable future upgrade if that
changes, not a blocker now.

## What this does NOT do

- Does not touch DNS at the registrar (cyberfolks.pl) — nameserver delegation
  is a manual step at cutover time, outside Terraform's reach entirely.
- Does not configure the AI Crawl Control / bot allowlist — that's a one-time
  dashboard toggle by design (see the migration plan's reasoning), not
  something worth a scoped API permission for.
- Does not deploy the site build — `wrangler pages deploy` in CI does that,
  against the Pages project this config creates.
