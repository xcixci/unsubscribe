# Testing

## Automated

```bash
npm test          # vitest, 66 tests, ~2 s
npm run build     # also validates the catalogue and typechecks
```

The deploy workflow runs both on every push; a failure stops the deploy.

| File | Covers |
|---|---|
| `tests/billing.test.ts` | Monthly/quarterly/half-yearly/annual/custom conversions, 28- and 84-day packs, five-year projection, paise precision, invalid amounts, cycle validation and labels |
| `tests/dates.test.ts` | ISO validation, month-end clamping, leap years, rolling past renewal dates forward without drift |
| `tests/spending.test.ts` | Totals from the user's amounts, cancelled excluded, "considering" reported, category shares sum to 100%, custom subscriptions |
| `tests/recommendations.test.ts` | Ranking, honest savings, cheaper tiers flagged, student and shared plans, legacy-price warning, expired offers hidden, bundles never savings |
| `tests/ics.test.ts` | Event dates for each offset, recurrence rules for every cycle, alarms, CRLF, escaping, line folding with multi-byte characters, Google Calendar link |
| `tests/storage.test.ts` | Save/load/clear, unreadable data kept, import validation, sensitive-text stripping, merge by id |
| `tests/catalogue.test.ts` | The shipped catalogue builds cleanly, covers all 14 categories, verified plans have price/source/date, templates build, broken references/prices/columns/dates are rejected, website-as-logo refused, private columns dropped, 84-day cycles |
| `tests/config.test.ts` | Ships with every founder feature off; Form/WhatsApp host checks; UPI link needs a valid ID and payee name |

## Manual checklist before a release

Browser end-to-end checks were run against the production build at 1280 px and 390 px (all passed at launch):

- Quick check: tapping services updates the total; "Save these to my list" adds them and opens My subscriptions
- Add from the picker: choosing a plan pre-fills the listed price; your own amount and cycle are saved; live monthly/yearly preview is right
- Validation: empty custom form, non-numeric amount, card numbers in notes are all rejected with clear messages
- Custom 84-day subscription is annualised by days
- Dashboard totals match the maths; marking "Considering cancelling" shows the potential saving
- Remove shows Undo, and Undo restores the item
- Renewal reminder downloads an `.ics` with the chosen offsets and the right recurrence
- Data survives a reload
- Export → Delete all → Import restores everything; importing a foreign file is refused; merging the same backup doesn't duplicate
- Explore search, category filter, price sort, no-results state
- Service deep links work; unknown services show a helpful page
- Mobile menu navigates
- Catalogue failure shows an error with "Try again"
- Broken logos fall back to initials

Also check after deploying: open the live site on a phone, add a subscription, reload, and download a reminder.
