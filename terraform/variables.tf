variable "cloudflare_account_id" {
  description = "Cloudflare account ID that owns this zone and the Pages project"
  type        = string
  nullable    = false
}

variable "domain" {
  description = "Apex domain for the site"
  type        = string
  default     = "growuphackathon.pl"
  nullable    = false
}

variable "pages_project_name" {
  description = "Cloudflare Pages project name"
  type        = string
  default     = "growuphackathon"
  nullable    = false
}
