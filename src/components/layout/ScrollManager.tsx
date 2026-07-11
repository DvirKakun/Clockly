import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Native-app scroll behaviour for single-page navigation, which otherwise leaves you at the
 * previous page's scroll offset (opening a shift while scrolled down would drop you mid-form):
 *
 *  - Forward navigation (PUSH/REPLACE — tapping a shift, switching tabs) starts at the top.
 *  - Back/forward (POP) restores the exact position you left that page at, so returning to a
 *    long list keeps your place.
 *
 * React Router's built-in <ScrollRestoration> only works with the data router; this is the
 * hand-rolled equivalent for the classic <BrowserRouter> the app uses.
 */
export function ScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef(new Map<string, number>());
  const lastKey = useRef(location.key);

  // Let us drive scrolling ourselves instead of the browser restoring its own remembered offset.
  useLayoutEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  }, []);

  useLayoutEffect(() => {
    // Record where the page we're leaving was scrolled to. This runs the instant the route
    // changes, while that page is still on screen (AnimatePresence keeps it during its exit
    // animation), so window.scrollY is still its real position — no scroll listener needed.
    if (lastKey.current !== location.key) {
      positions.current.set(lastKey.current, window.scrollY);
      lastKey.current = location.key;
    }

    const target = navigationType === 'POP' ? (positions.current.get(location.key) ?? 0) : 0;

    if (target === 0) {
      window.scrollTo(0, 0);
      return;
    }

    // Restoring on Back: the incoming (taller) page may not be mounted yet because the outgoing
    // one is still animating out, so the document can be too short to reach `target` for a few
    // frames. Re-apply each frame until it fits (or a short budget elapses, if the page is
    // genuinely shorter now — e.g. fewer list items — in which case we settle at its bottom).
    let raf = 0;
    let frames = 0;
    const restore = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, Math.min(target, Math.max(0, maxScroll)));
      frames += 1;
      if (maxScroll < target && frames < 60) raf = requestAnimationFrame(restore);
    };
    raf = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(raf);
  }, [location.key, navigationType]);

  return null;
}
