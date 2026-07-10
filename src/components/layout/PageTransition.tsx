import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.7 }}
    >
      {children}
    </motion.div>
  );
}
