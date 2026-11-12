"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Info, Maximize2, Minimize2 } from "lucide-react";
import { useAuthed } from "@/lib/store";
import type { Employee } from "@/lib/types";
import { Avatar, Badge, Button, Card, SearchInput, Select, StatusBadge } from "@/components/ui";
import ProfileModal from "@/components/org/ProfileModal";
import { cn, fullName, getSubordinates } from "@/lib/utils";

/**
 * Interactive reporting-hierarchy tree.
 * Connected wedge #3: task assignment & visibility inherit from this structure.
 */
export default function OrgChart({ variant }: { variant: "admin" | "employee" }) {
  const { db, user, fetchOrgChart } = useAuthed();
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [profile, setProfile] = useState<string | null>(null);

  useEffect(() => {
    fetchOrgChart({ departmentId: dept, query: q }).catch(() => {});
  }, [dept, q, fetchOrgChart]);

  const people = useMemo(() => db.employees.filter((e) => e.status !== "TERMINATED"), [db]);
  const childrenOf = (id: string) => people.filter((e) => e.managerId === id);
  const roots = people.filter((e) => !e.managerId || !people.some((m) => m.id === e.managerId));

  const s = q.trim().toLowerCase();
  const matches = (e: Employee) =>
    (!s || `${fullName(e)} ${e.designation}`.toLowerCase().includes(s)) && (dept === "all" || e.departmentId === dept);

  // Show a node if it matches or any descendant matches (keeps the path visible).
  const visible = useMemo(() => {
    const set = new Set<string>();
    const visit = (e: Employee): boolean => {
      const kids = people.filter((k) => k.managerId === e.id);
      const anyKid = kids.map(visit).some(Boolean);
      const ok = matches(e) || anyKid;
      if (ok) set.add(e.id);
      return ok;
    };
    people.filter((e) => !e.managerId || !people.some((m) => m.id === e.managerId)).forEach(visit);
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, s, dept]);

  const filtering = !!s || dept !== "all";
  const mySubtree = new Set(getSubordinates(db.employees, user.id).map((e) => e.id));

  const toggle = (id: string) =>
    setCollapsed((c) => {
      const n = new Set(c);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const Node = ({ e, depth }: { e: Employee; depth: number }) => {
    if (!visible.has(e.id)) return null;
    const kids = childrenOf(e.id).filter((k) => visible.has(k.id));
    const total = getSubordinates(people, e.id).length;
    const isCollapsed = collapsed.has(e.id) && !filtering;
    const d = db.departments.find((x) => x.id === e.departmentId);
    const highlight = filtering && matches(e);
    const relation = e.id === user.id ? "You" : mySubtree.has(e.id) ? "Can assign" : null;

    const card = (
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border px-3 py-2.5 bg-white dark:bg-white/[0.03] transition-colors min-w-0 flex-1",
          highlight ? "border-blue-400 ring-2 ring-blue-400/30" : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20",
          e.id === user.id && "bg-blue-50/50 dark:bg-blue-500/5",
        )}
      >
        <Avatar employee={e} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium truncate">{fullName(e)}</p>
            {e.status !== "ACTIVE" && <StatusBadge status={e.status} />}
            {relation && <Badge color={relation === "You" ? "blue" : "green"}>{relation}</Badge>}
          </div>
          <p className="text-xs text-gray-500 dark:text-white/40 truncate">{e.designation}</p>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
          {d && <Badge color={d.color}>{d.code}</Badge>}
          {total > 0 && <span className="text-[11px] text-gray-400">{total} in org</span>}
        </div>
      </div>
    );

    return (
      <li className="relative">
        <div className="flex items-center gap-1.5">
          {kids.length > 0 ? (
            <button onClick={() => toggle(e.id)} className="p-1 rounded text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 shrink-0" aria-label={isCollapsed ? "Expand" : "Collapse"}>
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          ) : (
            <span className="w-6 shrink-0" />
          )}
          {variant === "admin" ? (
            <Link href={`/admin/directory/${e.id}`} className="flex-1 min-w-0 flex">{card}</Link>
          ) : (
            <button onClick={() => setProfile(e.id)} className="flex-1 min-w-0 flex text-left">{card}</button>
          )}
        </div>
        {kids.length > 0 && !isCollapsed && (
          <ul className="ml-4 sm:ml-7 pl-3 sm:pl-4 mt-2 border-l border-dashed border-gray-300 dark:border-white/15 flex flex-col gap-2">
            {kids.map((k) => <Node key={k.id} e={k} depth={depth + 1} />)}
          </ul>
        )}
      </li>
    );
  };

  const managers = people.filter((e) => childrenOf(e.id).length > 0);

  return (
    <>
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          <b>One permission system.</b> Task assignment and visibility inherit from this hierarchy — managers can assign and view work for
          everyone beneath them, and changing a reporting line instantly updates who can manage whose tasks.
          {mySubtree.size > 0 && <> You can currently assign work to <b>{mySubtree.size}</b> people in your reporting line.</>}
        </p>
      </div>

      <Card className="p-4 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <SearchInput value={q} onChange={setQ} placeholder="Find a person or role…" className="flex-1" />
          <Select value={dept} onChange={(e) => setDept(e.target.value)} className="sm:w-48">
            <option value="all">All departments</option>
            {db.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <div className="flex gap-2">
            <Button variant="secondary" icon={<Maximize2 className="w-4 h-4" />} onClick={() => setCollapsed(new Set())}>Expand</Button>
            <Button variant="secondary" icon={<Minimize2 className="w-4 h-4" />} onClick={() => setCollapsed(new Set(managers.map((m) => m.id).filter((id) => roots.every((r) => r.id !== id))))}>Collapse</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            ["People", people.length],
            ["Managers", managers.length],
            ["Departments", db.departments.length],
            ["Max span", Math.max(0, ...managers.map((m) => childrenOf(m.id).length))],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-gray-50 dark:bg-white/[0.03] py-2">
              <p className="text-lg font-semibold tabular-nums">{v}</p>
              <p className="text-[11px] text-gray-500 dark:text-white/40">{k}</p>
            </div>
          ))}
        </div>
        {visible.size === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No one matches your filters.</p>
        ) : (
          <ul className="flex flex-col gap-2 overflow-x-auto">
            {roots.map((r) => <Node key={r.id} e={r} depth={0} />)}
          </ul>
        )}
      </Card>

      <ProfileModal db={db} employeeId={profile} onClose={() => setProfile(null)} />
    </>
  );
}
