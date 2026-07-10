export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      breaks: {
        Row: {
          created_at: string;
          end_time: string;
          id: string;
          is_paid: boolean;
          shift_id: string;
          start_time: string;
        };
        Insert: {
          created_at?: string;
          end_time: string;
          id?: string;
          is_paid?: boolean;
          shift_id: string;
          start_time: string;
        };
        Update: {
          created_at?: string;
          end_time?: string;
          id?: string;
          is_paid?: boolean;
          shift_id?: string;
          start_time?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'breaks_shift_id_fkey';
            columns: ['shift_id'];
            isOneToOne: false;
            referencedRelation: 'shifts';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      shifts: {
        Row: {
          bonuses: number;
          clock_in_at: string | null;
          clock_out_at: string | null;
          created_at: string;
          crosses_midnight: boolean;
          date: string;
          day_type: string;
          end_time: string | null;
          id: string;
          meal_deduction: number;
          notes: string | null;
          other_deduction: number;
          source: string;
          start_time: string;
          tips: number;
          travel_reimbursement: number;
          updated_at: string;
          user_id: string;
          workplace_id: string;
        };
        Insert: {
          bonuses?: number;
          clock_in_at?: string | null;
          clock_out_at?: string | null;
          created_at?: string;
          crosses_midnight?: boolean;
          date: string;
          day_type?: string;
          end_time?: string | null;
          id?: string;
          meal_deduction?: number;
          notes?: string | null;
          other_deduction?: number;
          source?: string;
          start_time: string;
          tips?: number;
          travel_reimbursement?: number;
          updated_at?: string;
          user_id: string;
          workplace_id: string;
        };
        Update: {
          bonuses?: number;
          clock_in_at?: string | null;
          clock_out_at?: string | null;
          created_at?: string;
          crosses_midnight?: boolean;
          date?: string;
          day_type?: string;
          end_time?: string | null;
          id?: string;
          meal_deduction?: number;
          notes?: string | null;
          other_deduction?: number;
          source?: string;
          start_time?: string;
          tips?: number;
          travel_reimbursement?: number;
          updated_at?: string;
          user_id?: string;
          workplace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'shifts_workplace_id_fkey';
            columns: ['workplace_id'];
            isOneToOne: false;
            referencedRelation: 'workplaces';
            referencedColumns: ['id'];
          },
        ];
      };
      tax_profiles: {
        Row: {
          additional_credit_points: number;
          car_value_addition: number;
          created_at: string;
          id: string;
          is_female: boolean;
          is_resident: boolean;
          keren_hishtalmut_opt_in: boolean;
          pension_opt_in: boolean;
          updated_at: string;
        };
        Insert: {
          additional_credit_points?: number;
          car_value_addition?: number;
          created_at?: string;
          id: string;
          is_female?: boolean;
          is_resident?: boolean;
          keren_hishtalmut_opt_in?: boolean;
          pension_opt_in?: boolean;
          updated_at?: string;
        };
        Update: {
          additional_credit_points?: number;
          car_value_addition?: number;
          created_at?: string;
          id?: string;
          is_female?: boolean;
          is_resident?: boolean;
          keren_hishtalmut_opt_in?: boolean;
          pension_opt_in?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      workplaces: {
        Row: {
          color: string;
          created_at: string;
          daily_rate: number | null;
          employment_type: string;
          hourly_rate: number | null;
          id: string;
          is_archived: boolean;
          meal_deduction_default: number | null;
          monthly_salary: number | null;
          name: string;
          standard_weekly_hours: number;
          start_date: string | null;
          travel_daily_cost: number | null;
          updated_at: string;
          user_id: string;
          work_days_per_week: number;
        };
        Insert: {
          color?: string;
          created_at?: string;
          daily_rate?: number | null;
          employment_type?: string;
          hourly_rate?: number | null;
          id?: string;
          is_archived?: boolean;
          meal_deduction_default?: number | null;
          monthly_salary?: number | null;
          name: string;
          standard_weekly_hours?: number;
          start_date?: string | null;
          travel_daily_cost?: number | null;
          updated_at?: string;
          user_id: string;
          work_days_per_week?: number;
        };
        Update: {
          color?: string;
          created_at?: string;
          daily_rate?: number | null;
          employment_type?: string;
          hourly_rate?: number | null;
          id?: string;
          is_archived?: boolean;
          meal_deduction_default?: number | null;
          monthly_salary?: number | null;
          name?: string;
          standard_weekly_hours?: number;
          start_date?: string | null;
          travel_daily_cost?: number | null;
          updated_at?: string;
          user_id?: string;
          work_days_per_week?: number;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
