import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCatalogue } from '../state/CatalogueContext';
import { useSubscriptions } from '../state/SubscriptionsContext';
import { useToast } from '../state/ToastContext';
import { annualEquivalent, cycleSuffix, monthlyEquivalent } from '../domain/billing';
import { inr, inrPrice } from '../domain/money';
import type { Plan } from '../domain/types';
import { Logo } from '../components/Logo';
import { Icon } from '../components/Icon';
import { StayInLoop } from '../components/Community';

/** Common plans for the homepage quick check. Missing or unpriced plans are skipped. */
const QUICK_PLANS = [
  'netflix-standard',
  'prime-annual',
  'jiohotstar-super-monthly',
  'yt-individual',
  'spotify-standard',
  'chatgpt-plus',
  'icloud-50gb',
  'google-one-basic-monthly',
];

export function Home() {
  return (
    <>
      <Hero />
      <section className="container steps" aria-labelledby="how-title">
        <h2 id="how-title" className="steps__title">
          How it works
        </h2>
        <ol className="steps__list">
          <li>
            <span className="steps__n num" aria-hidden="true">
              1
            </span>
            <h3>Select your subscriptions.</h3>
            <p>Pick from Indian services or add your own. Enter what you really pay — older prices, offers and family plans included.</p>
          </li>
          <li>
            <span className="steps__n num" aria-hidden="true">
              2
            </span>
            <h3>See what you’re spending.</h3>
            <p>Monthly, yearly and five-year totals, by category. Annual and 84-day plans are converted properly, not guessed.</p>
          </li>
          <li>
            <span className="steps__n num" aria-hidden="true">
              3
            </span>
            <h3>Discover opportunities to save.</h3>
            <p>Cheaper billing for the same plan, student and family plans, offers and telecom bundles — each with its source.</p>
          </li>
        </ol>
      </section>
      <Promise />
      <StayInLoop />
    </>
  );
}

function Hero() {
  const navigate = useNavigate();
  const { index } = useCatalogue();
  const { add } = useSubscriptions();
  const { notify } = useToast();
  const plans = useMemo(
    () => QUICK_PLANS.map((id) => index.plans.get(id)).filter((p): p is Plan => !!p && p.price !== null && p.status === 'active'),
    [index],
  );
  const [picked, setPicked] = useState<string[]>([]);
  const selected = plans.filter((p) => picked.includes(p.id));
  const monthly = selected.reduce((t, p) => t + monthlyEquivalent(p.price!, p.billing), 0);
  const annual = selected.reduce((t, p) => t + annualEquivalent(p.price!, p.billing), 0);

  async function saveAll() {
    for (const p of selected) {
      await add({ serviceId: p.serviceId, planId: p.id, amount: p.price!, currency: 'INR', billing: p.billing, status: 'active' });
    }
    notify(`Added ${selected.length} to your list. Check each amount matches what you pay.`);
    navigate('/mine');
  }

  return (
    <section className="hero on-ink" aria-labelledby="hero-title">
      <div className="container hero__inner">
        <div className="hero__copy">
          <h1 id="hero-title" className="hero__title">
            Your money deserves better<span className="dot">.</span>
          </h1>
          <p className="hero__lede">Find out what your subscriptions cost, discover better deals and stop paying for things you don’t need.</p>
          <div className="hero__ctas">
            <Link to="/mine?add=1" className="btn btn--accent">
              Find my subscriptions
            </Link>
            <Link to="/explore" className="btn btn--on-ink">
              Explore subscriptions
            </Link>
          </div>
          <p className="hero__note">
            <Icon name="lock" />
            No sign-up. No bank details. Your list stays in this browser.
          </p>
        </div>

        {plans.length > 0 && (
          <div className="quick" aria-labelledby="quick-title">
            <div className="quick__head">
              <h2 id="quick-title">Quick check</h2>
              <p>Tap what you pay for.</p>
            </div>
            <div className="quick__grid">
              {plans.map((p) => {
                const s = index.services.get(p.serviceId)!;
                const on = picked.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    className="quick__item"
                    aria-pressed={on}
                    onClick={() => setPicked((x) => (on ? x.filter((i) => i !== p.id) : [...x, p.id]))}
                  >
                    <Logo name={s.name} src={s.logo} size="sm" />
                    <span className="quick__name">
                      {s.name}
                      <small title={p.name}>
                        <span className="visually-hidden">{p.name}, </span>
                        {inrPrice(p.price!)}
                        {cycleSuffix(p.billing)}
                      </small>
                    </span>
                    <span className="quick__tick" aria-hidden="true">
                      {on && <Icon name="check" />}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="quick__total" aria-live="polite">
              <div>
                <span className="quick__label">That’s about</span>
                <span className="quick__value num">{inr(monthly)}</span>
                <span className="quick__label">a month, or {inr(annual)} a year.</span>
              </div>
              <button type="button" className="btn btn--accent btn--small" disabled={!selected.length} onClick={saveAll}>
                Save these to my list
              </button>
            </div>
            <p className="quick__fine">Estimate from listed prices, most still awaiting verification. You can enter your real amounts next.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function Promise() {
  const { catalogue } = useCatalogue();
  const verified = catalogue.plans.filter((p) => p.verification === 'verified').length;
  const priced = catalogue.plans.filter((p) => p.price !== null).length;
  return (
    <section className="container promise" aria-labelledby="promise-title">
      <div className="promise__card">
        <h2 id="promise-title">Built to be trusted with your money questions.</h2>
        <ul className="promise__list">
          <li>
            <strong>Nothing to sign up for.</strong> Your list is saved in this browser only. Export it any time, or delete it with one click.
          </li>
          <li>
            <strong>No bank details, ever.</strong> We never ask for card numbers, OTPs, UPI PINs or statements.
          </li>
          <li>
            <strong>No tracking.</strong> No analytics, no ad pixels, no cookies. Service logos load from our own site.
          </li>
          <li>
            <strong>Every price has a source.</strong> {catalogue.services.length} services and {priced} listed prices, each linked to where it came from.{' '}
            {verified} are verified on the official page so far; the rest are clearly marked.
          </li>
        </ul>
        <div className="promise__links">
          <Link to="/deals" className="btn btn--ghost">
            See deals & offers
          </Link>
          <Link to="/about" className="link-btn">
            How we check prices
          </Link>
        </div>
      </div>
    </section>
  );
}
