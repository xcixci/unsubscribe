# UNSUBSCRIBE.

**Your money deserves better.**

UNSUBSCRIBE is an India-first subscription intelligence platform. People pick the subscriptions they pay for, enter what they really pay, and see their monthly, yearly and five-year spend — then find cheaper ways to pay, offers and telecom bundles, each with its source.

- **Live site:** https://xcixci.github.io/unsubscribe/
- **No login, no backend, no tracking.** Personal data stays in the visitor's browser.

---

## What's in this release

| Area | What it does |
|---|---|
| Home | Headline, two calls to action, a live "Quick check" tally of popular services, the three-step explainer and the privacy promise. |
| Explore | Searchable, filterable, sortable catalogue of 29 Indian digital subscriptions in 14 categories. Each service has a detail page with every plan: listed price, cycle, monthly and annual equivalents, features, official plan page, price source and last-verified date. |
| My subscriptions | Add catalogue or custom subscriptions, choose a plan, enter the actual amount, billing cycle (monthly, quarterly, half-yearly, annual, or custom days/months such as 84-day packs), next renewal, payment method, notes and status (wanted / considering cancelling / cancelled). Totals per month, per year and over five years; spending by category; renewals in the next 30 days; per-subscription "ways to pay less". Export, import (merge or replace) and delete all data. |
| Deals & offers | Personal suggestions, "same plan, billed less often" savings computed from listed prices, offers with the four verification labels, student/two-person/family plans. |
| Bundles | Telecom and broadband bundles with what's included, a like-for-like standalone comparison where the exact plans are known, and an explicit warning that combined value is not a saving. |
| Reminders | Downloadable `.ics` calendar reminders (7, 3 or 1 day before, or on the day), repeating every billing cycle, plus an "Add to Google Calendar" link. The calendar app sends the alert. |
| About & support | How data is stored, privacy, how prices are checked, disclaimers, support options and community links (all configurable). |

## Tech stack, and why

- **React 18 + TypeScript + Vite.** Static output, fast builds, strict types for the money maths.
- **Plain CSS with design tokens** (`src/styles/tokens.css`). No UI framework: the brand needs custom typography and layout, and the CSS is about 9 KB gzipped.
- **No chart library.** Spending charts are ranked HTML bars (one hue, every figure also printed as text, keyboard and hover tooltips).
- **Hash routing** (`#/explore`). GitHub Pages can't rewrite unknown paths to `index.html`, so hash URLs keep every shared link working.
- **Self-hosted fonts** (Space Grotesk, Inter via `@fontsource`) and **build-time cached logos**: visitors' browsers never contact Google Fonts or the services' sites.
- **GitHub Actions → GitHub Pages.** Free hosting; every push to `main` tests, builds and deploys.

## Quick start

```bash
npm ci
npm run dev          # http://localhost:5173/unsubscribe/
npm test             # 66 unit tests
npm run build        # validates the catalogue, typechecks, builds to dist/
npm run preview      # serve the production build
```

Node 20 or newer.

| Script | Does |
|---|---|
| `npm run catalogue` | Validates `catalogue/csv/*.csv` and writes `public/data/catalogue.json`. Fails on any error. |
| `npm run catalogue:fetch` | Downloads the published Google Sheet tabs into `catalogue/csv/` (only if the whole sheet validates). |
| `npm run logos` | Downloads each service's `logo_url` into `public/logos/` (run in CI before building). |
| `npm test` | Unit tests for billing maths, dates, totals, recommendations, calendar files, storage/import, catalogue validation and config. |

## Project structure

```
src/
  domain/        Pure logic: billing maths, dates, money formatting, spending summary,
                 recommendations, offers, calendar (.ics) generation. No React.
  storage/       SubscriptionRepository interface, localStorage implementation, import validation.
  state/         React providers: catalogue, personal subscriptions, toasts.
  data/          Catalogue loader.
  config/        site.config.json (founder settings) and its validator.
  components/    UI building blocks (forms, sheets, badges, charts, brand).
  pages/         Home, Explore, ServiceDetail, Mine, Deals, Bundles, About, NotFound.
  styles/        Tokens, base, layout, components, pages.
catalogue/
  csv/           The catalogue as four CSVs (mirror of the Google Sheet). Source of truth in git.
  templates/     Blank CSV templates with the required headers.
  UNSUBSCRIBE_Catalogue.xlsx   Google Sheets-compatible workbook of the same data.
scripts/         build-catalogue, fetch-sheet, cache-logos (+ lib/catalogue-core).
brand/           Brand Asset Pack v1.0 (originals) and the brand board reference.
public/          Static files: favicons, manifest, outlined brand SVGs, generated catalogue JSON.
tests/           Vitest unit tests.
docs/            Catalogue workflow, configuration, architecture, testing.
.github/workflows/
  deploy.yml           Test, build and deploy to GitHub Pages on every push to main.
  sync-catalogue.yml   Pull the Google Sheet, validate, commit and redeploy (manual button).
```

## Updating the catalogue

The master catalogue is the Google Sheet **UNSUBSCRIBE master catalogue** (in the founder's Drive). The pipeline is:

```
Google Sheet ──publish CSV──▶ GitHub Action "Sync catalogue" ──validate──▶ catalogue/csv ──▶ catalogue.json ──▶ GitHub Pages
```

Full instructions, column reference and the verification policy: **[docs/catalogue.md](docs/catalogue.md)**.

## Configuration (Google Form, WhatsApp, UPI)

Everything a founder supplies lives in [`src/config/site.config.json`](src/config/site.config.json). Empty values hide the feature — the site never shows a button that goes nowhere. See **[docs/configuration.md](docs/configuration.md)**.

## Deployment

1. Repository **Settings → Pages → Source: GitHub Actions** (one-time).
2. Push to `main`. The **Deploy to GitHub Pages** workflow runs tests, caches logos, builds and publishes.
3. For a custom domain later, add it in Settings → Pages and build with `BASE_PATH=/` (set it as an env var in `deploy.yml`).

## Privacy and security

- No accounts, cookies, analytics, ad pixels or third-party requests while browsing.
- Personal data is stored only in `localStorage` (`unsubscribe:v1:personal-data`) and never transmitted.
- The app never asks for bank logins, card numbers, CVVs, OTPs, UPI PINs or statements, and rejects notes that look like card or account numbers.
- No secrets in the repo. The only external fetches happen at build time in GitHub Actions (published sheet CSVs and logos).

## Brand

Brand Asset Pack v1.0 is in [`brand/asset-pack-v1.0`](brand/asset-pack-v1.0). The website uses vector-outlined versions of the primary wordmark and the U-and-dot icon (`public/brand/`, `src/components/brand/`), fitted to the pack's PNGs so they render identically everywhere. The strike-through mark is campaign-only and not used in the product. Colours: Ink `#111111`, Paper `#F5F2EB`, Alert `#F04438`, Accent `#D7FF35`. Type: Space Grotesk (headlines, figures), Inter (interface).

## Future expansion (not in this release)

Accounts and cloud sync, statement upload and recurring-payment detection, UPI AutoPay guidance, renewal notifications, AI-assisted analysis and cancellation help. The code is prepared: personal data goes through the `SubscriptionRepository` interface, and domain logic is framework-free. See [docs/architecture.md](docs/architecture.md).

---

Not affiliated with any service listed. Names and logos belong to their owners and are shown only to identify the service. Information, not financial advice.
