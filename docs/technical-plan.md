# SAEL Website v5 · Technical Development Plan

Nov 7, 2026 · @Team

## Summary

Build the production site in **Astro 7 with TypeScript**, as a static site with all content in files. SAEL then edits that content through **Pages CMS**, a free browser editor, so nobody touches code after handover. Hosting and the domain will be decided later. Translation into other languages is out of scope for now.

| Decision | Choice | Why |
| --- | --- | --- |
| Framework | Astro 7 + TypeScript (strict) | Static pages with no JavaScript by default. Interactive parts load only where needed. |
| Interactive parts | Small TypeScript "islands": calculator, chat, gallery, menu | No React needed; keeps the home page light. |
| Animation | GSAP + ScrollTrigger and Lenis, installed from npm | Same effects as v5, bundled and self-hosted instead of loaded from public CDNs. |
| Content | Astro content collections: Markdown for blog posts, JSON for settings, projects, FAQs and subsidy rules | Content sits apart from code, and a schema checks every file at build time. |
| Editing after handover | Pages CMS (free), with TinaCMS as the alternative | SAEL staff edit in a browser; every change is saved to Git and the site rebuilds. |
| Enquiries | One serverless function: validates, blocks spam, saves to a Google Sheet, emails the sales team | Leads are never lost, and the team works in a tool it already knows. |
| Testing | Vitest unit tests on all logic, Playwright end-to-end, axe and Lighthouse in CI | Catches wrong subsidy figures or a broken form before SAEL does. |

The v5 HTML stays as the visual reference. The build splits it into components and content files, rather than starting the design again.

## Framework

Astro fits best because the SAEL site is mostly content with a few interactive pieces. Most of the page needs no JavaScript at all.

|  | Astro 7 (recommended) | Next.js | Plain HTML + Vite (v5 as is) |
| --- | --- | --- | --- |
| Built for | Content sites: marketing pages, blogs | Web apps with logins, dashboards, live data | Single pages and prototypes |
| JavaScript sent to visitors | None by default; only the islands you mark | A React runtime on every page | Whatever you write |
| Blog and content | Content collections with schema checks | Possible, but you assemble it yourself | Hand-copied HTML per article |
| Editor (CMS) support | Pages CMS, TinaCMS, Keystatic, Decap, Sanity | Same CMS options | Hard to connect |
| Security features | Built-in Content Security Policy API | Middleware and headers | Headers set at the host only |
| Fit for SAEL | Strong | Heavier than needed | Hard to maintain beyond one page |

Astro 7 needs Node 22.23 or newer. It keeps the built-in Fonts API for self-hosted fonts and the stable Content Security Policy API introduced in Astro 6, both used in this plan. (The plan first named Astro 6; the build moved to Astro 7 because the last Astro 6 release has security advisories that are fixed only in 7.x, including one in AVIF image optimisation.)

## Architecture

The site is pre-built HTML served from a CDN. The only server code is the enquiry endpoint. Developer and SAEL changes both land in the same GitHub repository, so every change goes through the same build checks.

&#91;embedded content: site architecture · edits, build, hosting, enquiries\]

If a build fails, the host keeps serving the last good version. The chat assistant runs entirely in the browser and hands the conversation to SAEL's WhatsApp.

## Clean code and best practices

Keep three layers apart: **content** (what SAEL edits), **logic** (plain TypeScript functions with no page code), and **components** (how things look). Each layer has its own folder.

