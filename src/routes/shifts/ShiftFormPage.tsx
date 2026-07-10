import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Info, Moon, Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PageTransition } from '@/components/layout/PageTransition';
import { useWorkplaces } from '@/hooks/useWorkplaces';
import { useCreateShift, useDeleteShift, useShift, useUpdateShift } from '@/hooks/useShifts';
import { DEFAULT_RATES, computeShiftGross, isShiftFullyInShabbat, shiftPartiallyOverlapsShabbat, statutoryHolidayName } from '@/lib/calc';
import { workplaceToRateProfile } from '@/lib/calc/adapters';
import { formatCurrency } from '@/lib/format';

function todayIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

interface BreakField {
  start_time: string;
  end_time: string;
  is_paid: boolean;
}

type DayType = 'regular' | 'shabbat' | 'holiday';
type DayTypeChoice = 'auto' | DayType;

function detectDayType(date: string, startTime: string, endTime: string, crossesMidnight: boolean): DayType {
  const holiday = statutoryHolidayName(date);
  if (holiday) return 'holiday';
  if (isShiftFullyInShabbat(date, startTime, endTime, crossesMidnight)) return 'shabbat';
  return 'regular';
}

const dayTypeLabels: Record<DayType, string> = {
  regular: 'יום רגיל',
  shabbat: 'שבת',
  holiday: 'חג',
};

