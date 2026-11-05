"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle, CalendarClock, Check, MessageSquare, Paperclip, Plus, Repeat, Trash2, UserRoundCog, X, MoreHorizontal, Pencil,
} from "lucide-react";
import type { Board, ColumnCategory, DB, Employee, Priority, Recurrence, Task } from "@/lib/types";
import { useAuthed, suggestPeers } from "@/lib/store";
import {
  assignableEmployees, canManageTasksFor, cn, columnCategory, formatDate, fullName, isAdminRole, isOverdue, isTaskDone, timeAgo, today,
} from "@/lib/utils";
import {
  Avatar, AvatarStack, Badge, Button, ConfirmDialog, Field, FormError, Input, Modal, Select, StatusBadge, Textarea, useToast,
} from "@/components/ui";

export const CATEGORY_META: Record<ColumnCategory, { label: string; dot: string }> = {
  todo: { label: "To Do", dot: "bg-blue-500" },
  in_progress: { label: "In Progress", dot: "bg-orange-500" },
  review: { label: "Under Review", dot: "bg-purple-500" },
  done: { label: "Done", dot: "bg-green-500" },
};

export function columnForCategory(board: Board, cat: ColumnCategory) {
  return board.columns.find((c) => c.category === cat) ?? (cat === "done" ? board.columns[board.columns.length - 1] : board.columns[0]);
}

export function boardLabel(db: DB, board: Board | undefined) {
  if (!board) return "—";
  if (board.type === "PERSONAL") return "Personal";
  return board.title;
}

/** Boards a user may create tasks on. */
export function visibleBoards(db: DB, user: Employee) {
  return db.boards.filter((b) => {
    if (b.type === "PERSONAL") return b.ownerId === user.id;
    if (isAdminRole(user.role)) return true;
    if (b.type === "ONBOARDING") return b.ownerId === user.id || db.tasks.some((t) => t.boardId === b.id && t.assigneeIds.includes(user.id)) || canManageTasksFor(db.employees, user, b.ownerId ?? "");
    return true;
  });
}

/* ------------------------------------------------------------------ */
/* Task card                                                           */
/* ------------------------------------------------------------------ */

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <StatusBadge status={priority} />;
}

export function FlagBadge({ task }: { task: Task }) {
  if (task.flag === "DELAYED_ON_LEAVE")
    return (
      <Badge color="amber">
        <AlertTriangle className="w-3 h-3" /> Delayed — On Leave
      </Badge>
    );
  if (task.flag === "BLOCKED")
    return (
      <Badge color="red">
        <AlertTriangle className="w-3 h-3" /> Needs reassignment
      </Badge>
    );
  return null;
}

export function DueLabel({ db, task }: { db: DB; task: Task }) {
  if (!task.dueDate) return null;
  const overdue = isOverdue(db.boards, task);
  const isToday = task.dueDate === today() && !isTaskDone(db.boards, task);
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", overdue ? "text-red-600 dark:text-red-400" : isToday ? "text-amber-600 dark:text-amber-400" : "text-gray-500 dark:text-white/50")}>
      <CalendarClock className="w-3 h-3" />
      {overdue ? "Overdue · " : isToday ? "Today · " : ""}
      {formatDate(task.dueDate, false)}
    </span>
  );
}

