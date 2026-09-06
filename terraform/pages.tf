# Direct-upload project (no `source` block) -- deployment happens from CI via
# `wrangler pages deploy`, not Cloudflare's own Git integration. This keeps the
# existing seo-checks.yml build/gate pipeline as the single source of truth for
# what gets built, instead of running two divergent build pipelines.
resource "cloudflare_pages_project" "site" {
  account_id        = var.cloudflare_account_id
  name              = var.pages_project_name
  production_branch = "main"

  lifecycle {
    # Cloudflare's API returns default values for deployment_configs that
    # Terraform didn't set, causing a perpetual diff otherwise.
    ignore_changes = [deployment_configs]
  }
}

resource "cloudflare_pages_domain" "apex" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.site.name
  name         = var.domain
}
