import { describe, expect, it } from 'vitest';
import { evaluatePasswordRules, isPasswordValid } from '../passwordRules';

describe('isPasswordValid', () => {
  it('rejects a password missing every rule', () => {
    expect(isPasswordValid('abc')).toBe(false);
  });

  it('rejects a password missing an uppercase letter', () => {
    expect(isPasswordValid('lowercase1')).toBe(false);
  });

  it('rejects a password missing a number', () => {
    expect(isPasswordValid('NoNumbersHere')).toBe(false);
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(isPasswordValid('Aa1')).toBe(false);
  });

  it('accepts a password satisfying every rule', () => {
    expect(isPasswordValid('Str0ngPass')).toBe(true);
  });
});

describe('evaluatePasswordRules', () => {
  it('reports per-rule status for a partially valid password', () => {
    const result = evaluatePasswordRules('lowercase1');
    expect(result.find((r) => r.id === 'length')?.met).toBe(true);
    expect(result.find((r) => r.id === 'uppercase')?.met).toBe(false);
    expect(result.find((r) => r.id === 'number')?.met).toBe(true);
  });
});
