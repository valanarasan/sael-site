# SAEL Energy website

Production build of the SAEL Energy Solution LLP website, in Astro 7 + TypeScript.
The approved design is `reference/v5/` (read-only). Project rules: `CLAUDE.md`. Plans: `docs/`. Editing content after handover: `docs/editor-guide.md`.

## Setup

Requires Node 22.23 or newer (`.nvmrc` pins 24).

```bash
npm install
npx playwright install chromium   # once, for end-to-end tests
cp .env.example .env              # only needed for the enquiry form (step 9)
```

## Commands

| Command                 | What it does                                         |
| ----------------------- | ---------------------------------------------------- |
| `npm run dev`           | Local dev server at http://localhost:4321            |
| `npm run build`         | Production build into `dist/` (runs content schemas) |
| `npm run preview`       | Serve the production build                           |
| `npm run check`         | `astro check` + `tsc`                                |
| `npm run lint`          | ESLint + Prettier check (`npm run format` to fix)    |
| `npm test`              | Vitest unit and component tests                      |
| `npm run test:e2e`      | Playwright at 1440 and 390 widths, with axe checks   |
| `npm run test:coverage` | Vitest with coverage (`src/lib` must stay ≥ 90%)     |

Before calling a step done: `npm run check && npm run lint && npm test`.

A pre-commit hook (Husky + lint-staged) lints and formats staged files.
CI (`.github/workflows/ci.yml`) runs audit, check, lint, coverage, build and Playwright on every pull request.
