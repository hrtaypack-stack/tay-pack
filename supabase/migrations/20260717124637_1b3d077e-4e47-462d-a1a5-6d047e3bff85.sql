
-- Lock down audit_logs so only the SECURITY DEFINER trigger can insert
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM PUBLIC, anon, authenticated;

-- Extend leave request self-update guard: also block employee_id changes
CREATE OR REPLACE FUNCTION public.guard_leave_request_self_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Employees cannot modify approval, status, ownership, or audit fields on their own leave requests';
  END IF;

  RETURN NEW;
END;
$function$;

-- Extend mission request self-update guard: also block employee_id and request_date/type ownership drift
CREATE OR REPLACE FUNCTION public.guard_mission_request_self_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Employees cannot modify approval, status, ownership, or audit fields on their own mission requests';
  END IF;

  RETURN NEW;
END;
$function$;
