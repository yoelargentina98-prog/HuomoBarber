import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { emptySchedule, intervalsForDate, validateSchedule } from '../features/schedules/model';
import { SchedulePanel } from '../features/schedules/SchedulePanel';
import { loadSchedule, saveSchedule } from '../features/schedules/service';
vi.mock('../features/schedules/service', () => ({ loadSchedule: vi.fn(), saveSchedule: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadSchedule).mockResolvedValue(emptySchedule());
  vi.mocked(saveSchedule).mockResolvedValue();
});
describe('Horarios de barberos', () => {
  it('rechaza franjas superpuestas y horarios que cruzan medianoche', () => {
    const schedule = emptySchedule();
    schedule.weekly[1]!.intervals = [
      { start: '09:00', end: '13:00' },
      { start: '12:00', end: '17:00' },
    ];
    expect(() => validateSchedule(schedule)).toThrow(/superponerse/);
    schedule.weekly[1]!.intervals = [{ start: '23:00', end: '02:00' }];
    expect(() => validateSchedule(schedule)).toThrow(/mismo día/);
  });
  it('una ausencia reemplaza toda la jornada y una fecha especial reemplaza la semana', () => {
    const schedule = emptySchedule();
    schedule.weekly[1]!.intervals = [{ start: '09:00', end: '13:00' }];
    expect(intervalsForDate(schedule, '2026-10-26')).toHaveLength(1);
    schedule.exceptions = [{ date: '2026-10-26', reason: 'Vacaciones', intervals: [] }];
    expect(intervalsForDate(schedule, '2026-10-26')).toEqual([]);
    schedule.exceptions[0]!.intervals = [{ start: '16:00', end: '18:00' }];
    expect(intervalsForDate(schedule, '2026-10-26')).toEqual([{ start: '16:00', end: '18:00' }]);
  });
  it('guarda la semana editada y permite seguir guardando con la nueva revisión', async () => {
    render(<SchedulePanel employeeId="barber" onSaved={vi.fn()} />);
    await screen.findByText('Semana habitual');
    await userEvent.click(screen.getAllByRole('button', { name: 'Agregar franja' })[0]!);
    const start = screen.getByLabelText('Lunes, desde 1');
    const end = screen.getByLabelText('Lunes, hasta 1');
    // Native time inputs do not support userEvent.type consistently in jsdom.
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(start, { target: { value: '09:00' } });
    fireEvent.change(end, { target: { value: '13:00' } });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar horarios' }));
    await screen.findByText('Guardado correctamente.');
    expect(saveSchedule).toHaveBeenLastCalledWith(
      'barber',
      expect.objectContaining({
        revision: 0,
        weekly: expect.arrayContaining([{ day: 1, intervals: [{ start: '09:00', end: '13:00' }] }]),
      })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Guardar horarios' }));
    await waitFor(() =>
      expect(saveSchedule).toHaveBeenLastCalledWith(
        'barber',
        expect.objectContaining({ revision: 1 })
      )
    );
  });
  it('bloquea la edición si falló la carga', async () => {
    vi.mocked(loadSchedule).mockRejectedValue(new Error('No se pudieron cargar los horarios.'));
    render(<SchedulePanel employeeId="barber" onSaved={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar');
    expect(screen.queryByRole('button', { name: 'Guardar horarios' })).not.toBeInTheDocument();
  });
});
