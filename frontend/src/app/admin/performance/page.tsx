"use client";

import { useMemo, useState } from "react";
import { Lock, Plus, Sparkles, Target } from "lucide-react";
import { useAuthed } from "@/lib/store";
import type { Review } from "@/lib/types";
import { addDays, cn, formatDate, fullName, today } from "@/lib/utils";
import PerformanceMetrics from "@/components/PerformanceMetrics";
import {
  Avatar, Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, Field, FormError, Input, Modal, PageHeader, ProgressBar,
  SearchInput, Select, StarRating, StatCard, StatusBadge, Table, Tabs, Td, Textarea, Th, useToast,
} from "@/components/ui";

type Tab = "cycles" | "goals" | "distribution";

export default function AdminPerformancePage() {
  const { db } = useAuthed();
  const [tab, setTab] = useState<Tab>("cycles");
  const active = db.cycles.filter((c) => c.status === "ACTIVE");
  const activeReviews = db.reviews.filter((r) => active.some((c) => c.id === r.cycleId));
  const done = activeReviews.filter((r) => r.status === "COMPLETED").length;
  const rated = db.reviews.filter((r) => r.managerRating !== null);
  const avg = rated.length ? (rated.reduce((s, r) => s + (r.managerRating ?? 0), 0) / rated.length).toFixed(1) : "—";

  return (
    <>
      <PageHeader title="Performance Management" subtitle="Review cycles pre-populated with real task delivery data, goals & OKRs, and rating calibration." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active cycles" value={active.length} />
        <StatCard label="Reviews completed" value={`${done}/${activeReviews.length}`} hint={activeReviews.length ? `${Math.round((done / activeReviews.length) * 100)}%` : undefined} />
        <StatCard label="Average manager rating" value={avg} hint="all cycles" />
        <StatCard label="Goals at risk" value={db.goals.filter((g) => g.status === "AT_RISK" || g.status === "BEHIND").length} hintTone="warn" />
      </div>
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ value: "cycles", label: "Review Cycles" }, { value: "goals", label: "Goals & OKRs" }, { value: "distribution", label: "Rating Distribution" }]} />
      {tab === "cycles" && <Cycles />}
      {tab === "goals" && <Goals />}
      {tab === "distribution" && <Distribution />}
    </>
  );
}

