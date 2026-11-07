import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useCatalogueState } from '../state/CatalogueContext';

const TITLES: Record<string, string> = {
  '/': 'UNSUBSCRIBE. Your money deserves better.',
  '/explore': 'Explore subscriptions — UNSUBSCRIBE',
  '/mine': 'My subscriptions — UNSUBSCRIBE',
  '/deals': 'Deals & offers — UNSUBSCRIBE',
  '/bundles': 'Bundles — UNSUBSCRIBE',
  '/about': 'About & support — UNSUBSCRIBE',
};

export function useDocumentTitle() {
  const { pathname } = useLocation();
  const { state } = useCatalogueState();
  useEffect(() => {
    let title = TITLES[pathname];
    const m = /^\/explore\/([^/]+)$/.exec(pathname);
    if (m && state.status === 'ready') {
      const s = state.index.services.get(m[1]);
      if (s) title = `${s.name} plans and prices — UNSUBSCRIBE`;
    }
    document.title = title ?? 'Not found — UNSUBSCRIBE';
  }, [pathname, state]);
}