export function TaskCard({ db, task, onOpen, showBoard, draggable = true }: { db: DB; task: Task; onOpen: (t: Task) => void; showBoard?: boolean; draggable?: boolean }) {
  const done = isTaskDone(db.boards, task);
  const board = db.boards.find((b) => b.id === task.boardId);
  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/task", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onOpen(task)}
      data-task-id={task.id}
      className={cn(
        "group bg-white dark:bg-[#141414] border rounded-xl p-3.5 flex flex-col gap-2.5 cursor-pointer hover:shadow-md dark:hover:border-white/20 transition-all",
        task.flag !== "NORMAL" ? "border-amber-300 dark:border-amber-500/40" : "border-gray-200 dark:border-white/10",
        draggable && "active:cursor-grabbing",
      )}
    >
      {showBoard && board && <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-white/40 truncate">{boardLabel(db, board)}</span>}
      <span className={cn("text-sm font-medium leading-snug", done ? "line-through text-gray-400 dark:text-white/40" : "text-black dark:text-white/90")}>{task.title}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={task.priority} />
        <FlagBadge task={task} />
        {task.recurrence !== "NONE" && (
          <Badge color="indigo">
            <Repeat className="w-3 h-3" /> {task.recurrence.toLowerCase()}
          </Badge>
        )}
        {task.tags.slice(0, 2).map((t) => (
          <Badge key={t}>{t}</Badge>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <DueLabel db={db} task={task} />
          {task.comments.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 dark:text-white/40">
              <MessageSquare className="w-3 h-3" />
              {task.comments.length}
            </span>
          )}
          {task.attachments.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 dark:text-white/40">
              <Paperclip className="w-3 h-3" />
              {task.attachments.length}
            </span>
          )}
        </div>
        <AvatarStack employees={task.assigneeIds.map((id) => db.employees.find((e) => e.id === id))} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Kanban board (HTML5 drag & drop)                                    */
/* ------------------------------------------------------------------ */

export interface KanbanColumn {
  id: string;
  name: string;
  category: ColumnCategory;
  tasks: Task[];
}

export function KanbanBoard({
  db,
  columns,
  onMove,
  onOpen,
  onQuickAdd,
  showBoard,
  editable,
  onRenameColumn,
  onRemoveColumn,
  onAddColumn,
}: {
  db: DB;
  columns: KanbanColumn[];
  onMove: (taskId: string, columnId: string, beforeId: string | null) => void;
  onOpen: (t: Task) => void;
  onQuickAdd?: (columnId: string) => void;
  showBoard?: boolean;
  editable?: boolean;
  onRenameColumn?: (columnId: string, name: string) => void;
  onRemoveColumn?: (columnId: string) => void;
  onAddColumn?: () => void;
}) {
  const [over, setOver] = useState<string | null>(null);

  const beforeIdFromEvent = (e: React.DragEvent, container: HTMLElement) => {
    const cards = Array.from(container.querySelectorAll<HTMLElement>("[data-task-id]"));
    for (const card of cards) {
      const r = card.getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) return card.dataset.taskId ?? null;
    }
    return null;
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
      {columns.map((col) => (
        <div
          key={col.id}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(col.id);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setOver(null);
            const id = e.dataTransfer.getData("text/task");
            if (id) onMove(id, col.id, beforeIdFromEvent(e, e.currentTarget));
          }}
          className={cn(
            "flex flex-col gap-3 min-w-[280px] w-[280px] shrink-0 rounded-2xl p-3 transition-colors",
            over === col.id ? "bg-blue-50 dark:bg-blue-500/10 ring-2 ring-blue-300 dark:ring-blue-500/30" : "bg-gray-50 dark:bg-white/[0.02]",
          )}
        >
          <ColumnHeader col={col} editable={editable} onRename={onRenameColumn} onRemove={onRemoveColumn} onQuickAdd={onQuickAdd} />
          <div className="flex flex-col gap-2.5 min-h-[80px]">
            {col.tasks.map((t) => (
              <TaskCard key={t.id} db={db} task={t} onOpen={onOpen} showBoard={showBoard} />
            ))}
            {col.tasks.length === 0 && (
              <div className="text-xs text-center text-gray-400 dark:text-white/30 border border-dashed border-gray-200 dark:border-white/10 rounded-xl py-6">Drop tasks here</div>
            )}
          </div>
        </div>
      ))}
      {editable && onAddColumn && (
        <button
          onClick={onAddColumn}
          className="min-w-[200px] shrink-0 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 text-sm text-gray-500 dark:text-white/40 hover:border-gray-300 hover:text-black dark:hover:text-white flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add stage
        </button>
      )}
    </div>
  );
}

