# Configuration: email sign-up, WhatsApp, donations

All founder settings are in [`src/config/site.config.json`](../src/config/site.config.json). Edit it on GitHub (pencil icon → commit to `main`); the site redeploys in about two minutes.

**Every value ships empty, and an empty or invalid value hides that feature.** Nothing is invented and no button goes nowhere. Values are validated in `src/config/site.ts` (tested in `tests/config.test.ts`).

```json
{
  "siteUrl": "https://xcixci.github.io/unsubscribe/",
  "newsletter": { "googleFormUrl": "" },
  "whatsapp":   { "communityInviteUrl": "" },
  "support":    { "upiId": "", "payeeName": "", "paymentUrl": "", "qrImageUrl": "" },
  "contact":    { "email": "" }
}
```

## Stay in the loop (Google Form)

1. Create a Google Form titled "UNSUBSCRIBE updates" with:
   1. **Email address** — Short answer, *required*, response validation: Text → Email.
   2. **What would you like to hear about?** — Checkboxes, optional: Product updates · Deals and bundles · New features · Money-saving tips.
   3. **Consent** — Checkboxes, *required*, one option, not pre-ticked: "I agree to receive occasional emails from UNSUBSCRIBE. I understand I can unsubscribe at any time."
   - Settings → Responses: don't collect email addresses automatically (question 1 does it), and leave "Limit to 1 response" off so people don't need a Google sign-in.
   - Don't ask for phone numbers.
2. Click **Send → link** and copy it (`https://docs.google.com/forms/d/e/…/viewform` or `https://forms.gle/…`).
3. Put it in `newsletter.googleFormUrl`.

Only `docs.google.com` and `forms.gle` links are accepted. When set, a "Stay in the loop" band appears on the home page and the About page, opening the form in a new tab. Responses land in the form's own Google Sheet; UNSUBSCRIBE never sees or stores them.

## WhatsApp community

Create the community, copy the invite link (`https://chat.whatsapp.com/…`) into `whatsapp.communityInviteUrl`. Only `chat.whatsapp.com` / `whatsapp.com` links are accepted. The site shows a "Join the WhatsApp community" button with a note that admins can see members' numbers. No numbers are collected and no messages are sent by UNSUBSCRIBE.

## Support UNSUBSCRIBE (donations)

The footer always shows "Support UNSUBSCRIBE" with the line *Enjoying UNSUBSCRIBE? Help us keep it independent, useful and free.* Until something is configured it says "Support options coming soon".

| Field | Example | Shows |
|---|---|---|
| `upiId` + `payeeName` | `yourname@okhdfcbank`, `Arinjay Business Systems` | "Open my UPI app" button (`upi://pay?pa=…&pn=…&cu=INR`). **Both** are needed. |
| `qrImageUrl` | `support/upi-qr.png` | A QR code. Put the image in `public/support/upi-qr.png` (recommended: served from our own site), or use a full `https://` URL. |
| `paymentUrl` | `https://rzp.io/l/…` | "Go to the payment page" button (Razorpay, Instamojo, etc.). |

One-off payments only; there are no recurring donations and no pop-ups. Check the UPI ID by paying ₹1 to it before publishing.

## Contact email

`contact.email` adds "Spotted a wrong price or a missing service? Email …" to the About page.

## Custom domain

1. Settings → Pages → Custom domain (and add the DNS records GitHub shows).
2. In `.github/workflows/deploy.yml`, add `env: BASE_PATH: /` to the Build step.
3. Update `siteUrl` in `site.config.json`.
