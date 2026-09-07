import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { requiredEnv } from '@/lib/env';
import { WAKPU_SCHEMA } from './schema';
function createAdminClient() {
  return createClient(requiredEnv('NEXT_PUBLIC_SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {db:{schema:WAKPU_SCHEMA},auth:{persistSession:false,autoRefreshToken:false}});
}
let client: ReturnType<typeof createAdminClient> | undefined;
export function getAdminSupabase() {
  return client ??= createAdminClient();
}
