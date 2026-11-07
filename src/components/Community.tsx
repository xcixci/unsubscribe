import { siteConfig, supportConfigured } from '../config/site';
import { Icon } from './Icon';
import { assetUrl } from '../data/catalogue';

/** "Stay in the loop" — links to the founder's Google Form. Renders nothing until a form URL is configured. */
export function StayInLoop({ variant = 'band' }: { variant?: 'band' | 'panel' }) {
  const form = siteConfig.googleFormUrl;
  const wa = siteConfig.whatsappUrl;
  if (!form && !wa) return null;
  return (
    <section className={variant === 'band' ? 'loop-band' : 'panel'} aria-labelledby="loop-title">
      <div className={variant === 'band' ? 'container loop-band__inner' : undefined}>
        <div>
          <h2 id="loop-title">Stay in the loop.</h2>
          <p>Get occasional updates, useful subscription deals and money-saving ideas. No spam.</p>
        </div>
        <div className="loop-band__actions">
          {form && (
            <a className="btn btn--accent" href={form} target="_blank" rel="noopener noreferrer">
              Sign up with Google Forms
            </a>
          )}
          {wa && (
            <a className="btn btn--ghost" href={wa} target="_blank" rel="noopener noreferrer">
              Join the WhatsApp community
            </a>
          )}
          <p className="small muted">
            {form ? 'Opens a Google Form. You can unsubscribe at any time. ' : ''}
            {wa ? 'WhatsApp shows your number to the community admins.' : ''}
          </p>
        </div>
      </div>
    </section>
  );
}

export function SupportOptions() {
  const s = siteConfig.support;
  if (!supportConfigured()) {
    return (
      <div className="notice">
        <Icon name="info" />
        <span>Support options are coming soon. For now, the best support is telling a friend about UNSUBSCRIBE.</span>
      </div>
    );
  }
  return (
    <div className="support-options">
      {s.upiLink && (
        <div className="panel">
          <h3>Pay by UPI</h3>
          <p className="muted">
            UPI ID <strong className="num">{s.upiId}</strong>
            {s.payeeName ? ` (${s.payeeName})` : ''}
          </p>
          <a className="btn" href={s.upiLink}>
            Open my UPI app
          </a>
          <p className="small muted">Works on phones with a UPI app. One-off payments only — there are no recurring donations.</p>
        </div>
      )}
      {s.qrImage && (
        <div className="panel">
          <h3>Scan to pay</h3>
          <img
            src={s.qrImage.local ? assetUrl(s.qrImage.src) : s.qrImage.src}
            alt={`UPI QR code${s.payeeName ? ` for ${s.payeeName}` : ''}`}
            width={180}
            height={180}
            style={{ borderRadius: 12, background: '#fff' }}
          />
        </div>
      )}
      {s.paymentUrl && (
        <div className="panel">
          <h3>Pay online</h3>
          <a className="btn" href={s.paymentUrl} target="_blank" rel="noopener noreferrer">
            Go to the payment page
          </a>
        </div>
      )}
    </div>
  );
}
