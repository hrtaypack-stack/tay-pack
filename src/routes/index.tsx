import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { FullscreenLoader } from "@/components/loaders";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Leave Management System" },
      {
        name: "description",
        content:
          "Enterprise leave management for tracking time-off requests, approvals, and balances across employees, managers, and HR teams.",
      },
      { property: "og:title", content: "Leave Management System" },
      {
        property: "og:description",
        content:
          "Enterprise leave management for tracking time-off requests, approvals, and balances across employees, managers, and HR teams.",
      },
      { property: "og:url", content: "https://tay-pack.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://tay-pack.lovable.app/" }],
  }),
});


function Index() {
  const { loading, profile, profileMissing, user } = useAuth();
  if (loading) return <FullscreenLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (profileMissing || !profile) return <Navigate to="/employee" replace />;
  const dest =
    profile.role === "hr"
      ? "/hr"
      : profile.role === "manager"
        ? "/manager"
        : "/employee";
  return <Navigate to={dest} replace />;
}