```text
sael-site/
├─ src/
│  ├─ content/            # edited by SAEL through the CMS
│  │  ├─ blog/            # one Markdown file per article
│  │  ├─ projects/        # one JSON file per project
│  │  ├─ faqs.json
│  │  ├─ settings.json    # phones, WhatsApp, emails, offices, headlines
│  │  └─ subsidy.json     # central slabs and state top-ups
│  ├─ content.config.ts   # Zod schemas that check every content file
│  ├─ lib/                # pure logic, unit-tested
│  │  ├─ subsidy.ts       # calculateSubsidy(kw, state)
│  │  ├─ chat/intents.ts  # chat answers as data + matcher
│  │  └─ leads/           # LeadStore + LeadNotifier interfaces, Sheet and email adapters
│  ├─ components/
│  │  ├─ ui/              # Button, Card, Tag, Icon
│  │  ├─ sections/        # Hero, Compare, Subsidy, Process, Gallery…
│  │  └─ islands/         # Calculator, ChatWidget, Gallery, Menu
│  ├─ layouts/            # BaseLayout (head, header, footer)
│  ├─ pages/              # index.astro, blog/index.astro, blog/[slug].astro
│  │  └─ api/enquiry.ts   # the one server endpoint
│  └─ styles/tokens.css   # colours, type scale, spacing
├─ public/                # favicon, robots.txt, video
├─ tests/                 # Vitest unit tests + Playwright end-to-end tests
└─ .pages.yml             # Pages CMS editing setup
```

**Coding rules**

- TypeScript in strict mode. No `any`; validate anything that comes from outside the code (form data, content files).
- No hard-coded business data in components. The phone number, WhatsApp number, subsidy rates and offices live once, in content files.
- Small components with one job each, named after what they show (`SubsidyCalculator`, not `Widget2`).
- Design tokens in one CSS file. Each component has its own scoped styles; no global overrides.
- Accessible by default: real buttons and links, labelled form fields, visible focus, `prefers-reduced-motion` respected.

**Tooling and checks**

- ESLint and Prettier on save and before every commit (Husky + lint-staged).
- Vitest unit tests for the subsidy maths, chat matching and form validation: the parts that can be wrong silently.
- Playwright end-to-end tests for the menu, calculator, chat, form and blog pages on phone and desktop, plus axe accessibility checks.
- GitHub Actions runs lint, type-check, tests and build on every pull request. Nothing merges if a check fails.

**Git workflow**

- `main` is always deployable. Work happens on short-lived branches with a pull request each.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `content:`), so the history reads as a changelog.
- Every pull request gets a preview link, which doubles as SAEL's review link.

## Testing

Test the logic hard and the pages lightly. Most of the risk on this site is in a few pure functions: the subsidy maths, the chat matcher, form validation and the content schemas. Unit tests there are fast and cheap. A small set of browser tests then checks that the pieces work together.

| Layer | Tool | What it covers | Runs |
| --- | --- | --- | --- |
| Unit | Vitest | `lib/` functions: subsidy, chat matching, lead validation, formatting, content mappers | On save (watch mode) and in CI |
| Content | Astro build + Zod schemas | Every content file SAEL edits: required fields, number ranges, valid links | Every build, including CMS saves |
| Component | Vitest + Astro Container API | Sections render the right text and links from given props | CI |
| Endpoint | Vitest with a fake `LeadStore` and `LeadNotifier` | Enquiry API: rejects bad input, blocks spam, saves before notifying on good input, keeps the lead if the email fails | CI |
| End-to-end | Playwright | Menu, calculator, chat, form submission, blog filters on a phone and a desktop size | Every pull request, against the preview |
| Accessibility | @axe-core/playwright | No serious accessibility errors on each page | With end-to-end |
| Performance | Lighthouse CI | The budgets in the Performance section | Every pull request |

**What the unit tests must cover**

- **Subsidy:** every kW from 1 to 10. The slab edges (2 kW, 3 kW, above 3 kW) and the ₹78,000 cap. Every state rule: per-kW top-up, kW cap, rupee cap, note-only. An unknown state falls back to central only.
- **Chat:** each intent matches its typical questions. Removed products get the “not offered” answer. Unknown text gets the fallback with the WhatsApp button. Keyword clashes, such as “service”, pick the right intent.
- **Lead validation:** accepts valid Indian mobiles with or without +91 and spaces. Rejects short or long numbers, empty names, interests not on the list, over-long messages and filled honeypots.
- **Content mappers:** a project with no photo still renders. Dates format as “5 Nov 2026”. Blog slugs are unique.

