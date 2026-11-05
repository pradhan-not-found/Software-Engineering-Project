"use client";

import { useMemo, useState } from "react";
import { Check, Info, Paperclip, Receipt, X } from "lucide-react";
import { useAuthed } from "@/lib/store";
import type { Expense } from "@/lib/types";
import { formatDate, fullName, money, timeAgo } from "@/lib/utils";
import {
  Avatar, Badge, Button, Card, CardHeader, EmptyState, PageHeader, SearchInput, Select, StatCard, StatusBadge, Table, Td, Th, useToast,
} from "@/components/ui";

const CATEGORIES: Expense["category"][] = ["Travel", "Meals", "Equipment", "Internet", "Training", "Other"];
const CAT_COLOR: Record<Expense["category"], string> = { Travel: "blue", Meals: "orange", Equipment: "purple", Internet: "teal", Training: "green", Other: "gray" };

export default function AdminExpensesPage() {
  const { db, decideExpense } = useAuthed();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [cat, setCat] = useState("ALL");
  const year = String(new Date().getFullYear());

  const pending = db.expenses.filter((x) => x.status === "PENDING");
  const approved = db.expenses.filter((x) => x.status === "APPROVED");
  const reimbursedYTD = db.expenses.filter((x) => x.status === "REIMBURSED" && x.date.startsWith(year));

  const history = useMemo(
    () =>
      db.expenses
        .filter((x) => {
          const e = db.employees.find((y) => y.id === x.employeeId);
          if (status !== "ALL" && x.status !== status) return false;
          if (cat !== "ALL" && x.category !== cat) return false;
          if (q && !`${fullName(e)} ${x.description}`.toLowerCase().includes(q.toLowerCase())) return false;
          return true;
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [db, q, status, cat],
  );

  const decide = (x: Expense, ok: boolean) => {
    decideExpense(x.id, ok);
    toast(ok ? `Approved ${money(x.amount)} — it will be paid in the next payroll run.` : "Claim rejected.", ok ? "success" : "info");
  };

  return (
    <>
      <PageHeader title="Expense Claims" subtitle="Review reimbursement requests. Approved claims are paid automatically with the next payroll run." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending review" value={pending.length} hint={money(pending.reduce((s, x) => s + x.amount, 0))} hintTone="warn" />
        <StatCard label="Approved, awaiting payroll" value={money(approved.reduce((s, x) => s + x.amount, 0))} hint={`${approved.length} claims`} />
        <StatCard label={`Reimbursed in ${year}`} value={money(reimbursedYTD.reduce((s, x) => s + x.amount, 0))} hintTone="good" hint={`${reimbursedYTD.length} claims`} />
        <StatCard label="Rejected" value={db.expenses.filter((x) => x.status === "REJECTED").length} />
      </div>

      <div className="flex items-start gap-2 text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg px-3 py-2">
        <Info className="w-4 h-4 shrink-0 mt-px" />
        Approved claims are bundled into the next payroll run as reimbursements and marked “Reimbursed” once that run is paid.
      </div>

      <Card>
        <CardHeader title="Pending queue" subtitle={`${pending.length} claim(s) need a decision`} />
        {pending.length === 0 ? (
          <EmptyState icon={<Receipt className="w-10 h-10" />} title="No pending claims" />
        ) : (
          <div className="flex flex-col divide-y divide-gray-100 dark:divide-white/5">
            {pending.map((x) => {
              const e = db.employees.find((y) => y.id === x.employeeId);
              return (
                <div key={x.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar employee={e} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{x.description}</p>
                      <p className="text-xs text-gray-500 dark:text-white/50">
                        {fullName(e)} · {formatDate(x.date)} · submitted {timeAgo(x.createdAt)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge color={CAT_COLOR[x.category]}>{x.category}</Badge>
                        {x.receiptName ? (
                          <span className="text-xs text-gray-500 dark:text-white/50 flex items-center gap-1"><Paperclip className="w-3 h-3" />{x.receiptName}</span>
                        ) : (
                          <span className="text-xs text-amber-600 dark:text-amber-400">No receipt attached</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-lg font-semibold tabular-nums">{money(x.amount)}</span>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" icon={<X className="w-3.5 h-3.5" />} onClick={() => decide(x, false)}>Reject</Button>
                    <Button variant="success" size="sm" icon={<Check className="w-3.5 h-3.5" />} onClick={() => decide(x, true)}>Approve</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="All claims" />
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SearchInput value={q} onChange={setQ} placeholder="Search employee or description…" />
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ALL">All statuses</option>
            {["PENDING", "APPROVED", "REJECTED", "REIMBURSED"].map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}
          </Select>
          <Select value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="ALL">All categories</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </div>
        <Table minWidth={760}>
          <thead><tr><Th>Employee</Th><Th>Description</Th><Th>Category</Th><Th>Date</Th><Th>Amount</Th><Th>Status</Th><Th>Decided by</Th></tr></thead>
          <tbody>
            {history.map((x) => (
              <tr key={x.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                <Td className="whitespace-nowrap">{fullName(db.employees.find((y) => y.id === x.employeeId))}</Td>
                <Td className="max-w-[260px] truncate">{x.description}</Td>
                <Td><Badge color={CAT_COLOR[x.category]}>{x.category}</Badge></Td>
                <Td className="whitespace-nowrap">{formatDate(x.date)}</Td>
                <Td className="tabular-nums font-medium">{money(x.amount)}</Td>
                <Td><StatusBadge status={x.status} /></Td>
                <Td>{x.decidedBy ? fullName(db.employees.find((y) => y.id === x.decidedBy)) : "—"}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        {!history.length && <EmptyState title="No claims match these filters" />}
      </Card>
    </>
  );
}
