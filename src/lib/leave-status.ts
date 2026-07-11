export const LEAVE_STATUS = {
  PENDING_MANAGER: "Pending Manager",
  PENDING_HR: "Pending HR",
  APPROVED: "Approved",
  REJECTED_MANAGER: "Rejected by Manager",
  REJECTED_HR: "Rejected by HR",
} as const;

export type LeaveStatus = (typeof LEAVE_STATUS)[keyof typeof LEAVE_STATUS];

export const ALL_STATUSES: LeaveStatus[] = [
  LEAVE_STATUS.PENDING_MANAGER,
  LEAVE_STATUS.PENDING_HR,
  LEAVE_STATUS.APPROVED,
  LEAVE_STATUS.REJECTED_MANAGER,
  LEAVE_STATUS.REJECTED_HR,
];

export function statusVariant(
  s: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (s === LEAVE_STATUS.APPROVED) return "default";
  if (s === LEAVE_STATUS.REJECTED_MANAGER || s === LEAVE_STATUS.REJECTED_HR)
    return "destructive";
  if (s === LEAVE_STATUS.PENDING_HR) return "secondary";
  return "outline";
}

export function calcDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  const ms = e.getTime() - s.getTime();
  if (ms < 0) return 0;
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}
