"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight, LayoutList, Columns3, Plus, Info } from "lucide-react";
import { useAuthed } from "@/lib/store";
import type { ColumnCategory, Priority, Task } from "@/lib/types";
import { getSubordinates, isTaskDone, isOverdue, PRIORITY_ORDER, today, addDays, fullName, cn } from "@/lib/utils";
import { Button, Card, EmptyState, PageHeader, SearchInput, Select, StatCard, Tabs, useToast } from "@/components/ui";
import {
  CATEGORY_META, columnForCategory, KanbanBoard, TaskDetailModal, TaskFormModal, TaskRow, type KanbanColumn,
} from "@/components/tasks/TaskComponents";

type Scope = "mine" | "team" | "personal";

function TasksInner() {
  const { db, user, moveTask } = useAuthed();
  const toast = useToast();
  const params = useSearchParams();
  const [view, setView] = useState<"list" | "board">("list");
  const [scope, setScope] = useState<Scope>("mine");
  const [q, setQ] = useState("");
  const [priority, setPriority] = useState<"" | Priority>("");
  const [boardFilter, setBoardFilter] = useState("");
  const [openTask, setOpenTask] = useState<string | null>(null);
  const [creating, setCreating] = useState<{ columnId?: string; boardId?: string } | null>(null);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    const t = params.get("task");
    if (t) setOpenTask(t);
  }, [params]);

  const subordinates = useMemo(() => getSubordinates(db.employees, user.id), [db.employees, user.id]);
  const personalBoard = db.boards.find((b) => b.type === "PERSONAL" && b.ownerId === user.id);

  const tasks = useMemo(() => {
    let list: Task[];
    if (scope === "mine") list = db.tasks.filter((t) => t.assigneeIds.includes(user.id));
    else if (scope === "team") {
      // Org chart → task visibility: managers see work across their reporting subtree.
      const ids = new Set(subordinates.map((s) => s.id));
      list = db.tasks.filter((t) => t.assigneeIds.some((a) => ids.has(a)));
    } else list = db.tasks.filter((t) => t.boardId === personalBoard?.id);
    if (q) list = list.filter((t) => `${t.title} ${t.description} ${t.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase()));
    if (priority) list = list.filter((t) => t.priority === priority);
    if (boardFilter) list = list.filter((t) => t.boardId === boardFilter);
    return list.sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  }, [db.tasks, scope, user.id, subordinates, personalBoard, q, priority, boardFilter]);

  const boardsInScope = useMemo(() => Array.from(new Set(tasks.map((t) => t.boardId))).map((id) => db.boards.find((b) => b.id === id)!).filter(Boolean), [tasks, db.boards]);

  const open = tasks.filter((t) => !isTaskDone(db.boards, t));
  const done = tasks.filter((t) => isTaskDone(db.boards, t));
  const t0 = today();
  const groups: { key: string; label: string; tasks: Task[]; tone?: string }[] = [
    { key: "overdue", label: "Overdue", tasks: open.filter((t) => isOverdue(db.boards, t)), tone: "text-red-600 dark:text-red-400" },
    { key: "today", label: "Due today", tasks: open.filter((t) => t.dueDate === t0), tone: "text-amber-600 dark:text-amber-400" },
    { key: "week", label: "This week", tasks: open.filter((t) => t.dueDate && t.dueDate > t0 && t.dueDate <= addDays(t0, 7)) },
    { key: "later", label: "Later", tasks: open.filter((t) => t.dueDate && t.dueDate > addDays(t0, 7)) },
    { key: "none", label: "No due date", tasks: open.filter((t) => !t.dueDate) },
  ];

  const toggleDone = (t: Task) => {
    const board = db.boards.find((b) => b.id === t.boardId);
    if (!board) return;
    const target = columnForCategory(board, isTaskDone(db.boards, t) ? "todo" : "done");
    moveTask(t.id, target.id);
    if (!isTaskDone(db.boards, t)) toast(t.recurrence !== "NONE" ? "Done — next occurrence scheduled." : "Task completed. Nice work!");
  };

  // Cross-board Kanban: columns are workflow categories; a drop moves the task to the matching stage on its own board.
  const categoryColumns: KanbanColumn[] = (Object.keys(CATEGORY_META) as ColumnCategory[]).map((cat) => ({
    id: cat,
    name: CATEGORY_META[cat].label,
    category: cat,
    tasks: tasks
      .filter((t) => db.boards.find((b) => b.id === t.boardId)?.columns.find((c) => c.id === t.columnId)?.category === cat)
      .sort((a, b) => a.order - b.order),
  }));

  const personalColumns: KanbanColumn[] | null =
    scope === "personal" && personalBoard
      ? personalBoard.columns.map((c) => ({ ...c, tasks: tasks.filter((t) => t.columnId === c.id).sort((a, b) => a.order - b.order) }))
      : null;

  const onMoveCategory = (taskId: string, cat: string, beforeId: string | null) => {
    const t = db.tasks.find((x) => x.id === taskId);
    const board = db.boards.find((b) => b.id === t?.boardId);
    if (!t || !board) return;
    const before = beforeId ? db.tasks.find((x) => x.id === beforeId) : null;
    moveTask(taskId, columnForCategory(board, cat as ColumnCategory).id, before?.boardId === t.boardId ? beforeId : null);
  };

  const flagged = open.filter((t) => t.flag !== "NORMAL").length;

  return (
    <>
      <PageHeader
        title="My Tasks"
        subtitle="Personal to-dos, project work and onboarding steps — in one place."
        actions={
          <>
            <Tabs
              value={view}
              onChange={setView}
              tabs={[
                { value: "list", label: <span className="flex items-center gap-1.5"><LayoutList className="w-3.5 h-3.5" /> List</span> },
                { value: "board", label: <span className="flex items-center gap-1.5"><Columns3 className="w-3.5 h-3.5" /> Kanban</span> },
              ]}
            />
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setCreating({ boardId: scope === "personal" ? personalBoard?.id ?? "personal" : undefined })}>
              New task
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Open" value={open.length} />
        <StatCard label="Overdue" value={groups[0].tasks.length} hintTone="bad" hint={groups[0].tasks.length ? "needs attention" : undefined} />
        <StatCard label="Due today" value={groups[1].tasks.length} hintTone="warn" />
        <StatCard label="Flagged by HR events" value={flagged} hint={flagged ? "leave / exit" : "none"} hintTone={flagged ? "warn" : "muted"} />
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
        <Tabs
          value={scope}
          onChange={(s) => { setScope(s); setBoardFilter(""); }}
          tabs={[
            { value: "mine", label: "Assigned to me" },
            ...(subordinates.length ? [{ value: "team" as Scope, label: `My team (${subordinates.length})` }] : []),
            { value: "personal", label: "Personal to-dos" },
          ]}
        />
        <div className="flex flex-col sm:flex-row gap-2">
          <SearchInput value={q} onChange={setQ} placeholder="Search tasks…" className="sm:w-56" />
          <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority | "")} className="sm:w-36">
            <option value="">All priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </Select>
          {scope !== "personal" && (
            <Select value={boardFilter} onChange={(e) => setBoardFilter(e.target.value)} className="sm:w-48">
              <option value="">All boards</option>
              {boardsInScope.map((b) => (
                <option key={b.id} value={b.id}>{b.type === "PERSONAL" ? "Personal" : b.title}</option>
              ))}
            </Select>
          )}
        </div>
      </div>

      {scope === "team" && (
        <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-white/50 -mt-4">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          Visibility is inherited from the org chart: you see work for the {subordinates.length} people in your reporting line ({subordinates.slice(0, 3).map(fullName).join(", ")}{subordinates.length > 3 ? "…" : ""}).
        </div>
      )}

      {view === "list" ? (
        <div className="flex flex-col gap-6">
          {open.length === 0 && (
            <Card>
              <EmptyState title="Nothing open here" description="Create a task or switch scope to see more work." action={<Button size="sm" onClick={() => setCreating({})}>New task</Button>} />
            </Card>
          )}
          {groups.map(
            (g) =>
              g.tasks.length > 0 && (
                <section key={g.key} className="flex flex-col gap-2">
                  <h2 className={cn("text-xs font-semibold uppercase tracking-wider", g.tone ?? "text-gray-500 dark:text-white/50")}>
                    {g.label} · {g.tasks.length}
                  </h2>
                  {g.tasks.map((t) => (
                    <TaskRow key={t.id} db={db} task={t} onOpen={(x) => setOpenTask(x.id)} onToggle={toggleDone} />
                  ))}
                </section>
              ),
          )}
          {done.length > 0 && (
            <section className="flex flex-col gap-2">
              <button className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-white/50" onClick={() => setShowDone((s) => !s)}>
                {showDone ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                Completed · {done.length}
              </button>
              {showDone &&
                done
                  .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
                  .map((t) => <TaskRow key={t.id} db={db} task={t} onOpen={(x) => setOpenTask(x.id)} onToggle={toggleDone} />)}
            </section>
          )}
        </div>
      ) : personalColumns ? (
        <KanbanBoard
          db={db}
          columns={personalColumns}
          onMove={(id, col, before) => moveTask(id, col, before)}
          onOpen={(t) => setOpenTask(t.id)}
          onQuickAdd={(col) => setCreating({ boardId: personalBoard!.id, columnId: col })}
        />
      ) : (
        <>
          <p className="text-xs text-gray-500 dark:text-white/40 -mt-4">Drag cards between stages. Tasks from every board are grouped by workflow stage.</p>
          <KanbanBoard db={db} columns={categoryColumns} onMove={onMoveCategory} onOpen={(t) => setOpenTask(t.id)} showBoard />
        </>
      )}

      {creating && (
        <TaskFormModal open onClose={() => setCreating(null)} defaultBoardId={creating.boardId} defaultColumnId={creating.columnId} />
      )}
      <TaskDetailModal taskId={openTask} onClose={() => setOpenTask(null)} />
    </>
  );
}

export default function EmployeeTasksPage() {
  return (
    <Suspense>
      <TasksInner />
    </Suspense>
  );
}
