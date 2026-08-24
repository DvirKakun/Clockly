import { useEffect, useId, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

interface BottomSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * A sheet that rises from the bottom of the screen, for content that belongs *over* the current
 * screen rather than on a route of its own — you keep your place underneath.
 *
 * Follows ConfirmDialog's conventions (Framer Motion enter/exit, backdrop click to close,
 * role="dialog" + aria-modal) and adds the two things a dismissible overlay needs and the plain
 * dialog didn't: Escape to close, and focus moved in on open and restored to the trigger on close,
 * so a keyboard user is never stranded behind it.
 */
export function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);

    // The page behind must not scroll while the sheet is up, or dragging the sheet's content to
    // its end starts scrolling the screen underneath it.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-[#f8f7fb] shadow-xl outline-none dark:bg-[#16171d]"
            style={{ paddingBottom: 'calc(var(--safe-bottom) + 16px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky so the title and close stay reachable while a long breakdown scrolls. */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/5 bg-[#f8f7fb]/95 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#16171d]/95">
              <h2 id={titleId} className="text-base font-bold">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="סגירה"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-black/5 dark:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3 p-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
