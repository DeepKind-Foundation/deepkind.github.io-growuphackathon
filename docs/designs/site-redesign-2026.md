# GrowUp Hackathon — Site Redesign 2026

Decided after a 6-axis design research sweep (clichés, award winners, Polish design references,
typography, adjacent inspiration, anti-generic principles).

---

## Aesthetic Anchor

**A 1980s Polish summer science camp printed program** — an offset-printed A5 booklet handed to
teenagers arriving at a PAN youth olympiad. Set in Antykwa Półtawskiego on a Mazowsze press. Warm
off-white paper, near-black ink, one second ink color (vermillion) used only where the print budget
justified it: section headers, rule lines, a geometric diagram on the cover.

No overlap with any current hackathon site. Pre-digital, culturally specific, zero generic tech aesthetics.

---

## What to Avoid (Research Finding — All Observed on Competing Sites)

| Pattern | Why it's dead |
|---------|--------------|
| Dark bg + purple/indigo gradient | Tailwind `bg-indigo-500` default → AI codegen → every hackathon template |
| Glassmorphism cards | Saturated the space 2021–2023; now a dated signal |
| Particles.js hero | 46M CDN requests/month, memory leak, documented cliché |
| Inter or Poppins as the only typeface | Default for Tailwind UI, shadcn, AI codegen |
| Three-column feature icon grid | Appears on 22% of AI-generated landing pages verbatim |
| Countdown timer as hero element | Every MLH hackathon; communicates nothing when universal |
| Typewriter cycling text | Decade of ubiquity, accessibility problems |
| Gradient text headings | WCAG failure; signals "wanted to look designed" without being designed |
| Colored left-border card | Most recognisable tell of AI-generated UI (Impeccable research) |

---

## Reference Sites

**Nordic Health Hackathon** — three-token palette (black / white / warm gold). One unexpected accent
does more than any gradient. Extracts: single non-tech accent color, one moment of designed surprise per page.

**HackMIT archive** (2023–2024) — full visual identity recommission every year under a new conceptual
theme. Each edition is a cultural object, not a registration form. Extracts: permanent base system
(URL, grid, typeface family) + rotating surface identity per edition.

**Unsound Festival** (unsound.pl) — rebuilds around one conceptual Polish word per year: WEB, SOFT POWER.
Stark editorial hierarchy, bilingual PL/EN, no decorative chrome. Extracts: pick one Polish word per
edition as the generative concept, commission the visual language from it.

**Łódź Design Festival** — post-industrial aesthetics, no persistent decoration, each edition commissioned
fresh. Extracts: "things being built here" without tech iconography, rooted in Polish urban reality.

**Bread Zine** — electric two-color palette achieving Awwwards recognition with zero gradient or glassmorphism.
Extracts: two-ink palette on black ground is enough.

---

## Typography

**Display: Półtawski Nowy** (`@fontsource/poltawski-nowy`)
— open-source, Ministry of Culture funded, digitisation of Antykwa Półtawskiego (1920s).
The only canonical Polish display typeface with diacritics built into the original letterform structure.
Used at weights 400, 400 italic, 600, 600 italic.

**UI / structural: Martian Mono Variable** (`@fontsource-variable/martian-mono`)
— wider proportions and more legible letterforms than Space Mono. Creates visible tension with
Półtawski's warm humanist serifs — that contrast signals the site was not AI-generated.

**Banned**: Inter, Poppins, Roboto, Space Grotesk, DM Sans, Plus Jakarta Sans.

---

## Color System

Three roles. Poster-school proportions.

| Role | Token | Value | Usage |
|------|-------|-------|-------|
| P (field) | `--c-paper` | `oklch(96% 0.010 82)` | Page background — 65%+ of surface area |
| A (ink) | `--c-ink` | `oklch(14% 0.012 55)` | All structural type, borders, rules |
| C (accent) | `--c-red` | `oklch(52% 0.22 27)` | Second printing ink — sparingly only |

**The discipline**: if the vermillion accent appears twice in the same viewport while scrolling,
one instance is wrong. No gradients between P and C (complementary muddy midpoint). No glows. No
opacity-stacked ambient blobs.

---

## Layout Principles

1. **Hero is a poster, not a form.** Wordmark GROWUP at 13–17vw. Tagline italic below. Lead text +
   CTA at the bottom of the hero section, below fold on most screens. No glass panel, no decorative
   beams.

2. **Section breaks are 1px rule lines**, not background color changes. Each section has a
   `XX / SECTION NAME` label in Martian Mono to the right of a short rule — direct print logic.

3. **Asymmetric 2/3 column splits** on About, Benefits, Organizers. 3/2 elsewhere. No centered
   equal-column layouts unless the content genuinely requires symmetry.

4. **Partner logos: original appearance**, no desaturation, no filter treatment.

5. **Radii: nearly flat** (2–6px). Print aesthetic — not the rounded-corner SaaS default.

6. **No backdrop-filter, no box-shadow drama, no radial gradient blobs.**

---

## File Map

| File | Role |
|------|------|
| `src/styles/tokens.css` | Single source of truth for all design tokens |
| `src/styles/global.css` | Reset, base styles, shared utilities (.btn-primary, .card, .section-label) |
| `src/layouts/BaseLayout.astro` | Font imports (Półtawski + Martian Mono) |
| `src/components/sections/*.astro` | Each section self-contained with scoped styles |

---

## Content Sections (Ordered)

| # | Section | ID |
|---|---------|-----|
| — | Hero | — |
| 01 | O projekcie | `#o-projekcie` |
| 02 | Ścieżki tematyczne | `#sciezki` |
| 03 | Etapy programu | `#etapy` |
| 04 | Co zdobywasz | `#nagrody` |
| — | Zapisz się (waitlist) | — |
| 05 | Pytania i odpowiedzi | `#faq` |
| 06 | Organizatorzy | `#organizator` |
| 07 | Partnerzy | `#partnerzy` |
| — | Bottom CTA | — |
| — | Footer / Kontakt | `#kontakt` |
