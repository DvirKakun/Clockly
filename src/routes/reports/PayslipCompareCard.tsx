import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Check, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { usePayslip, useUpsertPayslip, useDeletePayslip, type PayslipRow } from '@/hooks/usePayslips';
import { buildPayslipComparison, type PayslipExpected, type PayslipFigures } from '@/lib/payslipCompare';
import { formatCurrency } from '@/lib/format';

export interface PayslipWorkplace {
  id: string;
  name: string;
  color: string;
  expected: PayslipExpected;
}

const FIELDS: { key: keyof PayslipFigures; label: string }[] = [
  { key: 'gross', label: 'ברוטו (₪)' },
  { key: 'income_tax', label: 'מס הכנסה (₪)' },
  { key: 'national_insurance', label: 'ביטוח לאומי (₪)' },
  { key: 'health_tax', label: 'דמי בריאות (₪)' },
  { key: 'pension', label: 'ניכוי פנסיה (₪)' },
  { key: 'travel', label: 'נסיעות (₪)' },
  { key: 'net', label: 'נטו לתשלום (₪)' },
];

type FormState = Record<keyof PayslipFigures, string>;
const emptyForm: FormState = {
  gross: '',
  income_tax: '',
  national_insurance: '',
  health_tax: '',
  pension: '',
  travel: '',
  net: '',
};

function rowToForm(p: PayslipRow): FormState {
  return {
    gross: p.gross != null ? String(p.gross) : '',
    income_tax: p.income_tax != null ? String(p.income_tax) : '',
    national_insurance: p.national_insurance != null ? String(p.national_insurance) : '',
    health_tax: p.health_tax != null ? String(p.health_tax) : '',
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
    national_insurance: num(f.national_insurance),
    health_tax: num(f.health_tax),
    pension: num(f.pension),
    travel: num(f.travel),
    net: num(f.net),
  };
}

export function PayslipCompareCard({
  workplaces,
  year,
  month,
}: {
  workplaces: PayslipWorkplace[];
  year: number;
  month: number;
}) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(workplaces[0]?.id ?? '');

  const multi = workplaces.length > 1;
  // Keep a valid selection if the workplace list changes (e.g. one is archived).
  const selected = workplaces.find((w) => w.id === selectedId) ?? workplaces[0];

  // Also read here (deduped with the child's query) so the collapsed header can show status.
  const { data: payslip } = usePayslip(selected?.id, year, month);

  if (!selected) return null;

  const offCount = payslip
    ? buildPayslipComparison(selected.expected, payslip).filter((r) => r.status === 'off').length
    : 0;

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
          {payslip && !open && (
            <span className={`text-xs ${offCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
              {multi ? `${selected.name}: ` : ''}
              {offCount > 0 ? `${offCount} פערים מול הצפי` : 'תואם לצפי'}
            </span>
          )}
        </div>
        <ChevronDown size={18} className={`text-black/30 transition-transform dark:text-white/30 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="flex flex-col gap-3 pt-1">
              {multi && (
                <>
                  {/* One payslip per employer — pick which workplace's payslip you're entering. */}
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    {workplaces.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setSelectedId(w.id)}
                        className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-colors ${
                          w.id === selected.id
                            ? 'bg-brand-500 text-white'
                            : 'bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60'
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: w.color }} />
                        {w.name}
                      </button>
                    ))}
                  </div>
                  <p className="rounded-2xl bg-black/[0.03] px-3 py-2 text-xs text-black/50 dark:bg-white/[0.04] dark:text-white/50">
                    כשיש כמה מעסיקים, ניכויי המס בפועל תלויים בתיאום המס בין המעסיקים ועשויים
                    להיות שונים מהצפי, שמחושב לכל מקום עבודה בנפרד כאילו הוא ההכנסה היחידה.
                  </p>
                </>
              )}

              {/* Keyed by workplace so switching remounts with that workplace's own data —
                  no chance of one employer's entries lingering in another's form. */}
              <WorkplacePayslip key={selected.id} workplace={selected} year={year} month={month} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function WorkplacePayslip({ workplace, year, month }: { workplace: PayslipWorkplace; year: number; month: number }) {
  const { data: payslip } = usePayslip(workplace.id, year, month);
  const upsert = useUpsertPayslip();
  const del = useDeletePayslip();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(payslip ? rowToForm(payslip) : emptyForm);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync the form when the saved payslip loads or changes (e.g. right after saving). The workplace
  // switch itself is handled by the key-based remount in the parent, so no cross-workplace leak.
  useEffect(() => {
    setForm(payslip ? rowToForm(payslip) : emptyForm);
    setEditing(false);
  }, [payslip]);

  const hasPayslip = !!payslip;
  const showForm = editing || !hasPayslip;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await upsert.mutateAsync({ workplaceId: workplace.id, year, month, ...formToFigures(form) });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'משהו השתבש, נסה/י שוב');
    }
  }

  const comparison = payslip ? buildPayslipComparison(workplace.expected, payslip) : [];
  const entered = comparison.filter((r) => r.status !== 'missing');
  const offCount = comparison.filter((r) => r.status === 'off').length;

  return (
    <>
      {showForm ? (
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <p className="text-xs text-black/40 dark:text-white/40">
            הזינו את הנתונים מהתלוש של {workplace.name} כדי להשוות אותם לצפי של Clockly. אפשר למלא רק חלק מהשדות.
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
        <div className="flex flex-col gap-2">
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

      <ConfirmDialog
        open={confirmDelete}
        title="מחיקת תלוש"
        message={`למחוק את נתוני התלוש שהוזנו ל${workplace.name} בחודש זה?`}
        confirmLabel="מחיקה"
        onConfirm={() => {
          del.mutate({ workplaceId: workplace.id, year, month });
          setConfirmDelete(false);
          setEditing(false);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