function ColumnHeader({
  col,
  editable,
  onRename,
  onRemove,
  onQuickAdd,
}: {
  col: KanbanColumn;
  editable?: boolean;
  onRename?: (id: string, name: string) => void;
  onRemove?: (id: string) => void;
  onQuickAdd?: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(col.name);
  const [menu, setMenu] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn("w-2 h-2 rounded-full shrink-0", CATEGORY_META[col.category].dot)} />
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              setEditing(false);
              if (name.trim() && name !== col.name) onRename?.(col.id, name);
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className="text-sm font-medium bg-transparent border-b border-gray-300 dark:border-white/20 focus:outline-none w-32"
          />
        ) : (
          <h3 className="text-sm font-medium text-black dark:text-white truncate">{col.name}</h3>
        )}
        <span className="text-xs text-gray-400 dark:text-white/40">{col.tasks.length}</span>
      </div>
      <div className="flex items-center gap-1 relative">
        {onQuickAdd && (
          <button onClick={() => onQuickAdd(col.id)} className="p-1 rounded text-gray-400 hover:text-black hover:bg-black/5 dark:hover:text-white dark:hover:bg-white/10" aria-label="Add task">
            <Plus className="w-4 h-4" />
          </button>
        )}
        {editable && (
          <>
            <button onClick={() => setMenu((m) => !m)} className="p-1 rounded text-gray-400 hover:text-black hover:bg-black/5 dark:hover:text-white dark:hover:bg-white/10" aria-label="Stage options">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menu && (
              <div className="absolute right-0 top-7 z-20 w-36 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-lg shadow-xl py-1 text-sm" onMouseLeave={() => setMenu(false)}>
                <button className="w-full text-left px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2" onClick={() => { setEditing(true); setMenu(false); }}>
                  <Pencil className="w-3.5 h-3.5" /> Rename
                </button>
                <button className="w-full text-left px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 flex items-center gap-2" onClick={() => { onRemove?.(col.id); setMenu(false); }}>
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Create task modal                                                   */
/* ------------------------------------------------------------------ */

export function TaskFormModal({
  open,
  onClose,
  defaultBoardId,
  defaultColumnId,
  defaultAssigneeId,
}: {
  open: boolean;
  onClose: () => void;
  defaultBoardId?: string;
  defaultColumnId?: string;
  defaultAssigneeId?: string;
}) {
  const { db, user, createTask } = useAuthed();
  const toast = useToast();
  const boards = useMemo(() => visibleBoards(db, user), [db, user]);
  const people = useMemo(() => assignableEmployees(db.employees, user), [db.employees, user]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    boardId: defaultBoardId ?? "personal",
    columnId: defaultColumnId ?? "",
    priority: "MEDIUM" as Priority,
    dueDate: "",
    assigneeIds: [defaultAssigneeId ?? user.id],
    recurrence: "NONE" as Recurrence,
    tags: "",
  });
  // Parents mount this modal only while open, so defaults are applied on each open.
  const [error, setError] = useState<string | null>(null);

  const board = boards.find((b) => b.id === form.boardId);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    const res = createTask({
      boardId: form.boardId,
      columnId: form.columnId || undefined,
      title: form.title,
      description: form.description,
      priority: form.priority,
      dueDate: form.dueDate || null,
      assigneeIds: form.assigneeIds,
      recurrence: form.recurrence,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    if (!res.ok) return setError(res.error);
    toast(res.data?.flag === "DELAYED_ON_LEAVE" ? "Task created — flagged because an assignee is on leave." : "Task created.", res.data?.flag === "DELAYED_ON_LEAVE" ? "info" : "success");
    setForm((f) => ({ ...f, title: "", description: "", dueDate: "", tags: "" }));
    setError(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New task"
      subtitle="Assignees are limited to you and your reporting line (org-chart permissions)."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Create task</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormError message={error} />
        <Field label="Title">
          <Input autoFocus value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Prepare sprint demo" onKeyDown={(e) => e.key === "Enter" && submit()} />
        </Field>
        <Field label="Description">
          <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Add details, acceptance criteria…" />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Board">
            <Select value={form.boardId} onChange={(e) => setForm((f) => ({ ...f, boardId: e.target.value, columnId: "" }))}>
              {!boards.some((b) => b.type === "PERSONAL") && <option value="personal">Personal to-do list</option>}
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.type === "PERSONAL" ? "Personal to-do list" : `${b.type === "ONBOARDING" ? "🧭 " : ""}${b.title}`}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Stage">
            <Select value={form.columnId} onChange={(e) => set("columnId", e.target.value)}>
              <option value="">{board ? board.columns[0].name : "To Do"} (default)</option>
              {board?.columns.slice(1).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={form.priority} onChange={(e) => set("priority", e.target.value as Priority)}>
              {(["LOW", "MEDIUM", "HIGH", "URGENT"] as Priority[]).map((p) => (
                <option key={p} value={p}>{p[0] + p.slice(1).toLowerCase()}</option>
              ))}
            </Select>
          </Field>
          <Field label="Due date">
            <Input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
          </Field>
          <Field label="Repeat">
            <Select value={form.recurrence} onChange={(e) => set("recurrence", e.target.value as Recurrence)}>
              <option value="NONE">Does not repeat</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
            </Select>
          </Field>
          <Field label="Tags" hint="Comma separated">
            <Input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="design, q4" />
          </Field>
        </div>
        <AssigneePicker people={people} value={form.assigneeIds} onChange={(v) => set("assigneeIds", v)} db={db} />
      </div>
    </Modal>
  );
}

function AssigneePicker({ db, people, value, onChange }: { db: DB; people: Employee[]; value: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState("");
  const filtered = people.filter((p) => fullName(p).toLowerCase().includes(q.toLowerCase())).slice(0, 30);
  const t = today();
  return (
    <Field label={`Assignees (${value.length})`}>
      <div className="flex flex-wrap gap-1.5 mb-1">
        {value.map((id) => {
          const e = db.employees.find((x) => x.id === id);
          return (
            <span key={id} className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-xs">
              <Avatar employee={e} size="xs" />
              {fullName(e)}
              <button type="button" onClick={() => onChange(value.filter((v) => v !== id))} aria-label="Remove">
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
      </div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people you can assign…" />
      <div className="max-h-40 overflow-y-auto border border-gray-100 dark:border-white/5 rounded-lg mt-1">
        {filtered.map((p) => {
          const onLeave = db.leaves.some((l) => l.employeeId === p.id && l.status === "APPROVED" && l.startDate <= t && l.endDate >= t);
          const load = db.tasks.filter((x) => x.assigneeIds.includes(p.id) && !isTaskDone(db.boards, x)).length;
          const selected = value.includes(p.id);
          return (
            <button
              type="button"
              key={p.id}
              onClick={() => onChange(selected ? value.filter((v) => v !== p.id) : [...value, p.id])}
              className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5", selected && "bg-blue-50 dark:bg-blue-500/10")}
            >
              <Avatar employee={p} size="xs" />
              <span className="flex-1 truncate">{fullName(p)}</span>
              {onLeave && <Badge color="amber">On leave</Badge>}
              <span className="text-[11px] text-gray-400">{load} open</span>
              {selected && <Check className="w-4 h-4 text-blue-500" />}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

/* ------------------------------------------------------------------ */
/* Task detail modal                                                   */
/* ------------------------------------------------------------------ */

export function TaskDetailModal({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const { db, user, updateTask, moveTask, deleteTask, addComment, addAttachment, removeAttachment, reassignTask } = useAuthed();
  const toast = useToast();
  const task = db.tasks.find((t) => t.id === taskId) ?? null;
  const [comment, setComment] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const people = useMemo(() => assignableEmployees(db.employees, user), [db.employees, user]);

  if (!task) return null;
  const board = db.boards.find((b) => b.id === task.boardId);
  const creator = db.employees.find((e) => e.id === task.creatorId);
  const canEdit =
    isAdminRole(user.role) || task.creatorId === user.id || task.assigneeIds.includes(user.id) || task.assigneeIds.some((a) => canManageTasksFor(db.employees, user, a));
  const flaggedAssignee = task.flag !== "NORMAL" ? task.assigneeIds.map((a) => db.employees.find((e) => e.id === a)).find((e) => e && (e.status === "ON_LEAVE" || e.status === "OFFBOARDING" || db.leaves.some((l) => l.employeeId === e.id && l.status === "APPROVED" && l.endDate >= today()))) : undefined;
  const peers = flaggedAssignee ? suggestPeers(db, flaggedAssignee.id).slice(0, 3) : [];

  const upd = (patch: Partial<Task>) => {
    const res = updateTask(task.id, patch);
    if (!res.ok) toast(res.error, "error");
  };

  return (
    <>
      <Modal
        open={!!task}
        onClose={onClose}
        size="xl"
        title={
          editingTitle && canEdit ? (
            <input
              autoFocus
              defaultValue={task.title}
              onBlur={(e) => {
                setEditingTitle(false);
                if (e.target.value.trim()) upd({ title: e.target.value.trim() });
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="bg-transparent border-b border-gray-300 dark:border-white/20 focus:outline-none w-full"
            />
          ) : (
            <button className="text-left hover:underline decoration-dotted underline-offset-4" onClick={() => setEditingTitle(true)}>{task.title}</button>
          )
        }
        subtitle={`${boardLabel(db, board)} · created by ${fullName(creator)} ${timeAgo(task.createdAt)}`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-5">
            {task.flag !== "NORMAL" && (
              <div className="rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 flex flex-col gap-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-amber-800 dark:text-amber-300">{task.flag === "DELAYED_ON_LEAVE" ? "Delayed — assignee on leave" : "Assignee is leaving — needs reassignment"}</p>
                    <p className="text-amber-700 dark:text-amber-200/70 text-xs mt-0.5">Raised automatically by the Connected Engine from HR data.</p>
                  </div>
                </div>
                {flaggedAssignee && peers.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-amber-800 dark:text-amber-200/80">Suggested reassignment:</span>
                    {peers.map((p) => (
                      <button
                        key={p.employee.id}
                        onClick={() => {
                          const res = reassignTask(task.id, flaggedAssignee.id, p.employee.id);
                          toast(res.ok ? `Reassigned to ${fullName(p.employee)}.` : res.error, res.ok ? "success" : "error");
                        }}
                        className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full bg-white dark:bg-black/30 border border-amber-200 dark:border-amber-500/30 text-xs hover:border-amber-400"
                      >
                        <Avatar employee={p.employee} size="xs" />
                        {fullName(p.employee)} <span className="text-gray-400">· {p.load} open</span>
                      </button>
                    ))}
                  </div>
                )}
                {canEdit && (
                  <button className="self-start text-xs text-amber-800 dark:text-amber-300 underline" onClick={() => upd({ flag: "NORMAL" })}>
                    Dismiss flag
                  </button>
                )}
              </div>
            )}

            <Field label="Description">
              <Textarea
                key={task.id + "desc"}
                defaultValue={task.description}
                disabled={!canEdit}
                onBlur={(e) => e.target.value !== task.description && upd({ description: e.target.value })}
                placeholder="Add a description…"
                className="min-h-[110px]"
              />
            </Field>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600 dark:text-white/70">Attachments ({task.attachments.length})</span>
                <Button size="sm" variant="secondary" icon={<Paperclip className="w-3.5 h-3.5" />} onClick={() => fileRef.current?.click()}>
                  Attach file
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      addAttachment(task.id, f.name, f.size);
                      toast(`Attached ${f.name}`);
                    }
                    e.target.value = "";
                  }}
                />
              </div>
              {task.attachments.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5">
                  <span className="flex items-center gap-2 min-w-0">
                    <Paperclip className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{a.name}</span>
                    <span className="text-xs text-gray-400 shrink-0">{Math.max(1, Math.round(a.size / 1024))} KB</span>
                  </span>
                  <button className="text-gray-400 hover:text-red-500" onClick={() => removeAttachment(task.id, a.id)} aria-label="Remove attachment">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-xs font-medium text-gray-600 dark:text-white/70">Comments ({task.comments.length})</span>
              {task.comments.map((c) => {
                const author = db.employees.find((e) => e.id === c.authorId);
                return (
                  <div key={c.id} className="flex gap-3">
                    <Avatar employee={author} size="sm" />
                    <div className="flex-1 min-w-0 bg-gray-50 dark:bg-white/5 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{fullName(author)}</span>
                        <span className="text-[11px] text-gray-400">{timeAgo(c.at)}</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-white/80 whitespace-pre-wrap">{c.text}</p>
                    </div>
                  </div>
                );
              })}
              <div className="flex gap-2">
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Write a comment…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && comment.trim()) {
                      addComment(task.id, comment);
                      setComment("");
                    }
                  }}
                />
                <Button
                  disabled={!comment.trim()}
                  onClick={() => {
                    addComment(task.id, comment);
                    setComment("");
                  }}
                >
                  Send
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Field label="Stage">
              <Select value={task.columnId} disabled={!canEdit} onChange={(e) => moveTask(task.id, e.target.value)}>
                {board?.columns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={task.priority} disabled={!canEdit} onChange={(e) => upd({ priority: e.target.value as Priority })}>
                {(["LOW", "MEDIUM", "HIGH", "URGENT"] as Priority[]).map((p) => (
                  <option key={p} value={p}>{p[0] + p.slice(1).toLowerCase()}</option>
                ))}
              </Select>
            </Field>
            <Field label="Due date">
              <Input type="date" disabled={!canEdit} value={task.dueDate ?? ""} onChange={(e) => upd({ dueDate: e.target.value || null })} />
            </Field>
            <Field label="Repeat">
              <Select value={task.recurrence} disabled={!canEdit} onChange={(e) => upd({ recurrence: e.target.value as Recurrence })}>
                <option value="NONE">Does not repeat</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
              </Select>
            </Field>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-gray-600 dark:text-white/70">Assignees</span>
              {task.assigneeIds.map((id) => {
                const e = db.employees.find((x) => x.id === id);
                return (
                  <div key={id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 min-w-0">
                      <Avatar employee={e} size="xs" />
                      <span className="truncate">{fullName(e)}</span>
                      {e?.status === "ON_LEAVE" && <Badge color="amber">On leave</Badge>}
                    </span>
                    {canEdit && (
                      <button className="text-gray-400 hover:text-red-500" onClick={() => upd({ assigneeIds: task.assigneeIds.filter((a) => a !== id) })} aria-label="Unassign">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
              {canEdit && (
                <Select
                  value=""
                  onChange={(e) => e.target.value && upd({ assigneeIds: [...task.assigneeIds, e.target.value] })}
                  className="mt-1"
                >
                  <option value="">+ Add assignee…</option>
                  {people
                    .filter((p) => !task.assigneeIds.includes(p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>{fullName(p)}</option>
                    ))}
                </Select>
              )}
              {flaggedAssignee && canEdit && (
                <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-1">
                  <UserRoundCog className="w-3 h-3" /> Only people in your reporting line are listed.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {task.tags.map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </div>
            <div className="text-xs text-gray-400 dark:text-white/40 flex flex-col gap-1 pt-2 border-t border-gray-100 dark:border-white/5">
              <span>Status: {CATEGORY_META[columnCategory(db.boards, task)].label}</span>
              {task.completedAt && <span>Completed {formatDate(task.completedAt.slice(0, 10))}</span>}
            </div>
            {canEdit && (
              <Button variant="ghost" className="text-red-600 dark:text-red-400 justify-start" icon={<Trash2 className="w-4 h-4" />} onClick={() => setConfirmDelete(true)}>
                Delete task
              </Button>
            )}
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteTask(task.id);
          onClose();
          toast("Task deleted.", "info");
        }}
        title="Delete task?"
        message={`“${task.title}” will be permanently removed.`}
        confirmLabel="Delete"
        danger
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Task list row                                                       */
/* ------------------------------------------------------------------ */

export function TaskRow({ db, task, onOpen, onToggle }: { db: DB; task: Task; onOpen: (t: Task) => void; onToggle: (t: Task) => void }) {
  const done = isTaskDone(db.boards, task);
  const board = db.boards.find((b) => b.id === task.boardId);
  const cat = columnCategory(db.boards, task);
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3.5 rounded-xl border bg-white dark:bg-white/[0.03] hover:border-gray-300 dark:hover:border-white/20 transition-all cursor-pointer",
        task.flag !== "NORMAL" ? "border-amber-300 dark:border-amber-500/30" : "border-gray-200 dark:border-white/10",
      )}
      onClick={() => onOpen(task)}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle(task);
        }}
        className={cn(
          "w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors",
          done ? "bg-green-500 border-green-500 text-white" : "border-gray-300 dark:border-white/30 hover:border-green-500",
        )}
        aria-label={done ? "Mark as not done" : "Mark as done"}
      >
        {done && <Check className="w-3 h-3" />}
      </button>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <span className={cn("text-sm font-medium", done ? "line-through text-gray-400 dark:text-white/40" : "text-black dark:text-white")}>{task.title}</span>
          <PriorityBadge priority={task.priority} />
        </div>
        {task.description && <p className="text-xs text-gray-500 dark:text-white/50 line-clamp-1">{task.description}</p>}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[11px] text-gray-400 dark:text-white/40">{boardLabel(db, board)}</span>
          <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-white/50">
            <span className={cn("w-1.5 h-1.5 rounded-full", CATEGORY_META[cat].dot)} />
            {board?.columns.find((c) => c.id === task.columnId)?.name}
          </span>
          <DueLabel db={db} task={task} />
          <FlagBadge task={task} />
          {task.recurrence !== "NONE" && (
            <span className="inline-flex items-center gap-1 text-[11px] text-indigo-500">
              <Repeat className="w-3 h-3" /> {task.recurrence.toLowerCase()}
            </span>
          )}
        </div>
      </div>
      <div className="hidden sm:block">
        <AvatarStack employees={task.assigneeIds.map((id) => db.employees.find((e) => e.id === id))} />
      </div>
    </div>
  );
}
