-- Allow authenticated (and anon during SSR) to invoke the SECURITY DEFINER
-- helper functions used inside RLS policies. Without USAGE on the private
-- schema and EXECUTE on the functions, every policy referencing
-- private.is_hr / private.is_manager_of / private.get_user_role errors out
-- with "permission denied", which surfaces in the app as blocked SELECTs
-- on profiles/leave_requests and the "No employee profile found" screen.

GRANT USAGE ON SCHEMA private TO authenticated;

GRANT EXECUTE ON FUNCTION private.is_hr(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_manager_of(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_user_role(uuid) TO authenticated;
