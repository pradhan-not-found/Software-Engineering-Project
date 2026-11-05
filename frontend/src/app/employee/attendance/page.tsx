"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useAuthed } from "@/lib/store";
import type { AttendanceStatus, Timesheet } from "@/lib/types";
import {
  Button, Card, CardHeader, EmptyState, Input, PageHeader, Select, StatCard, StatusBadge, Table, Td, Th, useToast,
} from "@/components/ui";
import ClockWidget from "@/components/employee/ClockWidget";
import { addDays, cn, formatDate, hoursBetween, isWeekend, parseDate, startOfWeek, today } from "@/lib/utils";

const STATUS_STYLE: Record<AttendanceStatus | "HOLIDAY" | "WEEKEND", string> = {
  PRESENT: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  REMOTE: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  HALF_DAY: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  ABSENT: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  ON_LEAVE: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
  HOLIDAY: "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300",
  WEEKEND: "bg-gray-50 text-gray-400 dark:bg-white/[0.02] dark:text-white/25",
};
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AttendancePage() {
  const { db, user, saveTimesheet } = useAuthed();
  const toast = useToast();
  const t = today();
  const [month, setMonth] = useState(t.slice(0, 7));

  /* --------------------------- Calendar --------------------------- */
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const firstOffset = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const records = db.attendance.filter((a) => a.employeeId === user.id && a.date.startsWith(month));
  const byDate = new Map(records.map((r) => [r.date, r]));
  const holidayMap = new Map(db.holidays.map((h) => [h.date, h.name]));

  const counts = records.reduce<Record<string, number>>((acc, r) => ((acc[r.status] = (acc[r.status] ?? 0) + 1), acc), {});
  const worked = records.filter((r) => r.clockIn && r.clockOut);
  const avgHours = worked.length ? worked.reduce((s, r) => s + hoursBetween(r.clockIn, r.clockOut), 0) / worked.length : 0;

  const shiftMonth = (delta: number) => {
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  /* --------------------------- Timesheet -------------------------- */
  const [weekStart, setWeekStart] = useState(startOfWeek(t));
  const existing = db.timesheets.find((x) => x.employeeId === user.id && x.weekStart === weekStart);
  const myProjectIds = useMemo(() => {
    const ids = new Set<string>();
    db.tasks.forEach((task) => {
      if (!task.assigneeIds.includes(user.id)) return;
      const pid = db.boards.find((b) => b.id === task.boardId)?.projectId;
      if (pid) ids.add(pid);
    });
    return Array.from(ids);
  }, [db, user.id]);
  const [entries, setEntries] = useState<Timesheet["entries"]>([]);
  useEffect(() => {
    setEntries(
      existing
        ? structuredClone(existing.entries)
        : (myProjectIds.length ? myProjectIds : db.projects.slice(0, 1).map((p) => p.id)).map((projectId) => ({ projectId, hours: [0, 0, 0, 0, 0, 0, 0] })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, existing?.id, existing?.status]);
  const locked = existing?.status === "SUBMITTED" || existing?.status === "APPROVED";
  const dayTotals = DAYS.map((_, i) => entries.reduce((s, e) => s + (Number(e.hours[i]) || 0), 0));
  const total = dayTotals.reduce((a, b) => a + b, 0);
  const unusedProjects = db.projects.filter((p) => !entries.some((e) => e.projectId === p.id));

  const save = (submit: boolean) => {
    if (submit && total === 0) return toast("Log some hours before submitting.", "error");
    const res = saveTimesheet(weekStart, entries.filter((e) => e.hours.some((h) => h > 0) || !submit), submit);
    if (res.ok) toast(submit ? "Timesheet submitted for approval." : "Draft saved.");
    else toast(res.error, "error");
  };

  const history = db.timesheets.filter((x) => x.employeeId === user.id).sort((a, b) => b.weekStart.localeCompare(a.weekStart));

  return (
    <>
      <PageHeader title="Attendance & Timesheets" subtitle={`Shift: ${user.shift} · Work mode: ${user.workMode}`} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ClockWidget />
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Present" value={(counts.PRESENT ?? 0) + (counts.REMOTE ?? 0)} hint={`${counts.REMOTE ?? 0} remote`} />
          <StatCard label="Half days" value={counts.HALF_DAY ?? 0} />
          <StatCard label="Absent" value={counts.ABSENT ?? 0} hintTone="bad" hint={counts.ABSENT ? "Loss of pay" : undefined} />
          <StatCard label="Avg. hours" value={avgHours.toFixed(1)} hint="per day" />
        </div>
      </div>

      <Card>
        <CardHeader
          title={new Date(y, m - 1, 1).toLocaleString("en", { month: "long", year: "numeric" })}
          subtitle="Monthly attendance calendar"
          action={
            <div className="flex gap-1">
              <Button size="sm" variant="secondary" onClick={() => shiftMonth(-1)} aria-label="Previous month"><ChevronLeft className="w-4 h-4" /></Button>
              <Button size="sm" variant="secondary" onClick={() => setMonth(t.slice(0, 7))}>Today</Button>
              <Button size="sm" variant="secondary" onClick={() => shiftMonth(1)} aria-label="Next month"><ChevronRight className="w-4 h-4" /></Button>
            </div>
          }
        />
        <div className="px-5 pb-5">
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {DAYS.map((d) => (
              <div key={d} className="text-[11px] font-semibold text-gray-400 dark:text-white/40 py-1">{d}</div>
            ))}
            {Array.from({ length: firstOffset }).map((_, i) => <div key={`pad${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const date = `${month}-${String(i + 1).padStart(2, "0")}`;
              const rec = byDate.get(date);
              const holiday = holidayMap.get(date);
              const key = rec ? rec.status : holiday ? "HOLIDAY" : isWeekend(date) ? "WEEKEND" : null;
              return (
                <div
                  key={date}
                  title={holiday ?? (rec ? `${rec.status}${rec.clockIn ? ` · ${hoursBetween(rec.clockIn, rec.clockOut).toFixed(1)}h` : ""}` : "")}
                  className={cn(
                    "aspect-square sm:aspect-auto sm:h-16 rounded-lg p-1.5 flex flex-col items-start justify-between text-xs border border-transparent",
                    key ? STATUS_STYLE[key] : "bg-gray-50 dark:bg-white/[0.03] text-gray-500 dark:text-white/40",
                    date === t && "ring-2 ring-black dark:ring-white",
                  )}
                >
                  <span className="font-semibold">{i + 1}</span>
                  <span className="hidden sm:block text-[10px] truncate w-full text-left">
                    {holiday ? holiday : rec?.clockIn ? `${hoursBetween(rec.clockIn, rec.clockOut || (date === t ? new Date().toISOString() : rec.clockIn)).toFixed(1)}h` : rec?.status === "ON_LEAVE" ? "Leave" : rec?.status === "ABSENT" ? "Absent" : ""}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            {(["PRESENT", "REMOTE", "HALF_DAY", "ABSENT", "ON_LEAVE", "HOLIDAY"] as const).map((k) => (
              <span key={k} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-white/50">
                <span className={cn("w-3 h-3 rounded", STATUS_STYLE[k])} />
                {k.replace("_", " ").toLowerCase()}
              </span>
            ))}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader
          title="Weekly timesheet"
          subtitle={`Week of ${formatDate(weekStart)} – ${formatDate(addDays(weekStart, 6))}`}
          action={
            <div className="flex items-center gap-2">
              {existing && <StatusBadge status={existing.status} />}
              <Button size="sm" variant="secondary" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Previous week"><ChevronLeft className="w-4 h-4" /></Button>
              <Button size="sm" variant="secondary" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Next week"><ChevronRight className="w-4 h-4" /></Button>
            </div>
          }
        />
        <Table minWidth={760}>
          <thead>
            <tr>
              <Th>Project</Th>
              {DAYS.map((d, i) => (
                <Th key={d} className="text-center">{d}<span className="block font-normal normal-case">{parseDate(addDays(weekStart, i)).getDate()}</span></Th>
              ))}
              <Th className="text-right">Total</Th>
              <Th> </Th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, row) => {
              const project = db.projects.find((p) => p.id === entry.projectId);
              return (
                <tr key={entry.projectId}>
                  <Td className="font-medium text-black dark:text-white">{project?.name ?? "Unknown project"}</Td>
                  {entry.hours.map((h, i) => (
                    <Td key={i} className="px-1">
                      <Input
                        type="number"
                        min={0}
                        max={24}
                        step={0.5}
                        disabled={locked}
                        value={h}
                        onChange={(e) => {
                          const next = structuredClone(entries);
                          next[row].hours[i] = Math.min(24, Math.max(0, Number(e.target.value) || 0));
                          setEntries(next);
                        }}
                        className="w-14 text-center px-1 mx-auto"
                      />
                    </Td>
                  ))}
                  <Td className="text-right font-semibold tabular-nums">{entry.hours.reduce((a, b) => a + (Number(b) || 0), 0)}</Td>
                  <Td>
                    {!locked && (
                      <button onClick={() => setEntries(entries.filter((_, r) => r !== row))} className="p-1 text-gray-400 hover:text-red-500" aria-label="Remove row">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </Td>
                </tr>
              );
            })}
            <tr>
              <Td className="font-semibold">Daily total</Td>
              {dayTotals.map((d, i) => (
                <Td key={i} className={cn("text-center font-semibold tabular-nums", d > 10 && "text-red-500")}>{d}</Td>
              ))}
              <Td className="text-right font-bold tabular-nums">{total}</Td>
              <Td> </Td>
            </tr>
          </tbody>
        </Table>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4">
          {!locked && unusedProjects.length > 0 ? (
            <div className="flex items-center gap-2">
              <Select
                value=""
                onChange={(e) => e.target.value && setEntries([...entries, { projectId: e.target.value, hours: [0, 0, 0, 0, 0, 0, 0] }])}
                className="w-60"
              >
                <option value="">+ Add project row…</option>
                {unusedProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
              <Plus className="w-4 h-4 text-gray-400" />
            </div>
          ) : (
            <span className="text-xs text-gray-500 dark:text-white/40">{locked ? "This timesheet is locked after submission." : ""}</span>
          )}
          {!locked && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => save(false)}>Save draft</Button>
              <Button onClick={() => save(true)}>Submit for approval</Button>
            </div>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="Timesheet history" />
        {history.length === 0 ? (
          <EmptyState title="No timesheets yet" />
        ) : (
          <Table minWidth={480}>
            <thead>
              <tr><Th>Week</Th><Th>Projects</Th><Th>Hours</Th><Th>Status</Th></tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5" onClick={() => setWeekStart(h.weekStart)}>
                  <Td>{formatDate(h.weekStart)}</Td>
                  <Td>{h.entries.map((e) => db.projects.find((p) => p.id === e.projectId)?.name).filter(Boolean).join(", ")}</Td>
                  <Td className="tabular-nums">{h.entries.reduce((s, e) => s + e.hours.reduce((a, b) => a + b, 0), 0)}</Td>
                  <Td><StatusBadge status={h.status} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
