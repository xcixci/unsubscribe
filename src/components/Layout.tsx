import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Wordmark } from './brand/Brand';
import { Icon } from './Icon';
import { useSubscriptions } from '../state/SubscriptionsContext';
import { useCatalogueState } from '../state/CatalogueContext';
import { formatDate } from '../domain/dates';
import { supportConfigured } from '../config/site';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/explore', label: 'Explore' },
  { to: '/mine', label: 'My subscriptions' },
  { to: '/deals', label: 'Deals & offers' },
  { to: '/bundles', label: 'Bundles' },
  { to: '/about', label: 'About & support' },
];

export function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { subscriptions } = useSubscriptions();
  const count = subscriptions.filter((s) => s.status !== 'cancelled').length;

  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          // Hash routing owns the URL fragment, so move focus instead of navigating.
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <div className="container site-header__inner">
          <Link to="/" className="site-header__brand" aria-label="UNSUBSCRIBE home">
            <Wordmark />
          </Link>
          <button type="button" className="menu-toggle" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen((o) => !o)}>
            <Icon name={open ? 'x' : 'menu'} className="" />
            Menu
          </button>
          <nav id="site-nav" className="site-nav" data-open={open} aria-label="Main">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={n.to === '/mine' ? 'site-nav__mine' : undefined}>
                {n.label}
                {n.to === '/mine' && count > 0 && (
                  <span className="site-nav__count" aria-label={`${count} tracked`}>
                    {count}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </>
  );
}

function Footer() {
  const { state } = useCatalogueState();
  const updated = state.status === 'ready' ? state.catalogue.generatedAt.slice(0, 10) : null;
  return (
    <footer className="site-footer on-ink">
      <div className="container site-footer__inner">
        <div className="site-footer__brand">
          <Wordmark />
          <p className="site-footer__tagline">Your money deserves better.</p>
        </div>
        <div>
          <h2>Use UNSUBSCRIBE</h2>
          <ul>
            {NAV.slice(1).map((n) => (
              <li key={n.to}>
                <Link to={n.to}>{n.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="site-footer__support">
          <h2>Support UNSUBSCRIBE</h2>
          <p>Enjoying UNSUBSCRIBE? Help us keep it independent, useful and free.</p>
          {supportConfigured() ? (
            <Link className="btn btn--on-ink btn--small" to="/about#support">
              Ways to support
            </Link>
          ) : (
            <span className="badge badge--neutral" style={{ background: 'var(--ink-raised)', color: 'var(--on-ink-2)' }}>
              Support options coming soon
            </span>
          )}
        </div>
      </div>
      <div className="container site-footer__legal">
        <span>
          No login, no tracking. Your list stays in your browser. Not affiliated with any service listed. Prices can change; always check the official page.
        </span>
        {updated && <span>Catalogue updated {formatDate(updated)}</span>}
      </div>
    </footer>
  );
}
