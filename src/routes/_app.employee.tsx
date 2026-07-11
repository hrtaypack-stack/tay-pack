import { createFileRoute } from "@tanstack/react-router";
import { EmployeeGate } from "@/components/role-gate";

export const Route = createFileRoute("/_app/employee")({
  component: EmployeeGate,
});
