import { describe, expect, it } from 'vitest';
import { translateAuthError } from '../authErrors';

describe('translateAuthError', () => {
  it('translates known Supabase error messages to Hebrew', () => {
    expect(translateAuthError('Invalid login credentials')).toBe('אימייל או סיסמה שגויים');
    expect(translateAuthError('Email not confirmed')).toBe('האימייל טרם אומת. בדוק/י את תיבת הדואר שלך');
    expect(translateAuthError('User already registered')).toBe('קיים כבר חשבון עם האימייל הזה');
  });

  it('translates opaque server-error markers instead of showing them raw', () => {
    // Reproduces a live incident: a failed confirmation-email send (bad SMTP config) surfaced
    // to the client as a bare "{}" instead of readable text.
    expect(translateAuthError('{}')).toBe('משהו השתבש, נסה/י שוב');
    expect(translateAuthError('{ }')).toBe('משהו השתבש, נסה/י שוב');
    expect(translateAuthError('')).toBe('משהו השתבש, נסה/י שוב');
  });

  it('translates "error sending" style messages', () => {
    expect(translateAuthError('Error sending confirmation email')).toBe('שליחת המייל נכשלה. נסה/י שוב מאוחר יותר');
  });

  it('falls back to the raw message when it is readable but unrecognized', () => {
    expect(translateAuthError('Some new Supabase error text')).toBe('Some new Supabase error text');
  });
});
