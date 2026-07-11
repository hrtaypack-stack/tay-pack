import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/_app/manager/history")({
  component: () => (
    <PagePlaceholder
      title="Leave History"
      description="Review previously processed leave requests."
    />
  ),
});
