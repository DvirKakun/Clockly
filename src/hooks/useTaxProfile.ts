import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import { useAuthStore } from '@/store/authStore';

export type TaxProfileRow = Database['public']['Tables']['tax_profiles']['Row'];
export type TaxProfileUpdate = Database['public']['Tables']['tax_profiles']['Update'];

export function useTaxProfile() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: ['tax-profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      // maybeSingle (not single): a missing row — e.g. if the signup trigger that seeds the
      // tax profile ever failed — returns null instead of throwing and taking down the whole
      // dashboard/reports/settings. Consumers already treat a null profile as "not loaded yet".
      const { data, error } = await supabase.from('tax_profiles').select('*').maybeSingle();
      if (error) throw error;
      return data as TaxProfileRow | null;
    },
  });
}

export function useUpdateTaxProfile() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const queryKey = ['tax-profile', userId];

  return useMutation({
    mutationFn: async (updates: TaxProfileUpdate) => {
      if (!userId) throw new Error('Not authenticated');
      // upsert (not update): if the profile row is somehow missing it's created here rather than
      // silently updating zero rows; the other columns fall back to their schema defaults.
      const { data, error } = await supabase
        .from('tax_profiles')
        .upsert({ id: userId, ...updates })
        .select()
        .single();
      if (error) throw error;
      return data as TaxProfileRow;
    },
    // Optimistic update: toggles (is_resident, pension_opt_in, ...) are read straight from this
    // query, so without this they'd only flip after a full round trip to Supabase — visible lag
    // on every tap. Apply the change to the cache immediately and roll back on failure.
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TaxProfileRow>(queryKey);
      if (previous) {
        queryClient.setQueryData<TaxProfileRow>(queryKey, { ...previous, ...updates });
      }
      return { previous };
    },
    onError: (_err, _updates, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tax-profile'] }),
  });
}
