import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { translateAuthError } from '@/lib/auth/authErrors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { AuthLayout } from './AuthLayout';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setShowResend(false);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) setShowResend(true);
        throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? translateAuthError(err.message) : 'משהו השתבש, נסה/י שוב');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setLoading(true);
    try {
      await supabase.auth.resend({ type: 'signup', email });
      setResendSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="התחברות">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="אימייל" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" dir="ltr" />
        <Input
          label="סיסמה"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          dir="ltr"
        />

        <Link to="/forgot-password" className="-mt-2 self-start text-xs text-brand-500">
          שכחת סיסמה?
        </Link>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {showResend &&
          (resendSent ? (
            <p className="text-sm text-green-600 dark:text-green-400">נשלח מייל אימות חדש</p>
          ) : (
            <button type="button" onClick={handleResend} className="text-sm text-brand-500">
              שלח/י שוב מייל אימות
            </button>
          ))}

        <Button type="submit" fullWidth disabled={loading}>
          {loading ? 'רגע...' : 'התחברות'}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
        <span className="text-xs text-black/40 dark:text-white/40">או</span>
        <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
      </div>

      <GoogleButton label="התחברות עם Google" />

      <button
        type="button"
        onClick={() => navigate('/signup', { state: { direction: 1 } })}
        className="mt-6 w-full text-center text-sm text-brand-500"
      >
        עוד אין לך חשבון? הרשמה
      </button>
    </AuthLayout>
  );
}
