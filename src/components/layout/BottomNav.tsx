import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarClock, Building2, Settings, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

const tabs = [
  { to: '/', label: 'בית', icon: LayoutDashboard, end: true },
  { to: '/shifts', label: 'משמרות', icon: CalendarClock },
  { to: '/workplaces', label: 'מקומות עבודה', icon: Building2 },
  { to: '/settings', label: 'הגדרות', icon: Settings },
];

export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-[#16171d]/85"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="relative mx-auto flex max-w-lg items-center justify-around px-2">
        {tabs.slice(0, 2).map((tab) => (
          <TabLink key={tab.to} {...tab} />
        ))}

        <NavLink to="/shifts/new" aria-label="הוסף משמרת" className="relative -top-4">
          {({ isActive }) => (
            <motion.div
              whileTap={{ scale: 0.88 }}
              className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-cyan text-white shadow-lg shadow-brand-500/30 ${isActive ? 'ring-2 ring-brand-300' : ''}`}
            >
              <Plus size={26} strokeWidth={2.5} />
            </motion.div>
          )}
        </NavLink>

        {tabs.slice(2).map((tab) => (
          <TabLink key={tab.to} {...tab} />
        ))}
      </div>
    </nav>
  );
}

function TabLink({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className="flex min-w-[64px] flex-col items-center gap-1 py-2.5 text-[11px] font-medium"
    >
      {({ isActive }) => (
        <>
          <Icon
            size={22}
            strokeWidth={isActive ? 2.4 : 1.8}
            className={isActive ? 'text-brand-500' : 'text-black/40 dark:text-white/40'}
          />
          <span className={isActive ? 'text-brand-500' : 'text-black/40 dark:text-white/40'}>{label}</span>
        </>
      )}
    </NavLink>
  );
}
