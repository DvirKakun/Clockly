/**
 * Bridges between a numeric model value and the string a numeric `<input>` holds.
 *
 * The rule that matters: **zero is represented as an empty field**, not as a literal `"0"`.
 * A field pre-filled with `0` forces the user to select and delete it before typing — on the
 * shift form's additions fields that is an extra gesture on every shift, and a slip leaves
 * values like `050`. An empty field with a `0` placeholder reads the same and types cleanly.
 *
 * Parsing is deliberately total: an empty or unparseable field is `0`, never `NaN`, so clearing
 * a field is a safe action rather than a way to poison a calculation.
 */

/** Model number → form string. Zero (and null/undefined/non-finite) become `''`. */
export function numberToFormValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value === 0) return '';
  return String(value);
}

/** Form string → model number. Empty or unparseable input is `0`. */
export function formValueToNumber(value: string): number {
  const trimmed = value.trim();
  if (trimmed === '') return 0;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
}
