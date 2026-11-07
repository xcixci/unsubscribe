import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { siteConfig } from '../config/site';
import { useCatalogue } from '../state/CatalogueContext';
import { OfferBadge, VerificationBadge } from '../components/Badges';
import { StayInLoop, SupportOptions } from '../components/Community';

export function About() {
  const { catalogue } = useCatalogue();
  const { hash } = useLocation();
  const verified = catalogue.plans.filter((p) => p.verification === 'verified').length;
  const priced = catalogue.plans.filter((p) => p.price !== null).length;

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <div className="container page prose-page">
      <header className="page-head">
        <h1>
          About & support<span className="dot">.</span>
        </h1>
        <p>UNSUBSCRIBE helps people in India see what their digital subscriptions really cost and find better ways to pay — without handing over any personal data.</p>
      </header>

      <div className="prose-grid">
        <section aria-labelledby="a-what">
          <h2 id="a-what">What this is</h2>
          <p>
            A free, independent tool. Pick the subscriptions you pay for, enter what you actually pay, and see your monthly, yearly and five-year totals.
            Then compare plans, offers and bundles. This first release is deliberately simple: no accounts, no bank connections, no notifications.
          </p>
        </section>

        <section aria-labelledby="a-data">
          <h2 id="a-data">Where your data lives</h2>
          <ul className="plain-list">
            <li>Your list is stored in this browser’s local storage on this device. It is never sent to us or to anyone else.</li>
            <li>It doesn’t sync between devices or browsers. Use “Export backup” on My subscriptions to move it, and “Import backup” to restore it.</li>
            <li>Clearing your browser’s site data, or using a private window, deletes it. Export a backup if it matters to you.</li>
            <li>You can delete everything at any time with “Delete all data”.</li>
          </ul>
        </section>

        <section aria-labelledby="a-privacy">
          <h2 id="a-privacy">Privacy and security</h2>
          <ul className="plain-list">
            <li>We never ask for bank logins, card numbers, CVVs, OTPs, UPI PINs or bank statements. If a site claiming to be us does, it isn’t us.</li>
            <li>No analytics, advertising pixels or tracking cookies. Fonts and service logos are served from this site, so your browser doesn’t contact other companies while you browse.</li>
            <li>Links to official websites, Google Calendar, Google Forms or WhatsApp only open when you choose them. Those services have their own privacy policies.</li>
            <li>The notes field rejects anything that looks like a card or account number.</li>
          </ul>
        </section>

        <section aria-labelledby="a-prices">
          <h2 id="a-prices">How prices are checked</h2>
          <p>
            Prices change often in India — some services changed three times in a year. Every listed price links to its source, and each one carries a label:
          </p>
          <dl className="legend legend--stack">
            <div>
              <dt>
                <VerificationBadge status="verified" />
              </dt>
              <dd>Confirmed on the provider’s official page on the date shown.</dd>
            </div>
            <div>
              <dt>
                <VerificationBadge status="awaiting_verification" />
              </dt>
              <dd>Reported by a news or comparison site. Probably right, not yet confirmed.</dd>
            </div>
            <div>
              <dt>
                <OfferBadge status="eligibility_needs_confirmation" />
              </dt>
              <dd>A real offer that only some people qualify for.</dd>
            </div>
            <div>
              <dt>
                <OfferBadge status="expired" />
              </dt>
              <dd>Past its end date.</dd>
            </div>
          </dl>
          <p>
            Right now the catalogue has {catalogue.services.length} services and {priced} listed prices, of which {verified} are verified. Where no reliable
            rupee price exists — for example services that bill in US dollars, or memberships priced per user and city — we leave the price blank rather
            than guess. Your own amount is always what we use for your totals.
          </p>
          <p>
            Recommendations are ranked by value to you, never by commission. UNSUBSCRIBE earns nothing from any service listed and uses no affiliate links.
          </p>
        </section>

        <section aria-labelledby="a-notes">
          <h2 id="a-notes">Good to know</h2>
          <ul className="plain-list">
            <li>All figures are estimates in Indian rupees. Monthly equivalents spread longer plans evenly; 28- and 84-day packs are annualised by days.</li>
            <li>Listed prices usually include GST for apps and streaming services. Telecom plans are often shown before 18% GST.</li>
            <li>UNSUBSCRIBE isn’t affiliated with any service listed. Names and logos belong to their owners and are shown only to identify the service.</li>
            <li>This is information, not financial advice. Check the official page before you buy, switch or cancel.</li>
          </ul>
        </section>

        <section aria-labelledby="support-title" id="support">
          <h2 id="support-title">Support UNSUBSCRIBE</h2>
          <p>Enjoying UNSUBSCRIBE? Help us keep it independent, useful and free.</p>
          <SupportOptions />
        </section>

        <section aria-labelledby="a-community">
          <h2 id="a-community">Updates and community</h2>
          {siteConfig.googleFormUrl || siteConfig.whatsappUrl ? (
            <StayInLoop variant="panel" />
          ) : (
            <p className="muted">Email updates and a WhatsApp community are coming soon.</p>
          )}
          {siteConfig.contactEmail && (
            <p style={{ marginTop: 'var(--s-3)' }}>
              Spotted a wrong price or a missing service? Email <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>.
            </p>
          )}
        </section>
      </div>

      <p style={{ marginTop: 'var(--s-7)' }}>
        <Link to="/mine?add=1" className="btn">
          Find my subscriptions
        </Link>
      </p>
    </div>
  );
}
