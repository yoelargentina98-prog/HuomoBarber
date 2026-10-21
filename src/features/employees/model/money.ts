/** Los importes se almacenan como centavos enteros, nunca como pesos flotantes. */
export function parseMoney(value: string): number {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim()))
    throw new Error('Ingresá un importe válido con hasta dos decimales, sin separador de miles.');
  const [whole = '0', decimal = ''] = value.trim().replace(',', '.').split('.');
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents > 100000000000)
    throw new Error('El importe supera el máximo permitido.');
  return cents;
}
export function parsePercent(value: string): number {
  const percent = parseMoney(value) / 100;
  if (percent > 100) throw new Error('La comisión debe estar entre 0 y 100%.');
  return percent;
}
export function money(cents: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(cents / 100);
}
export function moneyInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
