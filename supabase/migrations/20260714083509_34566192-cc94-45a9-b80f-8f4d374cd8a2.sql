
-- Mission & Permission module
CREATE TABLE public.mission_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('Mission','Permission')),
  request_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_hours NUMERIC(5,2) NOT NULL,
  details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending Manager',
  manager_action_by UUID REFERENCES public.profiles(id),
  manager_action_date TIMESTAMPTZ,
  manager_comment TEXT,
  hr_action_by UUID REFERENCES public.profiles(id),
  hr_action_date TIMESTAMPTZ,
  hr_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time),
  CHECK (duration_hours > 0)
);

CREATE INDEX idx_mission_requests_employee ON public.mission_requests(employee_id);
CREATE INDEX idx_mission_requests_status ON public.mission_requests(status);
CREATE INDEX idx_mission_requests_date ON public.mission_requests(request_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mission_requests TO authenticated;
GRANT ALL ON public.mission_requests TO service_role;

ALTER TABLE public.mission_requests ENABLE ROW LEVEL SECURITY;

-- Employee: view own
CREATE POLICY "mr_select_own" ON public.mission_requests FOR SELECT TO authenticated
USING (employee_id = auth.uid());

-- Manager: view team requests
CREATE POLICY "mr_select_manager" ON public.mission_requests FOR SELECT TO authenticated
USING (private.is_manager_of(auth.uid(), employee_id));

-- HR: view all
CREATE POLICY "mr_select_hr" ON public.mission_requests FOR SELECT TO authenticated
USING (private.is_hr(auth.uid()));

-- Employee: create own with initial status
CREATE POLICY "mr_insert_own" ON public.mission_requests FOR INSERT TO authenticated
WITH CHECK (
  employee_id = auth.uid()
  AND status = 'Pending Manager'
  AND manager_action_by IS NULL
  AND hr_action_by IS NULL
);

-- Employee: update/delete own only while Pending Manager
CREATE POLICY "mr_update_own_pending" ON public.mission_requests FOR UPDATE TO authenticated
USING (employee_id = auth.uid() AND status = 'Pending Manager')
WITH CHECK (employee_id = auth.uid() AND status = 'Pending Manager');

CREATE POLICY "mr_delete_own_pending" ON public.mission_requests FOR DELETE TO authenticated
USING (employee_id = auth.uid() AND status = 'Pending Manager');

-- Manager: update team requests (approve/reject)
CREATE POLICY "mr_update_manager" ON public.mission_requests FOR UPDATE TO authenticated
USING (private.is_manager_of(auth.uid(), employee_id))
WITH CHECK (private.is_manager_of(auth.uid(), employee_id));

-- HR: full update
CREATE POLICY "mr_update_hr" ON public.mission_requests FOR UPDATE TO authenticated
USING (private.is_hr(auth.uid()))
WITH CHECK (private.is_hr(auth.uid()));

CREATE POLICY "mr_delete_hr" ON public.mission_requests FOR DELETE TO authenticated
USING (private.is_hr(auth.uid()));

-- Guard: employee self-update can't change status/approval fields
CREATE OR REPLACE FUNCTION public.guard_mission_request_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> OLD.employee_id THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.status <> 'Pending Manager'
     OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
     OR NEW.manager_action_by IS DISTINCT FROM OLD.manager_action_by
     OR NEW.manager_action_date IS DISTINCT FROM OLD.manager_action_date
     OR NEW.manager_comment IS DISTINCT FROM OLD.manager_comment
     OR NEW.hr_action_by IS DISTINCT FROM OLD.hr_action_by
     OR NEW.hr_action_date IS DISTINCT FROM OLD.hr_action_date
     OR NEW.hr_comment IS DISTINCT FROM OLD.hr_comment
  THEN
    RAISE EXCEPTION 'Employees cannot modify approval or status fields on their own mission requests';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.guard_mission_request_self_update() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_mr_guard_self_update
BEFORE UPDATE ON public.mission_requests
FOR EACH ROW EXECUTE FUNCTION public.guard_mission_request_self_update();

CREATE TRIGGER trg_mr_updated_at
BEFORE UPDATE ON public.mission_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_mr_audit
AFTER INSERT OR UPDATE OR DELETE ON public.mission_requests
FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
