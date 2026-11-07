# Kickoff — build steps and prompts

Open this folder in Claude Code and paste one prompt per step. Review and commit at the end of each step before moving on.

## Before you start (one time)

1. Install Node 22 or newer (`node -v`).
2. Create an empty GitHub repo (e.g. `valanarasan/sael-site`) and clone it, or `git init` inside this folder.
3. Keep `reference/` and `docs/` in the repo; they are read-only inputs.
4. Start Claude Code in this folder: `claude`.

## Step prompts

**1 · Set-up**
> Read CLAUDE.md and docs/technical-plan.md. Scaffold the Astro 6 + TypeScript strict project in this folder (keep reference/ and docs/). Add ESLint, Prettier, Husky + lint-staged, Vitest, Playwright with @axe-core/playwright, and a GitHub Actions workflow running check, lint, test and build. Add the npm scripts named in CLAUDE.md and a .env.example. Don't build any pages yet. Stop and show me the file tree and a passing `npm run check && npm run lint && npm test`.

**2 · Foundations**
> Build styles/tokens.css from the v5 tokens, self-hosted fonts via the Astro Fonts API, BaseLayout (head, meta, favicon), header, mobile menu sheet, footer and mobile action bar, matching reference/v5/index.html. All contact details come from src/content/settings.json. Screenshot at 1440 and 390 and compare with v5.

**3 · Content model**
> Create the content collections and Zod schemas in content.config.ts for settings, sections, projects, faqs, subsidy, chat and blog. Move the v5 text into those files (keep "Content from SAEL" placeholders marked). Add lib/content.ts repository functions and mappers. Add tests for the mappers.

**4 · Logic + unit tests**
> Write lib/subsidy.ts, lib/chat matcher and lib/leads validation test-first with Vitest, covering every case listed in CLAUDE.md and the Testing section of docs/technical-plan.md. Show coverage for lib/.

**5 · Static sections**
> Build the home-page sections as components from the v5 markup, in order, using the content files. Move the photos from reference/v5/assets/img into src/assets and render them with astro:assets. No animation yet. Screenshot every section at 1440 and 390.

**6 · Islands**
> Build the islands: subsidy calculator (state dropdown), system finder, gallery + lightbox, chat assistant. Each hydrates with client:visible or client:idle. Keyboard and screen-reader friendly. Add Playwright tests for each.

**7 · Motion**
> Port the v5 animations into lib/motion.ts (GSAP, ScrollTrigger, Lenis): hero pinned slides, reveals, section effects, day/night slider. Reduced-motion path disables them. Check no layout shift.

**8 · Blog**
> Build /blog with topic filters and /blog/[slug] article template, RSS feed and share images. Seed the 14 titles from v5 as drafts.

**9 · Enquiries**
> Build api/enquiry.ts per CLAUDE.md: Zod validation, honeypot, Turnstile, rate limit, LeadStore (Google Sheet adapter) and LeadNotifier (Resend adapter) behind interfaces, save before notify, retry, no phone numbers in logs. Endpoint tests with fakes. Consent checkbox and privacy notice on the form.

**10 · Pages CMS**
> Write .pages.yml so every file in src/content is editable with friendly labels, field types and help text, plus a media folder. Write docs/editor-guide.md: add a blog post, change a phone number, swap a photo, change a subsidy rate.

**11 · Hardening**
> Add the CSP and security headers, check image output (AVIF/WebP), run Playwright + axe + Lighthouse CI against the budgets in CLAUDE.md, add SEO (titles, descriptions, sitemap, LocalBusiness structured data). Report anything that misses a budget.

## Waiting on SAEL (don't invent these)

Headlines, Why SAEL tiles, numbers band figures, engineering figures, blog articles, second phone number, WhatsApp confirmation,
project details and photo mapping, Tier-1/BIS/AMC claims, solar pump and off-grid decision, NZ office, brand colour decision,
vector logo, state top-up confirmation. Full list: docs/client-plan.md.
