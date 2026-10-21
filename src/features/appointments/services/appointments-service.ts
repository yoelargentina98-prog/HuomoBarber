import { requireSupabaseClient } from '../../../integrations/supabase/client';
import type {
  Appointment,
  AppointmentStatus,
  BookingSettings,
  BookingSlot,
  PublicBarber,
} from '../model/types';

export const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  minAdvanceHours: 2,
  maxFutureDays: 30,
  cancelLimitHours: 2,
  maxActivePerClient: 3,
};

export async function getBookingSettings(): Promise<BookingSettings> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('booking_settings')
    .select('min_advance_hours, max_future_days, cancel_limit_hours, max_active_per_client')
    .eq('id', true)
    .single();

  if (error || !data) {
    throw new Error('No se pudo cargar la configuración de reservas.');
  }

  return {
    minAdvanceHours: data.min_advance_hours,
    maxFutureDays: data.max_future_days,
    cancelLimitHours: data.cancel_limit_hours,
    maxActivePerClient: data.max_active_per_client,
  };
}

export async function saveBookingSettings(settings: BookingSettings): Promise<BookingSettings> {
  const client = requireSupabaseClient();
  const { data, error } = await client.rpc('save_booking_settings', {
    p_min_advance_hours: settings.minAdvanceHours,
    p_max_future_days: settings.maxFutureDays,
    p_cancel_limit_hours: settings.cancelLimitHours,
    p_max_active_per_client: settings.maxActivePerClient,
  });

  if (error) {
    throw new Error(error.message || 'No se pudieron guardar las reglas de reserva.');
  }

  return {
    minAdvanceHours: data.min_advance_hours,
    maxFutureDays: data.max_future_days,
    cancelLimitHours: data.cancel_limit_hours,
    maxActivePerClient: data.max_active_per_client,
  };
}

export async function getAvailableBranches(): Promise<
  Array<{ id: string; name: string; address: string; phone: string }>
> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('branches')
    .select('id, name, address, phone')
    .eq('active', true)
    .order('name');

  if (error) throw new Error('No se pudieron cargar las sucursales.');
  return data ?? [];
}

export async function getAvailableServices(branchId: string): Promise<
  Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    priceCents: number;
    durationMinutes: number;
  }>
> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('branch_services')
    .select(
      `
      price_cents,
      service:service_catalog(id, name, description, category, duration_minutes, active)
    `
    )
    .eq('branch_id', branchId)
    .eq('active', true);

  if (error) throw new Error('No se pudieron cargar los servicios para esta sucursal.');

  type ServiceRow = {
    id: string;
    name: string;
    description: string;
    category: string;
    duration_minutes: number;
    active: boolean;
  };

  const services = (data ?? [])
    .filter((item): item is typeof item & { service: ServiceRow } =>
      Boolean(
        item.service &&
        typeof item.service === 'object' &&
        'active' in item.service &&
        item.service.active
      )
    )
    .map(item => ({
      id: item.service.id,
      name: item.service.name,
      description: item.service.description,
      category: item.service.category,
      priceCents: Number(item.price_cents),
      durationMinutes: item.service.duration_minutes,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return services;
}

export async function getAvailableBarbers(
  branchId: string,
  serviceId: string
): Promise<PublicBarber[]> {
  const client = requireSupabaseClient();
  const { data, error } = await client.rpc('get_public_barbers_by_branch_and_service', {
    target_branch: branchId,
    target_service: serviceId,
  });

  if (error) throw new Error('No se pudieron consultar los barberos disponibles.');

  return (data ?? []).map(b => ({
    barberId: b.barber_id,
    barberName: b.barber_name,
    branchId: b.branch_id,
  }));
}

export async function getAvailableSlots(
  branchId: string,
  serviceId: string,
  barberId: string,
  targetDate: string
): Promise<BookingSlot[]> {
  const client = requireSupabaseClient();
  const { data, error } = await client.rpc('get_available_booking_slots', {
    p_branch_id: branchId,
    p_service_id: serviceId,
    p_barber_id: barberId,
    p_target_date: targetDate,
  });

  if (error) throw new Error(error.message || 'No se pudieron consultar los horarios disponibles.');

  return (data ?? []).map(s => ({
    startsAt: s.starts_at,
    endsAt: s.ends_at,
    timeDisplay: s.time_display,
  }));
}

export async function bookAppointment(params: {
  branchId: string;
  serviceId: string;
  barberId: string;
  startsAt: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  notes?: string;
}): Promise<Appointment> {
  const client = requireSupabaseClient();
  const { data, error } = await client.rpc('book_appointment', {
    p_branch_id: params.branchId,
    p_service_id: params.serviceId,
    p_barber_id: params.barberId,
    p_starts_at: params.startsAt,
    p_client_name: params.clientName,
    p_client_phone: params.clientPhone ?? '',
    p_client_email: params.clientEmail ?? '',
    p_notes: params.notes ?? '',
  });

  if (error) {
    throw new Error(error.message || 'No se pudo confirmar la reserva.');
  }

  return mapAppointmentRow(data);
}

export async function cancelAppointment(
  appointmentId: string,
  reason: string = 'Cancelado por el usuario'
): Promise<Appointment> {
  const client = requireSupabaseClient();
  const { data, error } = await client.rpc('cancel_appointment', {
    p_appointment_id: appointmentId,
    p_reason: reason,
  });

  if (error) {
    throw new Error(error.message || 'No se pudo cancelar el turno.');
  }

  return mapAppointmentRow(data);
}

export async function rescheduleAppointment(
  appointmentId: string,
  newStartsAt: string
): Promise<Appointment> {
  const client = requireSupabaseClient();
  const { data, error } = await client.rpc('reschedule_appointment', {
    p_appointment_id: appointmentId,
    p_new_starts_at: newStartsAt,
  });

  if (error) {
    throw new Error(error.message || 'No se pudo reprogramar el turno.');
  }

  return mapAppointmentRow(data);
}

export async function getClientAppointments(
  scope: 'upcoming' | 'history' = 'upcoming',
  page: number = 1
): Promise<{ items: Appointment[]; total: number; hasMore: boolean }> {
  const client = requireSupabaseClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session?.user) return { items: [], total: 0, hasMore: false };

  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = client
    .from('appointments')
    .select('*', { count: 'exact' })
    .eq('client_id', session.user.id);

  if (scope === 'upcoming') {
    query = query
      .eq('status', 'confirmed')
      .gte('ends_at', new Date().toISOString())
      .order('starts_at', { ascending: true });
  } else {
    query = query
      .or(`status.in.(completed,cancelled,no_show),ends_at.lt.${new Date().toISOString()}`)
      .order('starts_at', { ascending: false });
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error('No se pudieron cargar los turnos.');

  const total = count ?? 0;
  return {
    items: (data ?? []).map(mapAppointmentRow),
    total,
    hasMore: total > page * pageSize,
  };
}

export async function getBarberAppointments(
  dateStr?: string,
  page = 1
): Promise<{ items: Appointment[]; total: number }> {
  const client = requireSupabaseClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session?.user) throw new Error('No hay sesión activa.');
  return getBranchAppointments({ barberId: session.user.id, dateStr, page, ascending: true });
}

export async function getBranchAppointments(params: {
  ascending?: boolean;
  branchId?: string;
  dateStr?: string;
  barberId?: string;
  status?: AppointmentStatus | 'all';
  page?: number;
}): Promise<{ items: Appointment[]; total: number }> {
  const client = requireSupabaseClient();
  const pageSize = 20;
  const page = params.page ?? 1;
  if (!Number.isInteger(page) || page < 1) throw new Error('Página inválida.');
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = client.from('appointments').select('*', { count: 'exact' });

  if (params.branchId) {
    query = query.eq('branch_id', params.branchId);
  }
  if (params.barberId) {
    query = query.eq('barber_id', params.barberId);
  }
  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status);
  }
  if (params.dateStr) {
    const startOfDay = `${params.dateStr}T00:00:00-03:00`;
    const next = new Date(`${params.dateStr}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    const endOfDay = `${next.toISOString().slice(0, 10)}T00:00:00-03:00`;
    query = query.gte('starts_at', startOfDay).lt('starts_at', endOfDay);
  }

  const { data, error, count } = await query
    .order('starts_at', { ascending: params.ascending ?? false })
    .order('id')
    .range(from, to);

  if (error) throw new Error('No se pudieron consultar los turnos.');

  return {
    items: (data ?? []).map(mapAppointmentRow),
    total: count ?? 0,
  };
}

export async function completeAppointmentService(params: {
  appointmentId: string;
  paymentMethod?: 'cash' | 'transfer';
  paymentReference?: string;
  saleNotes?: string;
  operationId?: string;
}): Promise<{ appointmentId: string; serviceId: string; receiptId?: string | null }> {
  const client = requireSupabaseClient();
  const { data, error } = await client.rpc('complete_appointment_service', {
    p_appointment_id: params.appointmentId,
    p_payment_method: params.paymentMethod ?? undefined,
    p_payment_reference: params.paymentReference ?? '',
    p_sale_notes: params.saleNotes ?? '',
    p_operation_id: params.operationId ?? undefined,
  });

  if (error || !data || typeof data !== 'object' || Array.isArray(data))
    throw new Error(error?.message || 'No se pudo completar el turno.');
  if (typeof data.appointmentId !== 'string' || typeof data.serviceId !== 'string')
    throw new Error('Respuesta incompleta. Revisá Caja antes de repetir.');
  return {
    appointmentId: data.appointmentId,
    serviceId: data.serviceId,
    receiptId: typeof data.receiptId === 'string' ? data.receiptId : null,
  };
}

type AppointmentDatabaseRow = {
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
  status: AppointmentStatus;
  branch_name: string;
  barber_name: string;
  service_name: string;
  price_cents: number;
  duration_minutes: number;
  notes: string;
  arrived_at?: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function mapAppointmentRow(row: AppointmentDatabaseRow): Appointment {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    clientPhone: row.client_phone ?? '',
    clientEmail: row.client_email ?? '',
    branchId: row.branch_id,
    branchName: row.branch_name,
    barberId: row.barber_id,
    barberName: row.barber_name,
    serviceId: row.service_id,
    serviceName: row.service_name,
    priceCents: Number(row.price_cents),
    durationMinutes: Number(row.duration_minutes),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    arrivedAt: row.arrived_at,
    notes: row.notes ?? '',
    cancellationReason: row.cancellation_reason,
    cancelledAt: row.cancelled_at,
    cancelledBy: row.cancelled_by,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function markAppointmentAttendance(id: string, attendance: 'arrived' | 'no_show') {
  const { error } = await requireSupabaseClient().rpc('mark_appointment_attendance', {
    target_appointment: id,
    attendance,
  });
  if (error) throw new Error(error.message);
}
