import { Check, X } from 'lucide-react';
import { evaluatePasswordRules } from '@/lib/auth/passwordRules';

export function PasswordGuidelines({ password }: { password: string }) {
  const rules = evaluatePasswordRules(password);

  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 py-1">
      {rules.map((rule) => (
        <li
          key={rule.id}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            rule.met ? 'text-green-600 dark:text-green-400' : 'text-black/40 dark:text-white/40'
          }`}
        >
          {rule.met ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={2.5} />}
          {rule.label}
        </li>
      ))}
    </ul>
  );
}
