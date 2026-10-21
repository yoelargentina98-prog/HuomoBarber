import type { Adjustment, Compensation, ServiceRecord } from './types';

export function effectiveCompensation(
  configs: Compensation[],
  date: string
): Compensation | undefined {
  return configs
    .filter(config => config.effective_from <= date)
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0];
}
export function summarize(
  services: ServiceRecord[],
  movements: Adjustment[],
  configs: Compensation[],
  month: string
) {
  const validServices = services.filter(service => !service.voided_at);
  const validMovements = movements.filter(movement => !movement.voided_at);
  const revenue = validServices.reduce((sum, service) => sum + service.amount_cents, 0);
  const commission = validServices.reduce(
    (sum, service) => sum + (service.commission_cents ?? 0),
    0
  );
  const fixed = effectiveCompensation(configs, `${month}-01`)?.monthly_fixed_cents ?? 0;
  const extras = validMovements
    .filter(item => item.kind !== 'deduction')
    .reduce((sum, item) => sum + item.amount_cents, 0);
  const deductions = validMovements
    .filter(item => item.kind === 'deduction')
    .reduce((sum, item) => sum + item.amount_cents, 0);
  return {
    count: validServices.length,
    cuts: validServices.filter(item => item.category === 'cut').length,
    beards: validServices.filter(item => item.category === 'beard').length,
    others: validServices.filter(item => item.category === 'other').length,
    revenue,
    commission,
    fixed,
    extras,
    deductions,
    estimated: fixed + commission + extras - deductions,
  };
}
