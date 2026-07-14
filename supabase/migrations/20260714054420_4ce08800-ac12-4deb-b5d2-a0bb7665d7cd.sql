
-- Tighten profiles self-insert: force safe defaults
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND role = 'employee'
    AND manager_id IS NULL
    AND department_id IS NULL
    AND is_active = true
  );

-- Tighten leave_requests employee self-update: lock approval/status fields at WITH CHECK time
DROP POLICY IF EXISTS lr_update_own_pending ON public.leave_requests;
CREATE POLICY lr_update_own_pending ON public.leave_requests
  FOR UPDATE TO authenticated
  USING (employee_id = auth.uid() AND status = 'Pending Manager')
  WITH CHECK (
    employee_id = auth.uid()
    AND status = 'Pending Manager'
    AND manager_action_by IS NULL
    AND manager_action_date IS NULL
    AND manager_comment IS NULL
    AND hr_action_by IS NULL
    AND hr_action_date IS NULL
    AND hr_comment IS NULL
  );
