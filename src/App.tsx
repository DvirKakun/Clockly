import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthListener } from '@/hooks/useAuthListener';
import { useAuthStore } from '@/store/authStore';
import { SplashScreen } from '@/components/layout/SplashScreen';
import { ProtectedLayout } from '@/routes/ProtectedLayout';

const AuthPage = lazy(() => import('@/routes/auth/AuthPage').then((m) => ({ default: m.AuthPage })));
const DashboardPage = lazy(() => import('@/routes/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ShiftsPage = lazy(() => import('@/routes/shifts/ShiftsPage').then((m) => ({ default: m.ShiftsPage })));
const ShiftFormPage = lazy(() => import('@/routes/shifts/ShiftFormPage').then((m) => ({ default: m.ShiftFormPage })));
const WorkplacesPage = lazy(() => import('@/routes/workplaces/WorkplacesPage').then((m) => ({ default: m.WorkplacesPage })));
const SettingsPage = lazy(() => import('@/routes/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));

function LoginRoute() {
  const session = useAuthStore((s) => s.session);
  if (session) return <Navigate to="/" replace />;
  return <AuthPage />;
}

export default function App() {
  useAuthListener();
  const isInitializing = useAuthStore((s) => s.isInitializing);

  if (isInitializing) return <SplashScreen />;

  return (
    <Suspense fallback={<SplashScreen />}>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/shifts" element={<ShiftsPage />} />
          <Route path="/shifts/new" element={<ShiftFormPage />} />
          <Route path="/shifts/:id/edit" element={<ShiftFormPage />} />
          <Route path="/workplaces" element={<WorkplacesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
