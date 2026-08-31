// ---------- Supabase client ----------
// This "publishable" key is meant to be public — it's safe to ship in
// client-side code because Row Level Security on every table (see
// supabase-schema.sql) is what actually restricts access, not secrecy of
// this key. Never put a "secret"/service_role key here — that one bypasses
// RLS entirely and must only ever run on a trusted server.
//
// Named `sb`, not `supabase` — the vendored supabase.min.js already
// defines a global `supabase` (the library object with .createClient),
// so reusing that name for the client instance would collide with it.
const SUPABASE_URL = 'https://bahtctvlhcimragoojeq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_XuLZgWP_t1Qfvg59IylJ2w_-7S5n36G';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
