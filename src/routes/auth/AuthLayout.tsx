import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

interface AuthLayoutProps {
  title?: string;
  subtitle?: string;
  /** Compact header (small inline icon + wordmark, no subtitle) for content-heavy pages like signup. */
  compact?: boolean;
  children: ReactNode;
}

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -40 : 40, opacity: 0 }),
};

export function AuthLayout({ title, subtitle, compact, children }: AuthLayoutProps) {
  const location = useLocation();
  const direction = (location.state as { direction?: number } | null)?.direction ?? 0;

  return (
    <div
      className="flex min-h-full flex-1 flex-col justify-center px-6"
      style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="mx-auto w-full max-w-sm">
        {compact ? (
          <div className="mb-3 flex flex-col items-center gap-1.5">
            <img src="/logo.png" alt="" width={44} height={44} className="rounded-2xl shadow-md shadow-brand-500/25" />
            <h1 className="text-lg font-bold">Clockly</h1>
          </div>
        ) : (
          <div className="mb-8 flex flex-col items-center gap-3">
            <img src="/logo.png" alt="" width={64} height={64} className="rounded-3xl shadow-lg shadow-brand-500/30" />
            <h1 className="text-2xl font-bold">Clockly</h1>
            <p className="text-center text-sm text-black/50 dark:text-white/50">
              {subtitle ?? 'מעקב שעות עבודה וחישוב שכר לפי דיני העבודה בישראל'}
            </p>
          </div>
        )}

        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={location.pathname}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.7 }}
          >
            {title && <h2 className={compact ? 'mb-2 text-base font-bold' : 'mb-4 text-lg font-bold'}>{title}</h2>}
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
