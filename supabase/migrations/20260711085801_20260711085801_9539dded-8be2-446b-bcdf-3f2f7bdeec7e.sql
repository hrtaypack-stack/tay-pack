
-- Add footer text to settings
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS footer_text text NOT NULL DEFAULT '© Leave Management System';

-- Audit triggers for leave_requests
DROP TRIGGER IF EXISTS audit_leave_requests_ins ON public.leave_requests;
DROP TRIGGER IF EXISTS audit_leave_requests_upd ON public.leave_requests;
DROP TRIGGER IF EXISTS audit_leave_requests_del ON public.leave_requests;
CREATE TRIGGER audit_leave_requests_ins AFTER INSERT ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER audit_leave_requests_upd AFTER UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER audit_leave_requests_del AFTER DELETE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

-- Audit triggers for profiles, departments, leave_types, settings
DROP TRIGGER IF EXISTS audit_profiles ON public.profiles;
CREATE TRIGGER audit_profiles AFTER INSERT OR UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
DROP TRIGGER IF EXISTS audit_departments ON public.departments;
CREATE TRIGGER audit_departments AFTER INSERT OR UPDATE OR DELETE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
DROP TRIGGER IF EXISTS audit_leave_types ON public.leave_types;
CREATE TRIGGER audit_leave_types AFTER INSERT OR UPDATE OR DELETE ON public.leave_types FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
DROP TRIGGER IF EXISTS audit_settings ON public.settings;
CREATE TRIGGER audit_settings AFTER INSERT OR UPDATE OR DELETE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

-- Update default status
ALTER TABLE public.leave_requests ALTER COLUMN status SET DEFAULT 'Pending Manager';
;
