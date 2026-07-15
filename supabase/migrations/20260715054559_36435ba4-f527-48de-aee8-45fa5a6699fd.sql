
-- Block direct client inserts to audit_logs; only SECURITY DEFINER trigger writes.
DROP POLICY IF EXISTS audit_logs_no_direct_insert ON public.audit_logs;
CREATE POLICY audit_logs_no_direct_insert ON public.audit_logs
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);

-- Prevent employees from forging approval fields on their own pending mission requests.
DROP POLICY IF EXISTS mr_update_own_pending ON public.mission_requests;
CREATE POLICY mr_update_own_pending ON public.mission_requests
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
