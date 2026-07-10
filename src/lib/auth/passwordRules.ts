export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: 'לפחות 8 תווים', test: (p) => p.length >= 8 },
  { id: 'lowercase', label: 'אות קטנה (a-z)', test: (p) => /[a-z]/.test(p) },
  { id: 'uppercase', label: 'אות גדולה (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { id: 'number', label: 'ספרה אחת לפחות', test: (p) => /[0-9]/.test(p) },
];

export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

export function evaluatePasswordRules(password: string): { id: string; label: string; met: boolean }[] {
  return PASSWORD_RULES.map((rule) => ({ id: rule.id, label: rule.label, met: rule.test(password) }));
}
