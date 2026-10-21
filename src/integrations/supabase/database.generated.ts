export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      barber_schedules: {
        Row: {
          employee_id: string;
          exceptions: Json;
          revision: number;
          updated_at: string;
          weekly: Json;
        };
        Insert: {
          employee_id: string;
          exceptions?: Json;
          revision?: number;
          updated_at?: string;
          weekly?: Json;
        };
        Update: {
          employee_id?: string;
          exceptions?: Json;
          revision?: number;
          updated_at?: string;
          weekly?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'barber_schedules_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: true;
            referencedRelation: 'employee_details';
            referencedColumns: ['employee_id'];
          },
        ];
      };
      barber_services: {
        Row: {
          assigned_at: string;
          employee_id: string;
          service_id: string;
        };
        Insert: {
          assigned_at?: string;
          employee_id: string;
          service_id: string;
        };
        Update: {
          assigned_at?: string;
          employee_id?: string;
          service_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'barber_services_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employee_details';
            referencedColumns: ['employee_id'];
          },
          {
            foreignKeyName: 'barber_services_service_id_fkey';
            columns: ['service_id'];
            isOneToOne: false;
            referencedRelation: 'service_catalog';
            referencedColumns: ['id'];
          },
        ];
      };
      branch_expense_audit: {
        Row: {
          action: string;
          actor_id: string | null;
          after_data: Json | null;
          before_data: Json | null;
          branch_id: string;
          created_at: string;
          expense_id: string;
          id: number;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          branch_id: string;
          created_at?: string;
          expense_id: string;
          id?: never;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          branch_id?: string;
          created_at?: string;
          expense_id?: string;
          id?: never;
        };
        Relationships: [
          {
            foreignKeyName: 'branch_expense_audit_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'branch_expense_audit_expense_id_fkey';
            columns: ['expense_id'];
            isOneToOne: false;
            referencedRelation: 'branch_expenses';
            referencedColumns: ['id'];
          },
        ];
      };
      branch_expenses: {
        Row: {
          amount_cents: number;
          branch_id: string;
          category: string;
          created_at: string;
          description: string;
          id: string;
          method: string;
          notes: string;
          operation_id: string;
          paid_on: string;
          recorded_by: string;
          void_reason: string | null;
          voided_at: string | null;
          voided_by: string | null;
        };
        Insert: {
          amount_cents: number;
          branch_id: string;
          category: string;
          created_at?: string;
          description: string;
          id?: string;
          method: string;
          notes?: string;
          operation_id: string;
          paid_on: string;
          recorded_by: string;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
        };
        Update: {
          amount_cents?: number;
          branch_id?: string;
          category?: string;
          created_at?: string;
          description?: string;
          id?: string;
          method?: string;
          notes?: string;
          operation_id?: string;
          paid_on?: string;
          recorded_by?: string;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'branch_expenses_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
        ];
      };
      branch_services: {
        Row: {
          active: boolean;
          branch_id: string;
          price_cents: number | null;
          service_id: string;
        };
        Insert: {
          active?: boolean;
          branch_id: string;
          price_cents?: number | null;
          service_id: string;
        };
        Update: {
          active?: boolean;
          branch_id?: string;
          price_cents?: number | null;
          service_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'branch_services_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'branch_services_service_id_fkey';
            columns: ['service_id'];
            isOneToOne: false;
            referencedRelation: 'service_catalog';
            referencedColumns: ['id'];
          },
        ];
      };
      branches: {
        Row: {
          active: boolean;
          address: string;
          created_at: string;
          id: string;
          name: string;
          phone: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          address?: string;
          created_at?: string;
          id?: string;
          name: string;
          phone?: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          address?: string;
          created_at?: string;
          id?: string;
          name?: string;
          phone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cash_payments: {
        Row: {
          amount_cents: number;
          barber_name: string;
          branch_id: string;
          branch_name: string;
          created_at: string;
          employee_id: string;
          id: string;
          method: string;
          notes: string;
          paid_at: string;
          recorded_by: string;
          reference: string;
          request_id: string;
          sale_payload: Json | null;
          service_id: string;
          service_name: string;
          void_reason: string | null;
          voided_at: string | null;
          voided_by: string | null;
        };
        Insert: {
          amount_cents: number;
          barber_name: string;
          branch_id: string;
          branch_name: string;
          created_at?: string;
          employee_id: string;
          id?: string;
          method: string;
          notes?: string;
          paid_at: string;
          recorded_by: string;
          reference?: string;
          request_id: string;
          sale_payload?: Json | null;
          service_id: string;
          service_name: string;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
        };
        Update: {
          amount_cents?: number;
          barber_name?: string;
          branch_id?: string;
          branch_name?: string;
          created_at?: string;
          employee_id?: string;
          id?: string;
          method?: string;
          notes?: string;
          paid_at?: string;
          recorded_by?: string;
          reference?: string;
          request_id?: string;
          sale_payload?: Json | null;
          service_id?: string;
          service_name?: string;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'cash_payments_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cash_payments_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employee_details';
            referencedColumns: ['employee_id'];
          },
          {
            foreignKeyName: 'cash_payments_service_id_fkey';
            columns: ['service_id'];
            isOneToOne: false;
            referencedRelation: 'employee_services';
            referencedColumns: ['id'];
          },
        ];
      };
      employee_adjustments: {
        Row: {
          amount_cents: number;
          created_at: string;
          description: string;
          employee_id: string;
          id: string;
          kind: string;
          period: string;
          recorded_by: string | null;
          void_reason: string | null;
          voided_at: string | null;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          description: string;
          employee_id: string;
          id?: string;
          kind: string;
          period: string;
          recorded_by?: string | null;
          void_reason?: string | null;
          voided_at?: string | null;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          description?: string;
          employee_id?: string;
          id?: string;
          kind?: string;
          period?: string;
          recorded_by?: string | null;
          void_reason?: string | null;
          voided_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'employee_adjustments_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employee_details';
            referencedColumns: ['employee_id'];
          },
        ];
      };
      employee_audit: {
        Row: {
          action: string;
          actor_id: string | null;
          after_data: Json | null;
          before_data: Json | null;
          created_at: string;
          employee_id: string;
          entity: string;
          id: number;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          created_at?: string;
          employee_id: string;
          entity: string;
          id?: never;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          created_at?: string;
          employee_id?: string;
          entity?: string;
          id?: never;
        };
        Relationships: [
          {
            foreignKeyName: 'employee_audit_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      employee_compensation: {
        Row: {
          beard_percent: number | null;
          commission_percent: number;
          created_at: string;
          cut_percent: number | null;
          effective_from: string;
          employee_id: string;
          id: string;
          monthly_fixed_cents: number;
          other_percent: number | null;
        };
        Insert: {
          beard_percent?: number | null;
          commission_percent?: number;
          created_at?: string;
          cut_percent?: number | null;
          effective_from: string;
          employee_id: string;
          id?: string;
          monthly_fixed_cents?: number;
          other_percent?: number | null;
        };
        Update: {
          beard_percent?: number | null;
          commission_percent?: number;
          created_at?: string;
          cut_percent?: number | null;
          effective_from?: string;
          employee_id?: string;
          id?: string;
          monthly_fixed_cents?: number;
          other_percent?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'employee_compensation_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employee_details';
            referencedColumns: ['employee_id'];
          },
        ];
      };
      employee_details: {
        Row: {
          active: boolean;
          created_at: string;
          employee_id: string;
          employee_number: number;
          hire_date: string;
          notes: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          employee_id: string;
          employee_number?: never;
          hire_date?: string;
          notes?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          employee_id?: string;
          employee_number?: never;
          hire_date?: string;
          notes?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'employee_details_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      employee_services: {
        Row: {
          amount_cents: number;
          branch_id: string | null;
          branch_name: string | null;
          category: string;
          commission_cents: number | null;
          commission_percent: number;
          created_at: string;
          employee_id: string;
          id: string;
          notes: string;
          performed_at: string;
          recorded_by: string | null;
          service_id: string | null;
          service_name: string;
          void_reason: string | null;
          voided_at: string | null;
        };
        Insert: {
          amount_cents: number;
          branch_id?: string | null;
          branch_name?: string | null;
          category: string;
          commission_cents?: number | null;
          commission_percent: number;
          created_at?: string;
          employee_id: string;
          id?: string;
          notes?: string;
          performed_at: string;
          recorded_by?: string | null;
          service_id?: string | null;
          service_name: string;
          void_reason?: string | null;
          voided_at?: string | null;
        };
        Update: {
          amount_cents?: number;
          branch_id?: string | null;
          branch_name?: string | null;
          category?: string;
          commission_cents?: number | null;
          commission_percent?: number;
          created_at?: string;
          employee_id?: string;
          id?: string;
          notes?: string;
          performed_at?: string;
          recorded_by?: string | null;
          service_id?: string | null;
          service_name?: string;
          void_reason?: string | null;
          voided_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'employee_services_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employee_services_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employee_details';
            referencedColumns: ['employee_id'];
          },
          {
            foreignKeyName: 'employee_services_service_id_fkey';
            columns: ['service_id'];
            isOneToOne: false;
            referencedRelation: 'service_catalog';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          branch_id: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          phone: string | null;
          role: Database['public']['Enums']['app_role'] | null;
          updated_at: string;
          username: string | null;
        };
        Insert: {
          branch_id?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          role?: Database['public']['Enums']['app_role'] | null;
          updated_at?: string;
          username?: string | null;
        };
        Update: {
          branch_id?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          role?: Database['public']['Enums']['app_role'] | null;
          updated_at?: string;
          username?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
        ];
      };
      service_catalog: {
        Row: {
          active: boolean;
          category: string;
          created_at: string;
          description: string;
          duration_minutes: number;
          id: string;
          name: string;
          price_cents: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          category?: string;
          created_at?: string;
          description?: string;
          duration_minutes: number;
          id?: string;
          name: string;
          price_cents?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          category?: string;
          created_at?: string;
          description?: string;
          duration_minutes?: number;
          id?: string;
          name?: string;
          price_cents?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_access_cash_branch: {
        Args: { target_branch: string };
        Returns: boolean;
      };
      collect_service_payment: {
        Args: {
          operation_id: string;
          payment_at: string;
          payment_method: string;
          payment_notes?: string;
          payment_reference?: string;
          target_service: string;
        };
        Returns: string;
      };
      get_barber_dashboard: { Args: { week_start: string }; Returns: Json };
      get_barber_portal: { Args: never; Returns: Json };
      get_barber_service_history: {
        Args: { page_number?: number; week_start: string };
        Returns: Json;
      };
      get_branch_balances: {
        Args: { month_start: string };
        Returns: {
          active: boolean;
          balance_cents: number;
          branch_id: string;
          branch_name: string;
          commission_cents: number;
          expense_cents: number;
          income_cents: number;
          payment_count: number;
          total_cost_cents: number;
        }[];
      };
      get_branch_commissions: {
        Args: { month_start: string; target_branch: string };
        Returns: {
          active: boolean;
          belongs_here: boolean;
          commission_cents: number;
          employee_id: string;
          full_name: string;
          service_count: number;
          username: string;
        }[];
      };
      get_cash_day_summary: {
        Args: { selected_branch?: string; service_day: string };
        Returns: Json;
      };
      get_cash_operator: { Args: never; Returns: Json };
      get_cash_sale_options: {
        Args: { target_branch: string };
        Returns: {
          barber_name: string;
          employee_id: string;
          price_cents: number;
          service_id: string;
          service_name: string;
        }[];
      };
      get_cash_sale_setup: { Args: { target_branch: string }; Returns: Json };
      get_employee_month_summary: {
        Args: { month_start: string; target_employee: string };
        Returns: Json;
      };
      get_management_page: {
        Args: {
          filters?: Json;
          page_number?: number;
          page_size?: number;
          resource: string;
        };
        Returns: Json;
      };
      get_pending_cash_services: {
        Args: { selected_branch?: string; service_day: string };
        Returns: {
          amount_cents: number;
          barber_name: string;
          branch_id: string;
          branch_name: string;
          employee_id: string;
          id: string;
          performed_at: string;
          service_name: string;
        }[];
      };
      get_reception_team: {
        Args: { target_branch?: string };
        Returns: {
          active: boolean;
          full_name: string;
          id: string;
          role: Database['public']['Enums']['app_role'];
          services: string[];
          username: string;
        }[];
      };
      get_reception_team_count: {
        Args: { target_branch: string };
        Returns: number;
      };
      get_team_weekly_stats: {
        Args: { selected_branch?: string; week_start: string };
        Returns: {
          commission_cents: number;
          employee_id: string;
          full_name: string;
          revenue_cents: number;
          service_count: number;
          username: string;
        }[];
      };
      is_admin: { Args: never; Returns: boolean };
      record_branch_expense: {
        Args: {
          expense_category: string;
          expense_cents: number;
          expense_date: string;
          expense_description: string;
          expense_notes?: string;
          payment_method: string;
          request_id: string;
          target_branch: string;
        };
        Returns: string;
      };
      record_catalog_service: {
        Args: {
          catalog_service: string;
          charged_cents: number;
          service_at: string;
          service_notes?: string;
          target_employee: string;
        };
        Returns: string;
      };
      record_employee_adjustment: {
        Args: {
          movement_cents: number;
          movement_description: string;
          movement_kind: string;
          target_employee: string;
          target_period: string;
        };
        Returns: string;
      };
      record_employee_service: {
        Args: {
          charged_cents: number;
          service_at: string;
          service_category: string;
          service_label: string;
          service_notes?: string;
          target_employee: string;
        };
        Returns: string;
      };
      register_cash_sale: {
        Args: {
          catalog_service: string;
          expected_cents: number;
          operation_id: string;
          payment_method: string;
          payment_reference?: string;
          sale_notes?: string;
          target_branch: string;
          target_employee: string;
        };
        Returns: string;
      };
      save_barber_schedule: {
        Args: {
          date_exceptions: Json;
          expected_revision: number;
          target_employee: string;
          weekly_hours: Json;
        };
        Returns: undefined;
      };
      save_employee_branch: {
        Args: { target_branch: string; target_employee: string };
        Returns: undefined;
      };
      save_employee_personal: {
        Args: {
          employee_name: string;
          employee_notes: string;
          employee_phone: string;
          start_date: string;
          target_employee: string;
        };
        Returns: undefined;
      };
      save_service_branch_prices: {
        Args: { prices: Json; target_service: string };
        Returns: undefined;
      };
      set_barber_services: {
        Args: { service_ids: string[]; target_employee: string };
        Returns: undefined;
      };
      set_employee_access: {
        Args: {
          acting_admin: string;
          enabled: boolean;
          target_employee: string;
        };
        Returns: undefined;
      };
      validate_work_intervals: { Args: { intervals: Json }; Returns: undefined };
      void_branch_expense: {
        Args: { reason: string; target_expense: string };
        Returns: undefined;
      };
      void_cash_payment: {
        Args: { reason: string; target_payment: string };
        Returns: undefined;
      };
      void_employee_entry: {
        Args: { entry_id: string; entry_type: string; reason: string };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: 'admin' | 'reception' | 'barber';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ['admin', 'reception', 'barber'],
    },
  },
} as const;
