"use client";

import { useMemo, useState } from "react";
import { KeyRound, Lock, ShieldCheck } from "lucide-react";
import { useAuthed } from "@/lib/store";
import type { Role } from "@/lib/types";
import {
  Avatar, Badge, Button, Card, CardHeader, ConfirmDialog, PageHeader, SearchInput, Select, StatCard, StatusBadge, Table,
  Td, Th, Toggle, useToast,
} from "@/components/ui";
import { fullName, MODULES, ROLE_LABEL } from "@/lib/utils";

const ROLES: Role[] = ["SUPER_ADMIN", "HR_ADMIN", "MANAGER", "EMPLOYEE"];

export default function AccessPage() {
  const { db, user, togglePermission, setRole, setAccountStatus, resetPassword } = useAuthed();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [resetFor, setResetFor] = useState<string | null>(null);
  const canEdit = user.role === "SUPER_ADMIN";

  const users = useMemo(() => {
    const s = q.trim().toLowerCase();
    return db.employees
      .filter((e) => e.status !== "TERMINATED" || e.accountStatus === "ACTIVE")
      .filter((e) => (roleFilter === "all" || e.role === roleFilter) && (!s || `${fullName(e)} ${e.email}`.toLowerCase().includes(s)))
      .sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || fullName(a).localeCompare(fullName(b)));
  }, [db, q, roleFilter]);

  const count = (r: Role) => db.employees.filter((e) => e.role === r && e.status !== "TERMINATED").length;
  const resetTarget = db.employees.find((e) => e.id === resetFor);

  return (
    <>
      <PageHeader title="Access Control" subtitle="Role-based permissions, module visibility and account status." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {ROLES.map((r) => <StatCard key={r} label={ROLE_LABEL[r]} value={count(r)} hint={r === "SUPER_ADMIN" ? "full access" : undefined} />)}
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title="Permission matrix"
          subtitle="Which modules each role can see. Admin console requires Super Admin or HR Admin; Manager/Employee flags control portal features like Directory and Org Chart."
          action={!canEdit && <Badge color="amber"><Lock className="w-3 h-3" />Read-only</Badge>}
        />
        <Table minWidth={720}>
          <thead>
            <tr>
              <Th>Module</Th>
              {ROLES.map((r) => <Th key={r} className="text-center">{ROLE_LABEL[r]}</Th>)}
            </tr>
          </thead>
          <tbody>
            {MODULES.map((m) => (
              <tr key={m.key}>
                <Td>
                  <p className="font-medium text-black dark:text-white">{m.label}</p>
                  <p className="text-xs text-gray-500 dark:text-white/40">{m.description}</p>
                </Td>
                {ROLES.map((r) => {
                  const locked = r === "SUPER_ADMIN" && m.key === "access";
                  return (
                    <Td key={r} className="text-center">
                      <div className="flex justify-center">
                        <Toggle
                          checked={db.permissions[r][m.key]}
                          disabled={!canEdit || locked}
                          onChange={() => togglePermission(r, m.key)}
                        />
                      </div>
                    </Td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="Users & roles" subtitle="Change a user's role, suspend sign-in or reset credentials." />
        <div className="flex flex-col sm:flex-row gap-2 px-5 pb-4">
          <SearchInput value={q} onChange={setQ} placeholder="Search users…" className="flex-1" />
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)} className="sm:w-44">
            <option value="all">All roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </Select>
        </div>
        <Table minWidth={760}>
          <thead><tr><Th>User</Th><Th>Role</Th><Th>Employment</Th><Th>Account</Th><Th className="text-right">Actions</Th></tr></thead>
          <tbody>
            {users.map((e) => (
              <tr key={e.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar employee={e} size="sm" />
                    <div className="min-w-0">
                      <p className="font-medium text-black dark:text-white truncate">{fullName(e)}{e.id === user.id && <span className="text-xs text-gray-400"> (you)</span>}</p>
                      <p className="text-xs text-gray-500 dark:text-white/40 truncate">{e.email}</p>
                    </div>
                  </div>
                </Td>
                <Td>
                  <Select
                    value={e.role}
                    className="w-36 py-1.5 text-xs"
                    onChange={(x) => {
                      const r = setRole(e.id, x.target.value as Role);
                      r.ok ? toast(`${fullName(e)} is now ${ROLE_LABEL[x.target.value as Role]}.`) : toast(r.error, "error");
                    }}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </Select>
                </Td>
                <Td><StatusBadge status={e.status} /></Td>
                <Td><StatusBadge status={e.accountStatus} /></Td>
                <Td className="text-right whitespace-nowrap">
                  <Button size="sm" variant="ghost" icon={<KeyRound className="w-3.5 h-3.5" />} onClick={() => setResetFor(e.id)}>Reset password</Button>
                  <Button
                    size="sm"
                    variant={e.accountStatus === "ACTIVE" ? "secondary" : "success"}
                    onClick={() => {
                      const r = setAccountStatus(e.id, e.accountStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE");
                      r.ok ? toast(`Account ${e.accountStatus === "ACTIVE" ? "suspended" : "re-activated"}.`) : toast(r.error, "error");
                    }}
                  >
                    {e.accountStatus === "ACTIVE" ? "Suspend" : "Activate"}
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <div className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-4 py-3 text-sm text-gray-600 dark:text-white/60">
        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
        <p>Task-level permissions are not configured here — they are inherited automatically from the reporting hierarchy in the Org Chart.</p>
      </div>

      <ConfirmDialog
        open={!!resetFor}
        onClose={() => setResetFor(null)}
        title="Reset password?"
        message={<>The password for <b>{fullName(resetTarget)}</b> will be reset to the default demo password.</>}
        confirmLabel="Reset"
        onConfirm={() => {
          if (!resetFor) return;
          resetPassword(resetFor);
          toast(`Password for ${fullName(resetTarget)} reset to demo1234.`);
        }}
      />
    </>
  );
}
