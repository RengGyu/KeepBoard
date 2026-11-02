-- Run once in the dedicated Supabase project before selecting Supabase in Vercel.
-- Create a separate PRIVATE Storage bucket in the dashboard with the exact
-- KEEPBOARD_SUPABASE_BUCKET name and a file limit of at most 50 MB.
-- Only the server's service-role key accesses this table or bucket.

create table if not exists public.keepboard_objects (
  key text primary key,
  etag text not null,
  content_type text not null,
  data_base64 text,
  storage_path text,
  size_bytes bigint not null check (size_bytes >= 0),
  constraint keepboard_objects_one_body check (num_nonnulls(data_base64, storage_path) = 1)
);

alter table public.keepboard_objects enable row level security;
revoke all on public.keepboard_objects from public, anon, authenticated;
grant select, insert, update, delete on public.keepboard_objects to service_role;

-- Deliberately no anon/authenticated RLS policy. The service role is held by
-- the Vercel server only; browser uploads receive a path-bound signed token.
