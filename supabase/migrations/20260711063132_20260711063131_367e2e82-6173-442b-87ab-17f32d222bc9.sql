
-- =========================
-- Helper: updated_at trigger
-- =========================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =========================
-- Table: departments
-- =========================
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- =========================
-- Table: profiles
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_code TEXT UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee','manager','hr')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_manager_id ON public.profiles(manager_id);
CREATE INDEX idx_profiles_department_id ON public.profiles(department_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- Security definer helpers (avoid RLS recursion)
-- =========================
CREATE OR REPLACE FUNCTION public.get_user_role(_uid UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = _uid
$$;

CREATE OR REPLACE FUNCTION public.is_hr(_uid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid AND role = 'hr')
$$;

CREATE OR REPLACE FUNCTION public.is_manager_of(_manager UUID, _employee UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _employee AND manager_id = _manager)
$$;

-- =========================
-- Profiles policies
-- =========================
CREATE POLICY "profiles_select_self" ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "profiles_select_reports" ON public.profiles FOR SELECT TO authenticated
USING (manager_id = auth.uid());

CREATE POLICY "profiles_select_hr" ON public.profiles FOR SELECT TO authenticated
USING (public.is_hr(auth.uid()));

CREATE POLICY "profiles_insert_hr" ON public.profiles FOR INSERT TO authenticated
WITH CHECK (public.is_hr(auth.uid()));

CREATE POLICY "profiles_update_hr" ON public.profiles FOR UPDATE TO authenticated
USING (public.is_hr(auth.uid())) WITH CHECK (public.is_hr(auth.uid()));

CREATE POLICY "profiles_delete_hr" ON public.profiles FOR DELETE TO authenticated
USING (public.is_hr(auth.uid()));

-- =========================
-- Departments policies
-- =========================
CREATE POLICY "departments_select_all" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "departments_write_hr" ON public.departments FOR ALL TO authenticated
USING (public.is_hr(auth.uid())) WITH CHECK (public.is_hr(auth.uid()));

-- =========================
-- Table: leave_types
-- =========================
CREATE TABLE public.leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_types TO authenticated;
GRANT ALL ON public.leave_types TO service_role;
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leave_types_select_all" ON public.leave_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "leave_types_write_hr" ON public.leave_types FOR ALL TO authenticated
USING (public.is_hr(auth.uid())) WITH CHECK (public.is_hr(auth.uid()));

-- =========================
-- Table: leave_requests
-- =========================
CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES public.leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days NUMERIC(5,2) NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'Pending Manager'
    CHECK (status IN ('Pending Manager','Rejected by Manager','Pending HR','Rejected by HR','Approved','Cancelled')),
  manager_comment TEXT,
  hr_comment TEXT,
  manager_action_by UUID REFERENCES public.profiles(id),
  manager_action_date TIMESTAMPTZ,
  hr_action_by UUID REFERENCES public.profiles(id),
  hr_action_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);
CREATE INDEX idx_lr_employee ON public.leave_requests(employee_id);
CREATE INDEX idx_lr_status ON public.leave_requests(status);
CREATE INDEX idx_lr_type ON public.leave_requests(leave_type_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_requests TO authenticated;
GRANT ALL ON public.leave_requests TO service_role;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_lr_updated_at
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SELECT
CREATE POLICY "lr_select_own" ON public.leave_requests FOR SELECT TO authenticated
USING (employee_id = auth.uid());
CREATE POLICY "lr_select_manager" ON public.leave_requests FOR SELECT TO authenticated
USING (public.is_manager_of(auth.uid(), employee_id));
CREATE POLICY "lr_select_hr" ON public.leave_requests FOR SELECT TO authenticated
USING (public.is_hr(auth.uid()));

-- INSERT (own only)
CREATE POLICY "lr_insert_own" ON public.leave_requests FOR INSERT TO authenticated
WITH CHECK (employee_id = auth.uid() AND status = 'Pending Manager');
CREATE POLICY "lr_insert_hr" ON public.leave_requests FOR INSERT TO authenticated
WITH CHECK (public.is_hr(auth.uid()));

-- UPDATE
CREATE POLICY "lr_update_own_pending" ON public.leave_requests FOR UPDATE TO authenticated
USING (employee_id = auth.uid() AND status = 'Pending Manager')
WITH CHECK (employee_id = auth.uid());
CREATE POLICY "lr_update_manager" ON public.leave_requests FOR UPDATE TO authenticated
USING (public.is_manager_of(auth.uid(), employee_id))
WITH CHECK (public.is_manager_of(auth.uid(), employee_id));
CREATE POLICY "lr_update_hr" ON public.leave_requests FOR UPDATE TO authenticated
USING (public.is_hr(auth.uid())) WITH CHECK (public.is_hr(auth.uid()));

-- DELETE
CREATE POLICY "lr_delete_own_pending" ON public.leave_requests FOR DELETE TO authenticated
USING (employee_id = auth.uid() AND status = 'Pending Manager');
CREATE POLICY "lr_delete_hr" ON public.leave_requests FOR DELETE TO authenticated
USING (public.is_hr(auth.uid()));

-- =========================
-- Table: settings (singleton)
-- =========================
CREATE TABLE public.settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name TEXT NOT NULL DEFAULT 'Acme Corporation',
  company_logo TEXT,
  primary_color TEXT NOT NULL DEFAULT '#3B82F6',
  secondary_color TEXT NOT NULL DEFAULT '#FFFFFF',
  welcome_text TEXT NOT NULL DEFAULT 'Welcome to the Leave Management System',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select_all" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_write_hr" ON public.settings FOR ALL TO authenticated
USING (public.is_hr(auth.uid())) WITH CHECK (public.is_hr(auth.uid()));

CREATE TRIGGER trg_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- =========================
-- Table: audit_logs
-- =========================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_select_hr" ON public.audit_logs FOR SELECT TO authenticated
USING (public.is_hr(auth.uid()));
CREATE POLICY "audit_insert_authenticated" ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- =========================
-- Audit trigger function
-- =========================
CREATE OR REPLACE FUNCTION public.write_audit_log()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old JSONB;
  v_new JSONB;
  v_rec TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_old := NULL; v_new := to_jsonb(NEW); v_rec := NEW.id::text;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD); v_new := to_jsonb(NEW); v_rec := NEW.id::text;
  ELSE
    v_old := to_jsonb(OLD); v_new := NULL; v_rec := OLD.id::text;
  END IF;
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
  VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, v_rec, v_old, v_new);
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER audit_profiles AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER audit_departments AFTER INSERT OR UPDATE OR DELETE ON public.departments
FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER audit_leave_types AFTER INSERT OR UPDATE OR DELETE ON public.leave_types
FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER audit_leave_requests AFTER INSERT OR UPDATE OR DELETE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER audit_settings AFTER UPDATE ON public.settings
FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

-- =========================
-- Seed leave types
-- =========================
INSERT INTO public.leave_types (name, code, color, sort_order) VALUES
  ('Annual Leave', 'AL', '#3b82f6', 1),
  ('Sick Leave', 'SL', '#ef4444', 2),
  ('Casual Leave', 'CL', '#10b981', 3),
  ('Unpaid Leave', 'UL', '#6b7280', 4)
ON CONFLICT (code) DO NOTHING;
;
