# SAEL Energy website — production build

Production build of the SAEL Energy Solution LLP website (solar EPC, South India: Bangalore + Kerala offices, NZ office).
Built by Valan Arasan for Hiranmaye Digital (agency client project).
The approved design is the v5 HTML in `reference/v5/`. Rebuild it as a maintainable Astro site; do not redesign.

Full plans: `docs/technical-plan.md` (how to build) and `docs/client-plan.md` (what SAEL asked for, open questions).
When this file and the plans disagree, this file wins.

## Stack

- Astro 7 (7.4.x), TypeScript strict, Node 22.23+ (24 recommended). Astro 6 was dropped: its last release has unpatched security advisories. Static output; one server route for the enquiry form.
- Interactive parts are small vanilla-TS islands (no React): subsidy calculator, system finder, gallery + lightbox, chat assistant, mobile menu.
- GSAP + ScrollTrigger and Lenis from npm, wrapped in one `src/lib/motion.ts`. Always respect `prefers-reduced-motion`.
- Content in Astro content collections, validated by Zod in `src/content.config.ts`.
- Editing after handover: Pages CMS (`.pages.yml`). Every editable value lives in `src/content/`.
- Tests: Vitest (unit, component, endpoint), Playwright (+ @axe-core/playwright), Lighthouse CI.
- Lint/format: ESLint + Prettier, Husky + lint-staged. CI: GitHub Actions.

## Out of scope for now

- Hosting and domain (decided later). Don't add host-specific config beyond what an adapter needs; keep it swappable.
- Translation / multiple languages.
- WhatsApp Business API (the chat hands off to a normal `wa.me` link).

## Commands

```
npm run dev        # local dev server
npm run build      # production build (runs content schema checks)
npm run check      # astro check + tsc
npm run lint       # eslint + prettier --check
npm test           # vitest run
npm run test:e2e   # playwright
```
Keep these script names. Run `npm run check && npm run lint && npm test` before calling any step done.

## Structure

```
src/
  content/            # SAEL edits these via Pages CMS
    blog/             # one .md per article
    projects/         # one .json per project
    faqs.json  settings.json  subsidy.json  chat.json  sections.json
  content.config.ts   # Zod schemas
  lib/                # pure logic, no DOM, unit-tested
    subsidy.ts        # calculateSubsidy(kw, stateId, rules) -> { central, state, total, note }
    chat/             # intents matcher
    leads/            # Lead types, LeadStore + LeadNotifier interfaces, adapters, validation
    content.ts        # repository: getProjects(), getFaqs(), getPosts(), getSettings()
    motion.ts         # GSAP/ScrollTrigger/Lenis facade
  components/ ui/ sections/ islands/
  layouts/BaseLayout.astro
  pages/ index.astro  blog/index.astro  blog/[slug].astro  api/enquiry.ts
  styles/tokens.css
public/  tests/unit  tests/e2e  reference/v5 (read-only)
```

## Rules

- Content / logic / components stay separate. No business data (phones, WhatsApp, addresses, rates, headlines) hard-coded in components: read it from `settings.json` etc.
- Single responsibility: `lib/subsidy.ts` does maths only; the island only renders; `subsidy.json` only holds rates.
- Open/closed: new state top-ups and chat answers are new data entries, not code changes.
- Depend on interfaces: the enquiry route uses `LeadStore` and `LeadNotifier`; the only place that picks vendors is `lib/leads/index.ts`.
- Pages fetch and map content (repository + adapter functions); section components only render props. Props are small and specific.
- No `any`. Validate all external input (form data, content) with Zod.
- Accessible: semantic elements, labelled fields, visible focus, keyboard-operable menu/gallery/chat, alt text on every image.
- Small commits, Conventional Commits (`feat:`, `fix:`, `content:`, `test:`, `chore:`). One branch + PR per build step.
- Every bug fix gets a test. `lib/` keeps ≥ 90% line coverage. Tests use fixtures, never live content files.

## Design tokens (from v5 — keep exactly)

