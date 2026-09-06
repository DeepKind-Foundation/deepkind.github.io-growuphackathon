# Apex CNAME to the Pages project -- relies on Cloudflare's CNAME flattening,
# which is why this works at the zone root (most DNS providers don't allow
# CNAME at the apex; Cloudflare does via flattening).
resource "cloudflare_dns_record" "apex" {
  zone_id = cloudflare_zone.main.id
  name    = "@"
  type    = "CNAME"
  content = cloudflare_pages_project.site.subdomain
  proxied = true
  ttl     = 1 # required to be 1 ("automatic") when proxied
}
