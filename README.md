Author: DziQTrueCoder, original repo: https://github.com/DziQTrueCoder/dziqtruecoder.github.io

## Analytics & cookie consent

Google Analytics 4 is wired up (`src/components/CookieBanner.astro`), but never loads before a visitor explicitly accepts the cookie banner:

- The GA script tag is injected at runtime, only from the Accept click handler (or automatically on a later page load if the visitor already accepted). No `<script>` referencing Google exists anywhere else in the page.
- Declining is stored just as permanently as accepting, and is presented with equal visual weight — not a de-emphasized afterthought.
- Loading is also gated on the production hostname (`growuphackathon.pl`), so local dev and any other environment never sends real hits.
- The Measurement ID lives in Keystatic: `home.json`'s `analytics.gaMeasurementId` field (schema in `keystatic.config.ts`). Leave it empty to disable analytics entirely, regardless of consent.

This exists because GDPR/RODO reject *implied* consent ("continued use of the site = agreement") for non-essential cookies — consent must be an affirmative action taken before the cookie is set, and declining must be as easy as accepting. When changing this mechanism, verify against the **live production URL** with Playwright, not just local dev: a fresh, isolated browser context should show zero network requests to Google before any interaction and after Decline (including across a reload), and exactly one correct request after Accept.
