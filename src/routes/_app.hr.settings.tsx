import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/_app/hr/settings")({
  component: () => (
    <PagePlaceholder
      title="Settings"
      description="Company profile, branding, and system configuration."
    />
  ),
});
