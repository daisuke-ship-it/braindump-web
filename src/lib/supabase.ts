import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDB = SupabaseClient<any, "public", any>;

// Client-side
export const supabase: AnyDB = createClient(supabaseUrl, supabaseAnonKey);

// Server-side (singleton)
let _admin: AnyDB | null = null;
export function getSupabaseAdmin(): AnyDB {
  if (!_admin) {
    _admin = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _admin;
}
