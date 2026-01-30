import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://aqbyqtvaxjroakgnxlun.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxYnlxdHZheGpyb2FrZ254bHVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MjgyNTUsImV4cCI6MjA3MjAwNDI1NX0.-maAL13IekgDe9K_Lfmvs8vg2nKBr06ew_EUcJ0c6DU";

export const supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    storageKey: 'sb-admin-auth',
    persistSession: true,
    autoRefreshToken: true,
  },
});
