import { useState, type ReactNode } from 'react';
import { Pagination } from './Pagination';
import { RemoteCollection } from './RemoteCollection';
import type { PageSource } from '../lib/pages';

/** For bounded configuration/aggregate collections. Transaction histories use RemoteList. */
export function Paginated<T>({
  items,
  children,
  resetKey = '',
  cash = false,
  source,
}: {
  items: T[];
  children: (rows: T[]) => ReactNode;
  resetKey?: string;
  cash?: boolean;
  source?: PageSource;
}) {
  const [size, setSize] = useState(20);
  const identity = `${resetKey}/${items
    .map(item => {
      if (item && typeof item === 'object') {
        const row = item as Record<string, unknown>;
        return row.id ?? row.employee_id ?? row.branch_id ?? row.key ?? row.name ?? '';
      }
      return String(item);
    })
    .join(',')}`;
  const [position, setPosition] = useState({ identity, page: 0 });
  const page =
    identity === position.identity
      ? Math.min(position.page, Math.max(0, Math.ceil(items.length / size) - 1))
      : 0;
  if (source)
    return (
      <RemoteCollection source={source} cash={cash}>
        {children}
      </RemoteCollection>
    );
  return (
    <>
      {children(items.slice(page * size, (page + 1) * size))}
      <Pagination
        page={page}
        size={size}
        total={items.length}
        onPage={value => setPosition({ identity, page: value })}
        onSize={
          cash
            ? value => {
                setSize(value);
                setPosition({ identity, page: 0 });
              }
            : undefined
        }
      />
    </>
  );
}
