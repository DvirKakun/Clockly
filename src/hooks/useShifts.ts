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

// The range lists are keyed ['shifts', userId, startDate, endDate]. These helpers let the
// optimistic mutations place a shift into exactly the cached ranges whose window covers its date
// — so an edit that moves a shift to another month drops it from the old month and (if that range
// is cached) adds it to the new one, instead of leaving it stranded in the wrong list.
function rangeOfShiftKey(key: readonly unknown[]): [string | undefined, string | undefined] {
  return [key[2] as string | undefined, key[3] as string | undefined];
}
function dateInRange(date: string, start: string | undefined, end: string | undefined): boolean {
  return (start == null || date >= start) && (end == null || date <= end);
}

export function useShiftsForRange(startDate: string, endDate: string, enabled = true) {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: ['shifts', userId, startDate, endDate],
    enabled: !!userId && enabled,
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
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['shift', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('shifts').select('*, breaks(*)').eq('id', id!).single();
      if (error) throw error;
      return data as ShiftWithBreaks;
    },
    // Opening a shift from the calendar/list is instant: the row (with its breaks) is already in
    // a cached range query, so seed the form from there instead of flashing its blank defaults
    // while a fresh fetch runs. initialDataUpdatedAt carries the source query's age so a genuinely
    // stale cache still refetches on mount rather than being pinned as fresh.
    initialData: () => {
      if (!id) return undefined;
      for (const [, list] of queryClient.getQueriesData<ShiftWithBreaks[]>({ queryKey: ['shifts'] })) {
        const found = list?.find((s) => s.id === id);
        if (found) return found;
      }
      return undefined;
    },
    initialDataUpdatedAt: () => {
      if (!id) return undefined;
      let latest: number | undefined;
      for (const query of queryClient.getQueryCache().findAll({ queryKey: ['shifts'] })) {
        const list = query.state.data as ShiftWithBreaks[] | undefined;
        if (list?.some((s) => s.id === id)) latest = Math.max(latest ?? 0, query.state.dataUpdatedAt);
      }
      return latest;
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
    // Optimistically drop the new shift into every cached range that covers its date, so it shows
    // on the calendar/list the instant you save instead of after a refetch. The server row (with
    // its real id and any computed columns) replaces this temporary one on settle.
    onMutate: async (values) => {
      if (!userId) return { previousLists: [] as [readonly unknown[], ShiftWithBreaks[] | undefined][] };
      await queryClient.cancelQueries({ queryKey: ['shifts'] });
      const previousLists = queryClient.getQueriesData<ShiftWithBreaks[]>({ queryKey: ['shifts'] });

      const now = new Date().toISOString();
      const { breaks, ...shift } = values;
      const optimistic: ShiftWithBreaks = {
        id: `optimistic-${Date.now()}`,
        user_id: userId,
        clock_in_at: null,
        clock_out_at: null,
        source: 'manual',
        created_at: now,
        updated_at: now,
        ...shift,
        breaks: breaks.map((b, i) => ({
          id: `optimistic-b-${i}`,
          shift_id: 'optimistic',
          start_time: b.start_time,
          end_time: b.end_time,
          is_paid: b.is_paid,
          created_at: now,
        })),
      };

      for (const [key, list] of previousLists) {
        if (!Array.isArray(list)) continue;
        const [start, end] = rangeOfShiftKey(key);
        if (dateInRange(optimistic.date, start, end)) queryClient.setQueryData(key, [...list, optimistic]);
      }
      return { previousLists };
    },
    onError: (_err, _values, context) => {
      context?.previousLists.forEach(([key, list]) => queryClient.setQueryData(key, list));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['shifts'] }),
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
    // Optimistically patch the edited shift into the detail cache and every cached range list, so
    // the calendar/list and the edit form reflect the change immediately — and, just as important,
    // reopening the form never shows the pre-edit values while the refetch is still in flight.
    onMutate: async ({ id, breaks, ...values }) => {
      await queryClient.cancelQueries({ queryKey: ['shift', id] });
      await queryClient.cancelQueries({ queryKey: ['shifts'] });

      const previousDetail = queryClient.getQueryData<ShiftWithBreaks>(['shift', id]);
      const previousLists = queryClient.getQueriesData<ShiftWithBreaks[]>({ queryKey: ['shifts'] });

      const patch = (shift: ShiftWithBreaks): ShiftWithBreaks => ({
        ...shift,
        ...values,
        breaks: breaks
          ? breaks.map((b, i) => ({
              id: `optimistic-${i}`,
              shift_id: id,
              start_time: b.start_time,
              end_time: b.end_time,
              is_paid: b.is_paid,
              created_at: new Date().toISOString(),
            }))
          : shift.breaks,
      });

      if (previousDetail) queryClient.setQueryData(['shift', id], patch(previousDetail));

      // Patch, using whichever cached copy we have as the base so lists that didn't hold the shift
      // can still receive it when an edit moves its date into their range.
      const base = previousDetail ?? previousLists.flatMap(([, l]) => l ?? []).find((s) => s.id === id);
      const patched = base ? patch(base) : undefined;
      for (const [key, list] of previousLists) {
        if (!Array.isArray(list)) continue;
        const without = list.filter((s) => s.id !== id);
        const [start, end] = rangeOfShiftKey(key);
        if (patched && dateInRange(patched.date, start, end)) {
          queryClient.setQueryData(key, [...without, patched]);
        } else {
          queryClient.setQueryData(key, without);
        }
      }

      return { previousDetail, previousLists };
    },
    onError: (_err, { id }, context) => {
      if (!context) return;
      if (context.previousDetail) queryClient.setQueryData(['shift', id], context.previousDetail);
      for (const [key, list] of context.previousLists) queryClient.setQueryData(key, list);
    },
    // Reconcile with the server (server-computed columns, real break ids) once the write lands.
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['open-shift'] });
      queryClient.invalidateQueries({ queryKey: ['shift', id] });
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
    // Remove the shift from every cached list immediately so it disappears from the calendar/list
    // on tap rather than after a refetch; restore all lists on failure.
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['shifts'] });
      const previousLists = queryClient.getQueriesData<ShiftWithBreaks[]>({ queryKey: ['shifts'] });
      for (const [key, list] of previousLists) {
        if (Array.isArray(list)) queryClient.setQueryData(key, list.filter((s) => s.id !== id));
      }
      return { previousLists };
    },
    onError: (_err, _id, context) => {
      context?.previousLists.forEach(([key, list]) => queryClient.setQueryData(key, list));
    },
    onSettled: (_data, _err, id) => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.removeQueries({ queryKey: ['shift', id] });
    },
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
