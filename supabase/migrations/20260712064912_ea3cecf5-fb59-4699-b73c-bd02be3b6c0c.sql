-- 1. Fix privilege escalation: prevent self-update of role and related fields
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    AND manager_id IS NOT DISTINCT FROM (SELECT p.manager_id FROM public.profiles p WHERE p.id = auth.uid())
    AND department_id IS NOT DISTINCT FROM (SELECT p.department_id FROM public.profiles p WHERE p.id = auth.uid())
    AND is_active = (SELECT p.is_active FROM public.profiles p WHERE p.id = auth.uid())
  );

-- 2. Remove duplicate profile select policy
DROP POLICY IF EXISTS profiles_select_self ON public.profiles;

-- 3. Remove less-restrictive duplicate leave_requests policies
DROP POLICY IF EXISTS leave_requests_select_own ON public.leave_requests;
DROP POLICY IF EXISTS leave_requests_insert_own ON public.leave_requests;
DROP POLICY IF EXISTS leave_requests_update_own ON public.leave_requests;
DROP POLICY IF EXISTS leave_requests_delete_own ON public.leave_requests;

-- 4. Lock down SECURITY DEFINER functions and pin search_path
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.write_audit_log() FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;