```ts
// tests/unit/subsidy.test.ts
import { describe, it, expect } from 'vitest';
import { calculateSubsidy } from '../../src/lib/subsidy';
import rules from '../../src/content/subsidy.json';

describe('central subsidy', () => {
  it.each([[1, 30000], [2, 60000], [3, 78000], [10, 78000]])('%i kW → ₹%i', (kw, total) => {
    expect(calculateSubsidy(kw, 'XX', rules).central).toBe(total);
  });
});

describe('state top-ups', () => {
  it('Uttar Pradesh caps at ₹30,000', () => {
    expect(calculateSubsidy(3, 'UP', rules).state).toBe(30000);
  });
  it('Tamil Nadu is note-only until guidelines are issued', () => {
    const r = calculateSubsidy(3, 'TN', rules);
    expect(r.state).toBe(0);
    expect(r.note).toMatch(/guidelines/);
  });
});
```

**Rules**

- Logic in `lib/` reaches 90% line coverage or more. Pages and styles have no coverage target.
- Every bug fixed gets a test that would have caught it.
- Tests use their own fixture data, not live content. Then a SAEL edit, such as a new subsidy rate, can't break the test suite. The content schemas catch bad edits instead.

## SOLID principles

SOLID comes from object-oriented code, but each rule maps onto a component-based site. Here is where each one shows up in SAEL's code.

| Principle | What it means here | Example in the SAEL site |
| --- | --- | --- |
| **S**ingle responsibility | One reason to change per module | `subsidy.ts` only does the maths. `SubsidyCalculator.astro` only shows it. `subsidy.json` only holds the rates. A new state rate changes one file. |
| **O**pen/closed | Add features by adding data or modules, not by editing working code | New state top-ups and new chat answers are new entries in a data file. The calculator and chat engine don't change. |
| **L**iskov substitution | Anything that fits an interface can replace another without breaking callers | The hero accepts any `Media` item, image or video. Any `LeadStore` (Google Sheet today, Zoho CRM later) can be swapped in, and the form still works. |
| **I**nterface segregation | Components ask only for what they use | `ProjectCard` takes `{ title, place, size, image }`, not the whole project record. The chat widget takes only the intents and the WhatsApp number. |
| **D**ependency inversion | High-level code depends on interfaces, not on vendors | The enquiry endpoint calls `LeadStore.save()` and `LeadNotifier.notify()`. Which sheet, CRM or email service sits behind them is set in one file. Pages read content through `getProjects()`-style functions, never from the CMS directly. |

```ts
// lib/leads/types.ts — the contracts the enquiry endpoint depends on
export interface Lead { name: string; phone: string; interest: string; district?: string; message?: string; consent: true }
export interface LeadStore { save(lead: Lead): Promise<{ id: string }> }
export interface LeadNotifier { notify(lead: Lead, id: string): Promise<void> }

// pages/api/enquiry.ts — works with any store and notifier passed in
export const handleEnquiry = (store: LeadStore, notifier: LeadNotifier) => async (lead: Lead) => {
  const { id } = await store.save(lead);  // save first: a lead is never lost
  await notifier.notify(lead, id);         // then alert the team (retried on failure)
};

// lib/leads/index.ts — the one place that picks the vendors
export const enquiry = handleEnquiry(googleSheetStore(env), resendNotifier(env));
```

## Design patterns

Each pattern below solves a specific problem in this site; none is there for its own sake.

| Pattern | Problem it solves | Where it sits |
| --- | --- | --- |
| Islands architecture | Most of the page needs no JavaScript | Only the calculator, chat, gallery and menu load scripts, each with `client:visible` or `client:idle`. |
| Presentational / container split | Mixing data fetching with markup makes both hard to change | Pages fetch and shape content; section components only render props. |
| Repository | Pages shouldn't know where content is stored | `lib/content.ts` exposes `getProjects()`, `getFaqs()`, `getPosts()`. Moving to another CMS changes this file only. |
| Adapter | Raw CMS data doesn't match what components need | Mapper functions turn content entries into view models such as `ProjectCardProps`. |
| Strategy | The same action has more than one way of doing it | Lead storage and alerts (`LeadStore`: Google Sheet now, CRM later; `LeadNotifier`: email now, WhatsApp API later) and state subsidy rules (per kW, capped, note-only). |
| Registry (data-driven) | Long `if`/`else` chains for chat answers | Chat intents live in a list of `{ keywords, answer, related }`; the matcher loops over it. |
| Facade | Third-party scripts spread through the code | One `analytics.track()` wrapper and one `motion.ts` module that sets up GSAP, ScrollTrigger and Lenis. |
| Observer | Animations and lazy loading that react to scrolling | `IntersectionObserver` for reveals and lazy media; ScrollTrigger for pinned sections. |
| Single source of truth (config) | The same phone number typed in ten places | `settings.json` feeds header, footer, chat, mobile bar, schema markup and form. |

