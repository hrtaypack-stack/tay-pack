
REVOKE EXECUTE ON FUNCTION public.get_user_role(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_hr(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_manager_of(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.write_audit_log() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
