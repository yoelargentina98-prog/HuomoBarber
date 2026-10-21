export const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export type Interval = { start: string; end: string };
export type WorkDay = { day: number; intervals: Interval[] };
export type Exception = { date: string; reason: string; intervals: Interval[] };
export type Schedule = { weekly: WorkDay[]; exceptions: Exception[]; revision: number };
export function emptySchedule(): Schedule {
  return {
    weekly: weekdays.map((_, day) => ({ day, intervals: [] })),
    exceptions: [],
    revision: 0,
  };
}
export function validateIntervals(intervals: Interval[]) {
  if (intervals.length > 8) throw new Error('Cada día admite hasta 8 franjas.');
  let previousEnd = '';
  for (const interval of [...intervals].sort((a, b) => a.start.localeCompare(b.start))) {
    const time = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!time.test(interval.start) || !time.test(interval.end) || interval.start >= interval.end)
      throw new Error('Cada franja debe empezar antes de terminar, dentro del mismo día.');
    if (interval.start < previousEnd)
      throw new Error('Las franjas de un día no pueden superponerse.');
    previousEnd = interval.end;
  }
}
export function validateSchedule(schedule: Schedule) {
  schedule.weekly.forEach(day => validateIntervals(day.intervals));
  const dates = new Set<string>();
  for (const exception of schedule.exceptions) {
    if (!exception.date || dates.has(exception.date))
      throw new Error('Completá las fechas sin repetirlas.');
    dates.add(exception.date);
    validateIntervals(exception.intervals);
  }
}
// An exception replaces the whole day, never adds hours to the weekly template.
export function intervalsForDate(schedule: Schedule, date: string): Interval[] {
  const exception = schedule.exceptions.find(item => item.date === date);
  if (exception) return exception.intervals;
  const day = new Date(`${date}T12:00:00-03:00`).getUTCDay();
  return schedule.weekly.find(item => item.day === day)?.intervals ?? [];
}
