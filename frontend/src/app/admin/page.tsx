"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle, ArrowRight, CalendarCheck, Check, Receipt, UserPlus, Users, Wallet, Zap, X, Clock, TrendingUp, Activity,
} from "lucide-react";
import { useAuthed, suggestPeers } from "@/lib/store";
import {
  cn, colorFor, formatDate, fullName, greeting, isTaskDone, LEAVE_TYPES, money, openTasksFor, timeAgo, today,
} from "@/lib/utils";
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, PageHeader, ProgressBar, StatCard, StatusBadge, Tabs, useToast } from "@/components/ui";

export default function AdminDashboardPage() {
  const { db, user, decideLeave, decideExpense } = useAuthed();
  const toast = useToast();
  const [feed, setFeed] = useState<"ALL" | "HR" | "WORK" | "SYSTEM">("ALL");
  const t = today();

  const workforce = db.employees.filter((e) => e.status !== "TERMINATED");
  const onLeaveToday = db.leaves.filter((l) => l.status === "APPROVED" && l.startDate <= t && l.endDate >= t);
  const capacity = workforce.length ? Math.round(((workforce.length - onLeaveToday.length) / workforce.length) * 100) : 100;
  const pendingLeaves = db.leaves.filter((l) => l.status === "PENDING");
  const pendingExpenses = db.expenses.filter((x) => x.status === "PENDING");
  const pendingTimesheets = db.timesheets.filter((x) => x.status === "SUBMITTED");
  const todayAtt = db.attendance.filter((a) => a.date === t);
  const clockedIn = todayAtt.filter((a) => a.clockIn).length;
  const flagged = db.tasks.filter((x) => x.flag !== "NORMAL" && !isTaskDone(db.boards, x));
  const newThisQuarter = workforce.filter((e) => e.joiningDate >= `${t.slice(0, 4)}-${String(Math.floor((new Date().getMonth()) / 3) * 3 + 1).padStart(2, "0")}-01`).length;
  const lastRun = db.payrollRuns[0];
  const onboarding = db.employees.filter((e) => e.status === "ONBOARDING");
  const offboarding = db.employees.filter((e) => e.status === "OFFBOARDING");
  const upcomingHolidays = db.holidays.filter((h) => h.date >= t).slice(0, 3);
  const activeCycle = db.cycles.find((c) => c.status === "ACTIVE");
  const cycleReviews = activeCycle ? db.reviews.filter((r) => r.cycleId === activeCycle.id) : [];
  const cycleDone = cycleReviews.filter((r) => r.status === "COMPLETED").length;

  const deptCounts = db.departments
    .map((d) => ({ d, n: workforce.filter((e) => e.departmentId === d.id).length }))
    .sort((a, b) => b.n - a.n);
  const maxDept = Math.max(1, ...deptCounts.map((x) => x.n));

  const activity = db.activity.filter((a) => feed === "ALL" || a.category === feed).slice(0, 12);

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user.firstName}`}
        subtitle={`${db.org.name} · organization-wide metrics, approvals and connected signals for ${formatDate(t)}.`}
        actions={
          <>
            <Link href="/admin/directory"><Button variant="secondary" icon={<UserPlus className="w-4 h-4" />}>Add new hire</Button></Link>
            <Link href="/admin/payroll"><Button icon={<Wallet className="w-4 h-4" />}>Run payroll</Button></Link>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Headcount" value={workforce.length} hint={newThisQuarter ? `+${newThisQuarter} this quarter` : "stable"} hintTone="good" icon={<Users className="w-4 h-4" />} />
        <StatCard
          label="Pending Approvals"
          value={pendingLeaves.length + pendingExpenses.length + pendingTimesheets.length}
          hint={pendingLeaves.length + pendingExpenses.length + pendingTimesheets.length ? "requires action" : "all clear"}
          hintTone={pendingLeaves.length ? "warn" : "good"}
          icon={<CalendarCheck className="w-4 h-4" />}
        />
        <StatCard label="Org Capacity" value={`${capacity}%`} hint={`${onLeaveToday.length} on leave today`} icon={<Activity className="w-4 h-4" />} />
        <StatCard label="Clocked in today" value={`${clockedIn}/${workforce.length}`} hint={`${workforce.length - clockedIn - onLeaveToday.length} not yet`} icon={<Clock className="w-4 h-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Approvals */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Approval inbox"
            subtitle="Leave requests show the requester's live workload so you can decide with context."
            action={<Link href="/admin/leaves" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">Open queue</Link>}
          />
          <div className="px-5 pb-5 flex flex-col gap-2">
            {pendingLeaves.length + pendingExpenses.length === 0 && <EmptyState title="Inbox zero" description="No pending leave or expense approvals." />}
            {pendingLeaves.slice(0, 4).map((l) => {
              const e = db.employees.find((x) => x.id === l.employeeId);
              const due = openTasksFor(db, l.employeeId).filter((x) => x.dueDate && x.dueDate >= l.startDate && x.dueDate <= l.endDate);
              const peer = suggestPeers(db, l.employeeId, l.startDate, l.endDate)[0];
              const isSelf = l.employeeId === user?.id;
              return (
                <div key={l.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar employee={e} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm"><span className="font-medium">{fullName(e)}</span> · {LEAVE_TYPES[l.type]?.label || "Leave"}, {l.days}d</p>
                      <p className="text-xs text-gray-500 dark:text-white/50">
                        {formatDate(l.startDate, false)} – {formatDate(l.endDate, false)} ·{" "}
                        <span className={due.length ? "text-amber-600 dark:text-amber-400 font-medium" : ""}>{due.length} task{due.length === 1 ? "" : "s"} due in window</span>
                        {due.length > 0 && peer && <> · cover: {peer.employee.firstName}</>}
                        {isSelf && <span className="text-gray-400 dark:text-white/40 ml-1.5 font-medium">(Your request)</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<X className="w-3.5 h-3.5" />}
                      disabled={isSelf}
                      title={isSelf ? "You cannot decide your own leave request" : undefined}
                      onClick={() => {
                        const r = decideLeave(l.id, false);
                        toast(r.ok ? "Leave rejected." : r.error, r.ok ? "info" : "error");
                      }}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="success"
                      icon={<Check className="w-3.5 h-3.5" />}
                      disabled={isSelf}
                      title={isSelf ? "You cannot decide your own leave request" : undefined}
                      onClick={() => {
                        const r = decideLeave(l.id, true);
                        toast(
                          r.ok ? `Leave approved${r.data ? ` — ${r.data} task(s) flagged “Delayed — On Leave”` : ""}.` : r.error,
                          r.ok ? "success" : "error"
                        );
                      }}
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              );
            })}
            {pendingExpenses.slice(0, 3).map((x) => {
              const e = db.employees.find((y) => y.id === x.employeeId);
              const isSelf = x.employeeId === user?.id;
              return (
                <div key={x.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center"><Receipt className="w-4 h-4" /></div>
                    <div className="min-w-0">
                      <p className="text-sm"><span className="font-medium">{fullName(e)}</span> · {x.category} claim {money(x.amount)}</p>
                      <p className="text-xs text-gray-500 dark:text-white/50 truncate">
                        {x.description}
                        {isSelf && <span className="text-gray-400 dark:text-white/40 ml-1.5 font-medium">(Your claim)</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isSelf}
                      title={isSelf ? "You cannot decide your own expense claim" : undefined}
                      onClick={() => {
                        const r = decideExpense(x.id, false);
                        toast(r.ok ? "Claim rejected." : r.error, r.ok ? "info" : "error");
                      }}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="success"
                      disabled={isSelf}
                      title={isSelf ? "You cannot decide your own expense claim" : undefined}
                      onClick={() => {
                        const r = decideExpense(x.id, true);
                        toast(
                          r.ok ? "Claim approved — will be paid with next payroll." : r.error,
                          r.ok ? "success" : "error"
                        );
                      }}
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              );
            })}
            {pendingTimesheets.length > 0 && (
              <Link href="/admin/attendance" className="text-xs text-gray-500 dark:text-white/50 hover:underline mt-1">
                + {pendingTimesheets.length} timesheet{pendingTimesheets.length === 1 ? "" : "s"} awaiting approval →
              </Link>
            )}
          </div>
        </Card>

        {/* Connected signals */}
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Connected engine signals</span>} subtitle="Work items affected by HR events" />
          <div className="px-5 pb-5 flex flex-col gap-3">
            {flagged.length === 0 && <p className="text-sm text-gray-500 dark:text-white/40 py-6 text-center">No delayed or blocked work.</p>}
            {flagged.slice(0, 5).map((task) => {
              const who = db.employees.find((e) => e.id === task.assigneeIds[0]);
              return (
                <Link key={task.id} href={`/admin/projects?task=${task.id}`} className="flex items-start gap-3 group">
                  <AlertTriangle className={cn("w-4 h-4 mt-0.5 shrink-0", task.flag === "BLOCKED" ? "text-red-500" : "text-amber-500")} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium group-hover:underline truncate">{task.title}</p>
                    <p className="text-xs text-gray-500 dark:text-white/50">{fullName(who)} · {task.flag === "BLOCKED" ? "leaving the company" : "on leave"}{task.dueDate ? ` · due ${formatDate(task.dueDate, false)}` : ""}</p>
                  </div>
                </Link>
              );
            })}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100 dark:border-white/5">
              <Link href="/admin/onboarding" className="rounded-xl bg-blue-50 dark:bg-blue-500/10 p-3">
                <p className="text-xl font-semibold text-blue-700 dark:text-blue-300">{onboarding.length}</p>
                <p className="text-[11px] text-blue-700/70 dark:text-blue-300/70">onboarding now</p>
              </Link>
              <Link href="/admin/onboarding" className="rounded-xl bg-orange-50 dark:bg-orange-500/10 p-3">
                <p className="text-xl font-semibold text-orange-700 dark:text-orange-300">{offboarding.length}</p>
                <p className="text-[11px] text-orange-700/70 dark:text-orange-300/70">offboarding</p>
              </Link>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity feed */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Global activity feed"
            subtitle="HR and work events in one stream"
            action={<Tabs value={feed} onChange={setFeed} tabs={[{ value: "ALL", label: "All" }, { value: "HR", label: "HR" }, { value: "WORK", label: "Work" }, { value: "SYSTEM", label: "System" }]} />}
          />
          <div className="px-5 pb-5 flex flex-col">
            {activity.map((a) => {
              const actor = db.employees.find((e) => e.id === a.actorId);
              return (
                <div key={a.id} className="flex gap-3 py-3 border-b border-gray-100 dark:border-white/5 last:border-0">
                  {actor ? <Avatar employee={actor} size="sm" /> : (
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0"><Zap className="w-4 h-4" /></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700 dark:text-white/80">{a.message}</p>
                    <p className="text-xs text-gray-400 dark:text-white/40 mt-0.5 flex items-center gap-2">
                      <span className={cn("font-semibold", a.category === "HR" ? "text-pink-500" : a.category === "WORK" ? "text-blue-500" : "text-gray-500")}>{a.category}</span>
                      {actor ? fullName(actor) : "Connected engine"} · {timeAgo(a.at)}
                    </p>
                  </div>
                </div>
              );
            })}
            {activity.length === 0 && <EmptyState title="No activity yet" />}
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Headcount by department" action={<Link href="/admin/reports" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Reports</Link>} />
            <div className="px-5 pb-5 flex flex-col gap-3">
              {deptCounts.map(({ d, n }) => (
                <div key={d.id} className="flex items-center gap-3">
                  <span className="text-xs w-28 truncate text-gray-600 dark:text-white/60">{d.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                    <div className={cn("h-full rounded-full", colorFor(d.color).bg)} style={{ width: `${(n / maxDept) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium tabular-nums w-5 text-right">{n}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="At a glance" />
            <div className="px-5 pb-5 flex flex-col gap-4 text-sm">
              {activeCycle && (
                <Link href="/admin/performance" className="block group">
                  <div className="flex justify-between mb-1.5">
                    <span className="flex items-center gap-1.5 group-hover:underline"><TrendingUp className="w-3.5 h-3.5" /> {activeCycle.name}</span>
                    <span className="text-xs text-gray-500">{cycleDone}/{cycleReviews.length}</span>
                  </div>
                  <ProgressBar value={cycleReviews.length ? (cycleDone / cycleReviews.length) * 100 : 0} color="purple" />
                </Link>
              )}
              {lastRun && (
                <Link href="/admin/payroll" className="flex items-center justify-between group">
                  <span className="flex items-center gap-1.5 group-hover:underline"><Wallet className="w-3.5 h-3.5" /> Last payroll</span>
                  <span className="flex items-center gap-2 text-xs"><StatusBadge status={lastRun.status} /> {money(lastRun.lines.reduce((s, l) => s + l.net, 0))}</span>
                </Link>
              )}
              <div>
                <p className="text-xs text-gray-500 dark:text-white/50 mb-2">Upcoming holidays</p>
                {upcomingHolidays.map((h) => (
                  <div key={h.id} className="flex justify-between py-1">
                    <span>{h.name}</span>
                    <Badge color={h.type === "Company" ? "purple" : h.type === "Regional" ? "teal" : "blue"}>{formatDate(h.date, false)}</Badge>
                  </div>
                ))}
                {upcomingHolidays.length === 0 && <p className="text-xs text-gray-400">None remaining this year.</p>}
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-white/50 mb-2">Out today</p>
                <div className="flex flex-wrap gap-2">
                  {onLeaveToday.length === 0 && <span className="text-xs text-gray-400">Everyone is in.</span>}
                  {onLeaveToday.map((l) => {
                    const e = db.employees.find((x) => x.id === l.employeeId);
                    return (
                      <span key={l.id} className="inline-flex items-center gap-1.5 text-xs pl-1 pr-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300">
                        <Avatar employee={e} size="xs" /> {e?.firstName} · until {formatDate(l.endDate, false)}
                      </span>
                    );
                  })}
                </div>
              </div>
              <Link href="/admin/notifications" className="text-xs font-medium flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                Full audit log <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
