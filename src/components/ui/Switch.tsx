import { motion } from 'framer-motion';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
}

export function Switch({ checked, onChange, label, description }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 py-1 text-start"
    >
      {(label || description) && (
        <span className="flex flex-col">
          {label && <span className="text-[15px] font-medium">{label}</span>}
          {description && <span className="text-xs text-black/50 dark:text-white/50">{description}</span>}
        </span>
      )}
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-brand-500' : 'bg-black/15 dark:bg-white/15'}`}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 600, damping: 35 }}
          className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow"
          style={{ [checked ? 'insetInlineEnd' : 'insetInlineStart']: '2px' } as React.CSSProperties}
        />
      </span>
    </button>
  );
}
