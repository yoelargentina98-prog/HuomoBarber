import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAvailableSlots,
  bookAppointment,
  cancelAppointment,
  rescheduleAppointment,
  getBookingSettings,
  saveBookingSettings,
  completeAppointmentService,
  DEFAULT_BOOKING_SETTINGS,
} from '../features/appointments/services/appointments-service';
import { requireSupabaseClient } from '../integrations/supabase/client';

vi.mock('../integrations/supabase/client', () => ({
  requireSupabaseClient: vi.fn(),
}));

describe('Servicio de turnos, reglas y atomicidad (appointments-service)', () => {
  const mockRpc = vi.fn();
  const mockFrom = vi.fn();
  const mockAuth = {
    getSession: vi.fn().mockResolvedValue({
      data: { session: { user: { id: 'client-123', email: 'test@cliente.com' } } },
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireSupabaseClient).mockReturnValue({
      rpc: mockRpc,
      from: mockFrom,
      auth: mockAuth,
    } as unknown as ReturnType<typeof requireSupabaseClient>);
  });

  it('obtiene las reglas de reserva por defecto si no existen en base de datos', async () => {
    const mockSingle = vi.fn().mockResolvedValueOnce({ data: null, error: new Error('not found') });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const settings = await getBookingSettings();
    expect(settings).toEqual(DEFAULT_BOOKING_SETTINGS);
    expect(settings.minAdvanceHours).toBe(2);
    expect(settings.maxActivePerClient).toBe(3);
  });

  it('guarda las reglas de reserva llamando al RPC correspondiente', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        id: true,
        min_advance_hours: 4,
        max_future_days: 15,
        cancel_limit_hours: 3,
        max_active_per_client: 2,
      },
      error: null,
    });

    const updated = await saveBookingSettings({
      minAdvanceHours: 4,
      maxFutureDays: 15,
      cancelLimitHours: 3,
      maxActivePerClient: 2,
    });

    expect(mockRpc).toHaveBeenCalledWith('save_booking_settings', {
      p_min_advance_hours: 4,
      p_max_future_days: 15,
      p_cancel_limit_hours: 3,
      p_max_active_per_client: 2,
    });
    expect(updated.minAdvanceHours).toBe(4);
    expect(updated.maxActivePerClient).toBe(2);
  });

  it('consulta los slots calculados por el servidor via get_available_booking_slots', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          starts_at: '2026-10-22T10:00:00-03:00',
          ends_at: '2026-10-22T10:45:00-03:00',
          time_display: '10:00 - 10:45',
        },
        {
          starts_at: '2026-10-22T11:00:00-03:00',
          ends_at: '2026-10-22T11:45:00-03:00',
          time_display: '11:00 - 11:45',
        },
      ],
      error: null,
    });

    const slots = await getAvailableSlots('branch-1', 'service-1', 'barber-1', '2026-10-22');

    expect(mockRpc).toHaveBeenCalledWith('get_available_booking_slots', {
      p_branch_id: 'branch-1',
      p_service_id: 'service-1',
      p_barber_id: 'barber-1',
      p_target_date: '2026-10-22',
    });
    expect(slots).toHaveLength(2);
    expect(slots[0]?.timeDisplay).toBe('10:00 - 10:45');
  });

  it('crea una reserva atómica con instantáneas inmutables', async () => {
    const fakeRow = {
      id: 'appt-999',
      client_id: 'client-123',
      branch_id: 'branch-1',
      branch_name: 'Sucursal Centro',
      barber_id: 'barber-1',
      barber_name: 'Franco Barbero',
      service_id: 'service-1',
      service_name: 'Corte Clásico',
      starts_at: '2026-10-22T10:00:00-03:00',
      ends_at: '2026-10-22T10:45:00-03:00',
      status: 'confirmed',
      price_cents: 1500000,
      duration_minutes: 45,
      client_name: 'Martín Gomez',
      client_phone: '1144556677',
      client_email: 'martin@correo.com',
      notes: 'Sin navaja',
      created_at: '2026-10-21T10:00:00-03:00',
      updated_at: '2026-10-21T10:00:00-03:00',
    };

    mockRpc.mockResolvedValueOnce({ data: fakeRow, error: null });

    const appt = await bookAppointment({
      branchId: 'branch-1',
      serviceId: 'service-1',
      barberId: 'barber-1',
      startsAt: '2026-10-22T10:00:00-03:00',
      clientName: 'Martín Gomez',
      clientPhone: '1144556677',
      clientEmail: 'martin@correo.com',
      notes: 'Sin navaja',
    });

    expect(mockRpc).toHaveBeenCalledWith('book_appointment', {
      p_branch_id: 'branch-1',
      p_service_id: 'service-1',
      p_barber_id: 'barber-1',
      p_starts_at: '2026-10-22T10:00:00-03:00',
      p_client_name: 'Martín Gomez',
      p_client_phone: '1144556677',
      p_client_email: 'martin@correo.com',
      p_notes: 'Sin navaja',
    });
    expect(appt.id).toBe('appt-999');
    expect(appt.priceCents).toBe(1500000);
    expect(appt.branchName).toBe('Sucursal Centro');
    expect(appt.serviceName).toBe('Corte Clásico');
  });

  it('lanza error si el servidor detecta superposición o superación del límite', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'El barbero ya tiene un turno confirmado en ese horario.' },
    });

    await expect(
      bookAppointment({
        branchId: 'branch-1',
        serviceId: 'service-1',
        barberId: 'barber-1',
        startsAt: '2026-10-22T10:00:00-03:00',
        clientName: 'Martín Gomez',
      })
    ).rejects.toThrow('El barbero ya tiene un turno confirmado en ese horario.');
  });

  it('cancela un turno llamando a cancel_appointment y cambia el estado a cancelled', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        id: 'appt-999',
        status: 'cancelled',
        cancellation_reason: 'Motivo de prueba',
        cancelled_at: '2026-10-21T11:00:00-03:00',
        starts_at: '2026-10-22T10:00:00-03:00',
        ends_at: '2026-10-22T10:45:00-03:00',
        price_cents: 1500000,
        duration_minutes: 45,
        created_at: '2026-10-21T10:00:00-03:00',
        updated_at: '2026-10-21T11:00:00-03:00',
      },
      error: null,
    });

    const cancelled = await cancelAppointment('appt-999', 'Motivo de prueba');
    expect(mockRpc).toHaveBeenCalledWith('cancel_appointment', {
      p_appointment_id: 'appt-999',
      p_reason: 'Motivo de prueba',
    });
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.cancellationReason).toBe('Motivo de prueba');
  });

  it('reprograma atómicamente el turno llamando a reschedule_appointment', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        id: 'appt-999',
        status: 'confirmed',
        starts_at: '2026-10-23T14:00:00-03:00',
        ends_at: '2026-10-23T14:45:00-03:00',
        price_cents: 1500000,
        duration_minutes: 45,
        created_at: '2026-10-21T10:00:00-03:00',
        updated_at: '2026-10-21T12:00:00-03:00',
      },
      error: null,
    });

    const rescheduled = await rescheduleAppointment('appt-999', '2026-10-23T14:00:00-03:00');
    expect(mockRpc).toHaveBeenCalledWith('reschedule_appointment', {
      p_appointment_id: 'appt-999',
      p_new_starts_at: '2026-10-23T14:00:00-03:00',
    });
    expect(rescheduled.startsAt).toBe('2026-10-23T14:00:00-03:00');
  });

  it('vincula la atención con Caja mediante complete_appointment_service sin duplicación', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        appointmentId: 'appt-999',
        serviceId: 'srv-101',
        receiptId: 'mov-202',
        status: 'completed',
      },
      error: null,
    });

    const result = await completeAppointmentService({
      appointmentId: 'appt-999',
      paymentMethod: 'cash',
    });

    expect(mockRpc).toHaveBeenCalledWith('complete_appointment_service', {
      p_appointment_id: 'appt-999',
      p_payment_method: 'cash',
      p_payment_reference: '',
      p_sale_notes: '',
      p_operation_id: null,
    });
    expect(result.appointmentId).toBe('appt-999');
    expect(result.serviceId).toBe('srv-101');
    expect(result.receiptId).toBe('mov-202');
  });
});
