"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, ArrowRightLeft, Check, UsersRound, X } from "lucide-react";
import { suggestPeers, useAuthed } from "@/lib/store";
import type { Review } from "@/lib/types";
import {
  Avatar, Badge, Button, Card, CardHeader, EmptyState, Modal, PageHeader, StarRating, StatCard, StatusBadge, Table, Td,
  Textarea, Th, useToast, Input,
} from "@/components/ui";
import PerformanceMetrics from "@/components/PerformanceMetrics";
import {
  formatDate, fullName, getDirectReports, getSubordinates, isOverdue, isTaskDone, LEAVE_TYPES, openTasksFor, today,
} from "@/lib/utils";

export default function MyTeamPage() {
  const { db, user, decideLeave, decideTimesheet, reassignTask, submitManagerReview, fetchTeamOverview } = useAuthed();
  const toast = useToast();
  const t = today();

  useEffect(() => {
    fetchTeamOverview?.().catch((err) => console.error("Error fetching team overview:", err));
  }, [fetchTeamOverview]);
  const reports = getDirectReports(db.employees, user.id);
  const subs = getSubordinates(db.employees, user.id).filter((e) => e.status !== "TERMINATED");
  const [comments, setComments] = useState<Record<string, string>>({});
  const [reviewing, setReviewing] = useState<Review | null>(null);
  const [mRating, setMRating] = useState<number | null>(null);
  const [mComment, setMComment] = useState("");

  if (reports.length === 0) {
    return (
      <>
        <PageHeader title="My Team" />
        <Card><EmptyState icon={<UsersRound className="w-10 h-10" />} title="No direct reports" description="This page appears for managers with people reporting to them." /></Card>
      </>
    );
  }

  const pendingLeaves = db.leaves.filter((l) => l.status === "PENDING" && subs.some((s) => s.id === l.employeeId)).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const flagged = db.tasks.filter((x) => x.flag !== "NORMAL" && !isTaskDone(db.boards, x) && x.assigneeIds.some((a) => subs.some((s) => s.id === a)));
  const timesheets = db.timesheets.filter((x) => x.status === "SUBMITTED" && reports.some((r) => r.id === x.employeeId));
  const cycle = db.cycles.find((c) => c.status === "ACTIVE");
  const reviews = cycle ? db.reviews.filter((r) => r.cycleId === cycle.id && r.reviewerId === user.id) : [];
  const onLeaveToday = subs.filter((s) => db.leaves.some((l) => l.employeeId === s.id && l.status === "APPROVED" && l.startDate <= t && l.endDate >= t));

  const decide = (id: string, approve: boolean) => {
    const res = decideLeave(id, approve, comments[id] ?? "");
    if (res.ok) toast(approve ? `Leave approved${res.data ? ` — ${res.data} task(s) auto-flagged for reassignment.` : "."}` : "Leave rejected.", approve ? "success" : "info");
    else toast(res.error, "error");
  };

  return (
    <>
      <PageHeader title="My Team" subtitle={`${reports.length} direct report(s) · ${subs.length} in your reporting line. Workload and attendance side by side.`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Out today" value={onLeaveToday.length} hint={onLeaveToday.map((e) => e.firstName).join(", ") || "Full strength"} />
        <StatCard label="Pending leave" value={pendingLeaves.length} hintTone={pendingLeaves.length ? "warn" : "good"} hint={pendingLeaves.length ? "Needs decision" : "All clear"} />
        <StatCard label="Flagged tasks" value={flagged.length} hintTone={flagged.length ? "bad" : "good"} hint={flagged.length ? "Reassign suggested" : "None"} />
        <StatCard label="Reviews to write" value={reviews.filter((r) => r.status !== "COMPLETED").length} hint={cycle?.name ?? "No active cycle"} />
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Team workload & availability" subtitle="Attendance → workload context for sprint planning and leave approvals" />
        <Table minWidth={760}>
          <thead>
            <tr><Th>Member</Th><Th>Today</Th><Th>Upcoming leave</Th><Th className="text-center">Open tasks</Th><Th className="text-center">Overdue</Th><Th className="text-center">Flagged</Th><Th>Load</Th></tr>
          </thead>
          <tbody>
            {subs.map((e) => {
              const att = db.attendance.find((a) => a.employeeId === e.id && a.date === t);
              const open = openTasksFor(db, e.id);
              const overdue = open.filter((x) => isOverdue(db.boards, x)).length;
              const fl = open.filter((x) => x.flag !== "NORMAL").length;
              const next = db.leaves.filter((l) => l.employeeId === e.id && l.status === "APPROVED" && l.endDate >= t).sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
              const load = open.length >= 6 ? "red" : open.length >= 3 ? "amber" : "green";
              return (
                <tr key={e.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar employee={e} size="sm" />
                      <div className="min-w-0">
                        <p className="font-medium text-black dark:text-white truncate">{fullName(e)} {e.managerId !== user.id && <span className="text-[10px] text-gray-400">(indirect)</span>}</p>
                        <p className="text-xs text-gray-500 dark:text-white/40 truncate">{e.designation}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>{att ? <StatusBadge status={att.status} /> : <span className="text-xs text-gray-400">Not in yet</span>}</Td>
                  <Td className="text-xs">{next ? `${formatDate(next.startDate, false)} – ${formatDate(next.endDate, false)}` : "—"}</Td>
                  <Td className="text-center tabular-nums">{open.length}</Td>
                  <Td className={`text-center tabular-nums ${overdue ? "text-red-600 dark:text-red-400 font-semibold" : ""}`}>{overdue}</Td>
                  <Td className={`text-center tabular-nums ${fl ? "text-amber-600 dark:text-amber-400 font-semibold" : ""}`}>{fl}</Td>
                  <Td><Badge color={load}>{load === "red" ? "Overloaded" : load === "amber" ? "Busy" : "Available"}</Badge></Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <Card>
        <CardHeader title="Leave requests awaiting your decision" />
        <div className="px-5 pb-5 flex flex-col gap-3">
          {pendingLeaves.length === 0 && <EmptyState title="No pending leave requests" />}
          {pendingLeaves.map((l) => {
            const e = db.employees.find((x) => x.id === l.employeeId);
            const due = openTasksFor(db, l.employeeId).filter((x) => x.dueDate && x.dueDate >= l.startDate && x.dueDate <= l.endDate);
            const alsoOff = subs.filter((s) => s.id !== l.employeeId && db.leaves.some((x) => x.employeeId === s.id && x.status === "APPROVED" && x.startDate <= l.endDate && x.endDate >= l.startDate));
            return (
              <div key={l.id} className="rounded-xl border border-gray-200 dark:border-white/10 p-4 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar employee={e} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{fullName(e)} · {LEAVE_TYPES[l.type].label}</p>
                      <p className="text-xs text-gray-500 dark:text-white/40">{formatDate(l.startDate, false)} – {formatDate(l.endDate)} · {l.days} day(s) · “{l.reason}”</p>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Input placeholder="Comment (optional)" value={comments[l.id] ?? ""} onChange={(ev) => setComments({ ...comments, [l.id]: ev.target.value })} className="w-44 py-1.5 text-xs" />
                    <Button size="sm" variant="success" icon={<Check className="w-3.5 h-3.5" />} onClick={() => decide(l.id, true)}>Approve</Button>
                    <Button size="sm" variant="secondary" icon={<X className="w-3.5 h-3.5" />} onClick={() => decide(l.id, false)}>Reject</Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge color={due.length ? "amber" : "green"}>{due.length} task(s) due in window</Badge>
                  <Badge color="gray">{openTasksFor(db, l.employeeId).length} open tasks total</Badge>
                  {alsoOff.length > 0 && <Badge color="red">Also off: {alsoOff.map((x) => x.firstName).join(", ")}</Badge>}
                </div>
                {due.length > 0 && <p className="text-xs text-gray-500 dark:text-white/50">Due: {due.map((x) => x.title).join(" · ")}</p>}
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader title="Flagged tasks" subtitle="Auto-flagged because the assignee is on leave or leaving — reassign to the least-loaded available peer" />
        <div className="px-5 pb-5 flex flex-col divide-y divide-gray-100 dark:divide-white/5">
          {flagged.length === 0 && <EmptyState title="No flagged tasks" />}
          {flagged.map((task) => {
            const from = task.assigneeIds.find((a) => subs.some((s) => s.id === a))!;
            const peer = suggestPeers(db, from)[0]; // same-department cover; reassignTask allows this for the assignee's manager
            return (
              <div key={task.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 hidden sm:block" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{task.title}</p>
                  <p className="text-xs text-gray-500 dark:text-white/40">
                    {fullName(db.employees.find((e) => e.id === from))} · {task.flag === "DELAYED_ON_LEAVE" ? "Delayed — on leave" : "Blocked — leaving"} · due {formatDate(task.dueDate, false)}
                  </p>
                </div>
                {peer ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<ArrowRightLeft className="w-3.5 h-3.5" />}
                    onClick={() => {
                      const res = reassignTask(task.id, from, peer.employee.id);
                      if (res.ok) toast(`Reassigned to ${fullName(peer.employee)}.`);
                      else toast(res.error, "error");
                    }}
                  >
                    Reassign to {peer.employee.firstName} ({peer.load} open)
                  </Button>
                ) : (
                  <span className="text-xs text-gray-400">No available peer</span>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="overflow-hidden">
          <CardHeader title="Timesheets to approve" />
          {timesheets.length === 0 ? (
            <EmptyState title="Nothing to approve" />
          ) : (
            <Table minWidth={420}>
              <thead><tr><Th>Member</Th><Th>Week</Th><Th>Hours</Th><Th> </Th></tr></thead>
              <tbody>
                {timesheets.map((ts) => (
                  <tr key={ts.id}>
                    <Td>{fullName(db.employees.find((e) => e.id === ts.employeeId))}</Td>
                    <Td>{formatDate(ts.weekStart, false)}</Td>
                    <Td className="tabular-nums">{ts.entries.reduce((s, e) => s + e.hours.reduce((a, b) => a + b, 0), 0)}</Td>
                    <Td className="text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => { decideTimesheet(ts.id, true); toast("Timesheet approved."); }}><Check className="w-4 h-4 text-green-600" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => { decideTimesheet(ts.id, false); toast("Timesheet rejected.", "info"); }}><X className="w-4 h-4 text-red-500" /></Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader title="Performance reviews" subtitle={cycle ? cycle.name : "No active cycle"} />
          <div className="px-5 pb-5 flex flex-col divide-y divide-gray-100 dark:divide-white/5">
            {reviews.length === 0 && <EmptyState title="No reviews assigned to you" />}
            {reviews.map((r) => {
              const e = db.employees.find((x) => x.id === r.employeeId);
              return (
                <div key={r.id} className="py-3 flex items-center gap-3">
                  <Avatar employee={e} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fullName(e)}</p>
                    <StatusBadge status={r.status} />
                  </div>
                  <Button
                    size="sm"
                    variant={r.status === "COMPLETED" ? "ghost" : "secondary"}
                    onClick={() => { setReviewing(r); setMRating(r.managerRating); setMComment(r.managerComment); }}
                  >
                    {r.status === "COMPLETED" ? "View" : "Review"}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Modal
        open={!!reviewing}
        onClose={() => setReviewing(null)}
        size="lg"
        title={`Review · ${fullName(db.employees.find((e) => e.id === reviewing?.employeeId))}`}
        subtitle={cycle ? `${cycle.name} · ${formatDate(cycle.startDate)} – ${formatDate(cycle.endDate)}` : undefined}
        footer={
          reviewing?.status !== "COMPLETED" ? (
            <>
              <Button variant="secondary" onClick={() => setReviewing(null)}>Cancel</Button>
              <Button
                disabled={!mRating || !mComment.trim()}
                onClick={() => { submitManagerReview(reviewing!.id, mRating!, mComment.trim()); toast("Review submitted."); setReviewing(null); }}
              >
                Submit review
              </Button>
            </>
          ) : undefined
        }
      >
        {reviewing && cycle && (
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-white/40 mb-2">Objective work data</p>
              <PerformanceMetrics db={db} employeeId={reviewing.employeeId} start={cycle.startDate} end={cycle.endDate} />
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-white/[0.03] p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-white/40 mb-2">Self-assessment</p>
              {reviewing.selfRating ? (
                <>
                  <StarRating value={reviewing.selfRating} />
                  <p className="text-sm mt-2">{reviewing.selfComment}</p>
                </>
              ) : (
                <p className="text-sm text-gray-500">Not submitted yet.</p>
              )}
            </div>
            {reviewing.peerFeedback.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-white/40">Peer feedback</p>
                {reviewing.peerFeedback.map((p, i) => (
                  <div key={i} className="text-sm flex items-start gap-2">
                    <StarRating value={p.rating} size={12} />
                    <span className="text-gray-600 dark:text-white/70">{fullName(db.employees.find((e) => e.id === p.fromId))}: {p.comment}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold">Your rating</p>
              <StarRating value={mRating} onChange={reviewing.status === "COMPLETED" ? undefined : setMRating} size={22} />
              <Textarea value={mComment} disabled={reviewing.status === "COMPLETED"} onChange={(e) => setMComment(e.target.value)} placeholder="Strengths, growth areas and goals for next cycle…" />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
