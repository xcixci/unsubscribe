# The catalogue: adding and updating subscriptions

The website reads one static file, `public/data/catalogue.json`. It is generated from four CSV files in `catalogue/csv/`, which mirror the four data tabs of the master Google Sheet. The public website never queries the sheet.

```
Google Sheet (SERVICES, PLANS, OFFERS, BUNDLES)
   │  File → Share → Publish to web → CSV, one link per tab
   ▼
GitHub Action "Sync catalogue from Google Sheets"   (Actions tab → Run workflow)
   │  scripts/fetch-sheet.mjs downloads the 4 CSVs
   │  scripts/lib/catalogue-core.mjs validates every row
   │  nothing changes if there is a single error
   ▼
catalogue/csv/*.csv  →  public/data/catalogue.json   (committed to git)
   ▼
Deploy workflow → GitHub Pages
```

## Connect the Google Sheet (one-time)

The master sheet is **UNSUBSCRIBE master catalogue** in the founder's Google Drive. It already holds the launch catalogue.

1. Open the sheet → **File → Share → Publish to web**.
2. Under **Link**, choose the **SERVICES** tab and **Comma-separated values (.csv)**. Click **Publish** and copy the link.
3. Repeat for **PLANS**, **OFFERS** and **BUNDLES** (four links in total). Leave README unpublished.
4. In GitHub: **Settings → Secrets and variables → Actions → Variables → New repository variable**. Add:

   | Name | Value |
   |---|---|
   | `SHEET_SERVICES_CSV_URL` | the SERVICES link |
   | `SHEET_PLANS_CSV_URL` | the PLANS link |
   | `SHEET_OFFERS_CSV_URL` | the OFFERS link |
   | `SHEET_BUNDLES_CSV_URL` | the BUNDLES link |

5. **Actions → Sync catalogue from Google Sheets → Run workflow.** If the sheet changed, it commits the new CSVs and JSON and redeploys the site (about 2 minutes).

Publishing to the web makes those four tabs readable by anyone with the link. That's fine because everything in them is shown on the public website anyway — but never put private information in the data tabs.

To sync automatically every Monday, uncomment the `schedule` block in `.github/workflows/sync-catalogue.yml`.

**Without the sheet:** edit `catalogue/csv/*.csv` directly on GitHub (or in a spreadsheet app and export CSV), commit, and the deploy workflow validates and publishes. `catalogue/UNSUBSCRIBE_Catalogue.xlsx` is a Google Sheets-compatible copy for setting up a new sheet.

## Columns

