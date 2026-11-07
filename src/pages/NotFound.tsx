import { Link } from 'react-router-dom';

export function NotFound({ what = 'There’s nothing at this address.' }: { what?: string }) {
  return (
    <div className="container page">
      <div className="state">
        <h1>
          Page not found<span className="dot">.</span>
        </h1>
        <p>{what} Your saved subscriptions are unaffected.</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/explore" className="btn">
            Explore subscriptions
          </Link>
          <Link to="/" className="btn btn--ghost">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
