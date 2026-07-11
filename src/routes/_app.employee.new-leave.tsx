import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/_app/employee/new-leave")({
  component: () => (
    <PagePlaceholder
      title="New Leave Request"
      description="Submit a new time-off request for approval."
    />
  ),
});
