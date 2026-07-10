import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import { useAuthStore } from '@/store/authStore';

export type ShiftRow = Database['public']['Tables']['shifts']['Row'];
export type BreakRow = Database['public']['Tables']['breaks']['Row'];
export type ShiftWithBreaks = ShiftRow & { breaks: BreakRow[] };
export type ShiftInsert = Database['public']['Tables']['shifts']['Insert'];

export interface ShiftFormValues {
  workplace_id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  crosses_midnight: boolean;
  day_type: 'regular' | 'shabbat' | 'holiday';
  bonuses: number;
  tips: number;
  travel_reimbursement: number;
  meal_deduction: number;
  other_deduction: number;
  notes: string | null;
  breaks: { start_time: string; end_time: string; is_paid: boolean }[];
}

export function useShiftsForRange(startDate: string, endDate: string) {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: ['shifts', userId, startDate, endDate],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*, breaks(*)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });
      if (error) throw error;
      return data as ShiftWithBreaks[];
    },
  });
}

export function useShift(id: string | undefined) {
  return useQuery({
    queryKey: ['shift', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('shifts').select('*, breaks(*)').eq('id', id!).single();
      if (error) throw error;
      return data as ShiftWithBreaks;
    },
  });
}

export function useOpenShift() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: ['open-shift', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*, breaks(*)')
        .is('clock_out_at', null)
        .eq('source', 'clock')
        .maybeSingle();
      if (error) throw error;
      return data as ShiftWithBreaks | null;
    },
    refetchInterval: 60_000,
  });
}

async function insertShift(values: ShiftFormValues, userId: string): Promise<ShiftRow> {
  const { breaks, ...shift } = values;
  const { data: shiftRow, error } = await supabase
    .from('shifts')
    .insert({ ...shift, user_id: userId })
    .select()
    .single();
  if (error) throw error;

  if (breaks.length > 0) {
    const { error: breaksError } = await supabase
      .from('breaks')
      .insert(breaks.map((b) => ({ ...b, shift_id: shiftRow.id })));
    if (breaksError) throw breaksError;
  }
  return shiftRow as ShiftRow;
}

export function useCreateShift() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (values: ShiftFormValues) => {
      if (!userId) throw new Error('Not authenticated');
      return insertShift(values, userId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts'] }),
  });
}

// Sequential inserts (not a single multi-row insert) because Postgres doesn't guarantee
// returned row order matches insertion order without an explicit ORDER BY, and each shift's
// breaks must be attached to the correct returned shift id.
export function useCreateShifts() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (valuesList: ShiftFormValues[]) => {
      if (!userId) throw new Error('Not authenticated');
      const created: ShiftRow[] = [];
      try {
        for (const values of valuesList) {
          created.push(await insertShift(values, userId));
        }
      } catch (err) {
        // Each insert is its own statement, so a failure partway through a recurring batch
        // otherwise leaves earlier weeks committed — clean those up so the whole action is
        // atomic from the user's point of view (breaks cascade-delete with their shift).
        if (created.length > 0) {
          await supabase.from('shifts').delete().in('id', created.map((s) => s.id));
        }
        throw err;
      }
      return created;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts'] }),
  });
}

export function useUpdateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, breaks, ...values }: Partial<ShiftFormValues> & { id: string }) => {
      const { error } = await supabase.from('shifts').update(values).eq('id', id);
      if (error) throw error;

      if (breaks) {
        const { error: deleteError } = await supabase.from('breaks').delete().eq('shift_id', id);
        if (deleteError) throw deleteError;
        if (breaks.length > 0) {
          const { error: insertError } = await supabase
            .from('breaks')
            .insert(breaks.map((b) => ({ ...b, shift_id: id })));
          if (insertError) throw insertError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['open-shift'] });
    },
  });
}

export function useDeleteShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shifts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts'] }),
  });
}

function toLocalTimeString(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

function toLocalDateString(date: Date): string {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function useClockIn() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (workplaceId: string) => {
      if (!userId) throw new Error('Not authenticated');
      const now = new Date();
      const { data, error } = await supabase
        .from('shifts')
        .insert({
          user_id: userId,
          workplace_id: workplaceId,
          date: toLocalDateString(now),
          start_time: toLocalTimeString(now),
          end_time: null,
          clock_in_at: now.toISOString(),
          source: 'clock',
        })
        .select()
        .single();
      if (error) throw error;
      return data as ShiftRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open-shift'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shift: ShiftRow) => {
      const now = new Date();
      const clockInDate = shift.clock_in_at ? new Date(shift.clock_in_at) : now;
      const crossesMidnight = toLocalDateString(now) !== toLocalDateString(clockInDate);
      const { error } = await supabase
        .from('shifts')
        .update({
          end_time: toLocalTimeString(now),
          clock_out_at: now.toISOString(),
          crosses_midnight: crossesMidnight,
        })
        .eq('id', shift.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open-shift'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}
