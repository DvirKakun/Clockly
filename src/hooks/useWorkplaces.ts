import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import { useAuthStore } from '@/store/authStore';

export type Workplace = Database['public']['Tables']['workplaces']['Row'];
export type WorkplaceInsert = Database['public']['Tables']['workplaces']['Insert'];
export type WorkplaceUpdate = Database['public']['Tables']['workplaces']['Update'];

export function useWorkplaces() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: ['workplaces', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workplaces')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Workplace[];
    },
  });
}

export function useCreateWorkplace() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (input: Omit<WorkplaceInsert, 'user_id'>) => {
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('workplaces')
        .insert({ ...input, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data as Workplace;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workplaces'] }),
  });
}

export function useUpdateWorkplace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: WorkplaceUpdate & { id: string }) => {
      const { data, error } = await supabase.from('workplaces').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as Workplace;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workplaces'] }),
  });
}

export function useArchiveWorkplace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workplaces').update({ is_archived: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workplaces'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}
