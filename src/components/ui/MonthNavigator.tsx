import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, ChevronDown, CornerUpRight } from 'lucide-react';
import { MONTH_NAMES_HE } from '@/lib/date';

interface MonthNavigatorProps {
  /** Full year, e.g. 2026. */
  year: number;
  /** 0-indexed month (0 = January), matching the app's cursor convention. */
  month: number;
  onChange: (year: number, month: number) => void;
  /** Optional line under the month label (e.g. the pay-period date range). */
  subLabel?: React.ReactNode;
}

/**
 * Month/year header shared by the dashboard, reports, and shifts screens. Beyond the prev/next
 * arrows it adds three things the plain header lacked: tapping the label opens a month+year grid
 * for jumping across the calendar, a pill that names the current month and returns to it, and a
 * clear marker of "today" inside the picker so you always know where now is while browsing.
 */
export function MonthNavigator({ year, month, onChange, subLabel }: MonthNavigatorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const isCurrentMonth = year === currentYear && month === currentMonth;

  function step(delta: 1 | -1) {
    const m = month + delta;
    if (m < 0) onChange(year - 1, 11);
    else if (m > 11) onChange(year + 1, 0);
    else onChange(year, m);
  }

  return (
    <div className="flex flex-col items-center gap-1.5 pt-1">
      <header className="flex w-full items-center justify-between">
        <button
          onClick={() => step(-1)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/5 dark:bg-white/10"
          aria-label="חודש קודם"
        >
          <ChevronRight size={18} />
        </button>

        <button
          onClick={() => setPickerOpen(true)}
          className="flex min-h-11 flex-col items-center justify-center px-3"
          aria-label="בחירת חודש ושנה"
          aria-haspopup="dialog"
        >
          <span className="flex items-center gap-1 text-lg font-bold">
            {MONTH_NAMES_HE[month]} {year}
            <ChevronDown size={16} className="text-black/30 dark:text-white/30" />
          </span>
          {subLabel}
        </button>

        <button
          onClick={() => step(1)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/5 dark:bg-white/10"
          aria-label="חודש הבא"
        >
          <ChevronLeft size={18} />
        </button>
      </header>

      {/* Doubles as the "you've navigated away" indicator (it names where today is) and the
          one-tap way back. Only shown when the cursor isn't already on the current month. */}
      <AnimatePresence initial={false}>
        {!isCurrentMonth && (
          <motion.button
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            onClick={() => onChange(currentYear, currentMonth)}
            className="flex items-center gap-1 rounded-full bg-brand-500/10 px-4 py-2 text-xs font-medium text-brand-600 dark:text-brand-400"
          >
            <CornerUpRight size={13} />
            חזרה ל{MONTH_NAMES_HE[currentMonth]} {currentYear}
          </motion.button>
        )}
      </AnimatePresence>

      <MonthYearPicker
        open={pickerOpen}
        selectedYear={year}
        selectedMonth={month}
        currentYear={currentYear}
        currentMonth={currentMonth}
        onSelect={(y, m) => {
          onChange(y, m);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}

interface MonthYearPickerProps {
  open: boolean;
  selectedYear: number;
  selectedMonth: number;
  currentYear: number;
  currentMonth: number;
  onSelect: (year: number, month: number) => void;
  onClose: () => void;
}

function MonthYearPicker({
  open,
  selectedYear,
  selectedMonth,
  currentYear,
  currentMonth,
  onSelect,
  onClose,
}: MonthYearPickerProps) {
  // The grid pages by year independently of the current selection, so you can browse to a
  // different year and pick a month there. Reset to the selected year each time it opens.
  const [viewYear, setViewYear] = useState(selectedYear);
  useEffect(() => {
    if (open) setViewYear(selectedYear);
  }, [open, selectedYear]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="בחירת חודש ושנה"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            className="w-full max-w-xs rounded-3xl bg-white p-4 shadow-xl dark:bg-[#1c1d24]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <button
                onClick={() => setViewYear((y) => y - 1)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-black/5 dark:bg-white/10"
                aria-label="שנה קודמת"
              >
                <ChevronRight size={18} />
              </button>
              <span className="text-base font-bold" dir="ltr">
                {viewYear}
              </span>
              <button
                onClick={() => setViewYear((y) => y + 1)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-black/5 dark:bg-white/10"
                aria-label="שנה הבאה"
              >
                <ChevronLeft size={18} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {MONTH_NAMES_HE.map((name, i) => {
                const isSelected = viewYear === selectedYear && i === selectedMonth;
                const isCurrent = viewYear === currentYear && i === currentMonth;
                return (
                  <button
                    key={name}
                    onClick={() => onSelect(viewYear, i)}
                    aria-current={isCurrent ? 'date' : undefined}
                    className={`relative flex min-h-11 items-center justify-center rounded-xl text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-brand-500 text-white'
                        : isCurrent
                          ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                          : 'bg-black/5 text-black/70 dark:bg-white/5 dark:text-white/70'
                    }`}
                  >
                    {name}
                    {isCurrent && !isSelected && (
                      <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-brand-500 dark:bg-brand-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
