import { describe, expect, it } from 'vitest';
import { formValueToNumber, numberToFormValue } from '../formNumber';

describe('numberToFormValue', () => {
  it('renders zero as an empty field so the placeholder shows instead of a literal 0', () => {
    expect(numberToFormValue(0)).toBe('');
  });

  it('keeps a real value visible', () => {
    expect(numberToFormValue(150)).toBe('150');
    expect(numberToFormValue(22.6)).toBe('22.6');
  });

  it('keeps negative values (the form does not validate sign)', () => {
    expect(numberToFormValue(-5)).toBe('-5');
  });

  it('treats a missing value as empty', () => {
    expect(numberToFormValue(null)).toBe('');
    expect(numberToFormValue(undefined)).toBe('');
  });

  it('never renders NaN or Infinity into the field', () => {
    expect(numberToFormValue(NaN)).toBe('');
    expect(numberToFormValue(Infinity)).toBe('');
  });
});

describe('formValueToNumber', () => {
  it('reads an empty field as zero, so clearing a field is safe', () => {
    expect(formValueToNumber('')).toBe(0);
    expect(formValueToNumber('   ')).toBe(0);
  });

  it('reads a typed value back', () => {
    expect(formValueToNumber('150')).toBe(150);
    expect(formValueToNumber('22.6')).toBe(22.6);
    expect(formValueToNumber('0.5')).toBe(0.5);
  });

  it('reads an explicit zero as zero', () => {
    expect(formValueToNumber('0')).toBe(0);
  });

  it('reads unparseable input as zero rather than NaN', () => {
    expect(formValueToNumber('abc')).toBe(0);
    expect(formValueToNumber('12abc')).toBe(0);
  });

  it('round-trips a value through the form and back', () => {
    for (const value of [0, 1, 150, 22.6, -5]) {
      expect(formValueToNumber(numberToFormValue(value))).toBe(value);
    }
  });
});
