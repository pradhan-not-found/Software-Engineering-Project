"use client";

import { useMemo, useEffect } from "react";
import { Download } from "lucide-react";
import { useAuthed } from "@/lib/store";
import type { LeaveTypeKey } from "@/lib/types";
import {
  addDays, cn, colorFor, downloadText, formatMonth, fullName, isTaskDone, LEAVE_TYPES, money, toCSV, today,
} from "@/lib/utils";
import { Avatar, Button, Card, CardHeader, PageHeader, StatCard } from "@/components/ui";

function Bar({ label, value, max, color = "blue", display }: { label: React.ReactNode; value: number; max: number; color?: string; display?: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr_auto] sm:grid-cols-[160px_1fr_auto] items-center gap-3">
      <span className="text-xs text-gray-600 dark:text-white/70 truncate">{label}</span>
      <div className="h-2.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
        <div className={cn("h-full rounded-full", colorFor(color).bg)} style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </div>
      <span className="text-xs font-medium tabular-nums text-right min-w-[48px]">{display ?? value}</span>
    </div>
  );
}

export default function AdminReportsPage() {
  const { db, fetchReportsOverview } = useAuthed();
  const t = today();
  const active = db.employees.filter((e) => e.status !== "TERMINATED");

  useEffect(() => {
    fetchReportsOverview().catch(() => {});
  }, [fetchReportsOverview]);

  const byDept = useMemo(
    () => db.departments.map((d) => ({ d, n: active.filter((e) => e.departmentId === d.id).length })).sort((a, b) => b.n - a.n),
    [db, active],
  );

  const statuses = ["ACTIVE", "ONBOARDING", "ON_LEAVE", "OFFBOARDING", "TERMINATED"] as const;
  const statusColors: Record<string, string> = { ACTIVE: "green", ONBOARDING: "blue", ON_LEAVE: "amber", OFFBOARDING: "orange", TERMINATED: "gray" };

  const attendance = useMemo(() => {
    const start = addDays(t, -30);
    const recs = db.attendance.filter((a) => a.date >= start && a.date < t && a.status !== "ON_LEAVE");
    const worked = recs.filter((a) => a.status === "PRESENT" || a.status === "REMOTE").length + recs.filter((a) => a.status === "HALF_DAY").length * 0.5;
    const perDept = db.departments.map((d) => {
      const r = recs.filter((a) => db.employees.find((e) => e.id === a.employeeId)?.departmentId === d.id);
      const w = r.filter((a) => a.status === "PRESENT" || a.status === "REMOTE").length + r.filter((a) => a.status === "HALF_DAY").length * 0.5;
      return { d, rate: r.length ? Math.round((w / r.length) * 100) : 0 };
    });
    const remote = recs.length ? Math.round((recs.filter((a) => a.status === "REMOTE").length / recs.length) * 100) : 0;
    return { rate: recs.length ? Math.round((worked / recs.length) * 100) : 0, perDept, remote };
  }, [db, t]);

  const leaveUse = useMemo(() => {
    const y = String(new Date().getFullYear());
    return (Object.keys(LEAVE_TYPES) as LeaveTypeKey[]).map((k) => {
      const used = db.leaves.filter((l) => l.type === k && l.status === "APPROVED" && l.startDate.startsWith(y)).reduce((s, l) => s + l.days, 0);
      const alloc = k === "UNPAID" ? 0 : LEAVE_TYPES[k].allocation * active.length;
      return { k, used, alloc };
    });
  }, [db, active.length]);

  const payroll = [...db.payrollRuns].sort((a, b) => a.month.localeCompare(b.month)).slice(-6).map((r) => ({ r, gross: r.lines.reduce((s, l) => s + l.gross, 0), net: r.lines.reduce((s, l) => s + l.net, 0) }));
  const payMax = Math.max(1, ...payroll.map((p) => p.gross));
  const deptCost = db.departments.map((d) => ({ d, cost: active.filter((e) => e.departmentId === d.id).reduce((s, e) => s + e.salary.basic + e.salary.hra + e.salary.allowances, 0) })).sort((a, b) => b.cost - a.cost);

  const throughput = db.projects.map((p) => {
    const ts = db.tasks.filter((tk) => db.boards.find((b) => b.id === tk.boardId)?.projectId === p.id);
    const done = ts.filter((tk) => isTaskDone(db.boards, tk)).length;
    return { p, done, open: ts.length - done };
  });
  const tpMax = Math.max(1, ...throughput.map((x) => x.done + x.open));

  const contributors = useMemo(() => {
    const since = addDays(t, -90);
    return active
      .map((e) => ({ e, n: db.tasks.filter((tk) => tk.assigneeIds.includes(e.id) && tk.completedAt && tk.completedAt.slice(0, 10) >= since).length }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 8);
  }, [db, active, t]);

  const exportHeadcount = async () => {
    try {
      const res = await fetch("/api/reports/export?dataset=headcount");
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `headcount-${t}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
    } catch {
      /* fallback to client CSV */
    }

    downloadText(
      `headcount-${t}.csv`,
      toCSV([
        ["Code", "Name", "Email", "Department", "Designation", "Role", "Manager", "Status", "Joined", "Location", "Work mode"],
        ...db.employees.map((e) => [
          e.code, fullName(e), e.email, db.departments.find((d) => d.id === e.departmentId)?.name ?? "", e.designation, e.role,
          fullName(db.employees.find((m) => m.id === e.managerId)), e.status, e.joiningDate, e.location, e.workMode,
        ]),
      ]),
      "text/csv",
    );
  };

  const maxDept = Math.max(1, ...byDept.map((x) => x.n));
  const maxCost = Math.max(1, ...deptCost.map((x) => x.cost));
  const totalTasksDone = throughput.reduce((s, x) => s + x.done, 0);

  return (
    <>
      <PageHeader title="Reports & Analytics" subtitle="Organisation-wide HR and work metrics in one place." actions={<Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={exportHeadcount}>Export headcount CSV</Button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Headcount" value={active.length} hint={`${db.departments.length} departments`} />
        <StatCard label="Attendance (30d)" value={`${attendance.rate}%`} hint={`${attendance.remote}% remote`} hintTone={attendance.rate >= 90 ? "good" : "warn"} />
        <StatCard label="Monthly payroll cost" value={money(deptCost.reduce((s, x) => s + x.cost, 0))} />
        <StatCard label="Project tasks done" value={totalTasksDone} hint={`${throughput.reduce((s, x) => s + x.open, 0)} open`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Headcount by department" />
          <div className="px-5 pb-5 flex flex-col gap-3">
            {byDept.map(({ d, n }) => <Bar key={d.id} label={d.name} value={n} max={maxDept} color={d.color} />)}
          </div>
        </Card>
        <Card>
          <CardHeader title="Employee status" />
          <div className="px-5 pb-5 flex flex-col gap-4">
            <div className="flex h-4 rounded-full overflow-hidden">
              {statuses.map((s) => {
                const n = db.employees.filter((e) => e.status === s).length;
                return n ? <div key={s} className={colorFor(statusColors[s]).bg} style={{ width: `${(n / db.employees.length) * 100}%` }} title={`${s}: ${n}`} /> : null;
              })}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {statuses.map((s) => (
                <div key={s} className="flex items-center gap-2 text-xs">
                  <span className={cn("w-2.5 h-2.5 rounded-full", colorFor(statusColors[s]).bg)} />
                  <span className="text-gray-600 dark:text-white/70 capitalize">{s.replace("_", " ").toLowerCase()}</span>
                  <span className="font-semibold ml-auto">{db.employees.filter((e) => e.status === s).length}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Attendance rate by department" subtitle="Last 30 days, excluding approved leave" />
          <div className="px-5 pb-5 flex flex-col gap-3">
            {attendance.perDept.map(({ d, rate }) => <Bar key={d.id} label={d.name} value={rate} max={100} color={rate >= 90 ? "green" : rate >= 75 ? "amber" : "red"} display={`${rate}%`} />)}
          </div>
        </Card>
        <Card>
          <CardHeader title={`Leave utilisation · ${new Date().getFullYear()}`} subtitle="Approved days vs. total allocation" />
          <div className="px-5 pb-5 flex flex-col gap-3">
            {leaveUse.map(({ k, used, alloc }) => (
              <Bar key={k} label={LEAVE_TYPES[k].label} value={used} max={alloc || Math.max(used, 1)} color={LEAVE_TYPES[k].color} display={alloc ? `${used}/${alloc}` : `${used} days`} />
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Payroll cost trend" subtitle="Gross vs net per run" />
          <div className="px-5 pb-5">
            {payroll.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">No payroll runs yet.</p>
            ) : (
              <div className="flex items-end gap-4 h-48 pt-4">
                {payroll.map(({ r, gross, net }) => (
                  <div key={r.id} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div className="flex items-end gap-1 h-full w-full justify-center">
                      <div className="w-1/3 max-w-[22px] rounded-t bg-blue-500/80" style={{ height: `${(gross / payMax) * 100}%` }} title={`Gross ${money(gross)}`} />
                      <div className="w-1/3 max-w-[22px] rounded-t bg-green-500/80" style={{ height: `${(net / payMax) * 100}%` }} title={`Net ${money(net)}`} />
                    </div>
                    <span className="text-[10px] text-gray-500 dark:text-white/50 whitespace-nowrap">{formatMonth(r.month).slice(0, 3)} {r.month.slice(2, 4)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-4 text-xs text-gray-500 dark:text-white/50 mt-3">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-blue-500/80" />Gross</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-green-500/80" />Net</span>
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Monthly salary cost by department" />
          <div className="px-5 pb-5 flex flex-col gap-3">
            {deptCost.map(({ d, cost }) => <Bar key={d.id} label={d.name} value={cost} max={maxCost} color={d.color} display={money(cost)} />)}
          </div>
        </Card>

        <Card>
          <CardHeader title="Task throughput by project" subtitle="Completed vs open" />
          <div className="px-5 pb-5 flex flex-col gap-3">
            {throughput.map(({ p, done, open }) => (
              <div key={p.id} className="grid grid-cols-[120px_1fr_auto] sm:grid-cols-[160px_1fr_auto] items-center gap-3">
                <span className="text-xs text-gray-600 dark:text-white/70 truncate">{p.name}</span>
                <div className="h-2.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden flex" style={{ width: `${((done + open) / tpMax) * 100}%` }}>
                  <div className="h-full bg-green-500" style={{ width: `${done + open ? (done / (done + open)) * 100 : 0}%` }} />
                  <div className="h-full bg-amber-400" style={{ width: `${done + open ? (open / (done + open)) * 100 : 0}%` }} />
                </div>
                <span className="text-xs tabular-nums">{done}/{done + open}</span>
              </div>
            ))}
            <div className="flex gap-4 text-xs text-gray-500 dark:text-white/50 mt-1">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-green-500" />Done</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-400" />Open</span>
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Top contributors" subtitle="Tasks completed in the last 90 days" />
          <div className="px-5 pb-5 flex flex-col gap-2.5">
            {contributors.length === 0 && <p className="text-sm text-gray-500 py-6 text-center">No completed tasks yet.</p>}
            {contributors.map(({ e, n }, i) => (
              <div key={e.id} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                <Avatar employee={e} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{fullName(e)}</p>
                  <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/10 mt-1 overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${(n / contributors[0].n) * 100}%` }} /></div>
                </div>
                <span className="text-sm font-semibold tabular-nums">{n}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
