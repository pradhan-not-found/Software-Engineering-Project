"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FolderKanban, Plus, Users, CalendarRange, Compass, AlertTriangle } from "lucide-react";
import { useAuthed } from "@/lib/store";
import type { ColumnCategory, Project } from "@/lib/types";
import { cn, colorFor, formatDate, fullName, isTaskDone, today, addDays } from "@/lib/utils";
import {
  Avatar, AvatarStack, Badge, Button, Card, EmptyState, Field, FormError, Input, Modal, PageHeader, ProgressBar, Select, StatusBadge, Textarea, useToast,
} from "@/components/ui";
import { KanbanBoard, TaskDetailModal, TaskFormModal } from "@/components/tasks/TaskComponents";

function ProjectsInner() {
  const { db, moveTask, addColumn, renameColumn, removeColumn, updateProject } = useAuthed();
  const toast = useToast();
  const params = useSearchParams();
  const [selected, setSelected] = useState<string | null>(null);
  const [openTask, setOpenTask] = useState<string | null>(null);
  const [creating, setCreating] = useState<{ boardId: string; columnId?: string } | null>(null);
  const [newProject, setNewProject] = useState(false);
  const [newStage, setNewStage] = useState(false);
  const [assignee, setAssignee] = useState("");

  const boards = db.boards.filter((b) => b.type !== "PERSONAL");

  useEffect(() => {
    const p = params.get("p");
    const t = params.get("task");
    const b = params.get("board");
    if (b && db.boards.some((x) => x.id === b)) setSelected(b);
    if (p) setSelected(db.boards.find((b) => b.projectId === p)?.id ?? null);
    if (t) {
      const task = db.tasks.find((x) => x.id === t);
      if (task) {
        setSelected(task.boardId);
        setOpenTask(t);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // `selected` is a board id, or "p:<projectId>" right after a project is created.
  const board = boards.find((b) => b.id === selected || (selected?.startsWith("p:") && b.projectId === selected.slice(2)));
  const project = db.projects.find((p) => p.id === board?.projectId);

  const stats = (boardId: string) => {
    const ts = db.tasks.filter((t) => t.boardId === boardId);
    const done = ts.filter((t) => isTaskDone(db.boards, t)).length;
    const members = Array.from(new Set(ts.flatMap((t) => t.assigneeIds)));
    const flagged = ts.filter((t) => t.flag !== "NORMAL" && !isTaskDone(db.boards, t)).length;
    return { total: ts.length, done, pct: ts.length ? Math.round((done / ts.length) * 100) : 0, members, flagged };
  };

  if (board) {
    const s = stats(board.id);
    const columns = board.columns.map((c) => ({
      ...c,
      tasks: db.tasks
        .filter((t) => t.boardId === board.id && t.columnId === c.id && (!assignee || t.assigneeIds.includes(assignee)))
        .sort((a, b) => a.order - b.order),
    }));
    const subject = board.type === "ONBOARDING" ? db.employees.find((e) => e.id === board.ownerId) : undefined;
    return (
      <>
        <div className="flex flex-col gap-3">
          <button className="text-xs text-gray-500 dark:text-white/50 hover:text-black dark:hover:text-white self-start" onClick={() => setSelected(null)}>
            ← All projects & boards
          </button>
          <PageHeader
            title={board.title}
            subtitle={project?.description ?? (subject ? `Auto-generated onboarding board for ${fullName(subject)} — ${subject.designation}.` : undefined)}
            actions={
              <>
                {project && (
                  <Select value={project.status} onChange={(e) => updateProject(project.id, { status: e.target.value as Project["status"] })} className="w-36">
                    <option value="PLANNING">Planning</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ON_HOLD">On hold</option>
                    <option value="COMPLETED">Completed</option>
                  </Select>
                )}
                <Button icon={<Plus className="w-4 h-4" />} onClick={() => setCreating({ boardId: board.id })}>
                  Add task
                </Button>
              </>
            }
          />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-xs text-gray-500 dark:text-white/50">Progress</p>
            <p className="text-2xl font-semibold mt-1">{s.pct}%</p>
            <ProgressBar value={s.pct} className="mt-2" color={project?.color ?? "blue"} />
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 dark:text-white/50">Tasks</p>
            <p className="text-2xl font-semibold mt-1">{s.done}/{s.total}</p>
            <p className="text-xs text-gray-400 mt-1">completed</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 dark:text-white/50">Lead</p>
            <div className="flex items-center gap-2 mt-2">
              <Avatar employee={db.employees.find((e) => e.id === (project?.leadId ?? subject?.managerId))} size="sm" />
              <span className="text-sm font-medium truncate">{fullName(db.employees.find((e) => e.id === (project?.leadId ?? subject?.managerId)))}</span>
            </div>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 dark:text-white/50">Flagged (HR signals)</p>
            <p className={cn("text-2xl font-semibold mt-1", s.flagged > 0 && "text-amber-600 dark:text-amber-400")}>{s.flagged}</p>
            <p className="text-xs text-gray-400 mt-1">assignee on leave / leaving</p>
          </Card>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-white/50">Filter by member:</span>
          <button onClick={() => setAssignee("")} className={cn("text-xs px-2.5 py-1 rounded-full border", !assignee ? "bg-black text-white dark:bg-white dark:text-black border-transparent" : "border-gray-200 dark:border-white/10")}>All</button>
          {s.members.map((m) => {
            const e = db.employees.find((x) => x.id === m);
            return (
              <button key={m} onClick={() => setAssignee(m === assignee ? "" : m)} className={cn("inline-flex items-center gap-1.5 text-xs pl-1 pr-2.5 py-0.5 rounded-full border", assignee === m ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10" : "border-gray-200 dark:border-white/10")}>
                <Avatar employee={e} size="xs" />
                {e?.firstName}
                {e?.status === "ON_LEAVE" && <span className="text-amber-500">●</span>}
              </button>
            );
          })}
        </div>
        <KanbanBoard
          db={db}
          columns={columns}
          editable
          onMove={(id, col, before) => moveTask(id, col, before)}
          onOpen={(t) => setOpenTask(t.id)}
          onQuickAdd={(col) => setCreating({ boardId: board.id, columnId: col })}
          onRenameColumn={(col, name) => renameColumn(board.id, col, name)}
          onRemoveColumn={(col) => {
            const res = removeColumn(board.id, col);
            toast(res.ok ? "Stage removed; its tasks moved to the first stage." : res.error, res.ok ? "info" : "error");
          }}
          onAddColumn={() => setNewStage(true)}
        />
        {creating && <TaskFormModal open onClose={() => setCreating(null)} defaultBoardId={creating.boardId} defaultColumnId={creating.columnId} />}
        <TaskDetailModal taskId={openTask} onClose={() => setOpenTask(null)} />
        <NewStageModal
          open={newStage}
          onClose={() => setNewStage(false)}
          onCreate={(name, cat) => {
            addColumn(board.id, name, cat);
            toast(`Stage “${name}” added.`);
          }}
        />
      </>
    );
  }

  const projectBoards = boards.filter((b) => b.type === "PROJECT");
  const onboardingBoards = boards.filter((b) => b.type === "ONBOARDING");

  return (
    <>
      <PageHeader
        title="Projects & Boards"
        subtitle="Project Kanban boards and auto-generated onboarding boards, connected to org and HR data."
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setNewProject(true)}>New project</Button>}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold flex items-center gap-2"><FolderKanban className="w-4 h-4" /> Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projectBoards.map((b) => {
            const p = db.projects.find((x) => x.id === b.projectId)!;
            const s = stats(b.id);
            const c = colorFor(p.color);
            const overdue = db.tasks.filter((t) => t.boardId === b.id && !isTaskDone(db.boards, t) && t.dueDate && t.dueDate < today()).length;
            return (
              <Card key={b.id} className="p-5 flex flex-col gap-4 cursor-pointer hover:border-gray-300 dark:hover:border-white/20" onClick={() => setSelected(b.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", c.soft, c.text)}>
                      <FolderKanban className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{p.name}</p>
                      <p className="text-xs text-gray-500 dark:text-white/50 truncate">{db.departments.find((d) => d.id === p.departmentId)?.name}</p>
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-xs text-gray-500 dark:text-white/50 line-clamp-2 min-h-[2rem]">{p.description}</p>
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-500 dark:text-white/50">{s.done}/{s.total} tasks</span>
                    <span className="font-medium">{s.pct}%</span>
                  </div>
                  <ProgressBar value={s.pct} color={p.color} />
                </div>
                <div className="flex items-center justify-between">
                  <AvatarStack employees={s.members.map((m) => db.employees.find((e) => e.id === m))} max={5} />
                  <div className="flex items-center gap-2">
                    {s.flagged > 0 && <Badge color="amber"><AlertTriangle className="w-3 h-3" /> {s.flagged}</Badge>}
                    {overdue > 0 && <Badge color="red">{overdue} overdue</Badge>}
                    <span className="text-[11px] text-gray-400 flex items-center gap-1"><CalendarRange className="w-3 h-3" />{formatDate(p.endDate, false)}</span>
                  </div>
                </div>
              </Card>
            );
          })}
          {projectBoards.length === 0 && (
            <Card className="md:col-span-3"><EmptyState title="No projects yet" action={<Button size="sm" onClick={() => setNewProject(true)}>Create project</Button>} /></Card>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold flex items-center gap-2"><Compass className="w-4 h-4" /> Onboarding boards <span className="text-xs font-normal text-gray-500 dark:text-white/40">— generated automatically when a new hire is added</span></h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {onboardingBoards.map((b) => {
            const s = stats(b.id);
            const subject = db.employees.find((e) => e.id === b.ownerId);
            return (
              <Card key={b.id} className="p-5 flex flex-col gap-3 cursor-pointer hover:border-gray-300 dark:hover:border-white/20" onClick={() => setSelected(b.id)}>
                <div className="flex items-center gap-3">
                  <Avatar employee={subject} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{fullName(subject)}</p>
                    <p className="text-xs text-gray-500 dark:text-white/50 truncate">{subject?.designation} · joined {formatDate(subject?.joiningDate)}</p>
                  </div>
                  {subject && <StatusBadge status={subject.status} />}
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-500 dark:text-white/50">{s.done}/{s.total} steps</span>
                    <span className="font-medium">{s.pct}%</span>
                  </div>
                  <ProgressBar value={s.pct} color="green" />
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-white/50">
                  <Users className="w-3.5 h-3.5" /> {s.members.length} people involved
                </div>
              </Card>
            );
          })}
          {onboardingBoards.length === 0 && (
            <Card className="md:col-span-3"><EmptyState title="No onboarding boards" description="Add a new hire from the Directory to generate one automatically." /></Card>
          )}
        </div>
      </section>

      <NewProjectModal open={newProject} onClose={() => setNewProject(false)} onCreated={(id) => setSelected(id)} />
    </>
  );
}

function NewStageModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (name: string, cat: ColumnCategory) => void }) {
  const [name, setName] = useState("");
  const [cat, setCat] = useState<ColumnCategory>("in_progress");
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Add workflow stage"
      subtitle="Custom stages map to a category so cross-board views stay consistent."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={!name.trim()} onClick={() => { onCreate(name, cat); setName(""); onClose(); }}>Add stage</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Stage name"><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. QA Testing" /></Field>
        <Field label="Category">
          <Select value={cat} onChange={(e) => setCat(e.target.value as ColumnCategory)}>
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

function NewProjectModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (boardId: string) => void }) {
  const { db, user, createProject } = useAuthed();
  const toast = useToast();
  const leads = useMemo(() => db.employees.filter((e) => e.status !== "TERMINATED"), [db.employees]);
  const [form, setForm] = useState({
    name: "", description: "", departmentId: db.departments[0]?.id ?? "", leadId: user.id, color: "blue",
    startDate: today(), endDate: addDays(today(), 60), status: "PLANNING" as Project["status"],
  });
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const submit = () => {
    const res = createProject(form);
    if (!res.ok) return setError(res.error);
    toast(`Project “${form.name}” created with a default Kanban board.`);
    onClose();
    setForm((f) => ({ ...f, name: "", description: "" }));
    if (res.data) onCreated(`p:${res.data.id}`);
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New project"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Create project</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormError message={error} />
        <Field label="Project name"><Input autoFocus value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Description"><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Department">
            <Select value={form.departmentId} onChange={(e) => set("departmentId", e.target.value)}>
              {db.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Project lead">
            <Select value={form.leadId} onChange={(e) => set("leadId", e.target.value)}>
              {leads.map((e) => <option key={e.id} value={e.id}>{fullName(e)}</option>)}
            </Select>
          </Field>
          <Field label="Start date"><Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /></Field>
          <Field label="Target end date"><Input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} /></Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => set("status", e.target.value as Project["status"])}>
              <option value="PLANNING">Planning</option>
              <option value="ACTIVE">Active</option>
            </Select>
          </Field>
          <Field label="Color">
            <div className="flex gap-2 py-1">
              {["blue", "teal", "purple", "orange", "pink", "green", "indigo"].map((c) => (
                <button key={c} type="button" onClick={() => set("color", c)} className={cn("w-7 h-7 rounded-full", colorFor(c).bg, form.color === c && "ring-2 ring-offset-2 ring-black dark:ring-white dark:ring-offset-black")} aria-label={c} />
              ))}
            </div>
          </Field>
        </div>
      </div>
    </Modal>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense>
      <ProjectsInner />
    </Suspense>
  );
}
