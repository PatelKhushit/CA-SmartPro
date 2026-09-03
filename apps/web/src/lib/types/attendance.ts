export type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY" | "ON_LEAVE" | "HOLIDAY" | "WEEK_OFF";

export interface AttendanceRecord {
  id: string;
  userId: string;
  user: { id: string; fullName: string };
  markedBy: { id: string; fullName: string };
  date: string;
  status: AttendanceStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
  workedMinutes: number | null;
  notes: string | null;
}

export interface AttendanceSummary {
  today: {
    checkedIn: boolean;
    checkedOut: boolean;
    status: AttendanceStatus | null;
    checkInAt: string | null;
    checkOutAt: string | null;
  };
  thisMonth: {
    present: number;
    absent: number;
    halfDay: number;
    onLeave: number;
    holiday: number;
    weekOff: number;
    totalWorkedMinutes: number;
  };
  team: {
    presentToday: number;
    teamSize: number;
  };
}

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  HALF_DAY: "Half Day",
  ON_LEAVE: "On Leave",
  HOLIDAY: "Holiday",
  WEEK_OFF: "Week Off",
};

export const ATTENDANCE_STATUS_VARIANT: Record<AttendanceStatus, "neutral" | "attention" | "completed" | "overdue" | "upcoming" | "inProgress" | "cancelled"> = {
  PRESENT: "completed",
  ABSENT: "overdue",
  HALF_DAY: "attention",
  ON_LEAVE: "upcoming",
  HOLIDAY: "neutral",
  WEEK_OFF: "neutral",
};

export function formatWorkedMinutes(minutes: number | null): string {
  if (minutes === null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}
