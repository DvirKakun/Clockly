import { motion } from 'framer-motion';

export function SplashScreen() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-3 bg-gradient-to-br from-brand-500 to-accent-cyan">
      <motion.img
        src="/logo.png"
        alt=""
        width={80}
        height={80}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="rounded-3xl shadow-lg shadow-black/20"
      />
      <motion.h1
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-2xl font-bold text-white"
      >
        Clockly
      </motion.h1>
    </div>
  );
}