```
--paper #F1F3F1  --paper-2 #E5EAE8  --white #FFFFFF
--ink #0B1F22  --ink-2 #2B4145  --muted #5D7376
--teal #0E4A4F  --teal-2 #13606A  --mint #BFE6DF
--copper #E8692E  --copper-2 #F59A5B
--line rgba(11,31,34,.12)  --line-d rgba(241,243,241,.16)
--ease cubic-bezier(.16,1,.3,1)
Fonts: Plus Jakarta Sans 400–800 (display/body), Newsreader italic 400/500 (accents), IBM Plex Mono 400/500 (labels)
```
Self-host fonts via Astro's Fonts API. Logo: `reference/v5/assets/img/sael-logo.png` (vector logo still to come from SAEL).
Open question: re-theme accents to the logo's green (#88C038) and blue (#20A8E0)? Don't change until SAEL decides.
Known issue, kept by decision until then: white text on copper fills (#E8692E) is 3.23:1, below WCAG AA 4.5:1. The axe tests skip only that rule for copper buttons (`tests/e2e/axe.ts`); fix it with the colour decision.

## Page content (home, in order)

Hero (5 slides) · Compare systems + finder · PM Surya Ghar subsidy calculator · How it works (5 steps) · Why SAEL (bento) ·
Engineering + photo strip · Gallery · Numbers band · Projects (South India only) · Who it's for (Homes / Shops & offices / Farms / Industries) ·
FAQs · Contact form (video background) · Day/night slider · Footer. Plus `/blog` (14 titles, cards + topic filters) and `/blog/[slug]`.
Copy marked "Content from SAEL" / "Figure from SAEL" in v5 is placeholder: keep it visibly marked until real text arrives.
Removed by the client — never reintroduce: Products section, solar atta chakki, solar water heater, Ghana project, 24/200/20 MW figures.

## Subsidy rules (put in `subsidy.json`, test every case)

Central (PM Surya Ghar, residential rooftop): ₹30,000/kW for the first 2 kW, ₹18,000 for the 3rd kW, max ₹78,000.
State top-ups (to be confirmed by SAEL): KA none · KL none · TN note-only (announced up to ₹1 lakh, guidelines awaited, not counted) ·
UP ₹15,000/kW capped at ₹30,000 · DL ₹10,000/kW up to 3 kW · GA note-only (set by GEDA) · Other states: central only.
Expected: 3 kW in UP → central 78,000 + state 30,000 = 1,08,000. Format rupees en-IN.

## Enquiry form → leads

Fields: name, phone (Indian mobile, optional +91/spaces), interest (On-grid solar | Hybrid solar with battery | Commercial or industrial project),
district/pincode, monthly bill, message, consent checkbox (required), honeypot. Server: Zod validation → Turnstile check → rate limit →
`LeadStore.save()` (Google Sheet "SAEL Leads" via service account) → `LeadNotifier.notify()` (Resend email to sales list, with Call/WhatsApp
buttons; retry on failure). Save before notify; a failed email must never lose a lead. Never log phone numbers. Secrets only in env vars;
keep `.env.example` up to date. Thank-you state offers "Continue on WhatsApp".

## Chat assistant

Data-driven intents in `chat.json` (keywords, answer, related blog slugs, optional WhatsApp prefill). Hands off to `wa.me/<settings.whatsapp>`.
Asking about atta chakki / water heater → polite "we don't supply these". Current WhatsApp: 919880703083 (to confirm).

## Performance and security budgets

LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 on mobile; home-page JS < 100 KB gzip; Lighthouse mobile ≥ 90.
Images via `astro:assets` (AVIF/WebP, srcset, width/height set); first hero image `fetchpriority="high"`, everything else lazy.
CSP via Astro's CSP API; HSTS, nosniff, strict-origin-when-cross-origin, Permissions-Policy, frame-ancestors 'none'.
No third-party CDNs. `rel="noopener noreferrer"` on new-tab links.

## Workflow for Claude in this repo

- Work through the build steps in `KICKOFF.md` one at a time. Stop at the end of each step: summarise what changed, show test results, wait for review.
- Match the v5 visuals: open `reference/v5/index.html` to compare. Take a Playwright screenshot at 1440 and 390 widths to check.
- Ask before adding a dependency not listed above, or changing anything under "Rules" or the design tokens.
- Never edit `reference/`.
