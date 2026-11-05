"use client";

import { useState } from "react";
import { Paperclip, Plus, Receipt } from "lucide-react";
import { useAuthed } from "@/lib/store";
import type { Expense } from "@/lib/types";
import {
  Button, Card, CardHeader, EmptyState, Field, FormError, Input, Modal, PageHeader, Select, StatCard, StatusBadge,
  Table, Td, Textarea, Th, useToast,
} from "@/components/ui";
import { formatDate, fullName, money, today } from "@/lib/utils";

const CATEGORIES: Expense["category"][] = ["Travel", "Meals", "Equipment", "Internet", "Training", "Other"];

export default function ExpensesPage() {
  const { db, user, submitExpense } = useAuthed();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const empty = { category: "Travel" as Expense["category"], amount: "", date: today(), description: "", receiptName: null as string | null };
  const [form, setForm] = useState(empty);

  const mine = db.expenses.filter((x) => x.employeeId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = (st: Expense["status"]) => mine.filter((x) => x.status === st).reduce((s, x) => s + x.amount, 0);

  const submit = () => {
    const res = submitExpense({ category: form.category, amount: Number(form.amount), date: form.date, description: form.description, receiptName: form.receiptName });
    if (res.ok) {
      toast("Expense claim submitted for approval.");
      setOpen(false);
      setForm(empty);
      setError(null);
    } else setError(res.error);
  };

  return (
    <>
      <PageHeader
        title="Expense Claims"
        subtitle="Submit reimbursements — approved claims are paid out with the next payroll run."
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={() => { setError(null); setOpen(true); }}>New claim</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending" value={money(total("PENDING"))} hint={`${mine.filter((x) => x.status === "PENDING").length} claim(s)`} hintTone="warn" />
        <StatCard label="Approved (unpaid)" value={money(total("APPROVED"))} hint="Next payroll" />
        <StatCard label="Reimbursed" value={money(total("REIMBURSED"))} hintTone="good" />
        <StatCard label="Rejected" value={money(total("REJECTED"))} hintTone="bad" />
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="My claims" />
        {mine.length === 0 ? (
          <EmptyState icon={<Receipt className="w-10 h-10" />} title="No claims yet" description="Submit your first reimbursement claim." />
        ) : (
          <Table minWidth={640}>
            <thead>
              <tr><Th>Date</Th><Th>Category</Th><Th>Description</Th><Th>Receipt</Th><Th className="text-right">Amount</Th><Th>Status</Th></tr>
            </thead>
            <tbody>
              {mine.map((x) => (
                <tr key={x.id}>
                  <Td className="whitespace-nowrap">{formatDate(x.date)}</Td>
                  <Td>{x.category}</Td>
                  <Td>{x.description}</Td>
                  <Td>{x.receiptName ? <span className="inline-flex items-center gap-1 text-xs"><Paperclip className="w-3 h-3" />{x.receiptName}</span> : <span className="text-xs text-gray-400">—</span>}</Td>
                  <Td className="text-right tabular-nums font-medium">{money(x.amount)}</Td>
                  <Td>
                    <StatusBadge status={x.status} />
                    {x.decidedBy && <p className="text-[11px] text-gray-500 dark:text-white/40 mt-1">by {fullName(db.employees.find((e) => e.id === x.decidedBy))}</p>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New expense claim"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Submit claim</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FormError message={error} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Expense["category"] })}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Amount (₹)">
              <Input type="number" min={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
            </Field>
          </div>
          <Field label="Expense date">
            <Input type="date" max={today()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Description">
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What was this expense for?" />
          </Field>
          <Field label="Receipt" hint="PDF or image. Only the file name is stored in this demo.">
            <Input type="file" accept="image/*,.pdf" onChange={(e) => setForm({ ...form, receiptName: e.target.files?.[0]?.name ?? null })} />
          </Field>
        </div>
      </Modal>
    </>
  );
}
