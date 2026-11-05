"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AlertCircle, ArrowRight, CalendarDays, ClipboardCheck, PartyPopper, Star, Timer, UserPlus } from "lucide-react";
import { useAuthed } from "@/lib/store";
import { Badge, Card, CardHeader, EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import ClockWidget from "@/components/employee/ClockWidget";
import {
  cn, colorFor, formatDate, getDirectReports, getSubordinates, greeting, isOverdue, isTaskDone, leaveBalances,
  LEAVE_TYPES, PRIORITY_ORDER, startOfWeek, timeAgo, today, addDays,
} from "@/lib/utils";

export default function EmployeeHubPage() {
  const { db, user } = useAuthed();
  const t = today();

  const myOpen = useMemo(
    () => db.tasks.filter((x) => x.assigneeIds.includes(user.id) && !isTaskDone(db.boards, x)),
    [db, user.id],
  );
  const dueToday = myOpen.filter((x) => x.dueDate === t).length;
  const overdue = myOpen.filter((x) => isOverdue(db.boards, x)).length;
  const upcoming = [...myOpen]
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    .slice(0, 5);

  const balances = leaveBalances(db, user.id);
  const annual = balances.find((b) => b.type === "ANNUAL")!;
  const casual = balances.find((b) => b.type === "CASUAL")!;

  const subs = getSubordinates(db.employees, user.id);
  const reports = getDirectReports(db.employees, user.id);
  const pendingApprovals =
    db.leaves.filter((l) => l.status === "PENDING" && subs.some((s) => s.id === l.employeeId)).length +
    db.timesheets.filter((x) => x.status === "SUBMITTED" && reports.some((r) => r.id === x.employeeId)).length;

  const monthPrefix = t.slice(0, 7);
  const monthAtt = db.attendance.filter((a) => a.employeeId === user.id && a.date.startsWith(monthPrefix) && a.status !== "ON_LEAVE");
  const present = monthAtt.filter((a) => a.status === "PRESENT" || a.status === "REMOTE").length + monthAtt.filter((a) => a.status === "HALF_DAY").length * 0.5;
  const attPct = monthAtt.length ? Math.round((present / monthAtt.length) * 100) : 100;

  const holidays = db.holidays.filter((h) => h.date >= t).slice(0, 4);
  const myLeaves = db.leaves.filter((l) => l.employeeId === user.id && l.endDate >= t && (l.status === "APPROVED" || l.status === "PENDING"));

  const activeCycle = db.cycles.find((c) => c.status === "ACTIVE");
  const myReview = activeCycle && db.reviews.find((r) => r.cycleId === activeCycle.id && r.employeeId === user.id);
  const lastWeek = startOfWeek(addDays(t, -7));
  const lastTs = db.timesheets.find((x) => x.employeeId === user.id && x.weekStart === lastWeek);
  const onbBoard = user.onboarding ? db.boards.find((b) => b.id === user.onboarding!.boardId) : undefined;
  const onbTasks = onbBoard ? db.tasks.filter((x) => x.boardId === onbBoard.id) : [];
  const onbDone = onbTasks.filter((x) => isTaskDone(db.boards, x)).length;

  const prompts: { icon: React.ReactNode; title: string; text: string; href: string; tone: string }[] = [];
  if (user.status === "ONBOARDING")
    prompts.push({ icon: <UserPlus className="w-4 h-4" />, title: "Finish onboarding", text: `${onbDone}/${onbTasks.length} onboarding tasks complete.`, href: "/employee/tasks", tone: "blue" });
  if (myReview?.status === "PENDING_SELF")
    prompts.push({ icon: <Star className="w-4 h-4" />, title: "Self-assessment due", text: `${activeCycle!.name} closes ${formatDate(activeCycle!.endDate)}.`, href: "/employee/performance", tone: "amber" });
  if (!lastTs || lastTs.status === "DRAFT" || lastTs.status === "REJECTED")
    prompts.push({ icon: <Timer className="w-4 h-4" />, title: "Timesheet not submitted", text: `Week of ${formatDate(lastWeek)} is ${lastTs ? lastTs.status.toLowerCase() : "missing"}.`, href: "/employee/attendance", tone: "orange" });
  if (pendingApprovals)
    prompts.push({ icon: <ClipboardCheck className="w-4 h-4" />, title: "Team approvals waiting", text: `${pendingApprovals} request(s) from your team need a decision.`, href: "/employee/team", tone: "purple" });
  if (overdue)
    prompts.push({ icon: <AlertCircle className="w-4 h-4" />, title: "Overdue tasks", text: `${overdue} task(s) are past their due date.`, href: "/employee/tasks", tone: "red" });

  const feed = db.notifications.filter((n) => n.recipientId === user.id).slice(0, 8);

  return (
    <>
      <PageHeader title={`${greeting()}, ${user.firstName}`} subtitle={`Here's what's happening with your work and HR today — ${formatDate(t)}.`} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ClockWidget />
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <StatCard label="My open tasks" value={myOpen.length} hint={overdue ? `${overdue} overdue` : dueToday ? `${dueToday} due today` : "On track"} hintTone={overdue ? "bad" : dueToday ? "warn" : "good"} />
          <StatCard label="Leave available" value={annual.available + casual.available} hint={`${annual.available} annual · ${casual.available} casual`} />
          <StatCard label="Attendance this month" value={`${attPct}%`} hint={`${monthAtt.length} working days logged`} hintTone={attPct >= 90 ? "good" : "warn"} />
          {reports.length > 0 ? (
            <StatCard label="Pending team approvals" value={pendingApprovals} hint={pendingApprovals ? "Requires action" : "All clear"} hintTone={pendingApprovals ? "warn" : "good"} />
          ) : (
            <StatCard label="Review status" value={myReview ? (myReview.status === "COMPLETED" ? "Done" : "Open") : "—"} hint={activeCycle?.name ?? "No active cycle"} />
          )}
        </div>
      </div>

      {prompts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {prompts.map((p) => (
            <Link key={p.title} href={p.href} className="group">
              <Card className="p-4 flex items-start gap-3 hover:border-gray-300 dark:hover:border-white/20">
                <span className={cn("p-2 rounded-lg", colorFor(p.tone).soft, colorFor(p.tone).text)}>{p.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-black dark:text-white">{p.title}</p>
                  <p className="text-xs text-gray-500 dark:text-white/50">{p.text}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform mt-1" />
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Today & upcoming" subtitle="Your highest-priority open work" action={<Link href="/employee/tasks" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">All tasks</Link>} />
          <div className="px-2 pb-3">
            {upcoming.length === 0 && <EmptyState title="Nothing on your plate" description="You have no open tasks right now." />}
            {upcoming.map((task) => {
              const board = db.boards.find((b) => b.id === task.boardId);
              const late = isOverdue(db.boards, task);
              return (
                <Link key={task.id} href={`/employee/tasks?task=${task.id}`} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", late ? "bg-red-500" : task.dueDate === t ? "bg-amber-500" : "bg-gray-300 dark:bg-white/20")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black dark:text-white truncate">{task.title}</p>
                    <p className="text-xs text-gray-500 dark:text-white/40 truncate">{board?.title}</p>
                  </div>
                  {task.flag === "DELAYED_ON_LEAVE" && <Badge color="amber">On leave</Badge>}
                  {task.flag === "BLOCKED" && <Badge color="red">Blocked</Badge>}
                  <StatusBadge status={task.priority} />
                  <span className={cn("text-xs w-20 text-right", late ? "text-red-600 dark:text-red-400 font-medium" : "text-gray-500 dark:text-white/50")}>{task.dueDate ? formatDate(task.dueDate, false) : "No date"}</span>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title="Time off & holidays" subtitle="Upcoming" action={<Link href="/employee/leaves" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">Apply</Link>} />
          <div className="px-5 pb-5 flex flex-col gap-3">
            {myLeaves.map((l) => (
              <div key={l.id} className="flex items-center gap-3">
                <CalendarDays className="w-4 h-4 text-blue-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{LEAVE_TYPES[l.type].label}</p>
                  <p className="text-xs text-gray-500 dark:text-white/40">{formatDate(l.startDate, false)} – {formatDate(l.endDate, false)} · {l.days}d</p>
                </div>
                <StatusBadge status={l.status} />
              </div>
            ))}
            {holidays.map((h) => (
              <div key={h.id} className="flex items-center gap-3">
                <PartyPopper className="w-4 h-4 text-pink-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{h.name}</p>
                  <p className="text-xs text-gray-500 dark:text-white/40">{formatDate(h.date)}</p>
                </div>
                <Badge color={h.type === "National" ? "blue" : h.type === "Company" ? "purple" : "gray"}>{h.type}</Badge>
              </div>
            ))}
            {myLeaves.length + holidays.length === 0 && <p className="text-sm text-gray-500">Nothing scheduled.</p>}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Unified activity feed" subtitle="HR and work events in one stream" action={<Link href="/employee/notifications" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">View all</Link>} />
        <div className="px-5 pb-5 flex flex-col divide-y divide-gray-100 dark:divide-white/5">
          {feed.length === 0 && <EmptyState title="No activity yet" />}
          {feed.map((n) => (
            <div key={n.id} className="py-3 flex items-start gap-3">
              <Badge color={n.category === "HR" ? "pink" : n.category === "WORK" ? "blue" : "gray"}>{n.category}</Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 dark:text-white/90"><span className="font-semibold">{n.title}</span> — {n.message}</p>
                <p className="text-xs text-gray-400 dark:text-white/40 mt-0.5">{timeAgo(n.createdAt)}</p>
              </div>
              {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 mt-2" />}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
