import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2, Briefcase } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PageTransition } from '@/components/layout/PageTransition';
import {
  useArchiveWorkplace,
  useCreateWorkplace,
  useWorkplaces,
  type Workplace,
} from '@/hooks/useWorkplaces';

const COLORS = ['#7e14ff', '#47bfff', '#ff6b6b', '#22c55e', '#f59e0b', '#ec4899'];

type FormState = {
  name: string;
  color: string;
  employment_type: 'hourly' | 'daily' | 'monthly';
  hourly_rate: string;
  daily_rate: string;
  monthly_salary: string;
  work_days_per_week: '5' | '6';
};

const emptyForm: FormState = {
  name: '',
  color: COLORS[0],
  employment_type: 'hourly',
  hourly_rate: '',
  daily_rate: '',
  monthly_salary: '',
  work_days_per_week: '5',
};

export function WorkplacesPage() {
  const { data: workplaces = [], isLoading } = useWorkplaces();
  const createWorkplace = useCreateWorkplace();
  const archiveWorkplace = useArchiveWorkplace();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createWorkplace.mutateAsync({
      name: form.name,
      color: form.color,
      employment_type: form.employment_type,
      hourly_rate: form.employment_type === 'hourly' ? Number(form.hourly_rate) : null,
      daily_rate: form.employment_type === 'daily' ? Number(form.daily_rate) : null,
      monthly_salary: form.employment_type === 'monthly' ? Number(form.monthly_salary) : null,
      standard_weekly_hours: 42,
      work_days_per_week: Number(form.work_days_per_week),
    });
    setForm(emptyForm);
    setShowForm(false);
  }

  return (
    <PageTransition>
      <div className="flex flex-col gap-4">
        <header className="flex items-center justify-between pt-1">
          <h1 className="text-lg font-bold">מקומות עבודה</h1>
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus size={18} /> חדש
          </Button>
        </header>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Card>
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  <Input
                    label="שם מקום העבודה"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />

                  <div className="flex gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm({ ...form, color: c })}
                        className="h-8 w-8 rounded-full ring-offset-2 dark:ring-offset-[#16171d]"
                        style={{ backgroundColor: c, boxShadow: form.color === c ? `0 0 0 2px ${c}` : undefined }}
                        aria-label={`צבע ${c}`}
                      />
                    ))}
                  </div>

                  <Select
                    label="סוג העסקה"
                    value={form.employment_type}
                    onChange={(e) => setForm({ ...form, employment_type: e.target.value as FormState['employment_type'] })}
                  >
                    <option value="hourly">שעתי</option>
                    <option value="daily">יומי</option>
                    <option value="monthly">חודשי גלובלי</option>
                  </Select>

                  {form.employment_type === 'hourly' && (
                    <Input
                      label="תעריף לשעה (₪)"
                      type="number"
                      step="0.01"
                      min={35.4}
                      required
                      value={form.hourly_rate}
                      onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
                    />
                  )}
                  {form.employment_type === 'daily' && (
                    <Input
                      label="תעריף ליום (₪)"
                      type="number"
                      step="0.01"
                      required
                      value={form.daily_rate}
                      onChange={(e) => setForm({ ...form, daily_rate: e.target.value })}
                    />
                  )}
                  {form.employment_type === 'monthly' && (
                    <Input
                      label="שכר חודשי (₪)"
                      type="number"
                      step="0.01"
                      min={6443.85}
                      required
                      value={form.monthly_salary}
                      onChange={(e) => setForm({ ...form, monthly_salary: e.target.value })}
                    />
                  )}

                  <Select
                    label="ימי עבודה בשבוע"
                    value={form.work_days_per_week}
                    onChange={(e) => setForm({ ...form, work_days_per_week: e.target.value as '5' | '6' })}
                  >
                    <option value="5">5 ימים</option>
                    <option value="6">6 ימים</option>
                  </Select>

                  <Button type="submit" fullWidth disabled={createWorkplace.isPending}>
                    שמירה
                  </Button>
                </form>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-black/40 dark:text-white/40">טוען...</p>
        ) : workplaces.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 py-8 text-center">
            <Briefcase className="text-black/20 dark:text-white/20" size={32} />
            <p className="text-sm text-black/50 dark:text-white/50">אין עדיין מקומות עבודה</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {workplaces.map((w) => (
              <WorkplaceCard key={w.id} workplace={w} onArchive={() => archiveWorkplace.mutate(w.id)} />
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}

function WorkplaceCard({ workplace, onArchive }: { workplace: Workplace; onArchive: () => void }) {
  const rateLabel =
    workplace.employment_type === 'hourly'
      ? `₪${workplace.hourly_rate}/שעה`
      : workplace.employment_type === 'daily'
        ? `₪${workplace.daily_rate}/יום`
        : `₪${workplace.monthly_salary}/חודש`;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="h-4 w-4 rounded-full" style={{ backgroundColor: workplace.color }} />
          <div>
            <p className="font-medium">{workplace.name}</p>
            <p className="text-xs text-black/50 dark:text-white/50">{rateLabel}</p>
          </div>
        </div>
        <button
          onClick={onArchive}
          className="flex h-9 w-9 items-center justify-center rounded-full text-black/30 active:bg-red-500/10 active:text-red-500 dark:text-white/30"
          aria-label="הסרה"
        >
          <Trash2 size={17} />
        </button>
      </div>
    </Card>
  );
}
