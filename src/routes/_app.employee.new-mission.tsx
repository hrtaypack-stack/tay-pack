import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { MISSION_STATUS, REQUEST_TYPES, calcDurationHours } from "@/lib/mission-utils";

export const Route = createFileRoute("/_app/employee/new-mission")({
  component: NewMissionPage,
});

function NewMissionPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [requestType, setRequestType] = useState<string>("");
  const [requestDate, setRequestDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [details, setDetails] = useState("");

  const hours = useMemo(
    () => calcDurationHours(startTime, endTime),
    [startTime, endTime],
  );

  const submitMut = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("User profile not loaded.");
      if (!requestType) throw new Error("Please select a request type.");
      if (!requestDate) throw new Error("Please select a request date.");
      if (!startTime || !endTime) throw new Error("Please set From and To times.");
      if (hours <= 0) throw new Error("To Time must be later than From Time.");
      if (!details.trim()) throw new Error("Details are required.");

      const { error } = await (supabase as any).from("mission_requests").insert({
        employee_id: profile.id,
        request_type: requestType,
        request_date: requestDate,
        start_time: startTime,
        end_time: endTime,
        duration_hours: hours,
        details: details.trim(),
        status: MISSION_STATUS.PENDING_MANAGER,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request submitted for approval.");
      qc.invalidateQueries({ queryKey: ["my_mission_requests"] });
      navigate({ to: "/employee/missions" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitMut.mutate();
  };

  return (
    <>
      <PageHeader
        title="New Mission / Permission Request"
        description="Submit a mission or permission request for approval."
      />
      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-5 rounded-xl border bg-card p-6"
      >
        <div className="space-y-2">
          <Label>Request Type *</Label>
          <Select value={requestType} onValueChange={setRequestType}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {REQUEST_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Request Date *</Label>
          <Input
            type="date"
            value={requestDate}
            onChange={(e) => setRequestDate(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>From Time *</Label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              step={60}
            />
          </div>
          <div className="space-y-2">
            <Label>To Time *</Label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              step={60}
            />
          </div>
        </div>

        <div className="rounded-lg bg-accent/40 p-3 text-sm">
          Total Duration:{" "}
          <span className="font-semibold">{hours} Hours</span>
        </div>

        <div className="space-y-2">
          <Label>Details *</Label>
          <Textarea
            rows={4}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Describe your mission or permission..."
            maxLength={2000}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/employee/missions" })}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitMut.isPending}>
            {submitMut.isPending ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </form>
    </>
  );
}
