"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarPlus, PartyPopper } from "lucide-react";
import { useAuthed } from "@/lib/store";
import type { LeaveTypeKey } from "@/lib/types";
import {
  Avatar, Badge, Button, Card, CardHeader, EmptyState, Field, FormError, Input, Modal, PageHeader,
  ProgressBar, Select, StatusBadge, Table, Td, Textarea, Th, useToast, Tabs,
} from "@/components/ui";
import { formatDate, fullName, isTaskDone, leaveBalances, LEAVE_TYPES, today, workingDays } from "@/lib/utils";

export default function MyLeavesPage() {
  const { db, user, requestLeave, cancelLeave } = useAuthed();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "PENDING" | "APPROVED" | "REJECTED">("all");
  const [form, setForm] = useState<{ type: LeaveTypeKey; startDate: string; endDate: string; reason: string }>({
    type: "ANNUAL", startDate: today(), endDate: today(), reason: "",
  });
  const [error, setError] = useState<string | null>(null);

  const t = today();
  const balances = leaveBalances(db, user.id);
  const holidayDates = db.holidays.map((h) => h.date);
  const days = form.startDate && form.endDate && form.endDate >= form.startDate ? workingDays(form.startDate, form.endDate, holidayDates) : 0;

  const tasksInWindow = useMemo(
    () =>
      db.tasks.filter(
        (x) => x.assigneeIds.includes(user.id) && !isTaskDone(db.boards, x) && x.dueDate && x.dueDate >= form.startDate && x.dueDate <= form.endDate,
      ),
    [db, user.id, form.startDate, form.endDate],
  );

  const mine = db.leaves
    .filter((l) => l.employeeId === user.id && (filter === "all" || l.status === filter))
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  const teammates = db.employees.filter((e) => e.id !== user.id && user.managerId && e.managerId === user.managerId);
  const teamLeaves = db.leaves
    .filter((l) => l.status === "APPROVED" && l.endDate >= t && teammates.some((e) => e.id === l.employeeId))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const overlapping = teamLeaves.filter((l) => l.startDate <= form.endDate && l.endDate >= form.startDate);

  const submit = () => {
    const res = requestLeave(form);
    if (res.ok) {
      toast("Leave request submitted to your manager.");
      setOpen(false);
      setError(null);
      setForm({ type: "ANNUAL", startDate: t, endDate: t, reason: "" });
    } else setError(res.error);
  };

  const year = new Date().getFullYear();

  return (
    <>
      <PageHeader
        title="My Leaves"
        subtitle={`Balances, requests and the ${year} holiday calendar.`}
        actions={<Button icon={<CalendarPlus className="w-4 h-4" />} onClick={() => { setError(null); setOpen(true); }}>Apply for leave</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {balances.map((b) => (
          <Card key={b.type} className="p-4 flex flex-col gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-white/60">{b.label}</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-semibold tabular-nums">{b.available}</span>
              <span className="text-xs text-gray-400 dark:text-white/40">/ {b.allocated} days</span>
            </div>
            <ProgressBar value={((b.used + b.pending) / b.allocated) * 100} color={b.color} />
            <span className="text-[11px] text-gray-500 dark:text-white/40">{b.used} used · {b.pending} pending</span>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader
            title="My requests"
            action={<Tabs value={filter} onChange={setFilter} tabs={[{ value: "all", label: "All" }, { value: "PENDING", label: "Pending" }, { value: "APPROVED", label: "Approved" }, { value: "REJECTED", label: "Rejected" }]} />}
          />
          {mine.length === 0 ? (
            <EmptyState title="No leave requests" description="Requests you submit will appear here." />
          ) : (
            <Table minWidth={620}>
              <thead>
                <tr><Th>Type</Th><Th>Dates</Th><Th>Days</Th><Th>Status</Th><Th>Decided by</Th><Th className="text-right"> </Th></tr>
              </thead>
              <tbody>
                {mine.map((l) => (
                  <tr key={l.id}>
                    <Td>
                      <p className="font-medium text-black dark:text-white">{LEAVE_TYPES[l.type].label}</p>
                      <p className="text-xs text-gray-500 dark:text-white/40 truncate max-w-[200px]">{l.reason}</p>
                    </Td>
                    <Td className="whitespace-nowrap">{formatDate(l.startDate, false)} – {formatDate(l.endDate)}</Td>
                    <Td>{l.days}</Td>
                    <Td>
                      <StatusBadge status={l.status} />
                      {l.decisionComment && <p className="text-[11px] text-gray-500 mt-1">“{l.decisionComment}”</p>}
                    </Td>
                    <Td>{l.approverId ? fullName(db.employees.find((e) => e.id === l.approverId)) : "—"}</Td>
                    <Td className="text-right">
                      {l.status === "PENDING" && (
                        <Button size="sm" variant="ghost" onClick={() => { cancelLeave(l.id); toast("Request cancelled.", "info"); }}>Cancel</Button>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Team availability" subtitle="Teammates with upcoming approved leave" />
            <div className="px-5 pb-5 flex flex-col gap-3">
              {teamLeaves.length === 0 && <p className="text-sm text-gray-500 dark:text-white/40">Everyone on your team is around.</p>}
              {teamLeaves.map((l) => {
                const e = db.employees.find((x) => x.id === l.employeeId);
                return (
                  <div key={l.id} className="flex items-center gap-3">
                    <Avatar employee={e} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{fullName(e)}</p>
                      <p className="text-xs text-gray-500 dark:text-white/40">{formatDate(l.startDate, false)} – {formatDate(l.endDate, false)}</p>
                    </div>
                    {l.startDate <= t && <Badge color="amber">Away now</Badge>}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title={`Holiday calendar ${year}`} />
            <div className="px-5 pb-5 flex flex-col gap-2.5 max-h-[360px] overflow-y-auto">
              {db.holidays.map((h) => (
                <div key={h.id} className={`flex items-center gap-3 ${h.date < t ? "opacity-50" : ""}`}>
                  <PartyPopper className="w-4 h-4 text-pink-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{h.name}</p>
                    <p className="text-xs text-gray-500 dark:text-white/40">{formatDate(h.date)}</p>
                  </div>
                  <Badge color={h.type === "National" ? "blue" : h.type === "Company" ? "purple" : "gray"}>{h.type}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Apply for leave"
        subtitle="Your manager will be notified and can see your workload context."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Submit request</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FormError message={error} />
          <Field label="Leave type">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as LeaveTypeKey })}>
              {balances.map((b) => (
                <option key={b.type} value={b.type}>
                  {b.label} {b.type !== "UNPAID" ? `(${b.available} available)` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date">
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value, endDate: e.target.value > form.endDate ? e.target.value : form.endDate })} />
            </Field>
            <Field label="End date">
              <Input type="date" value={form.endDate} min={form.startDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </Field>
          </div>
          <p className="text-sm text-gray-600 dark:text-white/70">
            <b className="text-black dark:text-white">{days}</b> working day{days === 1 ? "" : "s"} (weekends & holidays excluded)
          </p>
          <Field label="Reason">
            <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Briefly describe the reason…" />
          </Field>
          {tasksInWindow.length > 0 && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-3 text-sm">
              <p className="flex items-center gap-2 font-medium text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4" /> {tasksInWindow.length} of your task(s) are due in this window
              </p>
              <ul className="mt-2 ml-6 list-disc text-xs text-amber-700 dark:text-amber-300/80 space-y-0.5">
                {tasksInWindow.slice(0, 5).map((x) => (
                  <li key={x.id}>{x.title} — due {formatDate(x.dueDate, false)}</li>
                ))}
              </ul>
              <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-2">If approved, these will be auto-flagged “Delayed — On Leave” with a reassignment suggestion.</p>
            </div>
          )}
          {overlapping.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-white/50">
              Heads-up: {overlapping.map((l) => fullName(db.employees.find((e) => e.id === l.employeeId))).join(", ")} also off during this period.
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
