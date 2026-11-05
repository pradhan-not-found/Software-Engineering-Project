"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Circle, Mail, PartyPopper, UserMinus, UserPlus } from "lucide-react";
import { useAuthed } from "@/lib/store";
import type { Employee } from "@/lib/types";
import {
  Avatar, Badge, Button, Card, Checkbox, ConfirmDialog, EmptyState, PageHeader, ProgressBar, Select, StatCard, StatusBadge,
  Table, Tabs, Td, Th, useToast,
} from "@/components/ui";
import NewHireModal from "@/components/org/NewHireModal";
import OffboardModal from "@/components/org/OffboardModal";
import { cn, daysBetween, formatDate, fullName, isTaskDone, money, openTasksFor, today } from "@/lib/utils";

type Tab = "onboarding" | "offboarding";

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnOffboarding />
    </Suspense>
  );
}

function OnOffboarding() {
  const { db } = useAuthed();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>(params.get("tab") === "offboarding" ? "offboarding" : "onboarding");
  const [hireOpen, setHireOpen] = useState(false);
  const [offOpen, setOffOpen] = useState(false);

  const onboarding = db.employees.filter((e) => e.status === "ONBOARDING");
  const offboarding = db.employees.filter((e) => e.status === "OFFBOARDING");
  const exited = db.employees.filter((e) => e.status === "TERMINATED" && e.offboarding);

  return (
    <>
      <PageHeader
        title="On/Offboarding"
        subtitle="New-hire workflows with auto-generated boards, and structured exits with settlement."
        actions={
          tab === "onboarding" ? (
            <Button icon={<UserPlus className="w-4 h-4" />} onClick={() => setHireOpen(true)}>Add New Hire</Button>
          ) : (
            <Button variant="danger" icon={<UserMinus className="w-4 h-4" />} onClick={() => setOffOpen(true)}>Initiate Offboarding</Button>
          )
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Onboarding now" value={onboarding.length} hintTone="good" hint={onboarding.length ? "in progress" : undefined} />
        <StatCard label="Joined last 90 days" value={db.employees.filter((e) => daysBetween(e.joiningDate, today()) <= 90 && daysBetween(e.joiningDate, today()) >= 0).length} />
        <StatCard label="Offboarding" value={offboarding.length} hintTone="warn" hint={offboarding.length ? "exits pending" : undefined} />
        <StatCard label="Exited" value={exited.length} />
      </div>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "onboarding", label: `Onboarding (${onboarding.length})` },
          { value: "offboarding", label: `Offboarding (${offboarding.length})` },
        ]}
      />

      {tab === "onboarding" ? (
        onboarding.length === 0 ? (
          <Card><EmptyState icon={<PartyPopper className="w-10 h-10" />} title="No one is onboarding" description="Add a new hire to auto-generate their onboarding board." action={<Button onClick={() => setHireOpen(true)}>Add New Hire</Button>} /></Card>
        ) : (
          <div className="flex flex-col gap-6">{onboarding.map((e) => <OnboardingCard key={e.id} e={e} />)}</div>
        )
      ) : (
        <>
          {offboarding.length === 0 ? (
            <Card><EmptyState icon={<UserMinus className="w-10 h-10" />} title="No exits in progress" /></Card>
          ) : (
            <div className="flex flex-col gap-6">{offboarding.map((e) => <OffboardingCard key={e.id} e={e} />)}</div>
          )}
          <Card>
            <div className="px-5 pt-5 pb-3"><h3 className="text-sm font-semibold">Exit history</h3></div>
            {exited.length === 0 ? (
              <EmptyState title="No completed exits" />
            ) : (
              <Table>
                <thead><tr><Th>Employee</Th><Th>Last working day</Th><Th>Reason</Th><Th className="text-right">Settlement</Th></tr></thead>
                <tbody>
                  {exited.map((e) => (
                    <tr key={e.id}>
                      <Td><Link href={`/admin/directory/${e.id}`} className="flex items-center gap-2 hover:underline"><Avatar employee={e} size="sm" />{fullName(e)}</Link></Td>
                      <Td>{formatDate(e.offboarding!.lastWorkingDay)}</Td>
                      <Td>{e.offboarding!.reason}</Td>
                      <Td className="text-right font-medium">{money(e.offboarding!.settlementAmount)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </>
      )}

      <NewHireModal open={hireOpen} onClose={() => setHireOpen(false)} />
      <OffboardModal open={offOpen} onClose={() => setOffOpen(false)} />
    </>
  );
}

const TAG_ORDER = ["IT", "HR", "Manager", "Buddy", "Employee"];

function OnboardingCard({ e }: { e: Employee }) {
  const { db, toggleOnboardingDoc, setOfferStatus, completeOnboarding } = useAuthed();
  const toast = useToast();
  const ob = e.onboarding;
  const board = db.boards.find((b) => b.id === ob?.boardId);
  const tasks = db.tasks.filter((t) => t.boardId === ob?.boardId);
  const done = tasks.filter((t) => isTaskDone(db.boards, t)).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const docsDone = ob?.documentsRequired.filter((d) => d.done).length ?? 0;
  const mgr = db.employees.find((x) => x.id === e.managerId);
  const buddy = db.employees.find((x) => x.id === e.buddyId);
  const dept = db.departments.find((d) => d.id === e.departmentId);
  const groups = TAG_ORDER.map((tag) => ({ tag, items: tasks.filter((t) => t.tags.includes(tag)) })).filter((g) => g.items.length);
  const other = tasks.filter((t) => !t.tags.some((x) => TAG_ORDER.includes(x)));
  if (other.length) groups.push({ tag: "Other", items: other });
  const dayN = daysBetween(e.joiningDate, today());

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center gap-4 p-5 border-b border-gray-100 dark:border-white/5">
        <Link href={`/admin/directory/${e.id}`} className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar employee={e} size="lg" />
          <div className="min-w-0">
            <p className="font-semibold truncate hover:underline">{fullName(e)}</p>
            <p className="text-xs text-gray-500 dark:text-white/50 truncate">{e.designation} · {dept?.name}</p>
            <p className="text-xs text-gray-400 dark:text-white/40 mt-0.5">
              {dayN >= 0 ? `Day ${dayN + 1}` : `Starts in ${-dayN} day(s)`} · joined {formatDate(e.joiningDate)}
            </p>
          </div>
        </Link>
        <div className="md:w-64">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-500 dark:text-white/50">Board progress</span>
            <span className="font-semibold tabular-nums">{done}/{tasks.length} · {pct}%</span>
          </div>
          <ProgressBar value={pct} color={pct === 100 ? "green" : "blue"} />
        </div>
        <Button
          variant="success"
          onClick={() => {
            const r = completeOnboarding(e.id);
            r.ok ? toast(`${fullName(e)} completed onboarding${pct < 100 ? ` (${tasks.length - done} task(s) still open)` : ""}.`) : toast(r.error, "error");
          }}
        >
          Complete onboarding
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:divide-x divide-gray-100 dark:divide-white/5">
        <div className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Auto-generated checklist</h4>
            {board && <Link href={`/admin/projects?board=${board.id}`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Open board →</Link>}
          </div>
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-400">No onboarding board found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {groups.map((g) => (
                <div key={g.tag}>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-white/40 mb-1.5">{g.tag}</p>
                  <ul className="flex flex-col gap-1.5">
                    {g.items.map((t) => {
                      const isDone = isTaskDone(db.boards, t);
                      const who = db.employees.find((x) => x.id === t.assigneeIds[0]);
                      return (
                        <li key={t.id} className="flex items-start gap-2 text-sm">
                          {isDone ? <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> : <Circle className="w-4 h-4 text-gray-300 dark:text-white/20 mt-0.5 shrink-0" />}
                          <div className="min-w-0">
                            <p className={cn("truncate", isDone && "line-through text-gray-400 dark:text-white/40")}>{t.title.replace(/^\[[^\]]+\]\s*/, "")}</p>
                            <p className="text-[11px] text-gray-400 dark:text-white/40">{who ? fullName(who) : "Unassigned"} · due {formatDate(t.dueDate, false)}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-5 flex flex-col gap-5 border-t lg:border-t-0 border-gray-100 dark:border-white/5">
          <div>
            <h4 className="text-sm font-semibold mb-2">Offer letter</h4>
            <Select value={ob?.offerLetterStatus ?? "DRAFT"} onChange={(x) => setOfferStatus(e.id, x.target.value as "DRAFT" | "SENT" | "ACCEPTED")}>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="ACCEPTED">Accepted</option>
            </Select>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-2">Documents <span className="text-gray-400 font-normal">({docsDone}/{ob?.documentsRequired.length ?? 0})</span></h4>
            <div className="flex flex-col gap-1.5">
              {ob?.documentsRequired.map((d) => <Checkbox key={d.id} checked={d.done} onChange={() => toggleOnboardingDoc(e.id, d.id)} label={d.label} />)}
            </div>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <h4 className="font-semibold">Welcome workflow</h4>
            <span className="flex items-center gap-2 text-gray-600 dark:text-white/70">
              <Mail className="w-4 h-4" />Welcome email {ob?.welcomeEmailSent ? <Badge color="green">Sent</Badge> : <Badge color="amber">Pending</Badge>}
            </span>
            <span className="text-gray-600 dark:text-white/70">Manager: <b>{mgr ? fullName(mgr) : "—"}</b></span>
            <span className="text-gray-600 dark:text-white/70">Buddy: <b>{buddy ? fullName(buddy) : "Not assigned"}</b></span>
            <span className="text-gray-600 dark:text-white/70">Assets: {e.assets.map((a) => a.type).join(", ") || "None"}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function OffboardingCard({ e }: { e: Employee }) {
  const { db, toggleOffboardingItem, toggleAssetReturned, finalizeOffboarding } = useAuthed();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const ob = e.offboarding!;
  const done = ob.checklist.filter((c) => c.done).length;
  const open = openTasksFor(db, e.id);
  const flagged = open.filter((t) => t.flag !== "NORMAL").length;
  const daysLeft = daysBetween(today(), ob.lastWorkingDay);
  const unreturned = e.assets.filter((a) => !a.returned).length;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center gap-4 p-5 border-b border-gray-100 dark:border-white/5">
        <Link href={`/admin/directory/${e.id}`} className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar employee={e} size="lg" />
          <div className="min-w-0">
            <div className="flex items-center gap-2"><p className="font-semibold truncate hover:underline">{fullName(e)}</p><StatusBadge status={e.status} /></div>
            <p className="text-xs text-gray-500 dark:text-white/50 truncate">{e.designation} · {ob.reason}</p>
            <p className="text-xs text-gray-400 dark:text-white/40 mt-0.5">
              Last working day {formatDate(ob.lastWorkingDay)} · {daysLeft >= 0 ? `${daysLeft} day(s) left` : `${-daysLeft} day(s) ago`}
            </p>
          </div>
        </Link>
        <div className="md:w-56">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-500 dark:text-white/50">Exit checklist</span>
            <span className="font-semibold tabular-nums">{done}/{ob.checklist.length}</span>
          </div>
          <ProgressBar value={(done / ob.checklist.length) * 100} color="orange" />
        </div>
        <Button variant="danger" onClick={() => setConfirm(true)}>Finalize & settle</Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 lg:divide-x divide-gray-100 dark:divide-white/5">
        <div className="p-5">
          <h4 className="text-sm font-semibold mb-2">Exit checklist</h4>
          <div className="flex flex-col gap-1.5">
            {ob.checklist.map((c) => <Checkbox key={c.id} checked={c.done} onChange={() => toggleOffboardingItem(e.id, c.id)} label={c.label} />)}
          </div>
        </div>
        <div className="p-5 border-t lg:border-t-0 border-gray-100 dark:border-white/5">
          <h4 className="text-sm font-semibold mb-2">Asset return <span className="text-gray-400 font-normal">({e.assets.length - unreturned}/{e.assets.length})</span></h4>
          <div className="flex flex-col gap-1.5">
            {e.assets.length === 0 && <p className="text-sm text-gray-400">No assets allocated.</p>}
            {e.assets.map((a) => <Checkbox key={a.id} checked={a.returned} onChange={() => toggleAssetReturned(e.id, a.id)} label={`${a.type} · ${a.tag}`} />)}
          </div>
        </div>
        <div className="p-5 border-t lg:border-t-0 border-gray-100 dark:border-white/5">
          <h4 className="text-sm font-semibold mb-2">Work hand-off</h4>
          {open.length === 0 ? (
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />No open tasks</p>
          ) : (
            <>
              <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-4 h-4" />{open.length} open task(s){flagged ? `, ${flagged} flagged` : ""} need reassignment
              </p>
              <ul className="text-xs text-gray-600 dark:text-white/60 flex flex-col gap-1">
                {open.slice(0, 5).map((t) => <li key={t.id} className="truncate">• {t.title}</li>)}
              </ul>
              <Link href="/admin/projects" className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">Reassign on boards →</Link>
            </>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={`Finalize exit for ${fullName(e)}?`}
        message={
          <>
            This marks all checklist items and assets complete, suspends the account and computes the full &amp; final settlement
            (pro-rated salary + annual leave encashment).
            {(done < ob.checklist.length || unreturned > 0) && <span className="block mt-2 text-amber-600 dark:text-amber-400">{ob.checklist.length - done} checklist item(s) and {unreturned} asset(s) are still open.</span>}
          </>
        }
        confirmLabel="Finalize"
        danger
        onConfirm={() => {
          const r = finalizeOffboarding(e.id);
          r.ok ? toast(`Exit finalised. Settlement: ${money(r.data ?? 0)}.`) : toast(r.error, "error");
        }}
      />
    </Card>
  );
}
