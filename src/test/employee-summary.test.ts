import { describe, expect, it } from 'vitest';
import { parseMoney, parsePercent } from '../features/employees/model/money';
import { periodBounds } from '../features/employees/model/period';
import { effectiveCompensation, summarize } from '../features/employees/model/summary';
import type { Adjustment, Compensation, ServiceRecord } from '../features/employees/model/types';

const config = (date: string, fixed: number): Compensation => ({
  id: date,
  employee_id: 'employee',
  effective_from: date,
  commission_percent: 40,
  monthly_fixed_cents: fixed,
  cut_percent: null,
  beard_percent: null,
  other_percent: null,
  created_at: '',
});
const service = (values: Partial<ServiceRecord>): ServiceRecord => ({
  branch_id: null,
  branch_name: null,
  service_id: null,
  id: '1',
  employee_id: 'employee',
  service_name: 'Corte',
  category: 'cut',
  performed_at: '',
  appointment_id: null,
  amount_cents: 2000000,
  commission_percent: 40,
  commission_cents: 800000,
  notes: '',
  recorded_by: 'admin',
  created_at: '',
  voided_at: null,
  void_reason: null,
  ...values,
});
const adjustment = (kind: string, amount: number, voided = false): Adjustment => ({
  id: kind,
  employee_id: 'employee',
  kind,
  amount_cents: amount,
  period: '2026-10-01',
  description: 'Concepto',
  recorded_by: 'admin',
  created_at: '',
  voided_at: voided ? '2026-10-20' : null,
  void_reason: null,
});
describe('Importes y períodos de la ficha', () => {
  it('convierte pesos a centavos sin errores de coma flotante', () => {
    expect(parseMoney('20000,01')).toBe(2000001);
    expect(parseMoney('0.29')).toBe(29);
    expect(parsePercent('25,50')).toBe(25.5);
  });
  it.each(['-1', '1.234', '20.000,00', '', 'NaN', '1e10'])(
    'rechaza importe ambiguo o inválido %s',
    value => expect(() => parseMoney(value)).toThrow()
  );
  it('rechaza porcentajes fuera del rango', () => expect(() => parsePercent('100.01')).toThrow());
  it('usa límites excluyentes en Argentina y cruza correctamente el año', () => {
    expect(periodBounds('2026-12')).toEqual({
      from: '2026-12-01T00:00:00-03:00',
      to: '2027-01-01T00:00:00-03:00',
    });
    expect(() => periodBounds('2026-13')).toThrow();
  });
});
describe('Remuneración y desempeño', () => {
  it('toma el fijo vigente y respeta las comisiones ya guardadas', () => {
    const summary = summarize(
      [service({})],
      [adjustment('bonus', 10000), adjustment('extra', 5000), adjustment('deduction', 2500)],
      [config('2026-09-01', 100000), config('2026-11-01', 300000)],
      '2026-10'
    );
    expect(summary).toMatchObject({
      count: 1,
      cuts: 1,
      revenue: 2000000,
      commission: 800000,
      fixed: 100000,
      extras: 15000,
      deductions: 2500,
      estimated: 912500,
    });
  });
  it('excluye anulaciones y distingue corte, barba y otros servicios', () => {
    const summary = summarize(
      [
        service({}),
        service({ id: '2', category: 'beard' }),
        service({ id: '3', category: 'other' }),
        service({ id: '4', voided_at: '2026-10-20' }),
      ],
      [adjustment('bonus', 10000, true)],
      [],
      '2026-10'
    );
    expect(summary).toMatchObject({
      count: 3,
      cuts: 1,
      beards: 1,
      others: 1,
      commission: 2400000,
      extras: 0,
      fixed: 0,
    });
  });
  it('no toma configuraciones futuras para meses anteriores', () => {
    expect(effectiveCompensation([config('2026-11-01', 100000)], '2026-10-01')).toBeUndefined();
  });
});
