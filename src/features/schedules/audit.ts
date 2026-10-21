import type { Json } from '../../integrations/supabase/types';
import { weekdays } from './model';

export function describeSchedule(value: Json, weekly: boolean): string {
  if (!Array.isArray(value) || !value.length) return 'Sin excepciones';
  return value
    .map(entry => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return '';
      const label = weekly ? weekdays[Number(entry.day)] : String(entry.date);
      const intervals = Array.isArray(entry.intervals) ? entry.intervals : [];
      const hours = intervals
        .map(interval => {
          if (!interval || typeof interval !== 'object' || Array.isArray(interval)) return '';
          return `${String(interval.start)}–${String(interval.end)}`;
        })
        .join(', ');
      return `${label}: ${hours || 'sin actividad'}${entry.reason ? ` (${String(entry.reason)})` : ''}`;
    })
    .join('; ');
}
