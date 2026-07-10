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
      const { data, error } = await supabase.from('tax_profiles').select('*').single();
      if (error) throw error;
      return data as TaxProfileRow;
    },
  });
}

export function useUpdateTaxProfile() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (updates: TaxProfileUpdate) => {
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('tax_profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      return data as TaxProfileRow;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tax-profile'] }),
  });
}
