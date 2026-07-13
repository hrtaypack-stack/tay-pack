
-- Fix 1: Remove direct INSERT access to audit_logs from clients
DROP POLICY IF EXISTS audit_insert_authenticated ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_insert_own ON public.audit_logs;
REVOKE INSERT ON public.audit_logs FROM authenticated;
REVOKE INSERT ON public.audit_logs FROM anon;

-- Fix 2: Restrict employee self-update on leave_requests via BEFORE UPDATE trigger
CREATE OR REPLACE FUNCTION public.guard_leave_request_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- Only guard when the actor is the request owner (employee self-update).
  -- Manager/HR updates are governed by their own policies and should pass through.
  IF auth.uid() IS NULL OR auth.uid() <> OLD.employee_id THEN
    RETURN NEW;
  END IF;

  -- Employee self-updates must keep approval/workflow fields unchanged
  -- and cannot move the request out of 'Pending Manager'.
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
    RAISE EXCEPTION 'Employees cannot modify approval or status fields on their own leave requests';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_leave_request_self_update ON public.leave_requests;
CREATE TRIGGER trg_guard_leave_request_self_update
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.guard_leave_request_self_update();
