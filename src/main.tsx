import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { GearFilters } from './components/GearFilters';
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GearFilters />
    <App />
  </StrictMode>,
);

// Work offline and install like an app (production builds only).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then(() => navigator.serviceWorker.ready)
      .then(async () => {
        // The first visit loaded the app before the service worker started,
        // so save those files now so the next visit works offline too.
        const files = performance
          .getEntriesByType('resource')
          .map((e) => e.name)
          .filter((url) => new URL(url).origin === location.origin);
        const cache = await caches.open('math-facts-v1');
        await cache.addAll([location.href.split('#')[0], ...files]);
      })
      .catch(() => {
        // No offline support in this browser: the app still works online.
      });
  });
}
