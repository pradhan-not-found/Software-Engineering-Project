"use client";

import { useState } from "react";
import { Pencil, Plus, Target, Trash2, X } from "lucide-react";
import { useAuthed } from "@/lib/store";
import type { ChecklistItem, Goal } from "@/lib/types";
import {
  Avatar, Badge, Button, Card, CardHeader, Checkbox, EmptyState, Field, Input, Modal, PageHeader, ProgressBar,
  Select, StarRating, StatusBadge, Textarea, useToast,
} from "@/components/ui";
import PerformanceMetrics from "@/components/PerformanceMetrics";
import { currentQuarter, formatDate, fullName, uid } from "@/lib/utils";

type GoalDraft = Omit<Goal, "id" | "employeeId"> & { id?: string };

export default function PerformancePage() {
  const { db, user, saveGoal, deleteGoal, submitSelfReview, addPeerFeedback } = useAuthed();
  const toast = useToast();

  const goals = db.goals.filter((g) => g.employeeId === user.id);
  const [draft, setDraft] = useState<GoalDraft | null>(null);
  const [newKr, setNewKr] = useState("");

  const cycle = db.cycles.find((c) => c.status === "ACTIVE");
  const myReview = cycle && db.reviews.find((r) => r.cycleId === cycle.id && r.employeeId === user.id);
  const [selfRating, setSelfRating] = useState<number | null>(null);
  const [selfComment, setSelfComment] = useState("");

  const peers = cycle
    ? db.reviews.filter((r) => {
        if (r.cycleId !== cycle.id || r.employeeId === user.id) return false;
        const e = db.employees.find((x) => x.id === r.employeeId);
        return !!e && ((user.managerId && e.managerId === user.managerId) || e.departmentId === user.departmentId);
      })
    : [];
  const [peerTarget, setPeerTarget] = useState<string | null>(null);
  const [peerRating, setPeerRating] = useState<number>(4);
  const [peerComment, setPeerComment] = useState("");

  const past = db.cycles
    .filter((c) => c.status === "CLOSED")
    .map((c) => ({ cycle: c, review: db.reviews.find((r) => r.cycleId === c.id && r.employeeId === user.id) }))
    .filter((x) => x.review);

  const krProgress = (krs: ChecklistItem[]) => (krs.length ? Math.round((krs.filter((k) => k.done).length / krs.length) * 100) : null);

  const persistGoal = () => {
    if (!draft || !draft.title.trim()) return toast("Give the goal a title.", "error");
    const auto = krProgress(draft.keyResults);
    saveGoal({ ...draft, employeeId: user.id, progress: auto ?? draft.progress, status: auto === 100 ? "COMPLETED" : draft.status });
    toast(draft.id ? "Goal updated." : "Goal created.");
    setDraft(null);
  };

  const toggleKr = (goal: Goal, krId: string) => {
    const keyResults = goal.keyResults.map((k) => (k.id === krId ? { ...k, done: !k.done } : k));
    const p = krProgress(keyResults)!;
    saveGoal({ ...goal, keyResults, progress: p, status: p === 100 ? "COMPLETED" : goal.status === "COMPLETED" ? "ON_TRACK" : goal.status });
  };

  return (
    <>
      <PageHeader
        title="Goals & Reviews"
        subtitle="Track your OKRs/KPIs and complete review cycles backed by your real work data."
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setDraft({ title: "", type: "OKR", quarter: currentQuarter(), progress: 0, status: "ON_TRACK", keyResults: [] })}>New goal</Button>}
      />

      {cycle && myReview && (
        <Card>
          <CardHeader
            title={cycle.name}
            subtitle={`${formatDate(cycle.startDate)} – ${formatDate(cycle.endDate)} · Reviewer: ${fullName(db.employees.find((e) => e.id === myReview.reviewerId))}`}
            action={<StatusBadge status={myReview.status} />}
          />
          <div className="px-5 pb-5 flex flex-col gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-white/40 mb-2">Your work this cycle (auto-populated from tasks & attendance)</p>
              <PerformanceMetrics db={db} employeeId={user.id} start={cycle.startDate} end={cycle.endDate} />
            </div>

            {myReview.status === "PENDING_SELF" ? (
              <div className="flex flex-col gap-3 border-t border-gray-100 dark:border-white/5 pt-4">
                <p className="text-sm font-semibold">Self-assessment</p>
                <StarRating value={selfRating} onChange={setSelfRating} size={22} />
                <Textarea value={selfComment} onChange={(e) => setSelfComment(e.target.value)} placeholder="Summarise your key achievements, challenges and growth areas…" />
                <div>
                  <Button
                    disabled={!selfRating || !selfComment.trim()}
                    onClick={() => {
                      submitSelfReview(myReview.id, selfRating!, selfComment.trim());
                      toast("Self-assessment submitted to your manager.");
                    }}
                  >
                    Submit self-assessment
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 dark:border-white/5 pt-4">
                <div className="rounded-xl bg-gray-50 dark:bg-white/[0.03] p-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-white/40 mb-2">Your self-assessment</p>
                  <StarRating value={myReview.selfRating} />
                  <p className="text-sm mt-2 text-gray-700 dark:text-white/80">{myReview.selfComment}</p>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-white/[0.03] p-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-white/40 mb-2">Manager review</p>
                  {myReview.status === "COMPLETED" ? (
                    <>
                      <StarRating value={myReview.managerRating} />
                      <p className="text-sm mt-2 text-gray-700 dark:text-white/80">{myReview.managerComment}</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-white/50">Awaiting your manager&apos;s review.</p>
                  )}
                </div>
              </div>
            )}

            {myReview.peerFeedback.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold">Peer feedback received</p>
                {myReview.peerFeedback.map((p, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-gray-100 dark:border-white/5 p-3">
                    <Avatar employee={db.employees.find((e) => e.id === p.fromId)} size="sm" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{fullName(db.employees.find((e) => e.id === p.fromId))}</span>
                        <StarRating value={p.rating} size={12} />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-white/70">{p.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
      {!cycle && (
        <Card><EmptyState title="No active review cycle" description="HR will notify you when the next cycle opens." /></Card>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">My goals · {currentQuarter()}</h2>
        {goals.length === 0 && <Card><EmptyState icon={<Target className="w-10 h-10" />} title="No goals yet" description="Set OKRs or KPIs to track your progress." /></Card>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((g) => (
            <Card key={g.id} className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge color={g.type === "OKR" ? "purple" : "teal"}>{g.type}</Badge>
                    <span className="text-xs text-gray-500 dark:text-white/40">{g.quarter}</span>
                  </div>
                  <p className="font-semibold text-black dark:text-white">{g.title}</p>
                </div>
                <div className="flex items-center gap-1">
                  <StatusBadge status={g.status} />
                  <button className="p-1.5 text-gray-400 hover:text-black dark:hover:text-white" onClick={() => setDraft({ ...g })} aria-label="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                  <button className="p-1.5 text-gray-400 hover:text-red-500" onClick={() => { deleteGoal(g.id); toast("Goal deleted.", "info"); }} aria-label="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ProgressBar value={g.progress} color={g.status === "BEHIND" ? "red" : g.status === "AT_RISK" ? "amber" : "green"} />
                <span className="text-xs font-semibold tabular-nums w-10 text-right">{g.progress}%</span>
              </div>
              {g.keyResults.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {g.keyResults.map((k) => (
                    <Checkbox key={k.id} checked={k.done} onChange={() => toggleKr(g, k.id)} label={k.label} />
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {cycle && peers.length > 0 && (
        <Card>
          <CardHeader title="Give peer feedback" subtitle="Teammates in the current review cycle" />
          <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {peers.map((r) => {
              const e = db.employees.find((x) => x.id === r.employeeId);
              const given = r.peerFeedback.find((p) => p.fromId === user.id);
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-white/10 p-3">
                  <Avatar employee={e} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fullName(e)}</p>
                    <p className="text-xs text-gray-500 dark:text-white/40 truncate">{e?.designation}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={given ? "ghost" : "secondary"}
                    onClick={() => {
                      setPeerTarget(r.id);
                      setPeerRating(given?.rating ?? 4);
                      setPeerComment(given?.comment ?? "");
                    }}
                  >
                    {given ? "Edit" : "Give"}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {past.length > 0 && (
        <Card>
          <CardHeader title="Past review cycles" />
          <div className="px-5 pb-5 flex flex-col divide-y divide-gray-100 dark:divide-white/5">
            {past.map(({ cycle: c, review: r }) => (
              <div key={c.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                <div className="flex-1">
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-gray-500 dark:text-white/40">{r!.managerComment || "—"}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">Self <StarRating value={r!.selfRating} size={12} /></div>
                <div className="flex items-center gap-2 text-xs text-gray-500">Manager <StarRating value={r!.managerRating} size={12} /></div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit goal" : "New goal"}
        footer={<><Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button><Button onClick={persistGoal}>Save goal</Button></>}
      >
        {draft && (
          <div className="flex flex-col gap-4">
            <Field label="Title"><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Improve page load time by 30%" /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Type">
                <Select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Goal["type"] })}><option>OKR</option><option>KPI</option></Select>
              </Field>
              <Field label="Quarter"><Input value={draft.quarter} onChange={(e) => setDraft({ ...draft, quarter: e.target.value })} /></Field>
              <Field label="Status">
                <Select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Goal["status"] })}>
                  <option value="ON_TRACK">On track</option><option value="AT_RISK">At risk</option><option value="BEHIND">Behind</option><option value="COMPLETED">Completed</option>
                </Select>
              </Field>
            </div>
            {draft.keyResults.length === 0 && (
              <Field label={`Progress: ${draft.progress}%`}>
                <input type="range" min={0} max={100} value={draft.progress} onChange={(e) => setDraft({ ...draft, progress: Number(e.target.value) })} className="accent-black dark:accent-white" />
              </Field>
            )}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-gray-600 dark:text-white/70">Key results {draft.keyResults.length > 0 && "(progress is calculated automatically)"}</span>
              {draft.keyResults.map((k) => (
                <div key={k.id} className="flex items-center gap-2">
                  <Checkbox checked={k.done} onChange={() => setDraft({ ...draft, keyResults: draft.keyResults.map((x) => (x.id === k.id ? { ...x, done: !x.done } : x)) })} label={k.label} />
                  <button className="ml-auto p-1 text-gray-400 hover:text-red-500" onClick={() => setDraft({ ...draft, keyResults: draft.keyResults.filter((x) => x.id !== k.id) })} aria-label="Remove"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input value={newKr} onChange={(e) => setNewKr(e.target.value)} placeholder="Add a key result…" onKeyDown={(e) => {
                  if (e.key === "Enter" && newKr.trim()) { setDraft({ ...draft, keyResults: [...draft.keyResults, { id: uid("kr"), label: newKr.trim(), done: false }] }); setNewKr(""); }
                }} />
                <Button variant="secondary" onClick={() => { if (newKr.trim()) { setDraft({ ...draft, keyResults: [...draft.keyResults, { id: uid("kr"), label: newKr.trim(), done: false }] }); setNewKr(""); } }}>Add</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!peerTarget}
        onClose={() => setPeerTarget(null)}
        title="Peer feedback"
        subtitle={fullName(db.employees.find((e) => e.id === db.reviews.find((r) => r.id === peerTarget)?.employeeId))}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPeerTarget(null)}>Cancel</Button>
            <Button disabled={!peerComment.trim()} onClick={() => { addPeerFeedback(peerTarget!, peerRating, peerComment.trim()); toast("Feedback shared."); setPeerTarget(null); }}>Submit</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <StarRating value={peerRating} onChange={setPeerRating} size={22} />
          <Textarea value={peerComment} onChange={(e) => setPeerComment(e.target.value)} placeholder="What do they do well? Where could they grow?" />
        </div>
      </Modal>
    </>
  );
}
