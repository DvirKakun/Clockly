import { Navigate, Outlet } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { AppShell } from '@/components/layout/AppShell';

export function ProtectedLayout() {
  const session = useAuthStore((s) => s.session);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const location = useLocation();

  if (isInitializing) return null;
  if (!session) return <Navigate to="/login" replace />;

  return (
    <AppShell>
      <AnimatePresence mode="wait" initial={false}>
        <div key={location.pathname}>
          <Outlet />
        </div>
      </AnimatePresence>
    </AppShell>
  );
}
