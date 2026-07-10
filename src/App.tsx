import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthListener } from '@/hooks/useAuthListener';
import { useAuthStore } from '@/store/authStore';
import { SplashScreen } from '@/components/layout/SplashScreen';
import { ProtectedLayout } from '@/routes/ProtectedLayout';

const LoginPage = lazy(() => import('@/routes/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('@/routes/auth/SignupPage').then((m) => ({ default: m.SignupPage })));
const ForgotPasswordPage = lazy(() =>
  import('@/routes/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage }))
);
const ResetPasswordPage = lazy(() =>
  import('@/routes/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage }))
);
const AuthCallbackPage = lazy(() =>
  import('@/routes/auth/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage }))
);
const DashboardPage = lazy(() => import('@/routes/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ShiftsPage = lazy(() => import('@/routes/shifts/ShiftsPage').then((m) => ({ default: m.ShiftsPage })));
const ShiftFormPage = lazy(() => import('@/routes/shifts/ShiftFormPage').then((m) => ({ default: m.ShiftFormPage })));
const WorkplacesPage = lazy(() => import('@/routes/workplaces/WorkplacesPage').then((m) => ({ default: m.WorkplacesPage })));
const SettingsPage = lazy(() => import('@/routes/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((s) => s.session);
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  useAuthListener();
  const isInitializing = useAuthStore((s) => s.isInitializing);

  if (isInitializing) return <SplashScreen />;

  return (
    <Suspense fallback={<SplashScreen />}>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicOnlyRoute>
              <SignupPage />
            </PublicOnlyRoute>
          }
        />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
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