export function ShiftFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const { data: workplaces = [] } = useWorkplaces();
  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const deleteShift = useDeleteShift();

  const { data: existing } = useShift(id);

  const [workplaceId, setWorkplaceId] = useState('');
  const [date, setDate] = useState(todayIso());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [dayTypeChoice, setDayTypeChoice] = useState<DayTypeChoice>('auto');
  const [bonuses, setBonuses] = useState('0');
  const [tips, setTips] = useState('0');
  const [travel, setTravel] = useState('0');
  const [meal, setMeal] = useState('0');
  const [notes, setNotes] = useState('');
  const [breaks, setBreaks] = useState<BreakField[]>([]);

  // Crossing midnight is a pure function of the two time fields — never a manual choice.
  const crossesMidnight = endTime !== '' && endTime <= startTime;

  const detectedDayType = useMemo(
    () => detectDayType(date, startTime, endTime, crossesMidnight),
    [date, startTime, endTime, crossesMidnight]
  );
  const dayType: DayType = dayTypeChoice === 'auto' ? detectedDayType : dayTypeChoice;
  const straddlesShabbatBoundary = useMemo(
    () => shiftPartiallyOverlapsShabbat(date, startTime, endTime, crossesMidnight),
    [date, startTime, endTime, crossesMidnight]
  );

  const selectedWorkplace = workplaces.find((w) => w.id === workplaceId);

  // When the shift straddles the Shabbat boundary and dayType is left on 'auto', the calc
  // engine splits it into a regular segment and a Shabbat segment automatically (see
  // grossEngine.computeShiftHours). Preview that split here so the user sees hours/pay per
  // tier instead of being asked to work it out or split the shift themselves.
  const splitPreview = useMemo(() => {
    if (dayTypeChoice !== 'auto' || !straddlesShabbatBoundary || !selectedWorkplace || !startTime || !endTime) {
      return null;
    }
    const rateProfile = workplaceToRateProfile(selectedWorkplace);
    const result = computeShiftGross(
      {
        id: 'preview',
        date,
        startTime,
        endTime,
        crossesMidnight,
        dayType: 'regular',
        breaks: breaks.map((b) => ({ startTime: b.start_time, endTime: b.end_time, isPaid: b.is_paid })),
      },
      rateProfile
    );
    return result;
  }, [dayTypeChoice, straddlesShabbatBoundary, selectedWorkplace, date, startTime, endTime, crossesMidnight, breaks]);

  useEffect(() => {
    if (existing) {
      setWorkplaceId(existing.workplace_id);
      setDate(existing.date);
      setStartTime(existing.start_time.slice(0, 5));
      setEndTime(existing.end_time?.slice(0, 5) ?? '17:00');
      // Preserve whatever was already saved rather than silently reclassifying past shifts.
      setDayTypeChoice(existing.day_type as DayType);
      setBonuses(String(existing.bonuses));
      setTips(String(existing.tips));
      setTravel(String(existing.travel_reimbursement));
      setMeal(String(existing.meal_deduction));
      setNotes(existing.notes ?? '');
      setBreaks(existing.breaks.map((b) => ({ start_time: b.start_time.slice(0, 5), end_time: b.end_time.slice(0, 5), is_paid: b.is_paid })));
    } else if (workplaces.length > 0 && !workplaceId) {
      const workplace = workplaces[0];
      setWorkplaceId(workplace.id);
      if (workplace.travel_daily_cost != null) {
        setTravel(String(Math.min(workplace.travel_daily_cost, DEFAULT_RATES.travel.dailyCap)));
      }
      if (workplace.meal_deduction_default != null) {
        setMeal(String(workplace.meal_deduction_default));
      }
    }
  }, [existing, workplaces, workplaceId]);

  function handleWorkplaceChange(newWorkplaceId: string) {
    setWorkplaceId(newWorkplaceId);
    if (isEdit) return; // don't override a saved shift's own recorded travel/meal values
    const workplace = workplaces.find((w) => w.id === newWorkplaceId);
    if (workplace?.travel_daily_cost != null) {
      setTravel(String(Math.min(workplace.travel_daily_cost, DEFAULT_RATES.travel.dailyCap)));
    }
    if (workplace?.meal_deduction_default != null) {
      setMeal(String(workplace.meal_deduction_default));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const values = {
      workplace_id: workplaceId,
      date,
      start_time: startTime,
      end_time: endTime,
      crosses_midnight: crossesMidnight,
      day_type: dayType,
      bonuses: Number(bonuses) || 0,
      tips: Number(tips) || 0,
      travel_reimbursement: Number(travel) || 0,
      meal_deduction: Number(meal) || 0,
      other_deduction: 0,
      notes: notes || null,
      breaks,
    };

    if (isEdit && id) {
      await updateShift.mutateAsync({ id, ...values });
    } else {
      await createShift.mutateAsync(values);
    }
    navigate('/shifts');
  }

  async function handleDelete() {
    if (id) {
      await deleteShift.mutateAsync(id);
      navigate('/shifts');
    }
  }

  return (
    <PageTransition>
      <div className="flex flex-col gap-4">
        <header className="flex items-center gap-3 pt-1">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 dark:bg-white/10"
            aria-label="חזרה"
          >
            <ChevronRight size={18} />
          </button>
          <h1 className="text-lg font-bold">{isEdit ? 'עריכת משמרת' : 'משמרת חדשה'}</h1>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <Select label="מקום עבודה" value={workplaceId} onChange={(e) => handleWorkplaceChange(e.target.value)} required>
              {workplaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>

            <Input label="תאריך" type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} required />

            <div className="flex flex-col gap-3">
              <Input
                label="שעת התחלה"
                type="time"
                dir="ltr"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
              <Input
                label="שעת סיום"
                type="time"
                dir="ltr"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>

            {crossesMidnight && (
              <div className="flex items-center gap-2 rounded-2xl bg-black/[0.03] px-3 py-2 text-xs text-black/50 dark:bg-white/[0.04] dark:text-white/50">
                <Moon size={14} className="shrink-0" />
                זוהתה משמרת חוצה חצות — מסתיימת ביום שאחרי
              </div>
            )}

            <Select
              label="סוג יום"
              value={dayTypeChoice}
              onChange={(e) => setDayTypeChoice(e.target.value as DayTypeChoice)}
            >
              <option value="auto">
                אוטומטי ({straddlesShabbatBoundary ? 'מפוצל: רגיל + שבת' : `זוהה: ${dayTypeLabels[detectedDayType]}`})
              </option>
              <option value="regular">יום רגיל</option>
              <option value="shabbat">שבת</option>
              <option value="holiday">חג</option>
            </Select>

            {splitPreview && (
              <div className="flex flex-col gap-2 rounded-2xl bg-brand-50 px-3 py-3 text-xs dark:bg-brand-500/10">
                <div className="flex gap-2 text-brand-800 dark:text-brand-200">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  <span>
                    המשמרת חוצה את כניסת השבת — חושבה אוטומטית לפי שעות בכל תעריף (זמן כניסת
                    השבת הוא אומדן).
                  </span>
                </div>
                <div className="flex flex-col gap-1 text-black/70 dark:text-white/70">
                  {splitPreview.hours.regularHours > 0 && (
                    <div className="flex justify-between">
                      <span>{splitPreview.hours.regularHours.toFixed(2)} שעות × 100% (רגיל)</span>
                      <span className="font-medium">{formatCurrency(splitPreview.regularPay)}</span>
                    </div>
                  )}
                  {splitPreview.hours.overtime125Hours > 0 && (
                    <div className="flex justify-between">
                      <span>{splitPreview.hours.overtime125Hours.toFixed(2)} שעות × 125% (נוספות)</span>
                      <span className="font-medium">{formatCurrency(splitPreview.overtime125Pay)}</span>
                    </div>
                  )}
                  {splitPreview.hours.overtime150Hours > 0 && (
                    <div className="flex justify-between">
                      <span>{splitPreview.hours.overtime150Hours.toFixed(2)} שעות × 150% (נוספות)</span>
                      <span className="font-medium">{formatCurrency(splitPreview.overtime150Pay)}</span>
                    </div>
                  )}
                  {splitPreview.hours.shabbatBaseHours > 0 && (
                    <div className="flex justify-between">
                      <span>{splitPreview.hours.shabbatBaseHours.toFixed(2)} שעות × 150% (שבת)</span>
                      <span className="font-medium">{formatCurrency(splitPreview.shabbatBasePay)}</span>
                    </div>
                  )}
                  {splitPreview.hours.shabbatOvertime175Hours > 0 && (
                    <div className="flex justify-between">
                      <span>{splitPreview.hours.shabbatOvertime175Hours.toFixed(2)} שעות × 175% (שבת+נוספות)</span>
                      <span className="font-medium">{formatCurrency(splitPreview.shabbatOvertime175Pay)}</span>
                    </div>
                  )}
                  {splitPreview.hours.shabbatOvertime200Hours > 0 && (
                    <div className="flex justify-between">
                      <span>{splitPreview.hours.shabbatOvertime200Hours.toFixed(2)} שעות × 200% (שבת+נוספות)</span>
                      <span className="font-medium">{formatCurrency(splitPreview.shabbatOvertime200Pay)}</span>
                    </div>
                  )}
                  <div className="mt-1 flex justify-between border-t border-black/10 pt-1 font-semibold dark:border-white/10">
                    <span>סה&quot;כ שכר בסיס למשמרת</span>
                    <span>
                      {formatCurrency(
                        splitPreview.regularPay +
                          splitPreview.overtime125Pay +
                          splitPreview.overtime150Pay +
                          splitPreview.shabbatBasePay +
                          splitPreview.shabbatOvertime175Pay +
                          splitPreview.shabbatOvertime200Pay
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">הפסקות</h2>
              <button
                type="button"
                onClick={() => setBreaks([...breaks, { start_time: '13:00', end_time: '13:30', is_paid: false }])}
                className="flex items-center gap-1 text-sm text-brand-500"
              >
                <Plus size={16} /> הוספה
              </button>
            </div>
            {breaks.map((brk, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="flex flex-1 flex-col gap-2">
                  <Input
                    label="התחלה"
                    type="time"
                    dir="ltr"
                    value={brk.start_time}
                    onChange={(e) => setBreaks(breaks.map((b, j) => (j === i ? { ...b, start_time: e.target.value } : b)))}
                  />
                  <Input
                    label="סיום"
                    type="time"
                    dir="ltr"
                    value={brk.end_time}
                    onChange={(e) => setBreaks(breaks.map((b, j) => (j === i ? { ...b, end_time: e.target.value } : b)))}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setBreaks(breaks.filter((_, j) => j !== i))}
                  className="mt-6 flex h-9 w-9 items-center justify-center rounded-full text-black/30 dark:text-white/30"
                  aria-label="הסרת הפסקה"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">תוספות וניכויים</h2>
            <div className="grid grid-cols-2 gap-3">
              <Input label="בונוס (₪)" type="number" value={bonuses} onChange={(e) => setBonuses(e.target.value)} />
              <Input label="טיפים (₪)" type="number" value={tips} onChange={(e) => setTips(e.target.value)} />
              <Input label="נסיעות (₪)" type="number" value={travel} onChange={(e) => setTravel(e.target.value)} />
              <Input label="ניכוי ארוחות (₪)" type="number" value={meal} onChange={(e) => setMeal(e.target.value)} />
            </div>
            <p className="-mt-2 text-xs text-black/40 dark:text-white/40">
              דמי הנסיעות וניכוי הארוחות ממולאים אוטומטית לפי ההגדרות במקום העבודה (דמי
              הנסיעות עד לתקרה החוקית), וניתן לשנות כל אחד מהם לכל משמרת בנפרד.
            </p>
            <Input label="הערות" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Card>

          <Button type="submit" fullWidth disabled={!workplaceId || createShift.isPending || updateShift.isPending}>
            שמירה
          </Button>
          {isEdit && (
            <Button type="button" variant="danger" fullWidth onClick={handleDelete}>
              מחיקת משמרת
            </Button>
          )}
        </form>
      </div>
    </PageTransition>
  );
}
