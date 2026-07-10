import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { translateAuthError } from '@/lib/auth/authErrors';
import { isPasswordValid } from '@/lib/auth/passwordRules';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordGuidelines } from '@/components/auth/PasswordGuidelines';
import { AuthLayout } from './AuthLayout';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // supabase-js parses the recovery link's token from the URL and establishes
    // a session automatically (detectSessionInUrl). Wait for that before allowing submit.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const passwordsMatch = confirmPassword.length === 0 || password === confirmPassword;
  const passwordValid = isPasswordValid(password);
  const canSubmit = passwordValid && password === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError(null);
    if (!canSubmit) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? translateAuthError(err.message) : 'משהו השתבש, נסה/י שוב');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <AuthLayout title="הסיסמה עודכנה">
        <div className="rounded-2xl bg-green-50 p-4 text-center text-sm text-green-700 dark:bg-green-500/10 dark:text-green-300">
          הסיסמה שלך עודכנה בהצלחה.
        </div>
        <Button fullWidth className="mt-4" onClick={() => navigate('/', { replace: true })}>
          כניסה לאפליקציה
        </Button>
      </AuthLayout>
    );
  }

  if (!ready) {
    return (
      <AuthLayout title="שחזור סיסמה">
        <p className="text-center text-sm text-black/50 dark:text-white/50">מאמת קישור...</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="בחירת סיסמה חדשה">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Input
            label="סיסמה חדשה"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            dir="ltr"
          />
          <PasswordGuidelines password={password} />
        </div>

        <Input
          label="אימות סיסמה"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          dir="ltr"
          error={touched && !passwordsMatch ? 'הסיסמאות אינן תואמות' : undefined}
        />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button type="submit" fullWidth disabled={loading}>
          {loading ? 'רגע...' : 'עדכון סיסמה'}
        </Button>
      </form>
    </AuthLayout>
  );
}
