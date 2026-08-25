import { useMemo, useRef, useState } from 'react';
import { useBlocker, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Info, Moon, Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageTransition } from '@/components/layout/PageTransition';
import { useAllWorkplaces, useWorkplaces, type Workplace } from '@/hooks/useWorkplaces';
import { useGoBack } from '@/hooks/useGoBack';
import {
  useCreateShift,
  useCreateShifts,
  useDeleteShift,
  useShift,
  useUpdateShift,
  type ShiftFormValues,
  type ShiftWithBreaks,
} from '@/hooks/useShifts';
import { DEFAULT_RATES, computeShiftGross, isShiftFullyInShabbat, shiftPartiallyOverlapsShabbat, statutoryHolidayName } from '@/lib/calc';
import { workplaceToRateProfile } from '@/lib/calc/adapters';
import { formatCurrency } from '@/lib/format';
import { formValueToNumber, numberToFormValue } from '@/lib/formNumber';
import { todayIso, weeklyOccurrences } from '@/lib/date';
import { DAY_TYPE_LABELS_HE } from '@/lib/labels';

interface BreakField {
  start_time: string;
  end_time: string;
  is_paid: boolean;
}

type DayType = 'regular' | 'shabbat' | 'holiday';
type DayTypeChoice = 'auto' | DayType;
type Repeat = 'none' | 'weekly';

const MAX_RECURRING_OCCURRENCES = 52;

function detectDayType(date: string, startTime: string, endTime: string, crossesMidnight: boolean): DayType {
  const holiday = statutoryHolidayName(date);
  if (holiday) return 'holiday';
  if (isShiftFullyInShabbat(date, startTime, endTime, crossesMidnight)) return 'shabbat';
  return 'regular';
}

const dayTypeLabels = DAY_TYPE_LABELS_HE;

// Travel reimbursement is a legal entitlement by default (see the note on WorkplacesPage), so a
// workplace with no travel_daily_cost configured (null) still defaults to the legal cap here —
// not to 0. An explicit 0 means the user opted out (e.g. employer-provided transport).
function travelDefaultFor(workplace: { travel_daily_cost: number | null }): number {
  return workplace.travel_daily_cost != null
    ? Math.min(workplace.travel_daily_cost, DEFAULT_RATES.travel.dailyCap)
    : DEFAULT_RATES.travel.dailyCap;
}

/**
 * Fetches the shift being edited (and the workplaces) and only mounts the form once its data is
 * ready, so the fields initialise from the real shift instead of flashing the "new shift" defaults
 * (today's date, 09:00–17:00). In the common path the shift is already in the calendar/list cache
 * (see useShift's initialData) and the workplaces are loaded, so this resolves without a loader.
 */
export function ShiftFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const goBack = useGoBack(id ? `/shifts/${id}` : '/shifts');

  const { data: existing } = useShift(id);
  const { data: workplaces = [], isLoading: loadingWorkplaces } = useWorkplaces();
  // Includes archived workplaces — needed so a shift that still belongs to a since-removed
  // workplace can display/select it correctly instead of falling out of the picker entirely.
  const { data: allWorkplaces = [] } = useAllWorkplaces();

  const notReady = (isEdit && !existing) || (!isEdit && loadingWorkplaces);
  if (notReady) {
    return (
      <PageTransition>
        <div className="flex flex-col gap-4">
          <FormHeader isEdit={isEdit} onBack={goBack} />
          <p className="py-12 text-center text-sm text-black/40 dark:text-white/40">טוען...</p>
        </div>
      </PageTransition>
    );
  }

  return <ShiftForm key={id ?? 'new'} id={id} existing={existing} workplaces={workplaces} allWorkplaces={allWorkplaces} />;
}

function FormHeader({ isEdit, onBack }: { isEdit: boolean; onBack: () => void }) {
  return (
    <header className="flex items-center gap-3 pt-1">
      <button
        onClick={onBack}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-black/5 dark:bg-white/10"
        aria-label="חזרה"
      >
        <ChevronRight size={18} />
      </button>
      <h1 className="text-lg font-bold">{isEdit ? 'עריכת משמרת' : 'משמרת חדשה'}</h1>
    </header>
  );
}