Required columns are in **bold**. Dates are always `YYYY-MM-DD`. Lists inside a cell use `|`. IDs use lowercase letters, numbers and hyphens and must never change once published (people's saved lists refer to them).

### SERVICES

| Column | Notes |
|---|---|
| **service_id** | e.g. `netflix`. Unique. |
| **service_name** | Display name. |
| **category** | One of `ott, music, ai, productivity, design, developer, cloud, gaming, education, news, fitness, shopping, food, travel, finance, social, security, other`. |
| **description** | One sentence, plain words. |
| **website_url** | Official site. |
| **logo_url** | A direct image URL (PNG/JPG/SVG/ICO). Never the website URL — the build rejects that. The launch catalogue uses Google's favicon service (`https://www.google.com/s2/favicons?domain=…&sz=128`); replace with official logo files when you have them. |
| **country** | `IN`. |
| **status** | `active` or `inactive` (inactive services are hidden). |
| **last_updated** | Date the row was last edited. |
| notes | Shown on the service page. |

### PLANS

| Column | Notes |
|---|---|
| **plan_id**, **service_id**, **plan_name** | `service_id` must exist in SERVICES. |
| **price** | Rupees, e.g. `649` or `638.38`. `0` for something free to join (shown as "Free"). **Blank if there is no reliable rupee price** (e.g. billed in USD, or set per user and city). |
| **currency** | `INR` (only INR is supported in this release). |
| **billing_frequency** | `monthly, quarterly, half_yearly, annual, custom`. |
| **billing_period_months** | 1, 3, 6 or 12 (must match the frequency). For `custom` by months, the number of months. |
| billing_period_days | For `custom` by days, e.g. `28` or `84` for telecom packs. |
| **plan_url** | Official plan or pricing page. |
| **features** | `1 device|Ad-free|HD`. |
| **last_verified** | Date you checked the official page. Blank if not verified. |
| **price_source_url** | Where the price came from. Required whenever there is a price. |
| **status** | `active` / `inactive`. |
| verification_status | `verified` or `awaiting_verification` (default). |
| plan_group | Same product on different billing cycles shares a group (e.g. `jiohotstar-super` for monthly, quarterly and annual Super). Powers "same plan, billed less often". |
| plan_type | `individual, family, duo, student, mobile`. Powers student and family suggestions. |
| notes | Shown under the plan. |

### OFFERS

| Column | Notes |
|---|---|
| **offer_id**, **service_id**, **offer_title**, **offer_description** | |
| **original_price**, **offer_price** | Rupees. `offer_price` 0 means free. |
| **currency** | `INR`. |
| billing_frequency, billing_period_months, billing_period_days | The cycle the prices refer to (needed to compare with what people pay). |
| **offer_url** | Official offer page. |
| **eligibility** | Who qualifies, in plain words. |
| **valid_from**, **valid_until** | Dates, or blank. Past `valid_until` → automatically shown as **Expired**. |
| **source_url** | Required. |
| **last_verified** | Date checked on the official page. |
| **verification_status** | `verified`, `eligibility_needs_confirmation`, `expired`, `awaiting_verification`. |

### BUNDLES

| Column | Notes |
|---|---|
| **bundle_id**, **provider**, **bundle_name**, **description** | |
| **included_service_ids** | `netflix|amazon-prime|jiohotstar`. Must exist. |
| included_plan_ids | The exact plans included, if stated (e.g. `netflix-basic`). Enables the like-for-like comparison. Each must belong to an included service. |
| **price**, **currency**, **billing_frequency** | Use `custom` + `billing_period_days` = 84 for 84-day packs. |
| billing_period_months, billing_period_days | |
| **eligibility**, **offer_url**, **source_url**, **last_verified**, **status** | |
| verification_status, notes | e.g. "Telecom prices are usually shown before 18% GST." |

## Verification policy

The site's credibility depends on this. Please keep to it.

- **Verified** = you opened the provider's own page **from India** and saw that exact rupee price today. Set `verification_status = verified` and `last_verified` to that date.
- **Awaiting verification** = from a news, comparison or coupon site. Keep the `price_source_url` so visitors can judge it.
- **Never** fill a price from memory or convert from US dollars. Blank is honest.
- Re-check prices at least monthly. Indian prices change often (Spotify India changed three times between August 2025 and May 2026).

At launch (7 Nov 2026): 29 services, 98 plans (74 priced, 10 verified on official pages — Netflix and Adobe), 8 offers and 6 bundles. The fastest way to raise trust is to verify the most popular plans first: JioHotstar, Amazon Prime, YouTube Premium, Spotify, ChatGPT, Google One/AI.

## What the validator checks

Run locally with `npm run catalogue`. Errors stop the build and name the row:

- Missing required columns, duplicate or badly formed IDs
- `service_id` / included IDs that don't exist; included plans from services not in the bundle
- Prices that aren't non-negative numbers; non-INR currencies
- Unknown categories, frequencies, statuses or verification labels
- `billing_period_months` that contradicts the frequency; custom cycles without a period
- Invalid URLs; dates not in `YYYY-MM-DD`; `last_verified` in the future; `valid_until` before `valid_from`
- Verified plans without a price or date; prices without a source

Warnings (don't stop the build): a logo URL equal to the website URL, missing logos, services without plans, and extra columns (ignored and **not published**).

## Logos

`scripts/cache-logos.mjs` runs in the deploy workflow. It downloads each `logo_url` once, checks it is a real image under 300 KB (SVGs with scripts are rejected), and saves it to `public/logos/`. The site only ever loads logos from its own domain. If a logo is missing or fails, the site shows the service's initials.
