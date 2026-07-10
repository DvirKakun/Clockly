import { useEffect, useState } from 'react';
import { LogOut, Moon, Sun, SunMoon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { PageTransition } from '@/components/layout/PageTransition';
import { useTaxProfile, useUpdateTaxProfile } from '@/hooks/useTaxProfile';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useThemeStore, type ThemeMode } from '@/store/themeStore';
import { supabase } from '@/lib/supabase/client';

export function SettingsPage() {
  const { data: taxProfile } = useTaxProfile();
  const updateTaxProfile = useUpdateTaxProfile();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { mode, setMode } = useThemeStore();

  const [fullName, setFullName] = useState('');
  const [additionalPoints, setAdditionalPoints] = useState('0');
  const [carValue, setCarValue] = useState('0');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
    }
  }, [profile]);

  useEffect(() => {
    if (taxProfile) {
      setAdditionalPoints(String(taxProfile.additional_credit_points));
      setCarValue(String(taxProfile.car_value_addition));
    }
  }, [taxProfile]);

  return (
    <PageTransition>
      <div className="flex flex-col gap-4">
        <header className="pt-1">
          <h1 className="text-lg font-bold">הגדרות</h1>
        </header>

        <Card className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">פרופיל</h2>
          <Input
            label="שם מלא"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            onBlur={() => updateProfile.mutate({ full_name: fullName })}
          />
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">פרופיל מס</h2>

          {taxProfile && (
            <>
              <Switch
                checked={taxProfile.is_resident}
                onChange={(v) => updateTaxProfile.mutate({ is_resident: v })}
                label="תושב/ת ישראל"
                description="2.25 נקודות זיכוי"
              />
              <Switch
                checked={taxProfile.is_female}
                onChange={(v) => updateTaxProfile.mutate({ is_female: v })}
                label="אישה"
                description="0.5 נקודות זיכוי נוספות"
              />
              <Input
                label="נקודות זיכוי נוספות"
                type="number"
                step="0.25"
                value={additionalPoints}
                onChange={(e) => setAdditionalPoints(e.target.value)}
                onBlur={() => updateTaxProfile.mutate({ additional_credit_points: Number(additionalPoints) || 0 })}
              />
              <p className="-mt-2 text-xs text-black/40 dark:text-white/40">
                עבור ילדים, עולה חדש, חייל משוחרר, תואר אקדמי או יישוב מזכה — לפי המחשבון הרשמי של רשות המסים.
              </p>

              <Switch
                checked={taxProfile.pension_opt_in}
                onChange={(v) => updateTaxProfile.mutate({ pension_opt_in: v })}
                label="הפרשת פנסיה"
                description="6% ניכוי עובד"
              />
              <Switch
                checked={taxProfile.keren_hishtalmut_opt_in}
                onChange={(v) => updateTaxProfile.mutate({ keren_hishtalmut_opt_in: v })}
                label="קרן השתלמות"
                description="2.5% ניכוי עובד"
              />
              <Input
                label="שווי רכב צמוד (₪ לחודש)"
                type="number"
                value={carValue}
                onChange={(e) => setCarValue(e.target.value)}
                onBlur={() => updateTaxProfile.mutate({ car_value_addition: Number(carValue) || 0 })}
              />
            </>
          )}
        </Card>

        <Card className="flex flex-col gap-2">
          <h2 className="mb-1 text-sm font-semibold text-black/60 dark:text-white/60">תצוגה</h2>
          <div className="flex gap-2">
            <ThemeOption mode="light" current={mode} onSelect={setMode} icon={Sun} label="בהיר" />
            <ThemeOption mode="dark" current={mode} onSelect={setMode} icon={Moon} label="כהה" />
            <ThemeOption mode="system" current={mode} onSelect={setMode} icon={SunMoon} label="מערכת" />
          </div>
        </Card>

        <Button variant="secondary" fullWidth onClick={() => supabase.auth.signOut()}>
          <LogOut size={16} /> התנתקות
        </Button>
      </div>
    </PageTransition>
  );
}

function ThemeOption({
  mode,
  current,
  onSelect,
  icon: Icon,
  label,
}: {
  mode: ThemeMode;
  current: ThemeMode;
  onSelect: (m: ThemeMode) => void;
  icon: typeof Sun;
  label: string;
}) {
  const active = current === mode;
  return (
    <button
      onClick={() => onSelect(mode)}
      className={`flex flex-1 flex-col items-center gap-1 rounded-2xl border py-3 text-xs font-medium ${
        active
          ? 'border-brand-400 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-200'
          : 'border-black/10 text-black/50 dark:border-white/10 dark:text-white/50'
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}
