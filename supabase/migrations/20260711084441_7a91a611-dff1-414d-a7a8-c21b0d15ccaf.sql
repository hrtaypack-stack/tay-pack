
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO postgres, service_role;

CREATE OR REPLACE FUNCTION private.get_user_role(_uid uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = _uid
$$;

CREATE OR REPLACE FUNCTION private.is_hr(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid AND role = 'hr')
$$;

CREATE OR REPLACE FUNCTION private.is_manager_of(_manager uuid, _employee uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _employee AND manager_id = _manager)
$$;

REVOKE ALL ON FUNCTION private.get_user_role(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.is_hr(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.is_manager_of(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- CASCADE drop removes all dependent policies; we recreate them below pointing at private.*
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_hr(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_manager_of(uuid, uuid) CASCADE;

-- Profiles
CREATE POLICY "profiles_select_hr" ON public.profiles FOR SELECT TO authenticated
USING (private.is_hr(auth.uid()));
CREATE POLICY "profiles_insert_hr" ON public.profiles FOR INSERT TO authenticated
WITH CHECK (private.is_hr(auth.uid()));
CREATE POLICY "profiles_update_hr" ON public.profiles FOR UPDATE TO authenticated
USING (private.is_hr(auth.uid())) WITH CHECK (private.is_hr(auth.uid()));
CREATE POLICY "profiles_delete_hr" ON public.profiles FOR DELETE TO authenticated
USING (private.is_hr(auth.uid()));

-- Departments
CREATE POLICY "departments_write_hr" ON public.departments FOR ALL TO authenticated
USING (private.is_hr(auth.uid())) WITH CHECK (private.is_hr(auth.uid()));

-- Leave types
CREATE POLICY "leave_types_write_hr" ON public.leave_types FOR ALL TO authenticated
USING (private.is_hr(auth.uid())) WITH CHECK (private.is_hr(auth.uid()));

-- Leave requests
CREATE POLICY "lr_select_manager" ON public.leave_requests FOR SELECT TO authenticated
USING (private.is_manager_of(auth.uid(), employee_id));
CREATE POLICY "lr_select_hr" ON public.leave_requests FOR SELECT TO authenticated
USING (private.is_hr(auth.uid()));
CREATE POLICY "lr_insert_hr" ON public.leave_requests FOR INSERT TO authenticated
WITH CHECK (private.is_hr(auth.uid()));
CREATE POLICY "lr_update_manager" ON public.leave_requests FOR UPDATE TO authenticated
USING (private.is_manager_of(auth.uid(), employee_id))
WITH CHECK (private.is_manager_of(auth.uid(), employee_id));
CREATE POLICY "lr_update_hr" ON public.leave_requests FOR UPDATE TO authenticated
USING (private.is_hr(auth.uid())) WITH CHECK (private.is_hr(auth.uid()));
CREATE POLICY "lr_delete_hr" ON public.leave_requests FOR DELETE TO authenticated
USING (private.is_hr(auth.uid()));

-- Settings
CREATE POLICY "settings_write_hr" ON public.settings FOR ALL TO authenticated
USING (private.is_hr(auth.uid())) WITH CHECK (private.is_hr(auth.uid()));

-- Audit logs
CREATE POLICY "audit_select_hr" ON public.audit_logs FOR SELECT TO authenticated
USING (private.is_hr(auth.uid()));
