import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { Clock } from 'lucide-react';

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
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-cyan text-white shadow-md shadow-brand-500/25">
              <Clock size={20} />
            </div>
            <h1 className="text-lg font-bold">Clockly</h1>
          </div>
        ) : (
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-500 to-accent-cyan text-white shadow-lg shadow-brand-500/30">
              <Clock size={30} />
            </div>
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
