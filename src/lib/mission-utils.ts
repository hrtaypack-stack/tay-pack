export const MISSION_STATUS = {
  PENDING_MANAGER: "Pending Manager",
  PENDING_HR: "Pending HR",
  APPROVED: "Approved",
  REJECTED_MANAGER: "Rejected by Manager",
  REJECTED_HR: "Rejected by HR",
  CANCELLED: "Cancelled",
} as const;

export type MissionStatus = (typeof MISSION_STATUS)[keyof typeof MISSION_STATUS];

export const ALL_MISSION_STATUSES: MissionStatus[] = [
  MISSION_STATUS.PENDING_MANAGER,
  MISSION_STATUS.PENDING_HR,
  MISSION_STATUS.APPROVED,
  MISSION_STATUS.REJECTED_MANAGER,
  MISSION_STATUS.REJECTED_HR,
  MISSION_STATUS.CANCELLED,
];

export const REQUEST_TYPES = ["Mission", "Permission"] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export function missionStatusVariant(
  s: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (s === MISSION_STATUS.APPROVED) return "default";
  if (s === MISSION_STATUS.REJECTED_MANAGER || s === MISSION_STATUS.REJECTED_HR)
    return "destructive";
  if (s === MISSION_STATUS.PENDING_HR) return "secondary";
  return "outline";
}

/** Duration in hours between two "HH:mm" strings (0 if invalid or negative). */
export function calcDurationHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  const mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) return 0;
  return Math.round((mins / 60) * 100) / 100;
}

export type MissionRequest = {
  id: string;
  employee_id: string;
  request_type: "Mission" | "Permission";
  request_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  details: string;
  status: string;
  manager_action_by: string | null;
  manager_action_date: string | null;
  manager_comment: string | null;
  hr_action_by: string | null;
  hr_action_date: string | null;
  hr_comment: string | null;
  created_at: string;
  updated_at: string;
};