function Cycles() {
  const { db, createCycle, closeCycle } = useAuthed();
  const toast = useToast();
  const [selected, setSelected] = useState<string>(db.cycles.find((c) => c.status === "ACTIVE")?.id ?? db.cycles[0]?.id ?? "");
  const [showNew, setShowNew] = useState(false);
  const [closeId, setCloseId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", startDate: today(), endDate: addDays(today(), 30) });
  const [error, setError] = useState<string | null>(null);
  const [openReview, setOpenReview] = useState<string | null>(null);
  const [filter, setFilter] = useState("ALL");
  const cycle = db.cycles.find((c) => c.id === selected);
  const reviews = db.reviews.filter((r) => r.cycleId === selected && (filter === "ALL" || r.status === filter));
  const all = db.reviews.filter((r) => r.cycleId === selected);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      <div className="flex flex-col gap-3">
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setError(null); setShowNew(true); }}>New review cycle</Button>
        {[...db.cycles].reverse().map((c) => {
          const rs = db.reviews.filter((r) => r.cycleId === c.id);
          const pct = rs.length ? Math.round((rs.filter((r) => r.status === "COMPLETED").length / rs.length) * 100) : 0;
          return (
            <button key={c.id} onClick={() => setSelected(c.id)} className={cn("text-left rounded-xl border p-4 transition-colors", selected === c.id ? "border-black dark:border-white bg-gray-50 dark:bg-white/5" : "border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/[0.03]")}>
              <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{c.name}</span><StatusBadge status={c.status} /></div>
              <p className="text-xs text-gray-500 dark:text-white/50 mt-1">{formatDate(c.startDate, false)} – {formatDate(c.endDate)}</p>
              <ProgressBar value={pct} color={pct === 100 ? "green" : "blue"} className="mt-3" />
              <p className="text-[11px] text-gray-500 dark:text-white/40 mt-1">{pct}% complete · {rs.length} reviews</p>
            </button>
          );
        })}
      </div>

      <Card className="xl:col-span-3">
        {cycle ? (
          <>
            <CardHeader
              title={cycle.name}
              subtitle={`Window ${formatDate(cycle.startDate)} – ${formatDate(cycle.endDate)} · metrics computed from tasks & attendance in this window`}
              action={
                <div className="flex gap-2">
                  <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="py-1.5 text-xs w-[150px]">
                    <option value="ALL">All ({all.length})</option>
                    <option value="PENDING_SELF">Pending self</option>
                    <option value="PENDING_MANAGER">Pending manager</option>
                    <option value="COMPLETED">Completed</option>
                  </Select>
                  {cycle.status === "ACTIVE" && <Button size="sm" variant="secondary" icon={<Lock className="w-3.5 h-3.5" />} onClick={() => setCloseId(cycle.id)}>Close</Button>}
                </div>
              }
            />
            <Table minWidth={760}>
              <thead><tr><Th>Employee</Th><Th>Reviewer</Th><Th>Self</Th><Th>Peers</Th><Th>Manager</Th><Th>Status</Th><Th></Th></tr></thead>
              <tbody>
                {reviews.map((r) => {
                  const e = db.employees.find((x) => x.id === r.employeeId);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] cursor-pointer" onClick={() => setOpenReview(r.id)}>
                      <Td><div className="flex items-center gap-2"><Avatar employee={e} size="xs" /><div><p className="whitespace-nowrap">{fullName(e)}</p><p className="text-xs text-gray-400">{e?.designation}</p></div></div></Td>
                      <Td className="whitespace-nowrap">{r.reviewerId ? fullName(db.employees.find((x) => x.id === r.reviewerId)) : "—"}</Td>
                      <Td>{r.selfRating ? <StarRating value={r.selfRating} size={13} /> : <span className="text-xs text-gray-400">—</span>}</Td>
                      <Td>{r.peerFeedback.length || "—"}</Td>
                      <Td>{r.managerRating ? <StarRating value={r.managerRating} size={13} /> : <span className="text-xs text-gray-400">—</span>}</Td>
                      <Td><StatusBadge status={r.status} /></Td>
                      <Td className="text-right"><Button size="sm" variant="ghost">Open</Button></Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            {!reviews.length && <EmptyState title="No reviews in this view" />}
          </>
        ) : (
          <EmptyState icon={<Target className="w-10 h-10" />} title="No review cycles yet" description="Launch a cycle to create self, peer and manager reviews for every eligible employee." />
        )}
      </Card>

      <ReviewModal reviewId={openReview} onClose={() => setOpenReview(null)} />

      <Modal
        open={showNew}
        onClose={() => setShowNew(false)}
        title="Launch review cycle"
        subtitle="Creates a review for every active employee and notifies them to submit a self-assessment."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={() => {
              const res = createCycle(form.name, form.startDate, form.endDate);
              if (!res.ok) return setError(res.error);
              toast(`“${form.name}” launched.`);
              setShowNew(false);
              setForm({ ...form, name: "" });
            }}>Launch</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Cycle name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Q1 2027 Check-in" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start"><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
            <Field label="End"><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
          </div>
          <FormError message={error} />
        </div>
      </Modal>
      <ConfirmDialog open={!!closeId} onClose={() => setCloseId(null)} onConfirm={() => { if (closeId) closeCycle(closeId); toast("Cycle closed.", "info"); }} title="Close this cycle?" message="Pending reviews will remain incomplete and the cycle becomes read-only." confirmLabel="Close cycle" />
    </div>
  );
}

