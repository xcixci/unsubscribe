import raw from './site.config.json';

/**
 * Founder-supplied settings, validated once at start-up.
 * Anything missing or malformed is treated as "not configured" and its UI stays hidden —
 * the site never shows a button that goes nowhere.
 */

function httpsUrl(v: unknown, hosts?: string[]): string | null {
  if (typeof v !== 'string' || !v.trim()) return null;
  try {
    const u = new URL(v.trim());
    if (u.protocol !== 'https:') return null;
    if (hosts && !hosts.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`))) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** A same-site image path such as "support/upi-qr.png" (file placed in public/support/). */
function localImage(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim().replace(/^\//, '');
  return /^[a-z0-9/_-]+\.(png|jpe?g|webp|svg)$/i.test(t) && !t.includes('..') ? t : null;
}

const UPI = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,64}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function readConfig(input: typeof raw) {
  const upiId = typeof input.support?.upiId === 'string' && UPI.test(input.support.upiId.trim()) ? input.support.upiId.trim() : null;
  const payeeName = typeof input.support?.payeeName === 'string' && input.support.payeeName.trim() ? input.support.payeeName.trim().slice(0, 60) : null;
  return {
    siteUrl: httpsUrl(input.siteUrl) ?? 'https://xcixci.github.io/unsubscribe/',
    googleFormUrl: httpsUrl(input.newsletter?.googleFormUrl, ['docs.google.com', 'forms.gle']),
    whatsappUrl: httpsUrl(input.whatsapp?.communityInviteUrl, ['chat.whatsapp.com', 'whatsapp.com']),
    support: {
      upiId,
      payeeName,
      /** A UPI deep link needs both a valid UPI ID and a payee name. */
      upiLink: upiId && payeeName ? `upi://pay?${new URLSearchParams({ pa: upiId, pn: payeeName, cu: 'INR' }).toString()}` : null,
      paymentUrl: httpsUrl(input.support?.paymentUrl),
      /** Either a same-site path (recommended, no third-party request) or an https URL. */
      qrImage: localImage(input.support?.qrImageUrl)
        ? { local: true, src: localImage(input.support?.qrImageUrl)! }
        : httpsUrl(input.support?.qrImageUrl)
          ? { local: false, src: httpsUrl(input.support?.qrImageUrl)! }
          : null,
    },
    contactEmail: typeof input.contact?.email === 'string' && EMAIL.test(input.contact.email.trim()) ? input.contact.email.trim() : null,
  };
}

export const siteConfig = readConfig(raw);

export const supportConfigured = (c = siteConfig) => !!(c.support.upiLink || c.support.paymentUrl || c.support.qrImage);