## Security

A static site has little to attack. The risk sits in three places: the enquiry form, the CMS login and third-party code.

**Enquiry form**

- [ ] Validate every field on the server with a Zod schema: Indian mobile format, length limits, allowed interest values. Never trust the browser's checks alone.
- [ ] Block bots with a hidden honeypot field plus Cloudflare Turnstile, a free CAPTCHA alternative.
- [ ] Rate-limit the endpoint by IP, for example 5 submissions per 10 minutes.
- [ ] Escape all user text before it goes into the notification email.
- [ ] Don't store enquiries on the site. They go straight to SAEL's inbox, and logs never record phone numbers.
- [ ] Add a short privacy notice under the form saying what is collected and why, in line with India's Digital Personal Data Protection Act, 2023.

**Secrets and access**

- [ ] API keys (email service, Turnstile) only in the host's environment variables, never in Git. `.env` is in `.gitignore`.
- [ ] Two-factor login on GitHub and every service account the site uses.
- [ ] CMS editors get access to content only. Code is protected with branch protection on `main`.

**Browser security headers** (set in the host config)

- [ ] Content Security Policy through Astro's CSP API: scripts only from the site itself and Turnstile.
- [ ] `Strict-Transport-Security` (HTTPS only), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy` that turns off camera, microphone and location, and `frame-ancestors 'none'` against clickjacking.

**Third-party code**

- [ ] GSAP, Lenis and fonts installed from npm and served from the site's own domain, not public CDNs.
- [ ] Dependabot or Renovate for dependency updates, with `npm audit` in CI.
- [ ] Pin exact versions in `package-lock.json`.
- [ ] Every outbound link that opens a new tab gets `rel="noopener noreferrer"`, including WhatsApp.

## Enquiries: saving leads and notifying SAEL

Every enquiry is **saved first, then announced**. The endpoint writes the lead to a Google Sheet that SAEL's team already knows how to use. It then emails the sales team straight away. If the email fails, the lead is still safe in the sheet. All of this costs nothing at SAEL's likely volume.

**What happens on submit**

1. The visitor submits the form. The endpoint validates it, checks Turnstile and the rate limit, and rejects spam silently.
2. It adds a row to the **SAEL Leads** Google Sheet through the Sheets API, using a service account. The row records time, name, phone, interest, district or pincode, monthly bill, message, page, language, campaign (UTM) tags and consent. A **Status** column starts at “New”.
3. It emails the sales team through Resend. The subject reads like “New enquiry: Hybrid solar · Kochi”. The body has one-tap **Call** and **WhatsApp** buttons for the customer's number, and a link to the sheet row.
4. The visitor sees a thank-you message with a **Continue on WhatsApp** button, so a hot lead can start chatting at once.
5. If the email fails, the endpoint retries. Failures are logged without personal data, and a daily check emails the developer if any lead was never notified.

**What SAEL's team does with it**

- Status dropdown in the sheet: New → Contacted → Survey booked → Quoted → Won / Lost, plus an Owner column.
- Sheet filters by district and interest, and a weekly count by status.
- The sheet is shared only with named SAEL staff, never “anyone with the link”.

**Options compared**

| Option | Where leads live | Team alert | Cost | When to choose |
| --- | --- | --- | --- | --- |
| **Google Sheet + Resend email (recommended)** | SAEL's Google Drive | Email to a team list | Free: Resend's free plan sends 3,000 emails a month, 100 a day | Launch. Simple, and the team can use it on day one. |
| Zoho CRM free edition | Zoho CRM | Workflow rules (10 on the free plan) and email | Free for 3 users; 1 web form per module | When SAEL wants follow-up reminders and a proper sales pipeline. |
| Cloudflare D1 database + email | A database on the host | Email | Free: 100,000 rows written a day, 5 GB | When the developer manages the data, or as a backup copy. |
| WhatsApp Business API alert | Any of the above | WhatsApp message to the team | Provider plan plus per-message charges | Only if SAEL picks Option B in the chatbot decision deck. |

Because the endpoint talks to a `LeadStore` and a `LeadNotifier` interface (see SOLID), moving from the sheet to Zoho CRM later means writing one new adapter. The form and the page don't change.

**Personal data**

- A required consent checkbox (“SAEL may contact me about my enquiry”) and the privacy notice, in line with India's Digital Personal Data Protection Act, 2023.
- Agree a retention period with SAEL, for example deleting closed leads after a set number of months, and write it in the privacy notice.
- The service-account key and Resend API key live only in the host's secret settings.

## Performance

The goal is to pass Google's Core Web Vitals on a mid-range Android phone over 4G, because that is how most SAEL customers will arrive. The budgets below are targets the build is tested against.

| Measure | Target | How it's checked |
| --- | --- | --- |
| Largest Contentful Paint (main image or headline shown) | 2.5 s or less | Lighthouse in CI, then real-user data from the host's analytics |
| Interaction to Next Paint (response to a tap) | 200 ms or less | Same |
| Cumulative Layout Shift (page jumping while loading) | 0.1 or less | Same |
| JavaScript on the home page | Under 100 KB compressed | Build-size check in CI |
| Lighthouse performance score, mobile | 90 or higher | Lighthouse CI on every pull request |

**Images and video**

- Astro's image pipeline turns the upscaled JPEGs into AVIF and WebP at several widths, with `srcset` and `sizes`. The current 18 MB image folder shrinks a lot.
- The first hero image loads with `fetchpriority="high"` and is preloaded. Every other image is lazy-loaded with fixed width and height, so nothing jumps.
- The background video loads only when the contact section is near, starts with its poster image, and is paused when reduced motion is on.

**Code and fonts**

- Islands hydrate only when visible or when the browser is idle. The chat code downloads only when someone opens the chat.
- GSAP and Lenis are bundled, tree-shaken and loaded only on the home page. Animations use `transform` and `opacity` only.
- Fonts are self-hosted through Astro's Fonts API: only the weights in use, subset to Latin, `font-display: swap`, with the main font preloaded.
- CSS is scoped per component and inlined where small. No unused framework CSS.

**Delivery**

- Every page is pre-built HTML on a global CDN, with long cache lifetimes on hashed assets.
- Brotli compression, HTTP/2 or HTTP/3, and a CDN edge close to Indian users.

## Content updates after handover

SAEL staff update the site through a CMS (content management system): a web page with forms, not code. Pages CMS is recommended. It's free, edits save straight into the GitHub repository, and editors join by email invite without needing a GitHub account. Each save rebuilds the live site automatically within a few minutes.

**How an edit reaches the live site**

1. A SAEL editor logs in to Pages CMS and opens, for example, “Blog” or “Settings”.
2. They edit a form (title, text, photo) and click Save.
3. Pages CMS saves the change as a commit in the GitHub repository.
4. The host sees the commit, runs the build with all its checks, and publishes the new version.
5. If a change breaks the build, for example a missing required field, the live site stays on the last good version. The editor sees the error.

**What SAEL can edit without a developer**

- Blog articles: write, add a cover photo, publish or keep as draft.
- Projects, FAQs, gallery photos and audience tabs.
- Headlines and short texts for each home-page section.
- Phone numbers, WhatsApp number, emails and office addresses: changed once, updated everywhere.
- Subsidy rates and state top-ups.
- Chat assistant answers.

Layout, new sections, animations and the form's logic stay with the developer.

**CMS options compared**

| CMS | How editors log in | Content stored | Cost (as listed in mid-2026) | Fit for SAEL |
| --- | --- | --- | --- | --- |
| **Pages CMS (recommended)** | Email invite; no other account needed | In the GitHub repo | Free, open source | Simple forms, media manager, no server code. Works with GitHub only. |
| TinaCMS | Tina Cloud account | In the Git repo | Free for 2 users; Team $24/month for 3 | Best if SAEL wants to edit on a visual preview of the page. |
| Keystatic | GitHub, or Keystatic Cloud | In the repo | Free; Cloud free up to 3 users | Good Astro fit, but its admin page needs a server route. |
| Decap CMS | GitHub sign-in | In the repo | Free, open source | Editors need GitHub accounts; sign-in setup is fiddly. |
| Sanity | Sanity account | Sanity's cloud, not Git | Free up to 20 seats; Growth $15 per seat per month | Most powerful, but content leaves the repo and the site needs a rebuild webhook. |

**Handover checklist**

- [ ] Move the GitHub repository into an account owned by SAEL or Hiranmaye, with you kept as a collaborator.
- [ ] Invite SAEL's editors to Pages CMS by email.
- [ ] Record a 10-minute screen video and write a one-page guide: how to add a blog post, change a phone number, swap a photo.
- [ ] Hand over a credentials sheet through a password manager, never by chat or email.
- [ ] Agree what happens after launch: a free bug-fix period, then a monthly maintenance plan or per-change quotes for anything outside content editing.

## Build phases

The work runs in this order. Each step ends with a preview link and passing checks. The dates follow the client-facing plan, with the production build from 16 to 28 November 2026.

1. **Set-up.** Astro 7 + TypeScript project, ESLint, Prettier, Husky, Vitest, Playwright, GitHub Actions, host connected with preview links.
2. **Foundations.** Design tokens, fonts, `BaseLayout`, header, menu, footer, mobile action bar, `settings.json`.
3. **Content model.** Zod schemas and content files for settings, projects, FAQs, subsidy rules, chat intents and blog posts. Move v5 text into them.
4. **Logic and unit tests.** `subsidy.ts`, chat matcher, lead validation, each written with its Vitest tests.
5. **Static sections.** Hero, Compare, Process, Why SAEL, Engineering, Projects, Audience, FAQs, Day/night, built as components from the v5 markup.
6. **Islands.** Subsidy calculator, system finder, gallery and viewer, chat assistant.
7. **Motion.** GSAP, ScrollTrigger and Lenis in one module, with a reduced-motion path.
8. **Blog.** Listing page with filters, article template, RSS feed, share images.
9. **Enquiries.** Endpoint with validation, Turnstile and rate limiting; Google Sheet store; Resend email alert with retry; consent and privacy notice.
10. **Pages CMS.** `.pages.yml` for every collection, test edits by a non-developer, editor guide.
11. **Hardening.** Security headers and CSP, images to AVIF/WebP, end-to-end, accessibility and Lighthouse checks, SEO (titles, sitemap, structured data for the local business), redirects from old URLs.
12. **Launch and handover.** Analytics, Search Console, handover checklist above. Hosting and domain set-up to be planned separately.

## Sources

- [Astro 6.0 release summary](https://alternativeto.net/news/2026/3/astro-6-0-brings-new-astro-dev-built-in-fonts-api-live-content-collections-and-csp-api): Fonts API, CSP API, Node 22 requirement.
- [Pages CMS](https://pagescms.org): free, email invites, GitHub-only.
- [Best headless CMS for Astro in 2026](https://www.bitdoze.com/md/best-headless-cms-for-astro.md) (Bitdoze, July 2026, updated September): TinaCMS, Keystatic, Decap and Sanity details and pricing.

* [Resend pricing](https://resend.com/pricing): free plan 3,000 emails a month, 100 a day.
* [Zoho CRM free edition](https://www.zoho.com/crm/lp/zoho-crm-free.html): 3 users, 1 web form per module, 10 workflow rules.
* [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/): free plan 100,000 rows written a day, 5 GB.
