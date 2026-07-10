import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { translateAuthError } from '@/lib/auth/authErrors';
import { isPasswordValid } from '@/lib/auth/passwordRules';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { PasswordGuidelines } from '@/components/auth/PasswordGuidelines';
import { AuthLayout } from './AuthLayout';

export function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const emailsMatch = confirmEmail.length === 0 || email.trim().toLowerCase() === confirmEmail.trim().toLowerCase();
  const passwordsMatch = confirmPassword.length === 0 || password === confirmPassword;
  const passwordValid = isPasswordValid(password);

  const canSubmit = useMemo(
    () =>
      fullName.trim().length > 0 &&
      email.trim().length > 0 &&
      email.trim().toLowerCase() === confirmEmail.trim().toLowerCase() &&
      passwordValid &&
      password === confirmPassword,
    [fullName, email, confirmEmail, passwordValid, password, confirmPassword]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError(null);
    if (!canSubmit) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
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
      <AuthLayout compact title="נרשמת בהצלחה">
        <div className="rounded-2xl bg-brand-50 p-4 text-center text-sm text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
          נשלח מייל אימות לכתובת {email}. אשר/י אותו כדי להתחבר.
        </div>
        <Button fullWidth className="mt-4" onClick={() => navigate('/login', { state: { direction: -1 } })}>
          חזרה להתחברות
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout compact title="יצירת חשבון">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <Input label="שם מלא" required value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />

        <Input
          label="אימייל"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          dir="ltr"
        />
        <Input
          label="אימות אימייל"
          type="email"
          required
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
          onPaste={(e) => e.preventDefault()}
          autoComplete="off"
          dir="ltr"
          error={touched && !emailsMatch ? 'כתובות האימייל אינן תואמות' : undefined}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="סיסמה"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            dir="ltr"
          />
          <Input
            label="אימות סיסמה"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            dir="ltr"
            error={touched && !passwordsMatch ? 'לא תואם' : undefined}
          />
        </div>
        <PasswordGuidelines password={password} />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button type="submit" fullWidth disabled={loading}>
          {loading ? 'רגע...' : 'הרשמה'}
        </Button>
      </form>

      <div className="my-2.5 flex items-center gap-3">
        <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
        <span className="text-xs text-black/40 dark:text-white/40">או</span>
        <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
      </div>

      <GoogleButton label="הרשמה עם Google" />

      <button
        type="button"
        onClick={() => navigate('/login', { state: { direction: -1 } })}
        className="mt-3 w-full text-center text-sm text-brand-500"
      >
        כבר יש לך חשבון? התחברות
      </button>
    </AuthLayout>
  );
}
