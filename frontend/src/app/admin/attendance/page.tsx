"use client";

import { useMemo, useState } from "react";
import { Check, Download, X } from "lucide-react";
import { useAuthed } from "@/lib/store";
import type { AttendanceStatus } from "@/lib/types";
import {
  addDays, cn, downloadText, formatDate, formatMonth, formatTime, fullName, hoursBetween, isWeekend, openTasksFor, toCSV, today,
} from "@/lib/utils";
import {
  Avatar, Badge, Button, Card, CardHeader, EmptyState, Input, PageHeader, SearchInput, Select, StatCard, StatusBadge,
  Table, Tabs, Td, Th, useToast,
} from "@/components/ui";

type Tab = "daily" | "monthly" | "shifts" | "timesheets";

const STATUSES: AttendanceStatus[] = ["PRESENT", "REMOTE", "HALF_DAY", "ABSENT", "ON_LEAVE"];
const SHIFT_PRESETS = ["General (09:00 – 18:00)", "Early (07:00 – 16:00)", "Late (12:00 – 21:00)", "Night (21:00 – 06:00)"];

export default function AdminAttendancePage() {
  const { db } = useAuthed();
  const [tab, setTab] = useState<Tab>("daily");
  const pendingTs = db.timesheets.filter((t) => t.status === "SUBMITTED").length;
  return (
    <>
      <PageHeader title="Attendance & Time Tracking" subtitle="Daily register, monthly summaries, shift rosters and timesheet approvals — with workload context." />
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "daily", label: "Daily Register" },
          { value: "monthly", label: "Monthly Summary" },
          { value: "shifts", label: "Shifts" },
          { value: "timesheets", label: `Timesheet Approvals${pendingTs ? ` (${pendingTs})` : ""}` },
        ]}
      />
      {tab === "daily" && <Daily />}
      {tab === "monthly" && <Monthly />}
      {tab === "shifts" && <Shifts />}
      {tab === "timesheets" && <Timesheets />}
    </>
  );
}

function activeEmployees(db: ReturnType<typeof useAuthed>["db"], date: string) {
  return db.employees.filter((e) => e.status !== "TERMINATED" && e.joiningDate <= date);
}

