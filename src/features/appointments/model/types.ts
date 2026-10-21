export type AppRole = 'admin' | 'reception' | 'barber' | 'client';

export type AppointmentStatus = 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface BookingSettings {
  minAdvanceHours: number;
  maxFutureDays: number;
  cancelLimitHours: number;
  maxActivePerClient: number;
  updatedAt?: string;
}

export interface BookingSlot {
  startsAt: string;
  endsAt: string;
  timeDisplay: string;
}

export interface Appointment {
  id: string;
  clientId: string | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  branchId: string;
  branchName: string;
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  priceCents: number;
  durationMinutes: number;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  notes: string;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicBarber {
  barberId: string;
  barberName: string;
  branchId: string;
}

export interface ClientProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: AppRole;
}
