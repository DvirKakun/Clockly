import { Check, X } from 'lucide-react';
import { evaluatePasswordRules } from '@/lib/auth/passwordRules';

export function PasswordGuidelines({ password }: { password: string }) {
  const rules = evaluatePasswordRules(password);

  return (
    <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5">
      {rules.map((rule) => (
        <li
          key={rule.id}
          className={`flex items-center gap-1 text-[11px] leading-tight transition-colors ${
            rule.met ? 'text-green-600 dark:text-green-400' : 'text-black/40 dark:text-white/40'
          }`}
        >
          {rule.met ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={2.5} />}
          {rule.label}
        </li>
      ))}
    </ul>
  );
}
