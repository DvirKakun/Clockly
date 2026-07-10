import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import './store/themeStore'; // module-scope side effect applies the `.dark` class before first paint — must load eagerly, not only when SettingsPage lazy-chunk loads
import App from './App.tsx';

// registerType: 'autoUpdate' only installs the new service worker in the background —
// without this, an already-open tab keeps being served by the OLD worker (and its
// cached assets) until the tab is closed and reopened. onNeedRefresh reloading
// ensures new deploys (icons, code, etc.) actually reach users who kept a tab open.
registerSW({
  immediate: true,
  onNeedRefresh() {
    window.location.reload();
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
