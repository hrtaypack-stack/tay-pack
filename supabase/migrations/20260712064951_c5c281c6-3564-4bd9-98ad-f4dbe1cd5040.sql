REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.rls_auto_enable() SET search_path = pg_catalog;
