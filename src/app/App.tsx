import { HashRouter, Route, Routes } from 'react-router-dom';
import { CatalogueProvider } from '../state/CatalogueContext';
import { SubscriptionsProvider } from '../state/SubscriptionsContext';
import { ToastProvider } from '../state/ToastContext';
import { Layout } from '../components/Layout';
import { CatalogueGate } from '../components/CatalogueGate';
import { Home } from '../pages/Home';
import { Explore } from '../pages/Explore';
import { ServiceDetail } from '../pages/ServiceDetail';
import { Mine } from '../pages/Mine';
import { Deals } from '../pages/Deals';
import { Bundles } from '../pages/Bundles';
import { About } from '../pages/About';
import { NotFound } from '../pages/NotFound';
import { useDocumentTitle } from './useDocumentTitle';

/**
 * Hash routing (#/explore) keeps every deep link working on GitHub Pages,
 * which can't rewrite unknown paths to index.html.
 */
export function App() {
  return (
    <ToastProvider>
      <CatalogueProvider>
        <SubscriptionsProvider>
          <HashRouter>
            <TitleSync />
            <Layout>
              <CatalogueGate>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/explore/:serviceId" element={<ServiceDetail />} />
                  <Route path="/mine" element={<Mine />} />
                  <Route path="/deals" element={<Deals />} />
                  <Route path="/bundles" element={<Bundles />} />
                  <Route path="/about" element={<About />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </CatalogueGate>
            </Layout>
          </HashRouter>
        </SubscriptionsProvider>
      </CatalogueProvider>
    </ToastProvider>
  );
}

function TitleSync() {
  useDocumentTitle();
  return null;
}
