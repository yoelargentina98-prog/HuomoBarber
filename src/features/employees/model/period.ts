const timezone = 'America/Argentina/Buenos_Aires';
export function today(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
export function currentMonth(): string {
  return today().slice(0, 7);
}
export function periodBounds(month: string): { from: string; to: string } {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Mes inválido.');
  const [year = 0, index = 0] = month.split('-').map(Number);
  const next = index === 12 ? `${year + 1}-01` : `${year}-${String(index + 1).padStart(2, '0')}`;
  return { from: `${month}-01T00:00:00-03:00`, to: `${next}-01T00:00:00-03:00` };
}
export function serviceDate(value: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: timezone,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}