function ShiftForm({
  id,
  existing,
  workplaces,
  allWorkplaces,
}: {
  id: string | undefined;
  existing: ShiftWithBreaks | undefined;
  workplaces: Workplace[];
  allWorkplaces: Workplace[];
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = !!id;

  const createShift = useCreateShift();
  const createShifts = useCreateShifts();
  const updateShift = useUpdateShift();
  const deleteShift = useDeleteShift();

  // Coming from the calendar view's "add shift" action for a selected day pre-fills that date.
  const initialDate = (location.state as { date?: string } | null)?.date;
  // For a new shift the form defaults to the first workplace and pulls its travel/meal defaults.
  const defaultWorkplace = existing ? undefined : workplaces[0];

  // State is initialised straight from the loaded shift (or the new-shift defaults). This component
  // only mounts once that data is available (its parent gates on loading), so there's no separate
  // hydration step and therefore no frame where stale/default values are shown.
  const [workplaceId, setWorkplaceId] = useState(existing?.workplace_id ?? defaultWorkplace?.id ?? '');
  const [date, setDate] = useState(existing?.date ?? initialDate ?? todayIso());
  const [startTime, setStartTime] = useState(existing ? existing.start_time.slice(0, 5) : '09:00');
  const [endTime, setEndTime] = useState(existing ? (existing.end_time?.slice(0, 5) ?? '17:00') : '17:00');
  const [dayTypeChoice, setDayTypeChoice] = useState<DayTypeChoice>(existing ? (existing.day_type as DayType) : 'auto');
  const [bonuses, setBonuses] = useState(numberToFormValue(existing?.bonuses));
  const [tips, setTips] = useState(numberToFormValue(existing?.tips));
  const [travel, setTravel] = useState(
    numberToFormValue(
      existing ? existing.travel_reimbursement : defaultWorkplace ? travelDefaultFor(defaultWorkplace) : 0
    )
  );
  const [meal, setMeal] = useState(
    numberToFormValue(existing ? existing.meal_deduction : (defaultWorkplace?.meal_deduction_default ?? 0))
  );
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [breaks, setBreaks] = useState<BreakField[]>(
    existing
      ? existing.breaks.map((b) => ({ start_time: b.start_time.slice(0, 5), end_time: b.end_time.slice(0, 5), is_paid: b.is_paid }))
      : []
  );
  const [repeat, setRepeat] = useState<Repeat>('none');
  const [repeatUntil, setRepeatUntil] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  // Paging is the first action in this form that can discard edits without leaving the screen,
  // so it has to know whether anything changed. Compared against a snapshot taken on mount;
  // the component is keyed by shift id, so it remounts (and re-snapshots) per shift.
  const currentSnapshot = JSON.stringify({
    workplaceId, date, startTime, endTime, dayTypeChoice, bonuses, tips, travel, meal, notes, breaks,
  });
  const [initialSnapshot] = useState(() => currentSnapshot);
  const isDirty = currentSnapshot !== initialSnapshot;

  // Set immediately before a navigation the user already consented to (saving, deleting), so the
  // blocker below lets it through instead of asking about changes they just committed.
  const skipGuard = useRef(false);

  /**
   * Guards every way out of the form, not just paging between shifts: the in-app back arrow, a
   * bottom-nav tab, the browser Back button, and the Android system Back button in the installed
   * PWA all route through here. Intercepting a Back navigation is the reason the app uses a data
   * router at all — see the note in App.tsx.
   */
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (skipGuard.current) return false;
    return isDirty && currentLocation.pathname !== nextLocation.pathname;
  });

  // Same guard. This is a real navigation, so the blocker above still intercepts it when dirty.
  const goBack = useGoBack(isEdit && id ? `/shifts/${id}` : '/shifts');

  const selectedWorkplace = allWorkplaces.find((w) => w.id === workplaceId);
  const isSelectedWorkplaceArchived = isEdit && !!selectedWorkplace?.is_archived;

  const occurrenceDates = useMemo(
    () => (repeat === 'weekly' && repeatUntil ? weeklyOccurrences(date, repeatUntil, MAX_RECURRING_OCCURRENCES) : []),
    [repeat, repeatUntil, date]
  );
  const tooManyOccurrences = occurrenceDates.length > MAX_RECURRING_OCCURRENCES;

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

  function handleWorkplaceChange(newWorkplaceId: string) {
    setWorkplaceId(newWorkplaceId);
    if (isEdit) return; // don't override a saved shift's own recorded travel/meal values
    const workplace = workplaces.find((w) => w.id === newWorkplaceId);
    if (workplace) {
      setTravel(numberToFormValue(travelDefaultFor(workplace)));
    }
    if (workplace?.meal_deduction_default != null) {
      setMeal(numberToFormValue(workplace.meal_deduction_default));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const baseValues = {
      workplace_id: workplaceId,
      start_time: startTime,
      end_time: endTime,
      crosses_midnight: crossesMidnight,
      bonuses: formValueToNumber(bonuses),
      tips: formValueToNumber(tips),
      travel_reimbursement: formValueToNumber(travel),
      meal_deduction: formValueToNumber(meal),
      other_deduction: 0,
      notes: notes || null,
      breaks,
    };

    try {
      let createdId: string | null = null;
      if (isEdit && id) {
        await updateShift.mutateAsync({ id, ...baseValues, date, day_type: dayType });
      } else if (repeat === 'weekly' && repeatUntil) {
        if (repeatUntil <= date) {
          setError('תאריך הסיום של החזרה צריך להיות אחרי תאריך המשמרת');
          return;
        }
        if (tooManyOccurrences) {
          setError(`חזרה שבועית מוגבלת ל-${MAX_RECURRING_OCCURRENCES} משמרות — קצרו את טווח התאריכים`);
          return;
        }
        // Only the first occurrence keeps a manual day-type override; every later week gets its
        // own date, so its Shabbat/holiday status is re-detected rather than copying week one's.
        const valuesList: ShiftFormValues[] = occurrenceDates.map((occDate) => ({
          ...baseValues,
          date: occDate,
          day_type: occDate === date ? dayType : detectDayType(occDate, startTime, endTime, crossesMidnight),
        }));
        await createShifts.mutateAsync(valuesList);
      } else {
        const created = await createShift.mutateAsync({ ...baseValues, date, day_type: dayType });
        createdId = created.id;
      }
      skipGuard.current = true;
      // Back to the shift's summary so the user immediately sees what the edit did. A recurring
      // batch has no single shift to show, so that returns to the list.
      const destination = isEdit && id ? `/shifts/${id}` : createdId ? `/shifts/${createdId}` : '/shifts';
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'משהו השתבש, נסה/י שוב');
    }
  }

  async function handleDelete() {
    if (id) {
      await deleteShift.mutateAsync(id);
      skipGuard.current = true;
      navigate('/shifts');
    }
  }

  return (
    <PageTransition>
      <div className="flex flex-col gap-4">
        <FormHeader isEdit={isEdit} onBack={goBack} />

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <Select label="מקום עבודה" value={workplaceId} onChange={(e) => handleWorkplaceChange(e.target.value)} required>
              {workplaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
              {isSelectedWorkplaceArchived && selectedWorkplace && (
                <option value={selectedWorkplace.id}>{selectedWorkplace.name} (הוסר)</option>
              )}
            </Select>
            {isSelectedWorkplaceArchived && (
              <p className="-mt-2 text-xs text-black/40 dark:text-white/40">
                מקום העבודה הזה הוסר. אפשר לבחור מקום עבודה אחר מהרשימה כדי לשייך את המשמרת אליו.
              </p>
            )}

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

          {!isEdit && (
            <Card className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold">חזרה על משמרת</h2>
              <Select label="תדירות" value={repeat} onChange={(e) => setRepeat(e.target.value as Repeat)}>
                <option value="none">חד פעמית</option>
                <option value="weekly">כל שבוע, באותו יום</option>
              </Select>
              {repeat === 'weekly' && (
                <>
                  <Input
                    label="חזרה עד תאריך"
                    type="date"
                    dir="ltr"
                    min={date}
                    value={repeatUntil}
                    onChange={(e) => setRepeatUntil(e.target.value)}
                    required
                  />
                  {repeatUntil && (
                    <p className="-mt-2 text-xs text-black/40 dark:text-white/40">
                      {tooManyOccurrences
                        ? `הטווח שנבחר יוצר יותר מ-${MAX_RECURRING_OCCURRENCES} משמרות — קצרו את התאריך`
                        : repeatUntil <= date
                          ? 'תאריך הסיום צריך להיות אחרי תאריך המשמרת'
                          : `ייווצרו ${occurrenceDates.length} משמרות, כולל התאריך שנבחר למעלה. סוג היום (רגיל/שבת/חג) יזוהה בנפרד לכל תאריך.`}
                    </p>
                  )}
                </>
              )}
            </Card>
          )}

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
                  className="mt-6 flex h-11 w-11 items-center justify-center rounded-full text-black/30 dark:text-white/30"
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
              <Input
                label="בונוס (₪)"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={bonuses}
                onChange={(e) => setBonuses(e.target.value)}
              />
              <Input
                label="טיפים (₪)"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={tips}
                onChange={(e) => setTips(e.target.value)}
              />
              <Input
                label="נסיעות (₪)"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={travel}
                onChange={(e) => setTravel(e.target.value)}
              />
              <Input
                label="ניכוי ארוחות (₪)"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={meal}
                onChange={(e) => setMeal(e.target.value)}
              />
            </div>
            <p className="-mt-2 text-xs text-black/40 dark:text-white/40">
              דמי הנסיעות וניכוי הארוחות ממולאים אוטומטית לפי ההגדרות במקום העבודה (דמי
              הנסיעות עד לתקרה החוקית), וניתן לשנות כל אחד מהם לכל משמרת בנפרד.
            </p>
            <Input label="הערות" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Card>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button
            type="submit"
            fullWidth
            disabled={
              !workplaceId ||
              createShift.isPending ||
              createShifts.isPending ||
              updateShift.isPending ||
              (repeat === 'weekly' && !!repeatUntil && (repeatUntil <= date || tooManyOccurrences))
            }
          >
            שמירה
          </Button>
          {isEdit && (
            <Button type="button" variant="danger" fullWidth onClick={() => setConfirmDelete(true)}>
              מחיקת משמרת
            </Button>
          )}
        </form>

        <ConfirmDialog
          open={blocker.state === 'blocked'}
          title="יש שינויים שלא נשמרו"
          message="היציאה מהמסך תבטל את השינויים שביצעת במשמרת הזו."
          confirmLabel="יציאה בלי לשמור"
          cancelLabel="הישארות"
          onConfirm={() => blocker.proceed?.()}
          onCancel={() => blocker.reset?.()}
        />

        <ConfirmDialog
          open={confirmDelete}
          title="מחיקת משמרת"
          message="למחוק את המשמרת הזו? לא ניתן לשחזר משמרת שנמחקה."
          confirmLabel="מחיקה"
          onConfirm={() => {
            setConfirmDelete(false);
            handleDelete();
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      </div>
    </PageTransition>
  );
}
