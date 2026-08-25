import { useLocation, useNavigate } from 'react-router-dom';

/**
 * React Router labels the first history entry of a session `'default'`. That is the signal for
 * "this page was opened directly" — a bookmark, a shared link, or the entry point of the installed
 * PWA — where there is no in-app history behind us.
 *
 * Exported separately from the hook so the rule has a test that survives without a renderer.
 */
export function isDeepLink(locationKey: string | undefined): boolean {
  // undefined counts too: erring toward a known route beats ejecting the user from the app.
  return locationKey === undefined || locationKey === 'default';
}

/**
 * A Back action that cannot strand or eject the user.
 *
 * `navigate(-1)` alone is wrong on a deep link: with nothing behind it in the history stack it
 * walks *out of the app* (a blank tab in the browser, nothing at all in the installed PWA). Both
 * the shift summary and the shift form are reachable by direct URL, so both need the fallback.
 */
export function useGoBack(fallbackPath: string): () => void {
  const navigate = useNavigate();
  const location = useLocation();

  return () => {
    if (isDeepLink(location.key)) navigate(fallbackPath);
    else navigate(-1);
  };
}
