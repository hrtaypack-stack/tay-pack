import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { LEAVE_STATUS, calcDays } from "@/lib/leave-status";

export const Route = createFileRoute("/_app/employee/new-leave")({
  component: NewLeavePage,
});

function NewLeavePage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  // جلب أنواع الإجازات المفعلة من قاعدة البيانات
  const { data: types = [] } = useQuery({
    queryKey: ["leave_types_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_types")
        .select("id, name, color")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as Array<{ id: string; name: string; color: string }>;
    },
  });

  // حساب عدد الأيام بشكل تلقائي
  const days = useMemo(() => calcDays(startDate, endDate), [startDate, endDate]);

  // دالة إرسال الطلب لـ Supabase
  const submitMut = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("لم يتم العثور على بيانات المستخدم، يرجى إعادة تسجيل الدخول.");
      if (!leaveTypeId) throw new Error("من فضلك اختر نوع الإجازة.");
      if (!startDate || !endDate) throw new Error("من فضلك حدد تاريخ البداية والنهاية.");
      if (days <= 0) throw new Error("تاريخ النهاية يجب أن يكون مساوياً أو بعد تاريخ البداية.");

      const now = new Date().toISOString();
      
      const { error } = await supabase.from("leave_requests").insert({
        employee_id: profile.id,
        leave_type_id: leaveTypeId,
        start_date: startDate, // صيغة YYYY-MM-DD مقبولة لعمود date في PostgreSQL
        end_date: endDate,
        days: days,
        reason: reason.trim() || null,
        status: LEAVE_STATUS.PENDING_MANAGER, // المرحلة الأولى: معلق بانتظار المدير
        created_at: now,
        updated_at: now,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تقديم طلب الإجازة بنجاح وهو قيد المراجعة الآن.");
      qc.invalidateQueries({ queryKey: ["my_leave_requests"] });
      navigate({ to: "/employee/my-leaves" });
    },
    onError: (e: Error) => {
      toast.error(`فشل التقديم: ${e.message}`);
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitMut.mutate();
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        title="New Leave Request"
        description="Submit a new time-off request for approval."
      />
      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-5 rounded-xl border bg-card p-6"
      >
        <div className="space-y-2">
          <Label htmlFor="leave-type">Leave type</Label>
          <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
            <SelectTrigger id="leave-type">
              <SelectValue placeholder="Select a leave type" />
            </SelectTrigger>
            <SelectContent>
              {types.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded"
                      style={{ backgroundColor: t.color }}
                    />
                    {t.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="start">Start date</Label>
            <Input
              id="start"
              type="date"
              min={today}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end">End date</Label>
            <Input
              id="end"
              type="date"
              min={startDate || today}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="rounded-lg bg-accent/40 p-4 text-sm">
          <span className="text-muted-foreground">Total days: </span>
          <span className="font-semibold">{days}</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">Reason</Label>
          <Textarea
            id="reason"
            rows={4}
            maxLength={1000}
            placeholder="Briefly describe the reason for your leave"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/employee/my-leaves" })}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitMut.isPending}>
            {submitMut.isPending ? "Submitting..." : "Submit request"}
          </Button>
        </div>
      </form>
    </>
  );
}
