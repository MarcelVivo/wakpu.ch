import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requiredEnv } from '@/lib/env';
let client: SupabaseClient | undefined;
export function getAdminSupabase(): SupabaseClient {
  return client ??= createClient(requiredEnv('NEXT_PUBLIC_SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {auth:{persistSession:false,autoRefreshToken:false}});
}
