import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
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
export const ManagerGate = makeGuard("manager");
export const HRGate = makeGuard("hr");
