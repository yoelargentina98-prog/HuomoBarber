/** Employee usernames map to internal Auth addresses; personal email is optional. */
export function loginEmail(identity: string): string {
  const value = identity.trim().toLowerCase();
  return value.includes('@') ? value : `${value}@staff.huomo.invalid`;
}
