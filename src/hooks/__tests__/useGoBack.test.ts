import { describe, expect, it } from 'vitest';
import { isDeepLink } from '../useGoBack';

/**
 * Regression cover for a bug found by the E2E suite: the shift form's back arrow used a bare
 * navigate(-1), so opening /shifts/:id/edit directly and pressing Back left the app entirely
 * instead of returning to the shift.
 */
describe('isDeepLink', () => {
  it("treats React Router's first-entry key as a deep link", () => {
    expect(isDeepLink('default')).toBe(true);
  });

  it('treats a generated key as ordinary in-app history', () => {
    expect(isDeepLink('ab12cd')).toBe(false);
  });

  it('treats a missing key as a deep link, so Back errs toward a known route', () => {
    // Safer default: sending the user to a real screen beats ejecting them from the app.
    expect(isDeepLink(undefined)).toBe(true);
  });
});