function ReviewModal({ reviewId, onClose }: { reviewId: string | null; onClose: () => void }) {
  const { db, submitManagerReview } = useAuthed();
  const toast = useToast();
  const review: Review | undefined = db.reviews.find((r) => r.id === reviewId);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [lastId, setLastId] = useState<string | null>(null);
  if (review && review.id !== lastId) {
    setLastId(review.id);
    setRating(review.managerRating);
    setComment(review.managerComment);
  }
  if (!review) return null;
  const cycle = db.cycles.find((c) => c.id === review.cycleId)!;
  const e = db.employees.find((x) => x.id === review.employeeId);
  const end = cycle.endDate < today() ? cycle.endDate : today();
  const goals = db.goals.filter((g) => g.employeeId === review.employeeId);
  const closed = cycle.status === "CLOSED";

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={`${fullName(e)} · ${cycle.name}`}
      subtitle={`${e?.designation} · reviewer ${review.reviewerId ? fullName(db.employees.find((x) => x.id === review.reviewerId)) : "unassigned"}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {!closed && (
            <Button
              disabled={!rating}
              onClick={() => {
                submitManagerReview(review.id, rating!, comment.trim());
                toast("Manager review submitted.");
                onClose();
              }}
            >
              {review.status === "COMPLETED" ? "Update review" : "Submit manager review"}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <h4 className="text-sm font-semibold">Objective work data</h4>
            <span className="text-xs text-gray-500 dark:text-white/40">auto-pulled from tasks & attendance, {formatDate(cycle.startDate, false)} – {formatDate(end)}</span>
          </div>
          <PerformanceMetrics db={db} employeeId={review.employeeId} start={cycle.startDate} end={end} />
        </div>

        {goals.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Goals</h4>
            <div className="flex flex-col gap-2">
              {goals.map((g) => (
                <div key={g.id} className="flex items-center gap-3">
                  <span className="text-sm flex-1 truncate">{g.title}</span>
                  <StatusBadge status={g.status} />
                  <div className="w-28"><ProgressBar value={g.progress} color={g.status === "ON_TRACK" || g.status === "COMPLETED" ? "green" : "amber"} /></div>
                  <span className="text-xs tabular-nums w-8 text-right">{g.progress}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4">
            <div className="flex items-center justify-between mb-2"><h4 className="text-sm font-semibold">Self-assessment</h4>{review.selfRating ? <StarRating value={review.selfRating} size={14} /> : <Badge color="amber">Pending</Badge>}</div>
            <p className="text-sm text-gray-600 dark:text-white/70">{review.selfComment || "Not submitted yet."}</p>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4">
            <h4 className="text-sm font-semibold mb-2">Peer feedback ({review.peerFeedback.length})</h4>
            {review.peerFeedback.length === 0 && <p className="text-sm text-gray-500 dark:text-white/40">No peer feedback yet.</p>}
            {review.peerFeedback.map((p) => (
              <div key={p.fromId} className="flex flex-col gap-1 py-1.5">
                <div className="flex items-center justify-between"><span className="text-xs font-medium">{fullName(db.employees.find((x) => x.id === p.fromId))}</span><StarRating value={p.rating} size={12} /></div>
                <p className="text-xs text-gray-600 dark:text-white/60">{p.comment}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 flex flex-col gap-3">
          <h4 className="text-sm font-semibold">Manager rating</h4>
          <StarRating value={rating} onChange={closed ? undefined : setRating} size={22} />
          <Textarea value={comment} onChange={(ev) => setComment(ev.target.value)} disabled={closed} placeholder="Summarise impact, strengths and growth areas — reference the delivery data above." />
        </div>
      </div>
    </Modal>
  );
}

function Goals() {
  const { db } = useAuthed();
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const goals = db.goals.filter((g) => {
    const e = db.employees.find((x) => x.id === g.employeeId);
    if (dept !== "ALL" && e?.departmentId !== dept) return false;
    if (status !== "ALL" && g.status !== status) return false;
    if (q && !`${g.title} ${fullName(e)}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  return (
    <Card>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search goals or people…" />
        <Select value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="ALL">All departments</option>
          {db.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">All statuses</option>
          {["ON_TRACK", "AT_RISK", "BEHIND", "COMPLETED"].map((s) => <option key={s} value={s}>{s.replace("_", " ").toLowerCase()}</option>)}
        </Select>
      </div>
      <Table minWidth={760}>
        <thead><tr><Th>Goal</Th><Th>Owner</Th><Th>Type</Th><Th>Quarter</Th><Th>Key results</Th><Th>Progress</Th><Th>Status</Th></tr></thead>
        <tbody>
          {goals.map((g) => {
            const e = db.employees.find((x) => x.id === g.employeeId);
            return (
              <tr key={g.id}>
                <Td className="font-medium text-black dark:text-white">{g.title}</Td>
                <Td><div className="flex items-center gap-2 whitespace-nowrap"><Avatar employee={e} size="xs" />{fullName(e)}</div></Td>
                <Td><Badge color={g.type === "OKR" ? "purple" : "teal"}>{g.type}</Badge></Td>
                <Td className="whitespace-nowrap">{g.quarter}</Td>
                <Td>{g.keyResults.length ? `${g.keyResults.filter((k) => k.done).length}/${g.keyResults.length}` : "—"}</Td>
                <Td><div className="flex items-center gap-2 min-w-[120px]"><ProgressBar value={g.progress} color={g.status === "BEHIND" ? "red" : g.status === "AT_RISK" ? "amber" : "green"} /><span className="text-xs tabular-nums">{g.progress}%</span></div></Td>
                <Td><StatusBadge status={g.status} /></Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      {!goals.length && <EmptyState icon={<Target className="w-10 h-10" />} title="No goals match these filters" />}
    </Card>
  );
}

function Distribution() {
  const { db } = useAuthed();
  const [cycleId, setCycleId] = useState(db.cycles[db.cycles.length - 1]?.id ?? "");
  const data = useMemo(() => {
    const rs = db.reviews.filter((r) => r.cycleId === cycleId);
    const bucket = (k: "selfRating" | "managerRating") => [1, 2, 3, 4, 5].map((n) => rs.filter((r) => r[k] === n).length);
    return { self: bucket("selfRating"), mgr: bucket("managerRating"), total: rs.length };
  }, [db, cycleId]);
  const max = Math.max(1, ...data.self, ...data.mgr);
  const labels = ["Needs improvement", "Below expectations", "Meets expectations", "Exceeds expectations", "Outstanding"];
  return (
    <Card>
      <CardHeader
        title="Rating distribution"
        subtitle="Calibrate self vs manager ratings across the organisation."
        action={
          <Select value={cycleId} onChange={(e) => setCycleId(e.target.value)} className="py-1.5 text-xs w-[180px]">
            {db.cycles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        }
      />
      <div className="px-5 pb-6 flex flex-col gap-4">
        {[5, 4, 3, 2, 1].map((n) => (
          <div key={n} className="grid grid-cols-[110px_1fr] sm:grid-cols-[200px_1fr] gap-3 items-center">
            <div className="text-xs"><span className="font-semibold">{n}★</span> <span className="text-gray-500 dark:text-white/50 hidden sm:inline">{labels[n - 1]}</span></div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2"><div className="h-3 rounded bg-blue-500/80" style={{ width: `${(data.self[n - 1] / max) * 100}%`, minWidth: data.self[n - 1] ? 6 : 0 }} /><span className="text-[11px] text-gray-500">{data.self[n - 1]}</span></div>
              <div className="flex items-center gap-2"><div className="h-3 rounded bg-purple-500/80" style={{ width: `${(data.mgr[n - 1] / max) * 100}%`, minWidth: data.mgr[n - 1] ? 6 : 0 }} /><span className="text-[11px] text-gray-500">{data.mgr[n - 1]}</span></div>
            </div>
          </div>
        ))}
        <div className="flex gap-4 text-xs text-gray-500 dark:text-white/50 pt-2">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500/80" />Self rating</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-500/80" />Manager rating</span>
          <span className="ml-auto">{data.total} reviews</span>
        </div>
      </div>
    </Card>
  );
}
