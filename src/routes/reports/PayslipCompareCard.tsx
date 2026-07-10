import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Check, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { usePayslip, useUpsertPayslip, useDeletePayslip, type PayslipRow } from '@/hooks/usePayslips';
import { buildPayslipComparison, type PayslipFigures } from '@/lib/payslipCompare';
import { formatCurrency } from '@/lib/format';
import type { MonthSummary } from '@/lib/calc/monthSummary';

const FIELDS: { key: keyof PayslipFigures; label: string }[] = [
  { key: 'gross', label: 'ברוטו (₪)' },
  { key: 'income_tax', label: 'מס הכנסה (₪)' },
  { key: 'social_security', label: 'ביטוח לאומי ובריאות (₪)' },
  { key: 'pension', label: 'ניכוי פנסיה (₪)' },
  { key: 'travel', label: 'נסיעות (₪)' },
  { key: 'net', label: 'נטו לתשלום (₪)' },
];

type FormState = Record<keyof PayslipFigures, string>;
const emptyForm: FormState = { gross: '', income_tax: '', social_security: '', pension: '', travel: '', net: '' };

function rowToForm(p: PayslipRow): FormState {
  return {
    gross: p.gross != null ? String(p.gross) : '',
    income_tax: p.income_tax != null ? String(p.income_tax) : '',
    social_security: p.social_security != null ? String(p.social_security) : '',
    pension: p.pension != null ? String(p.pension) : '',
    travel: p.travel != null ? String(p.travel) : '',
    net: p.net != null ? String(p.net) : '',
  };
}

function formToFigures(f: FormState): PayslipFigures {
  const num = (v: string) => (v.trim() === '' ? null : Number(v));
  return {
    gross: num(f.gross),
    income_tax: num(f.income_tax),
    social_security: num(f.social_security),
    pension: num(f.pension),
    travel: num(f.travel),
    net: num(f.net),
  };
}

export function PayslipCompareCard({ summary, year, month }: { summary: MonthSummary; year: number; month: number }) {
  const { data: payslip } = usePayslip(year, month);
  const upsert = useUpsertPayslip();
  const del = useDeletePayslip();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(payslip ? rowToForm(payslip) : emptyForm);
  }, [payslip]);

  const hasPayslip = !!payslip;
  const showForm = editing || (!hasPayslip && open);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await upsert.mutateAsync({ year, month, ...formToFigures(form) });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'משהו השתבש, נסה/י שוב');
    }
  }

  const comparison = payslip ? buildPayslipComparison(summary, payslip) : [];
  const entered = comparison.filter((r) => r.status !== 'missing');
  const offCount = comparison.filter((r) => r.status === 'off').length;

  return (
    <Card className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between text-start"
        aria-expanded={open}
      >
        <div className="flex flex-col">
          <span className="text-sm font-semibold">השוואה לתלוש</span>
          {hasPayslip && !open && (
            <span className={`text-xs ${offCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
              {offCount > 0 ? `${offCount} פערים מול הצפי` : 'תואם לצפי'}
            </span>
          )}
        </div>
        <ChevronDown size={18} className={`text-black/30 transition-transform dark:text-white/30 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            {showForm ? (
              <form onSubmit={handleSave} className="flex flex-col gap-3 pt-1">
                <p className="text-xs text-black/40 dark:text-white/40">
                  הזינו את הנתונים מהתלוש החודשי כדי להשוות אותם לצפי של Clockly. אפשר למלא רק חלק מהשדות.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {FIELDS.map(({ key, label }) => (
                    <Input
                      key={key}
                      label={label}
                      type="number"
                      step="0.01"
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    />
                  ))}
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="flex gap-2">
                  <Button type="submit" fullWidth disabled={upsert.isPending}>
                    שמירה
                  </Button>
                  {hasPayslip && (
                    <Button type="button" variant="secondary" fullWidth onClick={() => setEditing(false)}>
                      ביטול
                    </Button>
                  )}
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                <div className={`rounded-2xl px-3 py-2 text-sm ${offCount > 0 ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-green-500/10 text-green-700 dark:text-green-300'}`}>
                  {offCount > 0
                    ? `נמצאו ${offCount} פערים מול הצפי — כדאי לבדוק מול המעסיק.`
                    : entered.length > 0
                      ? 'כל הנתונים שהוזנו תואמים לצפי של Clockly.'
                      : 'לא הוזנו נתונים להשוואה.'}
                </div>

                {comparison.map((row) => (
                  <div key={row.key} className="flex items-start justify-between border-t border-black/5 py-1.5 text-sm first:border-t-0 dark:border-white/10">
                    <span className="text-black/70 dark:text-white/70">{row.label}</span>
                    <div className="flex flex-col items-end">
                      {row.actual == null ? (
                        <span className="text-xs text-black/30 dark:text-white/30">לא הוזן</span>
                      ) : (
                        <span className="flex items-center gap-1 font-medium">
                          {formatCurrency(row.actual)}
                          {row.status === 'match' ? (
                            <Check size={14} className="text-green-600 dark:text-green-400" />
                          ) : (
                            <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400" />
                          )}
                        </span>
                      )}
                      {row.status === 'off' && row.diff != null && (
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          צפי {formatCurrency(row.expected)} · {row.diff > 0 ? '+' : '−'}
                          {formatCurrency(Math.abs(row.diff))}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                <p className="text-xs text-black/40 dark:text-white/40">
                  הצפי הוא אומדן — פערים קטנים נובעים לרוב מעיגול, בונוסים שלא נרשמו או הבדלי חישוב מס.
                </p>

                <div className="flex gap-2">
                  <Button type="button" variant="secondary" fullWidth onClick={() => setEditing(true)}>
                    <Pencil size={15} /> עריכה
                  </Button>
                  <Button type="button" variant="danger" fullWidth onClick={() => setConfirmDelete(true)}>
                    <Trash2 size={15} /> מחיקה
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmDelete}
        title="מחיקת תלוש"
        message="למחוק את נתוני התלוש שהוזנו לחודש זה?"
        confirmLabel="מחיקה"
        onConfirm={() => {
          del.mutate({ year, month });
          setConfirmDelete(false);
          setEditing(false);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </Card>
  );
}
