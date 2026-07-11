import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Native-app scroll behaviour for single-page navigation, which otherwise leaves you at the
 * previous page's scroll offset (opening a shift while scrolled down would drop you mid-form):
 *
 *  - Forward navigation (PUSH/REPLACE — tapping a shift, switching tabs) starts at the top.
 *  - Back/forward (POP) restores the exact position you left that page at, so returning to a
 *    long list keeps your place.
 *
 * Positions are recorded *continuously while you scroll* (keyed by history entry), not read at
 * navigation time — because navigating from a tall list to a short form shrinks the document and
 * the browser clamps window.scrollY before we could read it, which would save the wrong offset.
 *
 * React Router's built-in <ScrollRestoration> only works with the data router; this is the
 * hand-rolled equivalent for the classic <BrowserRouter> the app uses.
 */
export function ScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef(new Map<string, number>());
  const activeKey = useRef(location.key);

  useLayoutEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  }, []);

  // Record the active entry's scroll on every scroll event. Saved synchronously (a Map write is
  // cheap) so the user's real resting position is captured before any navigation can clamp it.
  useEffect(() => {
    const onScroll = () => positions.current.set(activeKey.current, window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useLayoutEffect(() => {
    // Point future scroll writes at the incoming entry *first*. When the incoming page is shorter,
    // the browser clamps scrollY as the document shrinks and fires a scroll event; by now that
    // lands on the new entry, leaving the page we left with its true saved offset intact.
    activeKey.current = location.key;

    const target = navigationType === 'POP' ? (positions.current.get(location.key) ?? 0) : 0;

    if (target === 0) {
      window.scrollTo(0, 0);
      return;
    }

    // Restoring on Back: the incoming (taller) page may not be laid out yet, so the document can be
    // too short to reach `target` for a few frames. Re-apply each frame until it fits (or a short
    // budget elapses, if the page is genuinely shorter now — in which case we settle at its bottom).
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
