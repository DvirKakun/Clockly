import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import type { PayslipFigures } from '@/lib/payslipCompare';
import { useAuthStore } from '@/store/authStore';

export type PayslipRow = Database['public']['Tables']['payslips']['Row'];

/** `month` is 1-12 (calendar), unlike the app's 0-indexed cursor — callers convert at the boundary. */
export function usePayslip(year: number, month: number) {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: ['payslip', userId, year, month],
    enabled: !!userId,
    queryFn: async () => {
      // RLS scopes this to the signed-in user, so (year, month) uniquely identifies their payslip.
      const { data, error } = await supabase
        .from('payslips')
        .select('*')
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();
      if (error) throw error;
      return data as PayslipRow | null;
    },
  });
}

export function useUpsertPayslip() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async ({ year, month, ...values }: PayslipFigures & { year: number; month: number }) => {
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('payslips')
        .upsert(
          { user_id: userId, year, month, ...values, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,year,month' }
        )
        .select()
        .single();
      if (error) throw error;
      return data as PayslipRow;
    },
    onSuccess: (row) => queryClient.invalidateQueries({ queryKey: ['payslip', userId, row.year, row.month] }),
  });
}

export function useDeletePayslip() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async ({ year, month }: { year: number; month: number }) => {
      const { error } = await supabase.from('payslips').delete().eq('year', year).eq('month', month);
      if (error) throw error;
    },
    onSuccess: (_data, { year, month }) =>
      queryClient.invalidateQueries({ queryKey: ['payslip', userId, year, month] }),
  });
}
