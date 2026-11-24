-- Explicit privileges for the server role.
-- Newer Supabase projects can be created with "automatically expose new tables"
-- turned off, in which case tables created in the SQL editor get no grants and
-- the app's server (service_role) is refused. The public/anon roles still get
-- nothing: RLS + absent grants keep customer data private.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on function public.create_submission(jsonb) to service_role;
grant execute on function public.update_submission(uuid, jsonb) to service_role;
grant execute on function public.admin_stats() to service_role;
grant execute on function public._write_children(uuid, jsonb) to service_role;
grant execute on function public._customer_fields(jsonb) to service_role;
grant execute on function public.gen_ref_code() to service_role;
grant execute on function public.is_admin() to service_role, authenticated;
