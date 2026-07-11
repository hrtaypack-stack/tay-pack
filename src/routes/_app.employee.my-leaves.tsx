import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/_app/employee/my-leaves")({
  component: () => (
    <PagePlaceholder
      title="My Leave Requests"
      description="View and track all of your leave requests."
    />
  ),
});
