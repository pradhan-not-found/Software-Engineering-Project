"use client";

import { CalendarOff, CheckCircle2, Clock, FolderKanban, AlertTriangle, UserCheck } from "lucide-react";
import type { DB } from "@/lib/types";
import { performanceMetrics } from "@/lib/utils";

/**
 * Connected wedge: performance reviews pre-populated with real work data.
 * Shows task delivery and attendance metrics for an employee over a window.
 */
export default function PerformanceMetrics({ db, employeeId, start, end, compact }: { db: DB; employeeId: string; start: string; end: string; compact?: boolean }) {
  const m = performanceMetrics(db, employeeId, start, end);
  const items = [
    { label: "Tasks completed", value: m.completed, icon: <CheckCircle2 className="w-4 h-4" />, tone: "text-green-600 dark:text-green-400" },
    { label: "On-time delivery", value: `${m.onTimeRate}%`, icon: <Clock className="w-4 h-4" />, tone: m.onTimeRate >= 80 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400" },
    { label: "Missed / overdue", value: m.missedDeadlines, icon: <AlertTriangle className="w-4 h-4" />, tone: m.missedDeadlines ? "text-red-600 dark:text-red-400" : "text-gray-500" },
    { label: "Projects involved", value: m.projects, icon: <FolderKanban className="w-4 h-4" />, tone: "text-blue-600 dark:text-blue-400" },
    { label: "Attendance rate", value: `${m.attendanceRate}%`, icon: <UserCheck className="w-4 h-4" />, tone: "text-teal-600 dark:text-teal-400" },
    { label: "Leave days taken", value: m.leaveDays, icon: <CalendarOff className="w-4 h-4" />, tone: "text-purple-600 dark:text-purple-400" },
  ];
  return (
    <div className={compact ? "grid grid-cols-3 gap-2" : "grid grid-cols-2 sm:grid-cols-3 gap-3"}>
      {items.map((i) => (
        <div key={i.label} className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] p-3">
          <div className={`flex items-center gap-1.5 ${i.tone}`}>
            {i.icon}
            <span className="text-lg font-semibold tabular-nums">{i.value}</span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-white/50 mt-1">{i.label}</p>
        </div>
      ))}
    </div>
  );
}
