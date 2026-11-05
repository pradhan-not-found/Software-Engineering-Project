"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Check, ChevronLeft, ChevronRight, Plus, Trash2, Users, X } from "lucide-react";
import { useAuthed, suggestPeers } from "@/lib/store";
import type { LeaveRequest, LeaveTypeKey } from "@/lib/types";
import {
  addDays, cn, formatDate, fullName, leaveBalances, LEAVE_TYPES, openTasksFor, rangesOverlap, timeAgo, toISODate, today,
} from "@/lib/utils";
import {
  Avatar, Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, Field, Input, Modal, PageHeader, SearchInput, Select,
  StatCard, StatusBadge, Table, Tabs, Td, Th, useToast,
} from "@/components/ui";

type Tab = "pending" | "history" | "balances" | "calendar";

export default function AdminLeavesPage() {
  const { db } = useAuthed();
  const [tab, setTab] = useState<Tab>("pending");
  const pending = db.leaves.filter((l) => l.status === "PENDING");
  const t = today();
  const onLeaveToday = db.leaves.filter((l) => l.status === "APPROVED" && l.startDate <= t && l.endDate >= t).length;
  const upcoming = db.leaves.filter((l) => l.status === "APPROVED" && l.startDate > t && l.startDate <= addDays(t, 14)).length;
  const year = String(new Date().getFullYear());
  const approvedDays = db.leaves.filter((l) => l.status === "APPROVED" && l.startDate.startsWith(year)).reduce((s, l) => s + l.days, 0);

  return (
    <>
      <PageHeader title="Leave Management" subtitle="Approve requests with full workload context, audit balances and manage the holiday calendar." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending requests" value={pending.length} hint={pending.length ? "Requires action" : "All clear"} hintTone={pending.length ? "warn" : "good"} />
        <StatCard label="On leave today" value={onLeaveToday} hint="employees" />
        <StatCard label="Upcoming (14 days)" value={upcoming} hint="approved leaves" />
        <StatCard label={`Days taken in ${year}`} value={approvedDays} hint="approved" />
      </div>
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "pending", label: `Pending Queue (${pending.length})` },
          { value: "history", label: "History" },
          { value: "balances", label: "Balances Ledger" },
          { value: "calendar", label: "Holiday Calendar" },
        ]}
      />
      {tab === "pending" && <PendingQueue />}
      {tab === "history" && <History />}
      {tab === "balances" && <Balances />}
      {tab === "calendar" && <HolidayCalendar />}
    </>
  );
}

/* ------------------------------------------------------------------ */

function PendingQueue() {
  const { db } = useAuthed();
  const pending = db.leaves.filter((l) => l.status === "PENDING").sort((a, b) => a.startDate.localeCompare(b.startDate));
  if (!pending.length)
    return (
      <Card>
        <EmptyState icon={<Check className="w-10 h-10" />} title="No pending leave requests" description="New requests from employees will appear here with workload context." />
      </Card>
    );
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {pending.map((l) => (
        <PendingCard key={l.id} leave={l} />
      ))}
    </div>
  );
}

