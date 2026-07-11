import { createFileRoute } from "@tanstack/react-router";
import { ManagerGate } from "@/components/role-gate";

export const Route = createFileRoute("/_app/manager")({
  component: ManagerGate,
});