function Daily() {
  const { db, setAttendance } = useAuthed();
  const toast = useToast();
  const [date, setDate] = useState(today());
  const [q, setQ] = useState("");
  const emps = activeEmployees(db, date).filter((e) => fullName(e).toLowerCase().includes(q.toLowerCase()));
  const recs = db.attendance.filter((a) => a.date === date);
  const count = (s: AttendanceStatus) => recs.filter((r) => r.status === s && (r.clockIn || s === "ON_LEAVE" || s === "ABSENT")).length;
  const notMarked = activeEmployees(db, date).filter((e) => !recs.some((r) => r.employeeId === e.id && (r.clockIn || r.status === "ON_LEAVE" || r.status === "ABSENT"))).length;
  const holiday = db.holidays.find((h) => h.date === date);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" onClick={() => setDate(addDays(date, -1))}>← Prev</Button>
        <Input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-auto" />
        <Button variant="secondary" size="sm" onClick={() => setDate(addDays(date, 1))} disabled={date >= today()}>Next →</Button>
        {date !== today() && <Button variant="ghost" size="sm" onClick={() => setDate(today())}>Today</Button>}
        {holiday && <Badge color="pink">Holiday: {holiday.name}</Badge>}
        {isWeekend(date) && <Badge>Weekend</Badge>}
        <SearchInput value={q} onChange={setQ} placeholder="Filter employees…" className="ml-auto w-full sm:w-56" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Present" value={count("PRESENT")} hintTone="good" />
        <StatCard label="Remote" value={count("REMOTE")} />
        <StatCard label="Half day" value={count("HALF_DAY")} />
        <StatCard label="Absent" value={count("ABSENT")} hintTone="bad" />
        <StatCard label="On leave" value={count("ON_LEAVE")} />
        <StatCard label="Not marked" value={notMarked} hint={notMarked ? "no clock-in yet" : undefined} hintTone="warn" />
      </div>
      <Card>
        <Table minWidth={860}>
          <thead>
            <tr><Th>Employee</Th><Th>Shift</Th><Th>Clock in</Th><Th>Clock out</Th><Th>Hours</Th><Th>Workload context</Th><Th>Status</Th></tr>
          </thead>
          <tbody>
            {emps.map((e) => {
              const r = recs.find((x) => x.employeeId === e.id);
              const open = openTasksFor(db, e.id);
              const dueToday = open.filter((t) => t.dueDate === date).length;
              const hours = r?.clockOut ? hoursBetween(r.clockIn, r.clockOut) : r?.clockIn && date === today() ? hoursBetween(r.clockIn, new Date().toISOString()) : 0;
              const marked = r && (r.clockIn || r.status === "ON_LEAVE" || r.status === "ABSENT");
              return (
                <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <Td>
                    <div className="flex items-center gap-2">
                      <Avatar employee={e} size="sm" />
                      <div className="min-w-0"><p className="font-medium truncate">{fullName(e)}</p><p className="text-xs text-gray-500 dark:text-white/40">{e.designation}</p></div>
                    </div>
                  </Td>
                  <Td className="text-xs whitespace-nowrap">{e.shift}</Td>
                  <Td>{formatTime(r?.clockIn)}</Td>
                  <Td>{r?.clockIn && !r.clockOut && date === today() ? <span className="text-green-600 dark:text-green-400 text-xs font-medium">● Working</span> : formatTime(r?.clockOut)}</Td>
                  <Td className="tabular-nums">{hours ? `${hours.toFixed(1)}h` : "—"}</Td>
                  <Td>
                    <span className={cn("text-xs", open.length > 5 ? "text-red-600 dark:text-red-400 font-medium" : "text-gray-600 dark:text-white/60")}>
                      {open.length} open{dueToday ? ` · ${dueToday} due today` : ""}
                    </span>
                    {r?.status === "ON_LEAVE" && open.length > 0 && <span className="block text-[11px] text-amber-600 dark:text-amber-400">Tasks may need cover</span>}
                  </Td>
                  <Td>
                    <Select
                      value={marked ? r!.status : ""}
                      onChange={(ev) => {
                        setAttendance(e.id, date, ev.target.value as AttendanceStatus);
                        toast(`${fullName(e)} marked ${ev.target.value.replace("_", " ").toLowerCase()}.`);
                      }}
                      className="w-[130px] py-1.5 text-xs"
                    >
                      <option value="" disabled>Not marked</option>
                      {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ").toLowerCase()}</option>)}
                    </Select>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </>
  );
}

function Monthly() {
  const { db } = useAuthed();
  const [month, setMonth] = useState(today().slice(0, 7));
  const rows = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const start = `${month}-01`;
    const end = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
    return db.employees
      .filter((e) => e.status !== "TERMINATED" && e.joiningDate <= end)
      .map((e) => {
        const recs = db.attendance.filter((a) => a.employeeId === e.id && a.date >= start && a.date <= end);
        const c = (s: AttendanceStatus) => recs.filter((r) => r.status === s).length;
        const hours = recs.reduce((s, r) => s + hoursBetween(r.clockIn, r.clockOut), 0);
        const worked = c("PRESENT") + c("REMOTE") + c("HALF_DAY") * 0.5;
        const base = recs.filter((r) => r.status !== "ON_LEAVE").length;
        return { e, present: c("PRESENT"), remote: c("REMOTE"), half: c("HALF_DAY"), absent: c("ABSENT"), leave: c("ON_LEAVE"), hours, rate: base ? Math.round((worked / base) * 100) : 100 };
      });
  }, [db, month]);

  const exportCSV = () =>
    downloadText(
      `attendance-${month}.csv`,
      toCSV([["Employee", "Code", "Present", "Remote", "Half day", "Absent", "On leave", "Hours", "Attendance %"], ...rows.map((r) => [fullName(r.e), r.e.code, r.present, r.remote, r.half, r.absent, r.leave, r.hours.toFixed(1), r.rate])]),
      "text/csv",
    );

  return (
    <Card>
      <CardHeader
        title={`Monthly summary · ${formatMonth(month)}`}
        subtitle="Attendance % excludes approved leave days."
        action={
          <div className="flex gap-2">
            <Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="w-auto py-1.5" />
            <Button variant="secondary" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={exportCSV}>CSV</Button>
          </div>
        }
      />
      <Table minWidth={800}>
        <thead>
          <tr><Th>Employee</Th><Th>Present</Th><Th>Remote</Th><Th>Half day</Th><Th>Absent</Th><Th>On leave</Th><Th>Hours logged</Th><Th>Attendance</Th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.e.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
              <Td><div className="flex items-center gap-2"><Avatar employee={r.e} size="xs" />{fullName(r.e)}</div></Td>
              <Td>{r.present}</Td><Td>{r.remote}</Td><Td>{r.half}</Td>
              <Td className={r.absent ? "text-red-600 dark:text-red-400 font-medium" : ""}>{r.absent}</Td>
              <Td>{r.leave}</Td>
              <Td className="tabular-nums">{r.hours.toFixed(1)}h</Td>
              <Td>
                <div className="flex items-center gap-2 min-w-[110px]">
                  <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                    <div className={cn("h-full", r.rate >= 90 ? "bg-green-500" : r.rate >= 75 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${r.rate}%` }} />
                  </div>
                  <span className="text-xs tabular-nums w-9 text-right">{r.rate}%</span>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

function Shifts() {
  const { db, setShift } = useAuthed();
  const toast = useToast();
  const emps = db.employees.filter((e) => e.status !== "TERMINATED");
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="flex flex-col gap-3">
        {SHIFT_PRESETS.map((s) => {
          const n = emps.filter((e) => e.shift === s).length;
          return (
            <Card key={s} className="p-4 flex items-center justify-between">
              <div><p className="text-sm font-medium">{s.split(" (")[0]} shift</p><p className="text-xs text-gray-500 dark:text-white/50">{s.match(/\((.*)\)/)?.[1]}</p></div>
              <Badge color={n ? "blue" : "gray"}>{n} people</Badge>
            </Card>
          );
        })}
      </div>
      <Card className="lg:col-span-2">
        <CardHeader title="Shift roster" subtitle="Assign each employee to a shift." />
        <Table minWidth={520}>
          <thead><tr><Th>Employee</Th><Th>Work mode</Th><Th>Shift</Th></tr></thead>
          <tbody>
            {emps.map((e) => (
              <tr key={e.id}>
                <Td><div className="flex items-center gap-2"><Avatar employee={e} size="xs" />{fullName(e)}</div></Td>
                <Td><Badge color={e.workMode === "Remote" ? "teal" : e.workMode === "Hybrid" ? "purple" : "gray"}>{e.workMode}</Badge></Td>
                <Td>
                  <Select value={SHIFT_PRESETS.includes(e.shift) ? e.shift : ""} onChange={(ev) => { setShift(e.id, ev.target.value); toast(`${e.firstName} moved to ${ev.target.value.split(" (")[0]} shift.`); }} className="py-1.5 text-xs w-[200px]">
                    {!SHIFT_PRESETS.includes(e.shift) && <option value="">{e.shift}</option>}
                    {SHIFT_PRESETS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

function Timesheets() {
  const { db, decideTimesheet } = useAuthed();
  const toast = useToast();
  const pending = db.timesheets.filter((t) => t.status === "SUBMITTED");
  const history = db.timesheets.filter((t) => t.status === "APPROVED" || t.status === "REJECTED").sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const projectName = (id: string) => db.projects.find((p) => p.id === id)?.name ?? "General";

  return (
    <>
      {pending.length === 0 ? (
        <Card><EmptyState icon={<Check className="w-10 h-10" />} title="No timesheets awaiting approval" /></Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {pending.map((ts) => {
            const e = db.employees.find((x) => x.id === ts.employeeId);
            const total = ts.entries.reduce((s, en) => s + en.hours.reduce((a, b) => a + b, 0), 0);
            return (
              <Card key={ts.id} className="p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar employee={e} />
                    <div><p className="text-sm font-semibold">{fullName(e)}</p><p className="text-xs text-gray-500 dark:text-white/50">Week of {formatDate(ts.weekStart)}</p></div>
                  </div>
                  <span className={cn("text-lg font-semibold tabular-nums", total > 45 && "text-amber-600")}>{total}h</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[460px]">
                    <thead><tr className="text-gray-500 dark:text-white/50"><th className="text-left py-1 font-medium">Project</th>{days.map((d) => <th key={d} className="font-medium">{d}</th>)}<th className="font-medium">Total</th></tr></thead>
                    <tbody>
                      {ts.entries.map((en, i) => (
                        <tr key={i} className="border-t border-gray-100 dark:border-white/5">
                          <td className="py-1.5 pr-2 truncate max-w-[140px]">{projectName(en.projectId)}</td>
                          {en.hours.map((h, j) => <td key={j} className={cn("text-center tabular-nums", !h && "text-gray-300 dark:text-white/20")}>{h}</td>)}
                          <td className="text-center font-semibold tabular-nums">{en.hours.reduce((a, b) => a + b, 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" icon={<X className="w-4 h-4" />} onClick={() => { decideTimesheet(ts.id, false); toast("Timesheet rejected.", "info"); }}>Reject</Button>
                  <Button variant="success" icon={<Check className="w-4 h-4" />} onClick={() => { decideTimesheet(ts.id, true); toast("Timesheet approved."); }}>Approve</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <Card>
        <CardHeader title="Timesheet history" />
        <Table minWidth={560}>
          <thead><tr><Th>Employee</Th><Th>Week</Th><Th>Hours</Th><Th>Status</Th><Th>Decided by</Th></tr></thead>
          <tbody>
            {history.map((ts) => (
              <tr key={ts.id}>
                <Td>{fullName(db.employees.find((x) => x.id === ts.employeeId))}</Td>
                <Td>{formatDate(ts.weekStart)}</Td>
                <Td>{ts.entries.reduce((s, en) => s + en.hours.reduce((a, b) => a + b, 0), 0)}h</Td>
                <Td><StatusBadge status={ts.status} /></Td>
                <Td>{fullName(db.employees.find((x) => x.id === ts.decidedBy))}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        {!history.length && <EmptyState title="No decided timesheets yet" />}
      </Card>
    </>
  );
}