function PendingCard({ leave }: { leave: LeaveRequest }) {
  const { db, user, decideLeave } = useAuthed();
  const toast = useToast();
  const [comment, setComment] = useState("");
  const person = db.employees.find((e) => e.id === leave.employeeId);
  const dept = db.departments.find((d) => d.id === person?.departmentId);
  const bal = leaveBalances(db, leave.employeeId).find((b) => b.type === leave.type)!;
  const open = openTasksFor(db, leave.employeeId);
  const dueInWindow = open.filter((t) => t.dueDate && t.dueDate >= leave.startDate && t.dueDate <= leave.endDate);
  const teammatesOff = db.leaves.filter(
    (l) =>
      l.id !== leave.id &&
      l.status === "APPROVED" &&
      rangesOverlap(l.startDate, l.endDate, leave.startDate, leave.endDate) &&
      db.employees.find((e) => e.id === l.employeeId)?.departmentId === person?.departmentId,
  );
  const peers = suggestPeers(db, leave.employeeId, leave.startDate, leave.endDate).slice(0, 3);
  const isSelf = leave.employeeId === user.id;

  const decide = (approve: boolean) => {
    const res = decideLeave(leave.id, approve, comment.trim());
    if (!res.ok) return toast(res.error, "error");
    if (approve) {
      const n = res.data ?? 0;
      toast(n ? `Approved — ${n} task${n === 1 ? "" : "s"} flagged “Delayed — On Leave”` : "Leave approved.");
    } else toast("Leave request rejected.", "info");
  };

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar employee={person} />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{fullName(person)}</p>
            <p className="text-xs text-gray-500 dark:text-white/50 truncate">{person?.designation} · {dept?.name}</p>
          </div>
        </div>
        <Badge color={LEAVE_TYPES[leave.type].color}>{LEAVE_TYPES[leave.type].label}</Badge>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-gray-500 dark:text-white/50">Dates</p>
          <p className="font-medium text-sm">{formatDate(leave.startDate, false)} – {formatDate(leave.endDate, false)}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-white/50">Working days</p>
          <p className="font-medium text-sm">{leave.days}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-white/50">Balance left</p>
          <p className={cn("font-medium text-sm", bal.available < 0 && "text-red-500")}>{leave.type === "UNPAID" ? "—" : `${bal.available + leave.days} → ${bal.available}`}</p>
        </div>
      </div>
      <p className="text-sm text-gray-600 dark:text-white/70 bg-gray-50 dark:bg-white/[0.03] rounded-lg px-3 py-2">“{leave.reason}” <span className="text-xs text-gray-400">· {timeAgo(leave.createdAt)}</span></p>

      {/* Connected workload context */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/5 p-3 flex flex-col gap-2.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Workload context</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-white/70">
          <span><b className="text-black dark:text-white">{open.length}</b> open tasks</span>
          <span className={dueInWindow.length ? "text-amber-600 dark:text-amber-400" : ""}><b>{dueInWindow.length}</b> due during leave</span>
          <span className={teammatesOff.length ? "text-amber-600 dark:text-amber-400" : ""}><b>{teammatesOff.length}</b> teammate(s) also off</span>
        </div>
        {dueInWindow.length > 0 && (
          <ul className="text-xs flex flex-col gap-1">
            {dueInWindow.slice(0, 4).map((t) => (
              <li key={t.id} className="flex items-center gap-1.5 text-gray-700 dark:text-white/80">
                <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="truncate">{t.title}</span>
                <span className="text-gray-400 shrink-0">· due {formatDate(t.dueDate, false)}</span>
              </li>
            ))}
          </ul>
        )}
        {teammatesOff.length > 0 && (
          <p className="text-xs text-gray-600 dark:text-white/60">
            Also off: {teammatesOff.map((l) => fullName(db.employees.find((e) => e.id === l.employeeId))).join(", ")}
          </p>
        )}
        {peers.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-500 dark:text-white/50">Suggested cover:</span>
            {peers.map((p) => (
              <span key={p.employee.id} className="inline-flex items-center gap-1 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full pl-0.5 pr-2 py-0.5">
                <Avatar employee={p.employee} size="xs" className="ring-0" />
                {p.employee.firstName} <span className="text-gray-400">({p.load})</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <Input placeholder="Optional comment to employee…" value={comment} onChange={(e) => setComment(e.target.value)} />
      <div className="flex gap-2 justify-end">
        <Button variant="secondary" icon={<X className="w-4 h-4" />} onClick={() => decide(false)} disabled={isSelf}>Reject</Button>
        <Button variant="success" icon={<Check className="w-4 h-4" />} onClick={() => decide(true)} disabled={isSelf}>Approve</Button>
      </div>
      {isSelf && <p className="text-xs text-gray-400 text-right">You can&apos;t decide your own request.</p>}
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function History() {
  const { db } = useAuthed();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [dept, setDept] = useState("ALL");
  const rows = useMemo(
    () =>
      db.leaves
        .filter((l) => {
          const e = db.employees.find((x) => x.id === l.employeeId);
          if (status !== "ALL" && l.status !== status) return false;
          if (type !== "ALL" && l.type !== type) return false;
          if (dept !== "ALL" && e?.departmentId !== dept) return false;
          if (q && !fullName(e).toLowerCase().includes(q.toLowerCase())) return false;
          return true;
        })
        .sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [db, q, status, type, dept],
  );
  return (
    <Card>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search employee…" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">All statuses</option>
          {["PENDING", "APPROVED", "REJECTED", "CANCELLED"].map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}
        </Select>
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="ALL">All types</option>
          {(Object.keys(LEAVE_TYPES) as LeaveTypeKey[]).map((k) => <option key={k} value={k}>{LEAVE_TYPES[k].label}</option>)}
        </Select>
        <Select value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="ALL">All departments</option>
          {db.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
      </div>
      <Table minWidth={800}>
        <thead>
          <tr><Th>Employee</Th><Th>Type</Th><Th>Dates</Th><Th>Days</Th><Th>Status</Th><Th>Decided by</Th><Th>Comment</Th></tr>
        </thead>
        <tbody>
          {rows.map((l) => {
            const e = db.employees.find((x) => x.id === l.employeeId);
            return (
              <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                <Td><div className="flex items-center gap-2"><Avatar employee={e} size="xs" />{fullName(e)}</div></Td>
                <Td><Badge color={LEAVE_TYPES[l.type].color}>{LEAVE_TYPES[l.type].label}</Badge></Td>
                <Td className="whitespace-nowrap">{formatDate(l.startDate, false)} – {formatDate(l.endDate)}</Td>
                <Td>{l.days}</Td>
                <Td><StatusBadge status={l.status} /></Td>
                <Td>{l.approverId ? fullName(db.employees.find((x) => x.id === l.approverId)) : "—"}</Td>
                <Td className="text-xs text-gray-500 dark:text-white/50 max-w-[220px] truncate">{l.decisionComment ?? l.reason}</Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      {!rows.length && <EmptyState title="No leave records match these filters" />}
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function Balances() {
  const { db } = useAuthed();
  const [q, setQ] = useState("");
  const types = (Object.keys(LEAVE_TYPES) as LeaveTypeKey[]).filter((t) => t !== "UNPAID");
  const emps = db.employees.filter((e) => e.status !== "TERMINATED" && fullName(e).toLowerCase().includes(q.toLowerCase()));
  return (
    <Card>
      <CardHeader title={`Leave ledger · ${new Date().getFullYear()}`} subtitle="Used / allocated, with available balance (pending requests are reserved)." action={<SearchInput value={q} onChange={setQ} placeholder="Filter…" className="w-48" />} />
      <Table minWidth={760}>
        <thead>
          <tr>
            <Th>Employee</Th>
            {types.map((t) => <Th key={t}>{LEAVE_TYPES[t].label}</Th>)}
            <Th>Unpaid used</Th>
          </tr>
        </thead>
        <tbody>
          {emps.map((e) => {
            const b = leaveBalances(db, e.id);
            return (
              <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                <Td><div className="flex items-center gap-2"><Avatar employee={e} size="xs" /><span className="whitespace-nowrap">{fullName(e)}</span></div></Td>
                {types.map((t) => {
                  const x = b.find((y) => y.type === t)!;
                  return (
                    <Td key={t}>
                      <div className="flex flex-col gap-1 min-w-[90px]">
                        <span className="text-xs"><b className="text-black dark:text-white">{x.available}</b> left <span className="text-gray-400">· {x.used}/{x.allocated}{x.pending ? ` · ${x.pending} pend.` : ""}</span></span>
                        <div className="h-1 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${(x.used / x.allocated) * 100}%` }} />
                        </div>
                      </div>
                    </Td>
                  );
                })}
                <Td>{b.find((y) => y.type === "UNPAID")!.used}</Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function HolidayCalendar() {
  const { db, addHoliday, removeHoliday } = useAuthed();
  const toast = useToast();
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [showAdd, setShowAdd] = useState(false);
  const [del, setDel] = useState<string | null>(null);
  const [form, setForm] = useState({ date: today(), name: "", type: "Company" as "National" | "Regional" | "Company" });

  const first = new Date(cursor.y, cursor.m, 1);
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => toISODate(new Date(cursor.y, cursor.m, i + 1)))];
  while (cells.length % 7) cells.push(null);
  const monthLabel = first.toLocaleString("en", { month: "long", year: "numeric" });
  const move = (d: number) => setCursor((c) => { const x = new Date(c.y, c.m + d, 1); return { y: x.getFullYear(), m: x.getMonth() }; });
  const t = today();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <Card className="xl:col-span-2 p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => move(-1)} aria-label="Previous month"><ChevronLeft className="w-4 h-4" /></Button>
          <h3 className="text-sm font-semibold">{monthLabel}</h3>
          <Button variant="ghost" size="sm" onClick={() => move(1)} aria-label="Next month"><ChevronRight className="w-4 h-4" /></Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-[11px] text-center text-gray-400 dark:text-white/40 mb-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const hol = db.holidays.find((h) => h.date === d);
            const off = db.leaves.filter((l) => l.status === "APPROVED" && l.startDate <= d && l.endDate >= d);
            const weekend = i % 7 >= 5;
            return (
              <div
                key={d}
                className={cn(
                  "min-h-[78px] rounded-lg border p-1.5 flex flex-col gap-1 text-left",
                  hol ? "border-pink-300 dark:border-pink-500/30 bg-pink-50 dark:bg-pink-500/10" : "border-gray-100 dark:border-white/5",
                  weekend && !hol && "bg-gray-50 dark:bg-white/[0.02]",
                  d === t && "ring-2 ring-blue-500",
                )}
              >
                <span className="text-xs font-medium text-gray-600 dark:text-white/70">{Number(d.slice(8))}</span>
                {hol && <span className="text-[10px] leading-tight font-semibold text-pink-600 dark:text-pink-400 line-clamp-2">{hol.name}</span>}
                {off.length > 0 && (
                  <div className="flex flex-wrap gap-0.5" title={off.map((l) => fullName(db.employees.find((e) => e.id === l.employeeId))).join(", ")}>
                    {off.slice(0, 3).map((l) => <Avatar key={l.id} employee={db.employees.find((e) => e.id === l.employeeId)} size="xs" className="!w-5 !h-5 !text-[8px] ring-0" />)}
                    {off.length > 3 && <span className="text-[9px] text-gray-400">+{off.length - 3}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 text-[11px] text-gray-500 dark:text-white/50">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-pink-300 dark:bg-pink-500/40" />Holiday</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-300" />Employee on approved leave</span>
        </div>
      </Card>

      <Card>
        <CardHeader title="Holidays" subtitle={`${db.holidays.length} days on the calendar`} action={<Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAdd(true)}>Add</Button>} />
        <div className="px-3 pb-3 flex flex-col max-h-[520px] overflow-y-auto">
          {db.holidays.map((h) => (
            <div key={h.id} className={cn("flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 group", h.date < t && "opacity-50")}>
              <CalendarDays className="w-4 h-4 text-pink-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{h.name}</p>
                <p className="text-xs text-gray-500 dark:text-white/50">{formatDate(h.date)} · {h.type}</p>
              </div>
              <button onClick={() => setDel(h.id)} className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100" aria-label="Remove holiday"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </Card>

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add holiday"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!form.name.trim() || !form.date) return toast("Name and date are required.", "error");
                addHoliday(form.date, form.name.trim(), form.type);
                toast("Holiday added and employees notified.");
                setShowAdd(false);
                setForm({ ...form, name: "" });
              }}
            >
              Add holiday
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Company Offsite" /></Field>
          <Field label="Date"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Type">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}>
              <option>National</option><option>Regional</option><option>Company</option>
            </Select>
          </Field>
        </div>
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={() => { if (del) removeHoliday(del); toast("Holiday removed.", "info"); }} title="Remove holiday?" message="This day will no longer be excluded from leave calculations." confirmLabel="Remove" danger />
    </div>
  );
}
