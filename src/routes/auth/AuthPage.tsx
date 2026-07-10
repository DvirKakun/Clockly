import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        setSignupSuccess(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'משהו השתבש, נסה שוב');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex min-h-full flex-1 flex-col justify-center px-6"
      style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-500 to-accent-cyan text-white shadow-lg shadow-brand-500/30">
            <Clock size={30} />
          </div>
          <h1 className="text-2xl font-bold">Clockly</h1>
          <p className="text-center text-sm text-black/50 dark:text-white/50">
            מעקב שעות עבודה וחישוב שכר לפי דיני העבודה בישראל
          </p>
        </div>

        {signupSuccess ? (
          <div className="rounded-2xl bg-brand-50 p-4 text-center text-sm text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
            נשלח מייל אימות לכתובת שלך. אשר/י אותו כדי להתחבר.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <AnimatePresence initial={false}>
              {mode === 'signup' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <Input
                    label="שם מלא"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                  />
                </motion.div>
              )}
            </AnimatePresence>

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
              label="סיסמה"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              dir="ltr"
            />

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" fullWidth disabled={loading}>
              {loading ? 'רגע...' : mode === 'login' ? 'התחברות' : 'הרשמה'}
            </Button>
          </form>
        )}

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError(null);
            setSignupSuccess(false);
          }}
          className="mt-6 w-full text-center text-sm text-brand-500"
        >
          {mode === 'login' ? 'עוד אין לך חשבון? הרשמה' : 'כבר יש לך חשבון? התחברות'}
        </button>
      </div>
    </div>
  );
}
