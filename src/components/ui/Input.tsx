import { forwardRef, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className, id, ...props }, ref) => {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-black/60 dark:text-white/60">{label}</span>}
      <input
        ref={ref}
        id={id}
        className={clsx(
          'min-h-11 rounded-2xl border border-black/10 bg-white px-4 text-[16px] text-black outline-none transition-colors focus:border-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-white',
          error && 'border-red-400 dark:border-red-500',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </label>
  );
});
Input.displayName = 'Input';
