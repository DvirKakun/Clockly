import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { PageTransition } from '@/components/layout/PageTransition';
import { useWorkplaces } from '@/hooks/useWorkplaces';
import { useCreateShift, useDeleteShift, useShift, useUpdateShift } from '@/hooks/useShifts';

function todayIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

interface BreakField {
  start_time: string;
  end_time: string;
  is_paid: boolean;
}

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
  const [crossesMidnight, setCrossesMidnight] = useState(false);
  const [dayType, setDayType] = useState<'regular' | 'shabbat' | 'holiday'>('regular');
  const [bonuses, setBonuses] = useState('0');
  const [tips, setTips] = useState('0');
  const [travel, setTravel] = useState('0');
  const [meal, setMeal] = useState('0');
  const [notes, setNotes] = useState('');
  const [breaks, setBreaks] = useState<BreakField[]>([]);

  useEffect(() => {
    if (existing) {
      setWorkplaceId(existing.workplace_id);
      setDate(existing.date);
      setStartTime(existing.start_time.slice(0, 5));
      setEndTime(existing.end_time?.slice(0, 5) ?? '17:00');
      setCrossesMidnight(existing.crosses_midnight);
      setDayType(existing.day_type as 'regular' | 'shabbat' | 'holiday');
      setBonuses(String(existing.bonuses));
      setTips(String(existing.tips));
      setTravel(String(existing.travel_reimbursement));
      setMeal(String(existing.meal_deduction));
      setNotes(existing.notes ?? '');
      setBreaks(existing.breaks.map((b) => ({ start_time: b.start_time.slice(0, 5), end_time: b.end_time.slice(0, 5), is_paid: b.is_paid })));
    } else if (workplaces.length > 0 && !workplaceId) {
      setWorkplaceId(workplaces[0].id);
    }
  }, [existing, workplaces, workplaceId]);

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
            <Select label="מקום עבודה" value={workplaceId} onChange={(e) => setWorkplaceId(e.target.value)} required>
              {workplaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>

            <Input label="תאריך" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />

            <div className="grid grid-cols-2 gap-3">
              <Input label="שעת התחלה" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
              <Input label="שעת סיום" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
            </div>

            <Switch
              checked={crossesMidnight}
              onChange={setCrossesMidnight}
              label="משמרת חוצה חצות"
              description="המשמרת מסתיימת ביום שאחרי"
            />

            <Select label="סוג יום" value={dayType} onChange={(e) => setDayType(e.target.value as typeof dayType)}>
              <option value="regular">יום רגיל</option>
              <option value="shabbat">שבת</option>
              <option value="holiday">חג</option>
            </Select>
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
              <div key={i} className="flex items-end gap-2">
                <Input
                  label="התחלה"
                  type="time"
                  value={brk.start_time}
                  onChange={(e) => setBreaks(breaks.map((b, j) => (j === i ? { ...b, start_time: e.target.value } : b)))}
                  className="flex-1"
                />
                <Input
                  label="סיום"
                  type="time"
                  value={brk.end_time}
                  onChange={(e) => setBreaks(breaks.map((b, j) => (j === i ? { ...b, end_time: e.target.value } : b)))}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => setBreaks(breaks.filter((_, j) => j !== i))}
                  className="mb-2 flex h-9 w-9 items-center justify-center rounded-full text-black/30 dark:text-white/30"
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
