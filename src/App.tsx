import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { isUnauthorized } from '@/api/client';
import { FullPageLoader } from '@/components/FullPageLoader';
import { Layout } from '@/components/Layout';
import { ToastProvider, toast } from '@/components/ui/Toast';
import { AuthProvider, signOutLocal, useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useThemeSync } from '@/lib/theme';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { ResultsPage } from '@/pages/ResultsPage';
import { RunPage } from '@/pages/RunPage';
import { ScenariosPage } from '@/pages/ScenariosPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { TestDetailPage } from '@/pages/TestDetailPage';

let signingOut = false;

/** The API client already tried a token refresh; a second "unauthorized" ends the session. */
async function endExpiredSession() {
  if (signingOut) return;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  signingOut = true;
  toast.error('Your session has expired. Please sign in again.');
  await signOutLocal();
  signingOut = false;
}

function handleError(error: unknown) {
  if (isUnauthorized(error)) {
    void endExpiredSession();
    return;
  }
  toast.error(error instanceof Error ? error.message : 'Something went wrong');
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleError }),
  mutationCache: new MutationCache({ onError: handleError }),
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: (count, error) => !isUnauthorized(error) && count < 1,
    },
  },
});

/** Holds rendering until the stored session is known, so the login screen never flashes. */
function AuthGate({ children }: { children: ReactNode }) {
  const { loading } = useAuth();
  return loading ? <FullPageLoader /> : children;
}

/** If a reset link landed on another URL (e.g. the Site URL), send the user to the reset form. */
function RecoveryRedirect() {
  const { recovery } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (recovery && location.pathname !== '/reset-password') {
      navigate('/reset-password', { replace: true });
    }
  }, [recovery, location.pathname, navigate]);
  return null;
}

function RequireAuth() {
  const { session } = useAuth();
  const location = useLocation();
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function App() {
  useThemeSync();
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <AuthGate>
              <RecoveryRedirect />
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route element={<RequireAuth />}>
                  <Route element={<Layout />}>
                    <Route index element={<Navigate to="/run" replace />} />
                    <Route path="/run" element={<RunPage />} />
                    <Route path="/tests" element={<ResultsPage />} />
                    <Route path="/tests/:id" element={<TestDetailPage />} />
                    <Route path="/scenarios" element={<ScenariosPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                </Route>
              </Routes>
            </AuthGate>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
