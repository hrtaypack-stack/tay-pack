import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/_app/hr/employees")({
  component: () => (
    <PagePlaceholder
      title="Employees"
      description="Manage employee records and roles."
    />
  ),
});
