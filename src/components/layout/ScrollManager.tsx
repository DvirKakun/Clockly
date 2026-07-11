import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Resets the window to the top on every route change. Single-page navigation doesn't reset scroll
 * the way a full document load does, so without this you land on the next page at the *previous*
 * page's scroll offset — e.g. opening a shift while scrolled down the list drops you into the
 * middle of the form. We deliberately always go to the top (rather than restoring the previous
 * position on Back) for a predictable, native-feeling tab app.
 */
export function ScrollManager() {
  const { pathname } = useLocation();

  // Stop the browser from restoring its own remembered scroll on Back/Forward, which would
  // otherwise briefly fight the reset below.
  useLayoutEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  }, []);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
