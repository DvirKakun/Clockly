import { forwardRef, type SelectHTMLAttributes } from 'react';
import clsx from 'clsx';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, className, children, ...props }, ref) => {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-black/60 dark:text-white/60">{label}</span>}
      <select
        ref={ref}
        className={clsx(
          'min-h-11 rounded-2xl border border-black/10 bg-white px-4 text-[16px] text-black outline-none transition-colors focus:border-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-white',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
});
Select.displayName = 'Select';
