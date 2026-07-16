
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  notification_type text NOT NULL,
  related_type text,
  related_id uuid,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id) WHERE is_read = false;

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notif_select_own ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY notif_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id uuid, _title text, _message text, _type text,
  _related_type text, _related_id uuid, _link text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications (user_id, title, message, notification_type, related_type, related_id, link)
  VALUES (_user_id, _title, _message, _type, _related_type, _related_id, _link);
END; $$;

REVOKE ALL ON FUNCTION public.create_notification(uuid,text,text,text,text,uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_notification(uuid,text,text,text,text,uuid,text) FROM anon;
REVOKE ALL ON FUNCTION public.create_notification(uuid,text,text,text,text,uuid,text) FROM authenticated;

CREATE OR REPLACE FUNCTION public.notify_leave_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_emp_name text;
  v_mgr uuid;
  hr_rec record;
BEGIN
  SELECT full_name, manager_id INTO v_emp_name, v_mgr FROM public.profiles WHERE id = COALESCE(NEW.employee_id, OLD.employee_id);
  IF TG_OP = 'INSERT' THEN
    IF v_mgr IS NOT NULL THEN
      PERFORM public.create_notification(v_mgr, 'New Leave Request',
        COALESCE(v_emp_name,'An employee') || ' submitted a leave request.',
        'leave_request', 'leave_request', NEW.id, '/manager/pending');
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'Pending HR' THEN
      FOR hr_rec IN SELECT id FROM public.profiles WHERE role = 'hr' AND is_active = true LOOP
        PERFORM public.create_notification(hr_rec.id, 'Leave Request Awaiting HR',
          COALESCE(v_emp_name,'An employee') || '''s leave request needs HR approval.',
          'approval', 'leave_request', NEW.id, '/hr/leave-requests');
      END LOOP;
    ELSIF NEW.status = 'Rejected by Manager' THEN
      PERFORM public.create_notification(NEW.employee_id, 'Leave Request Rejected',
        'Your leave request was rejected by your supervisor.',
        'rejection', 'leave_request', NEW.id, '/employee/my-leaves');
    ELSIF NEW.status = 'Approved' THEN
      PERFORM public.create_notification(NEW.employee_id, 'Leave Request Approved',
        'Your leave request has been approved.',
        'approval', 'leave_request', NEW.id, '/employee/my-leaves');
    ELSIF NEW.status = 'Rejected by HR' THEN
      PERFORM public.create_notification(NEW.employee_id, 'Leave Request Rejected',
        'Your leave request was rejected by HR.',
        'rejection', 'leave_request', NEW.id, '/employee/my-leaves');
    END IF;
  END IF;
  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION public.notify_leave_request() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_leave_request() FROM anon;
REVOKE ALL ON FUNCTION public.notify_leave_request() FROM authenticated;

CREATE TRIGGER trg_notify_leave_request
AFTER INSERT OR UPDATE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_leave_request();

CREATE OR REPLACE FUNCTION public.notify_mission_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_emp_name text;
  v_mgr uuid;
  v_kind text;
  hr_rec record;
BEGIN
  SELECT full_name, manager_id INTO v_emp_name, v_mgr FROM public.profiles WHERE id = COALESCE(NEW.employee_id, OLD.employee_id);
  v_kind := COALESCE(NEW.request_type, OLD.request_type);
  IF TG_OP = 'INSERT' THEN
    IF v_mgr IS NOT NULL THEN
      PERFORM public.create_notification(v_mgr, 'New ' || v_kind || ' Request',
        COALESCE(v_emp_name,'An employee') || ' submitted a ' || lower(v_kind) || ' request.',
        'mission_request', 'mission_request', NEW.id, '/manager/missions');
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'Pending HR' THEN
      FOR hr_rec IN SELECT id FROM public.profiles WHERE role = 'hr' AND is_active = true LOOP
        PERFORM public.create_notification(hr_rec.id, v_kind || ' Awaiting HR',
          COALESCE(v_emp_name,'An employee') || '''s ' || lower(v_kind) || ' request needs HR approval.',
          'approval', 'mission_request', NEW.id, '/hr/missions');
      END LOOP;
    ELSIF NEW.status = 'Rejected by Manager' THEN
      PERFORM public.create_notification(NEW.employee_id, v_kind || ' Rejected',
        'Your ' || lower(v_kind) || ' request was rejected by your supervisor.',
        'rejection', 'mission_request', NEW.id, '/employee/missions');
    ELSIF NEW.status = 'Approved' THEN
      PERFORM public.create_notification(NEW.employee_id, v_kind || ' Approved',
        'Your ' || lower(v_kind) || ' request has been approved.',
        'approval', 'mission_request', NEW.id, '/employee/missions');
    ELSIF NEW.status = 'Rejected by HR' THEN
      PERFORM public.create_notification(NEW.employee_id, v_kind || ' Rejected',
        'Your ' || lower(v_kind) || ' request was rejected by HR.',
        'rejection', 'mission_request', NEW.id, '/employee/missions');
    END IF;
  END IF;
  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION public.notify_mission_request() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_mission_request() FROM anon;
REVOKE ALL ON FUNCTION public.notify_mission_request() FROM authenticated;

CREATE TRIGGER trg_notify_mission_request
AFTER INSERT OR UPDATE ON public.mission_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_mission_request();
