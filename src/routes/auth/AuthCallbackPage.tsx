import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { AuthLayout } from './AuthLayout';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, '?') || window.location.search);
    const errorDescription = params.get('error_description');
    if (errorDescription) {
      setError(decodeURIComponent(errorDescription.replace(/\+/g, ' ')));
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') navigate('/', { replace: true });
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setError(error.message);
      } else if (data.session) {
        navigate('/', { replace: true });
      }
    });

    const timeout = setTimeout(() => {
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session) setError('לא הצלחנו לאמת את ההתחברות. נסה/י שוב.');
      });
    }, 6000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  if (error) {
    return (
      <AuthLayout title="ההתחברות נכשלה">
        <p className="text-center text-sm text-red-500">{error}</p>
        <Button fullWidth className="mt-4" onClick={() => navigate('/login', { replace: true })}>
          חזרה להתחברות
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="מתחברים...">
      <p className="text-center text-sm text-black/50 dark:text-white/50">רגע, משלימים את ההתחברות</p>
    </AuthLayout>
  );
}
