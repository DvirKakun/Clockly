import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  variant?: Variant;
  fullWidth?: boolean;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  'aria-label'?: string;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-brand-500 text-white shadow-md shadow-brand-500/25 active:bg-brand-600',
  secondary:
    'bg-black/5 text-black dark:bg-white/10 dark:text-white active:bg-black/10 dark:active:bg-white/15',
  ghost: 'text-brand-500 active:bg-brand-50 dark:active:bg-brand-500/10',
  danger: 'bg-red-500/10 text-red-600 dark:text-red-400 active:bg-red-500/20',
};

export function Button({
  variant = 'primary',
  fullWidth,
  type = 'button',
  disabled,
  onClick,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={clsx(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-5 text-[15px] font-semibold transition-colors disabled:opacity-40',
        variantClasses[variant],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
