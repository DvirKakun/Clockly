/** Maps common Supabase Auth error messages to friendly Hebrew copy. Falls back to the raw message. */
export function translateAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('invalid login credentials')) return 'אימייל או סיסמה שגויים';
  if (lower.includes('email not confirmed')) return 'האימייל טרם אומת. בדוק/י את תיבת הדואר שלך';
  if (lower.includes('user already registered') || lower.includes('already registered'))
    return 'קיים כבר חשבון עם האימייל הזה';
  if (lower.includes('password should be at least')) return 'הסיסמה קצרה מדי';
  if (lower.includes('rate limit')) return 'יותר מדי ניסיונות. נסה/י שוב בעוד כמה דקות';
  if (lower.includes('invalid email')) return 'כתובת אימייל לא תקינה';
  if (lower.includes('network')) return 'בעיית רשת. בדוק/י את החיבור לאינטרנט ונסה/י שוב';

  return message;
}
