import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { translateAuthError } from '@/lib/auth/authErrors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthLayout } from './AuthLayout';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? translateAuthError(err.message) : 'משהו השתבש, נסה/י שוב');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout title="בדוק/י את המייל">
        <div className="rounded-2xl bg-brand-50 p-4 text-center text-sm text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
          אם קיים חשבון עם הכתובת {email}, נשלח אליו קישור לאיפוס סיסמה.
        </div>
        <Button fullWidth className="mt-4" onClick={() => navigate('/login', { state: { direction: -1 } })}>
          חזרה להתחברות
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="שחזור סיסמה" subtitle="נשלח לך קישור לאיפוס הסיסמה באימייל">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="אימייל" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" dir="ltr" />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button type="submit" fullWidth disabled={loading}>
          {loading ? 'רגע...' : 'שליחת קישור לאיפוס'}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => navigate('/login', { state: { direction: -1 } })}
        className="mt-6 w-full text-center text-sm text-brand-500"
      >
        חזרה להתחברות
      </button>
    </AuthLayout>
  );
}
