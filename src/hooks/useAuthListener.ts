import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';

export function useAuthListener() {
  const setSession = useAuthStore((s) => s.setSession);
  const setInitializing = useAuthStore((s) => s.setInitializing);

  useEffect(() => {
    // getSession() resolves near-instantly from local storage, which made the splash
    // screen flash for a single frame. A short minimum hold makes it actually
    // perceptible, like a native app's launch screen.
    const minDelay = new Promise((resolve) => setTimeout(resolve, 500));

    Promise.all([supabase.auth.getSession(), minDelay]).then(([{ data }]) => {
      setSession(data.session);
      setInitializing(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.subscription.unsubscribe();
  }, [setSession, setInitializing]);
}
