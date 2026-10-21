/**
 * Esquema extendido de Supabase para Huomo.
 * Integra las migraciones incrementales sobre database.generated.ts.
 */
import type { Database as GeneratedDatabase } from './database.generated';

export type { Json, Tables, TablesInsert, TablesUpdate } from './database.generated';

export type Database = Omit<GeneratedDatabase, 'public'> & {
  public: Omit<GeneratedDatabase['public'], 'Tables' | 'Functions' | 'Enums'> & {
    Enums: GeneratedDatabase['public']['Enums'] & {
      app_role: GeneratedDatabase['public']['Enums']['app_role'] | 'client';
      appointment_status: 'confirmed' | 'completed' | 'cancelled' | 'no_show';
    };
    Tables: GeneratedDatabase['public']['Tables'] & {
      booking_settings: {
        Row: {
          id: boolean;
          min_advance_hours: number;
          max_future_days: number;
          cancel_limit_hours: number;
          max_active_per_client: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: boolean;
          min_advance_hours?: number;
          max_future_days?: number;
          cancel_limit_hours?: number;
          max_active_per_client?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: boolean;
          min_advance_hours?: number;
          max_future_days?: number;
          cancel_limit_hours?: number;
          max_active_per_client?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      appointments: {
        Row: {
          id: string;
          client_id: string | null;
          client_name: string;
          client_phone: string;
          client_email: string;
          branch_id: string;
          barber_id: string;
          service_id: string;
          starts_at: string;
          ends_at: string;
          status: 'confirmed' | 'completed' | 'cancelled' | 'no_show';
          branch_name: string;
          barber_name: string;
          service_name: string;
          price_cents: number;
          duration_minutes: number;
          notes: string;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id?: string | null;
          client_name: string;
          client_phone?: string;
          client_email?: string;
          branch_id: string;
          barber_id: string;
          service_id: string;
          starts_at: string;
          ends_at: string;
          status?: 'confirmed' | 'completed' | 'cancelled' | 'no_show';
          branch_name: string;
          barber_name: string;
          service_name: string;
          price_cents: number;
          duration_minutes: number;
          notes?: string;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string | null;
          client_name?: string;
          client_phone?: string;
          client_email?: string;
          branch_id?: string;
          barber_id?: string;
          service_id?: string;
          starts_at?: string;
          ends_at?: string;
          status?: 'confirmed' | 'completed' | 'cancelled' | 'no_show';
          branch_name?: string;
          barber_name?: string;
          service_name?: string;
          price_cents?: number;
          duration_minutes?: number;
          notes?: string;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Functions: GeneratedDatabase['public']['Functions'] & {
      save_booking_settings: {
        Args: {
          p_min_advance_hours: number;
          p_max_future_days: number;
          p_cancel_limit_hours: number;
          p_max_active_per_client: number;
        };
        Returns: {
          id: boolean;
          min_advance_hours: number;
          max_future_days: number;
          cancel_limit_hours: number;
          max_active_per_client: number;
          updated_at: string;
          updated_by: string | null;
        };
      };
      get_public_barbers_by_branch_and_service: {
        Args: {
          target_branch: string;
          target_service: string;
        };
        Returns: {
          barber_id: string;
          barber_name: string;
          branch_id: string;
        }[];
      };
      get_available_booking_slots: {
        Args: {
          p_branch_id: string;
          p_service_id: string;
          p_barber_id: string;
          p_target_date: string;
        };
        Returns: {
          starts_at: string;
          ends_at: string;
          time_display: string;
        }[];
      };
      book_appointment: {
        Args: {
          p_branch_id: string;
          p_service_id: string;
          p_barber_id: string;
          p_starts_at: string;
          p_client_name: string;
          p_client_phone?: string;
          p_client_email?: string;
          p_notes?: string;
        };
        Returns: {
          id: string;
          client_id: string | null;
          client_name: string;
          client_phone: string;
          client_email: string;
          branch_id: string;
          barber_id: string;
          service_id: string;
          starts_at: string;
          ends_at: string;
          status: 'confirmed' | 'completed' | 'cancelled' | 'no_show';
          branch_name: string;
          barber_name: string;
          service_name: string;
          price_cents: number;
          duration_minutes: number;
          notes: string;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      cancel_appointment: {
        Args: {
          p_appointment_id: string;
          p_reason?: string;
        };
        Returns: {
          id: string;
          client_id: string | null;
          client_name: string;
          client_phone: string;
          client_email: string;
          branch_id: string;
          barber_id: string;
          service_id: string;
          starts_at: string;
          ends_at: string;
          status: 'confirmed' | 'completed' | 'cancelled' | 'no_show';
          branch_name: string;
          barber_name: string;
          service_name: string;
          price_cents: number;
          duration_minutes: number;
          notes: string;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      reschedule_appointment: {
        Args: {
          p_appointment_id: string;
          p_new_starts_at: string;
        };
        Returns: {
          id: string;
          client_id: string | null;
          client_name: string;
          client_phone: string;
          client_email: string;
          branch_id: string;
          barber_id: string;
          service_id: string;
          starts_at: string;
          ends_at: string;
          status: 'confirmed' | 'completed' | 'cancelled' | 'no_show';
          branch_name: string;
          barber_name: string;
          service_name: string;
          price_cents: number;
          duration_minutes: number;
          notes: string;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      complete_appointment_service: {
        Args: {
          p_appointment_id: string;
          p_payment_method?: string | null;
          p_payment_reference?: string;
          p_sale_notes?: string;
          p_operation_id?: string | null;
        };
        Returns: {
          appointmentId: string;
          serviceId: string;
          receiptId: string | null;
          status: string;
        };
      };
    };
  };
};

export type AppRole = Database['public']['Enums']['app_role'];
