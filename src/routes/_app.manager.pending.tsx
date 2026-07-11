import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/_app/manager/pending")({
  component: () => (
    <PagePlaceholder
      title="Pending Requests"
      description="Approve or reject your team's leave requests."
    />
  ),
});
