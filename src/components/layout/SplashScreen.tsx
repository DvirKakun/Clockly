import { motion } from 'framer-motion';

export function SplashScreen() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-3 bg-gradient-to-br from-brand-500 to-accent-cyan">
      {/* Fade only, no scale spring: the splash can mount twice in quick succession (auth-init
          gate, then the Suspense fallback while the first route chunk loads), and a bouncy
          entrance replayed on the second mount reads as a visible "bump". A plain fade stays
          calm across a remount. */}
      <motion.img
        src="/logo.png"
        alt=""
        width={80}
        height={80}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="rounded-3xl shadow-lg shadow-black/20"
      />
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="text-2xl font-bold text-white"
      >
        Clockly
      </motion.h1>
    </div>
  );
}
