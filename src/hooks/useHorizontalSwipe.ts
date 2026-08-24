import { useRef, type TouchEvent } from 'react';

/**
 * Detects a horizontal swipe without taking over the surface it's attached to.
 *
 * A draggable container was the obvious choice and the wrong one here: this is a *form*, not a
 * carousel. Making it draggable displaces the fields under the finger and competes with selecting
 * text in an input. This only listens — it never calls preventDefault and never transforms
 * anything — so vertical scrolling and every field keep working exactly as before.
 *
 * Guards, in order of how much trouble they save:
 *  - swipes starting on an interactive element are ignored, so dragging inside a field or across a
 *    picker never navigates;
 *  - horizontal movement must clearly dominate vertical, so scrolling the form is never hijacked;
 *  - swipes starting near the viewport edge are ignored, because that is the iOS Safari
 *    back-gesture zone and both firing would navigate twice.
 */

const MIN_DISTANCE_PX = 60;
/** Horizontal travel must beat vertical by this factor before it counts as a horizontal swipe. */
const DOMINANCE_RATIO = 1.5;
/** iOS Safari's interactive back-gesture zone. */
const EDGE_EXCLUSION_PX = 28;

const INTERACTIVE = 'input, select, textarea, button, a, [role="button"], [contenteditable]';

interface Options {
  onSwipeForward: () => void;
  onSwipeBack: () => void;
  enabled?: boolean;
}

export function useHorizontalSwipe({ onSwipeForward, onSwipeBack, enabled = true }: Options) {
  const start = useRef<{ x: number; y: number } | null>(null);

  function onTouchStart(event: TouchEvent) {
    if (!enabled || event.touches.length !== 1) {
      start.current = null;
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest(INTERACTIVE)) {
      start.current = null;
      return;
    }

    const touch = event.touches[0];
    const width = window.innerWidth;
    if (touch.clientX <= EDGE_EXCLUSION_PX || touch.clientX >= width - EDGE_EXCLUSION_PX) {
      start.current = null;
      return;
    }

    start.current = { x: touch.clientX, y: touch.clientY };
  }

  function onTouchEnd(event: TouchEvent) {
    const origin = start.current;
    start.current = null;
    if (!origin || !enabled) return;

    const touch = event.changedTouches[0];
    if (!touch) return;

    const dx = touch.clientX - origin.x;
    const dy = touch.clientY - origin.y;

    if (Math.abs(dx) < MIN_DISTANCE_PX) return;
    if (Math.abs(dx) < Math.abs(dy) * DOMINANCE_RATIO) return;

    // RTL: "next" lives to the left (matching MonthNavigator and the metric switcher), so dragging
    // content leftward brings the next shift in.
    if (dx < 0) onSwipeForward();
    else onSwipeBack();
  }

  return { onTouchStart, onTouchEnd, onTouchCancel: () => (start.current = null) };
}
