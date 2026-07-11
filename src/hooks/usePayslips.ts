import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import type { PayslipFigures } from '@/lib/payslipCompare';
import { useAuthStore } from '@/store/authStore';

export type PayslipRow = Database['public']['Tables']['payslips']['Row'];

/**
 * A payslip is per-workplace: someone with two jobs gets two payslips a month. `month` is 1-12
 * (calendar), unlike the app's 0-indexed cursor — callers convert at the boundary.
 */
export function usePayslip(workplaceId: string | undefined, year: number, month: number) {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: ['payslip', userId, workplaceId, year, month],
    enabled: !!userId && !!workplaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payslips')
        .select('*')
        .eq('workplace_id', workplaceId!)
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
    mutationFn: async ({
      workplaceId,
      year,
      month,
      ...values
    }: PayslipFigures & { workplaceId: string; year: number; month: number }) => {
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('payslips')
        .upsert(
          { user_id: userId, workplace_id: workplaceId, year, month, ...values, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,workplace_id,year,month' }
        )
        .select()
        .single();
      if (error) throw error;
      return data as PayslipRow;
    },
    onSuccess: (row) =>
      queryClient.invalidateQueries({ queryKey: ['payslip', userId, row.workplace_id, row.year, row.month] }),
  });
}

export function useDeletePayslip() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async ({ workplaceId, year, month }: { workplaceId: string; year: number; month: number }) => {
      const { error } = await supabase
        .from('payslips')
        .delete()
        .eq('workplace_id', workplaceId)
        .eq('year', year)
        .eq('month', month);
      if (error) throw error;
    },
    onSuccess: (_data, { workplaceId, year, month }) =>
      queryClient.invalidateQueries({ queryKey: ['payslip', userId, workplaceId, year, month] }),
  });
}
