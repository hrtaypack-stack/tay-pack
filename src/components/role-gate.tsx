import { Outlet, Navigate } from "@tanstack/react-router";
import { useAuth, type UserRole } from "@/hooks/use-auth";
import { ErrorState } from "@/components/error-state";

function makeGuard(allowed: UserRole) {
  return function Guard() {
    const { profile, loading } = useAuth();
    if (loading) return null;
    if (!profile) return <Navigate to="/auth" replace />;
    if (profile.role !== allowed) {
      return (
        <ErrorState
          code="403"
          title="Access denied"
          message="You don't have permission to view this section."
        />
      );
    }
    return <Outlet />;
  };
}

export const EmployeeGate = makeGuard("employee");
export const HRGate = makeGuard("hr");

// Manager area: accessible to users with the "manager" role AND to any
// employee who has one or more direct reports assigned (supervisor).
export function ManagerGate() {
  const { profile, hasReports, loading } = useAuth();
  if (loading) return null;
  if (!profile) return <Navigate to="/auth" replace />;
  const canApprove = profile.role === "manager" || hasReports;
  if (!canApprove) {
    return (
      <ErrorState
        code="403"
        title="Access denied"
        message="You don't have permission to view this section."
      />
    );
  }
  return <Outlet />;
}
