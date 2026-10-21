export function field(data: FormData, key: string): string {
  return String(data.get(key) ?? '');
}
