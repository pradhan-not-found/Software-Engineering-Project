"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Download, LayoutGrid, List, UserPlus, Users } from "lucide-react";
import { useAuthed } from "@/lib/store";
import type { EmployeeStatus, Role } from "@/lib/types";
import {
  Avatar, Badge, Button, Card, EmptyState, PageHeader, SearchInput, Select, StatCard, StatusBadge, Table, Tabs, Td, Th,
} from "@/components/ui";
import NewHireModal from "@/components/org/NewHireModal";
import { downloadText, formatDate, fullName, getDirectReports, ROLE_LABEL, toCSV } from "@/lib/utils";

type SortKey = "name" | "designation" | "department" | "joiningDate" | "status";

export default function DirectoryPage() {
  const { db } = useAuthed();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");
  const [status, setStatus] = useState<"all" | EmployeeStatus>("all");
  const [role, setRole] = useState<"all" | Role>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });
  const [view, setView] = useState<"table" | "cards">("table");
  const [hireOpen, setHireOpen] = useState(false);

  const deptName = (id: string) => db.departments.find((d) => d.id === id)?.name ?? "—";
  const deptColor = (id: string) => db.departments.find((d) => d.id === id)?.color ?? "gray";

  const rows = useMemo(() => {
    const s = q.toLowerCase().trim();
    const list = db.employees.filter(
      (e) =>
        (!s || `${fullName(e)} ${e.email} ${e.designation} ${e.code} ${(e.skills || []).join(" ")}`.toLowerCase().includes(s)) &&
        (dept === "all" || e.departmentId === dept) &&
        (status === "all" || e.status === status) &&
        (role === "all" || e.role === role),
    );
    const val = (e: (typeof list)[number]) =>
      sort.key === "name" ? fullName(e) : sort.key === "department" ? deptName(e.departmentId) : String(e[sort.key]);
    return list.sort((a, b) => val(a).localeCompare(val(b)) * sort.dir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, q, dept, status, role, sort]);

  const counts = {
    total: db.employees.filter((e) => e.status !== "TERMINATED").length,
    onboarding: db.employees.filter((e) => e.status === "ONBOARDING").length,
    onLeave: db.employees.filter((e) => e.status === "ON_LEAVE").length,
    depts: db.departments.length,
  };

  const exportCSV = () => {
    const data = [
      ["Code", "Name", "Email", "Phone", "Designation", "Department", "Manager", "Role", "Status", "Joining Date", "Location", "Work Mode"],
      ...rows.map((e) => [
        e.code, fullName(e), e.email, e.phone, e.designation, deptName(e.departmentId),
        fullName(db.employees.find((m) => m.id === e.managerId)), e.role, e.status, e.joiningDate, e.location, e.workMode,
      ]),
    ];
    downloadText("employee-directory.csv", toCSV(data), "text/csv");
  };

  const SortHead = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <Th>
      <button className="flex items-center gap-1 uppercase" onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : 1 }))}>
        {children}
        {sort.key === k && (sort.dir === 1 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
      </button>
    </Th>
  );

  return (
    <>
      <PageHeader
        title="Employee Directory"
        subtitle="Manage and view all members of the organization."
        actions={
          <>
            <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={exportCSV}>Export CSV</Button>
            <Button icon={<UserPlus className="w-4 h-4" />} onClick={() => setHireOpen(true)}>Add New Hire</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Headcount" value={counts.total} hint="excl. exited" />
        <StatCard label="Onboarding" value={counts.onboarding} hint="new joiners" hintTone="good" />
        <StatCard label="On Leave Today" value={counts.onLeave} hintTone="warn" hint={counts.onLeave ? "away" : undefined} />
        <StatCard label="Departments" value={counts.depts} />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-3 p-4 border-b border-gray-200 dark:border-white/10">
          <SearchInput value={q} onChange={setQ} placeholder="Search name, email, skill, code…" className="flex-1" />
          <div className="grid grid-cols-3 gap-2 lg:flex">
            <Select value={dept} onChange={(e) => setDept(e.target.value)} className="lg:w-44">
              <option value="all">All departments</option>
              {db.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="lg:w-40">
              <option value="all">All statuses</option>
              {["ACTIVE", "ONBOARDING", "ON_LEAVE", "OFFBOARDING", "TERMINATED"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </Select>
            <Select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className="lg:w-36">
              <option value="all">All roles</option>
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </Select>
          </div>
          <Tabs
            value={view}
            onChange={setView}
            tabs={[
              { value: "table", label: <List className="w-4 h-4" /> },
              { value: "cards", label: <LayoutGrid className="w-4 h-4" /> },
            ]}
          />
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={<Users className="w-10 h-10" />} title="No employees match your filters" description="Try clearing the search or filters." />
        ) : view === "table" ? (
          <Table minWidth={860}>
            <thead>
              <tr>
                <SortHead k="name">Employee</SortHead>
                <SortHead k="designation">Role</SortHead>
                <SortHead k="department">Department</SortHead>
                <Th>Manager</Th>
                <SortHead k="joiningDate">Joined</SortHead>
                <SortHead k="status">Status</SortHead>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const mgr = db.employees.find((m) => m.id === e.managerId);
                return (
                  <tr key={e.id} onClick={() => router.push(`/admin/directory/${e.id}`)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]">
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar employee={e} />
                        <div className="min-w-0">
                          <p className="font-medium text-black dark:text-white truncate">{fullName(e)}</p>
                          <p className="text-xs text-gray-500 dark:text-white/40 truncate">{e.email} · {e.code}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <p>{e.designation}</p>
                      <p className="text-xs text-gray-400 dark:text-white/40">{ROLE_LABEL[e.role]}</p>
                    </Td>
                    <Td><Badge color={deptColor(e.departmentId)}>{deptName(e.departmentId)}</Badge></Td>
                    <Td>{mgr ? fullName(mgr) : <span className="text-gray-400">—</span>}</Td>
                    <Td className="whitespace-nowrap">{formatDate(e.joiningDate)}</Td>
                    <Td><StatusBadge status={e.status} /></Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {rows.map((e) => (
              <button
                key={e.id}
                onClick={() => router.push(`/admin/directory/${e.id}`)}
                className="text-left rounded-xl border border-gray-200 dark:border-white/10 p-4 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Avatar employee={e} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{fullName(e)}</p>
                    <p className="text-xs text-gray-500 dark:text-white/50 truncate">{e.designation}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge color={deptColor(e.departmentId)}>{deptName(e.departmentId)}</Badge>
                      <StatusBadge status={e.status} />
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5 text-xs text-gray-500 dark:text-white/40 flex justify-between">
                  <span>{e.location || "—"} · {e.workMode}</span>
                  <span>{getDirectReports(db.employees, e.id).length} reports</span>
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="px-4 py-3 text-xs text-gray-500 dark:text-white/40 border-t border-gray-100 dark:border-white/5">
          Showing {rows.length} of {db.employees.length} people
        </div>
      </Card>

      <NewHireModal open={hireOpen} onClose={() => setHireOpen(false)} />
    </>
  );
}
