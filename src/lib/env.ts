import 'server-only';
export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}
export function siteUrl(): string {
  const url = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid site URL');
  return url.origin;
}
export function hasDatabase(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
