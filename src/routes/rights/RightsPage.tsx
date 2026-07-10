import { useNavigate } from 'react-router-dom';
import { differenceInMonths, differenceInYears } from 'date-fns';
import { ChevronRight, Info } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageTransition } from '@/components/layout/PageTransition';
import { useWorkplaces, type Workplace } from '@/hooks/useWorkplaces';
import {
  annualLeaveDays,
  isEligibleForHolidayPay,
  monthlyLeaveAccrual,
  recoveryPayDays,
  sickLeaveAccrual,
  DEFAULT_RATES,
} from '@/lib/calc';
import { formatCurrency } from '@/lib/format';

function formatSeniority(months: number): string {
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'שנה' : 'שנים'}`);
  if (remMonths > 0 || years === 0) parts.push(`${remMonths} ${remMonths === 1 ? 'חודש' : 'חודשים'}`);
  return parts.join(' ו-');
}

export function RightsPage() {
  const navigate = useNavigate();
  const { data: workplaces = [], isLoading } = useWorkplaces();

  return (
    <PageTransition>
      <div className="flex flex-col gap-4">
        <header className="flex items-center gap-3 pt-1">
          <button
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/5 dark:bg-white/10"
            aria-label="חזרה"
          >
            <ChevronRight size={18} />
          </button>
          <h1 className="text-lg font-bold">זכויות עובד</h1>
        </header>

        <Card className="flex gap-2.5 bg-brand-50 dark:bg-brand-500/10">
          <Info size={18} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-300" />
          <p className="text-xs leading-relaxed text-brand-800 dark:text-brand-200">
            הצבירה מוצגת בהנחת משרה מלאה, לפי תאריך תחילת העבודה שהוזן לכל מקום עבודה. זהו אומדן לפי החוק
            ואינו מהווה תחליף לתלוש השכר או לייעוץ משפטי.
          </p>
        </Card>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-black/40 dark:text-white/40">טוען...</p>
        ) : workplaces.length === 0 ? (
          <Card className="py-8 text-center text-sm text-black/50 dark:text-white/50">אין עדיין מקומות עבודה</Card>
        ) : (
          workplaces.map((w) => <WorkplaceRights key={w.id} workplace={w} />)
        )}
      </div>
    </PageTransition>
  );
}

function WorkplaceRights({ workplace }: { workplace: Workplace }) {
  const navigate = useNavigate();

  if (!workplace.start_date) {
    return (
      <Card className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: workplace.color }} />
          <span className="font-medium">{workplace.name}</span>
        </div>
        <p className="text-sm text-black/50 dark:text-white/50">
          לא הוגדר תאריך תחילת עבודה, ולכן לא ניתן לחשב זכויות.
        </p>
        <Button variant="secondary" onClick={() => navigate('/workplaces')}>
          הוספת תאריך תחילת עבודה
        </Button>
      </Card>
    );
  }

  const start = new Date(workplace.start_date);
  const today = new Date();
  const seniorityMonths = Math.max(0, differenceInMonths(today, start));
  const seniorityYears = Math.max(0, differenceInYears(today, start));

  const leaveDaysPerYear = annualLeaveDays(seniorityYears);
  const monthlyAccrual = monthlyLeaveAccrual(seniorityYears);
  const sickDays = sickLeaveAccrual(seniorityMonths);
  const holidayEligible = isEligibleForHolidayPay(seniorityMonths);

  const recoveryEligible = seniorityYears >= 1;
  const recoveryDays = recoveryPayDays(seniorityYears);
  const recoveryAmount = recoveryDays * DEFAULT_RATES.recoveryPay.dailyRate;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: workplace.color }} />
          <span className="font-medium">{workplace.name}</span>
        </div>
        <span className="text-xs text-black/40 dark:text-white/40">ותק: {formatSeniority(seniorityMonths)}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <RightStat label="חופשה שנתית" value={`${leaveDaysPerYear} ימים`} sub={`צבירה: ${monthlyAccrual.toFixed(2)}/חודש`} />
        <RightStat label="ימי מחלה שנצברו" value={`${sickDays.toFixed(1)} ימים`} sub="מתוך 90 מקסימום" />
        <RightStat
          label="דמי הבראה"
          value={recoveryEligible ? formatCurrency(recoveryAmount) : 'טרם זכאי/ה'}
          sub={recoveryEligible ? `${recoveryDays} ימים × ₪${DEFAULT_RATES.recoveryPay.dailyRate}` : 'נדרשת שנת עבודה מלאה'}
        />
        <RightStat
          label="דמי חגים"
          value={holidayEligible ? 'זכאי/ה' : 'טרם זכאי/ה'}
          sub={holidayEligible ? 'בכפוף לאי-היעדרות סמוך לחג' : 'נדרשים 3 חודשי ותק'}
        />
      </div>
    </Card>
  );
}

function RightStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
      <p className="text-xs text-black/50 dark:text-white/50">{label}</p>
      <p className="text-[15px] font-semibold">{value}</p>
      <p className="text-[11px] text-black/40 dark:text-white/40">{sub}</p>
    </div>
  );
}
