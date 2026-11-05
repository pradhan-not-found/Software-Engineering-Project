"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Download, FileText, Pencil, Play, RefreshCw, Trash2, Wallet } from "lucide-react";
import { useAuthed } from "@/lib/store";
import type { PayrollLine, PayrollRun, SalaryStructure } from "@/lib/types";
import { computePayrollLine, downloadText, formatDate, formatMonth, fullName, money, toCSV, today } from "@/lib/utils";
import { PayslipModal } from "@/components/Payslip";
import {
  Avatar, Button, Card, CardHeader, ConfirmDialog, EmptyState, Field, FormError, Input, Modal, PageHeader, SearchInput,
  StatCard, StatusBadge, Table, Tabs, Td, Th, useToast,
} from "@/components/ui";

type Tab = "runs" | "salary" | "tax";

const sum = (lines: PayrollLine[], k: keyof PayrollLine) => lines.reduce((s, l) => s + (l[k] as number), 0);

export default function AdminPayrollPage() {
  const { db } = useAuthed();
  const [tab, setTab] = useState<Tab>("runs");
  const [openRun, setOpenRun] = useState<string | null>(null);
  const latest = db.payrollRuns[0];
  const monthlyCost = db.employees.filter((e) => e.status !== "TERMINATED").reduce((s, e) => s + e.salary.basic + e.salary.hra + e.salary.allowances, 0);
  const paidYTD = db.payrollRuns.filter((r) => r.status === "PAID" && r.month.startsWith(String(new Date().getFullYear()))).reduce((s, r) => s + sum(r.lines, "net"), 0);

  return (
    <>
      <PageHeader title="Payroll" subtitle="Generate monthly runs, compute taxes & deductions automatically and issue payslips." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Monthly fixed cost" value={money(monthlyCost)} hint="gross, active staff" />
        <StatCard label="Latest run" value={latest ? formatMonth(latest.month).split(" ")[0] : "—"} hint={latest?.status.toLowerCase()} hintTone={latest?.status === "PAID" ? "good" : "warn"} />
        <StatCard label="Net paid YTD" value={money(paidYTD)} />
        <StatCard label="Claims to reimburse" value={money(db.expenses.filter((x) => x.status === "APPROVED").reduce((s, x) => s + x.amount, 0))} hint="in next run" />
      </div>
      <Tabs<Tab> value={tab} onChange={(t) => { setTab(t); setOpenRun(null); }} tabs={[{ value: "runs", label: "Payroll Runs" }, { value: "salary", label: "Salary Structures" }, { value: "tax", label: "Tax & Compliance" }]} />
      {tab === "runs" && (openRun ? <RunDetail runId={openRun} onBack={() => setOpenRun(null)} /> : <Runs onOpen={setOpenRun} />)}
      {tab === "salary" && <SalaryStructures />}
      {tab === "tax" && <TaxSummary />}
    </>
  );
}

function Runs({ onOpen }: { onOpen: (id: string) => void }) {
  const { db, generatePayroll } = useAuthed();
  const toast = useToast();
  const [show, setShow] = useState(false);
  const [month, setMonth] = useState(today().slice(0, 7));
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader title="Payroll runs" subtitle="Draft → Processed → Paid" action={<Button size="sm" icon={<Play className="w-3.5 h-3.5" />} onClick={() => { setError(null); setShow(true); }}>Run payroll</Button>} />
      <Table minWidth={720}>
        <thead><tr><Th>Month</Th><Th>Status</Th><Th>Headcount</Th><Th>Gross</Th><Th>Deductions</Th><Th>Net pay</Th><Th></Th></tr></thead>
        <tbody>
          {db.payrollRuns.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] cursor-pointer" onClick={() => onOpen(r.id)}>
              <Td className="font-medium text-black dark:text-white">{formatMonth(r.month)}</Td>
              <Td><StatusBadge status={r.status} /></Td>
              <Td>{r.lines.length}</Td>
              <Td className="tabular-nums">{money(sum(r.lines, "gross"))}</Td>
              <Td className="tabular-nums">{money(sum(r.lines, "totalDeductions"))}</Td>
              <Td className="tabular-nums font-semibold">{money(sum(r.lines, "net"))}</Td>
              <Td className="text-right"><Button size="sm" variant="ghost">Open →</Button></Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {!db.payrollRuns.length && <EmptyState icon={<Wallet className="w-10 h-10" />} title="No payroll runs yet" />}

      <Modal
        open={show}
        onClose={() => setShow(false)}
        title="Run payroll"
        subtitle="Creates a draft computed from salary structures, attendance (LOP), unpaid leave and approved expense claims."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShow(false)}>Cancel</Button>
            <Button
              onClick={() => {
                const res = generatePayroll(month);
                if (!res.ok) return setError(res.error);
                toast(`Draft payroll generated for ${formatMonth(month)}.`);
                setShow(false);
                if (res.data) onOpen(res.data.id);
              }}
            >
              Generate draft
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Pay period"><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></Field>
          <FormError message={error} />
        </div>
      </Modal>
    </Card>
  );
}

function RunDetail({ runId, onBack }: { runId: string; onBack: () => void }) {
  const { db, recalcPayroll, setPayrollStatus, deletePayrollRun } = useAuthed();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [slip, setSlip] = useState<PayrollLine | null>(null);
  const [confirm, setConfirm] = useState<"paid" | "delete" | null>(null);
  const run = db.payrollRuns.find((r) => r.id === runId);
  if (!run) return <Card><EmptyState title="Run not found" action={<Button onClick={onBack}>Back</Button>} /></Card>;
  const lines = run.lines.filter((l) => fullName(db.employees.find((e) => e.id === l.employeeId)).toLowerCase().includes(q.toLowerCase()));

  const exportCSV = () =>
    downloadText(
      `payroll-${run.month}.csv`,
      toCSV([
        ["Employee", "Code", "Basic", "HRA", "Allowances", "Reimbursements", "Gross", "PF", "PT", "TDS", "LOP days", "LOP", "Other", "Total deductions", "Net"],
        ...run.lines.map((l) => {
          const e = db.employees.find((x) => x.id === l.employeeId);
          return [fullName(e), e?.code ?? "", l.basic, l.hra, l.allowances, l.reimbursements, l.gross, l.pf, l.professionalTax, l.incomeTax, l.lopDays, l.lopDeduction, l.otherDeductions, l.totalDeductions, l.net];
        }),
      ]),
      "text/csv",
    );

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />} onClick={onBack}>All runs</Button>
        <h2 className="text-lg font-semibold">{formatMonth(run.month)}</h2>
        <StatusBadge status={run.status} />
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={exportCSV}>CSV</Button>
          {run.status === "DRAFT" && (
            <>
              <Button variant="secondary" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={() => { recalcPayroll(run.id); toast("Recalculated from current salary structures."); }}>Recalculate</Button>
              <Button variant="secondary" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => setConfirm("delete")}>Delete draft</Button>
              <Button size="sm" onClick={() => { setPayrollStatus(run.id, "PROCESSED"); toast("Payroll processed and locked."); }}>Process</Button>
            </>
          )}
          {run.status === "PROCESSED" && <Button variant="success" size="sm" icon={<CheckCircle2 className="w-3.5 h-3.5" />} onClick={() => setConfirm("paid")}>Mark as paid</Button>}
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Gross" value={money(sum(run.lines, "gross"))} />
        <StatCard label="Deductions" value={money(sum(run.lines, "totalDeductions"))} />
        <StatCard label="Net payout" value={money(sum(run.lines, "net"))} />
        <StatCard label="Reimbursements" value={money(sum(run.lines, "reimbursements"))} hint={`${run.expenseIds.length} claims`} />
      </div>
      <Card>
        <CardHeader title={`${run.lines.length} employees`} subtitle={run.paidAt ? `Paid ${formatDate(run.paidAt.slice(0, 10))}` : run.processedAt ? `Processed ${formatDate(run.processedAt.slice(0, 10))}` : "Draft — editable"} action={<SearchInput value={q} onChange={setQ} className="w-48" />} />
        <Table minWidth={900}>
          <thead><tr><Th>Employee</Th><Th>Fixed gross</Th><Th>Reimb.</Th><Th>LOP</Th><Th>PF</Th><Th>TDS</Th><Th>Deductions</Th><Th>Net</Th><Th></Th></tr></thead>
          <tbody>
            {lines.map((l) => {
              const e = db.employees.find((x) => x.id === l.employeeId);
              return (
                <tr key={l.employeeId} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <Td><div className="flex items-center gap-2"><Avatar employee={e} size="xs" /><span className="whitespace-nowrap">{fullName(e)}</span></div></Td>
                  <Td className="tabular-nums">{money(l.basic + l.hra + l.allowances)}</Td>
                  <Td className="tabular-nums">{l.reimbursements ? money(l.reimbursements) : "—"}</Td>
                  <Td className="tabular-nums">{l.lopDays ? <span className="text-red-600 dark:text-red-400">{l.lopDays}d · {money(l.lopDeduction)}</span> : "—"}</Td>
                  <Td className="tabular-nums">{money(l.pf)}</Td>
                  <Td className="tabular-nums">{money(l.incomeTax)}</Td>
                  <Td className="tabular-nums">{money(l.totalDeductions)}</Td>
                  <Td className="tabular-nums font-semibold text-black dark:text-white">{money(l.net)}</Td>
                  <Td className="text-right"><Button size="sm" variant="ghost" icon={<FileText className="w-3.5 h-3.5" />} onClick={() => setSlip(l)}>Payslip</Button></Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
      <PayslipModal db={db} run={run} line={slip} onClose={() => setSlip(null)} />
      <ConfirmDialog
        open={confirm === "paid"}
        onClose={() => setConfirm(null)}
        onConfirm={() => { setPayrollStatus(run.id, "PAID"); toast("Marked paid — payslips published to employees."); }}
        title="Mark payroll as paid?"
        message={`This publishes payslips to ${run.lines.length} employees and marks ${run.expenseIds.length} expense claim(s) as reimbursed.`}
        confirmLabel="Mark paid"
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onClose={() => setConfirm(null)}
        onConfirm={() => { deletePayrollRun(run.id); toast("Draft deleted.", "info"); onBack(); }}
        title="Delete draft run?"
        message="The draft will be removed. You can regenerate it at any time."
        confirmLabel="Delete"
        danger
      />
    </>
  );
}

function SalaryStructures() {
  const { db, updateSalary } = useAuthed();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<SalaryStructure | null>(null);
  const editing = db.employees.find((e) => e.id === editId);
  const preview = useMemo(() => (editing && form ? computePayrollLine({ ...editing, salary: form }) : null), [editing, form]);
  const emps = db.employees.filter((e) => e.status !== "TERMINATED" && fullName(e).toLowerCase().includes(q.toLowerCase()));

  const num = (k: keyof SalaryStructure) => (e: React.ChangeEvent<HTMLInputElement>) => form && setForm({ ...form, [k]: Math.max(0, Number(e.target.value) || 0) });

  return (
    <Card>
      <CardHeader title="Salary structures" subtitle="Monthly components. Deductions & tax are computed automatically." action={<SearchInput value={q} onChange={setQ} className="w-48" />} />
      <Table minWidth={860}>
        <thead><tr><Th>Employee</Th><Th>Basic</Th><Th>HRA</Th><Th>Allowances</Th><Th>Gross / month</Th><Th>Est. net</Th><Th>Annual CTC</Th><Th></Th></tr></thead>
        <tbody>
          {emps.map((e) => {
            const g = e.salary.basic + e.salary.hra + e.salary.allowances;
            const line = computePayrollLine(e);
            return (
              <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                <Td><div className="flex items-center gap-2"><Avatar employee={e} size="xs" /><div className="min-w-0"><p className="whitespace-nowrap">{fullName(e)}</p><p className="text-xs text-gray-400">{e.designation}</p></div></div></Td>
                <Td className="tabular-nums">{money(e.salary.basic)}</Td>
                <Td className="tabular-nums">{money(e.salary.hra)}</Td>
                <Td className="tabular-nums">{money(e.salary.allowances)}</Td>
                <Td className="tabular-nums font-medium">{money(g)}</Td>
                <Td className="tabular-nums">{money(line.net)}</Td>
                <Td className="tabular-nums">{money(g * 12)}</Td>
                <Td className="text-right"><Button size="sm" variant="ghost" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => { setEditId(e.id); setForm({ ...e.salary }); }}>Edit</Button></Td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      <Modal
        open={!!editing && !!form}
        onClose={() => setEditId(null)}
        title={`Salary structure · ${fullName(editing)}`}
        subtitle={editing?.designation}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditId(null)}>Cancel</Button>
            <Button onClick={() => { if (editing && form) { updateSalary(editing.id, form); toast("Salary structure updated."); setEditId(null); } }}>Save structure</Button>
          </>
        }
      >
        {form && preview && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <Field label="Basic (monthly)"><Input type="number" value={form.basic} onChange={num("basic")} /></Field>
              <Field label="House Rent Allowance"><Input type="number" value={form.hra} onChange={num("hra")} /></Field>
              <Field label="Special allowances"><Input type="number" value={form.allowances} onChange={num("allowances")} /></Field>
              <Field label="Other fixed deductions"><Input type="number" value={form.otherDeductions} onChange={num("otherDeductions")} /></Field>
              <Field label="Effective from"><Input type="date" value={form.effectiveDate} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} /></Field>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 p-4 text-sm flex flex-col gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-white/50 mb-1">Live monthly preview</p>
              {[
                ["Gross", preview.gross],
                ["Provident Fund", -preview.pf],
                ["Professional Tax", -preview.professionalTax],
                ["Income Tax (TDS)", -preview.incomeTax],
                ["Other deductions", -preview.otherDeductions],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between"><span className="text-gray-500 dark:text-white/50">{k}</span><span className="tabular-nums">{money(v as number)}</span></div>
              ))}
              <div className="flex justify-between border-t border-gray-200 dark:border-white/10 pt-2 mt-1 font-semibold"><span>Net pay</span><span className="tabular-nums">{money(preview.net)}</span></div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-white/50 mt-2"><span>Annual CTC</span><span>{money(preview.gross * 12)}</span></div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-white/50"><span>Annual tax</span><span>{money(preview.incomeTax * 12)}</span></div>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}

function TaxSummary() {
  const { db } = useAuthed();
  const run: PayrollRun | undefined = db.payrollRuns.find((r) => r.status !== "DRAFT") ?? db.payrollRuns[0];
  const slabs = [
    ["Up to ₹3,00,000", "Nil"],
    ["₹3,00,001 – ₹7,00,000", "5%"],
    ["₹7,00,001 – ₹10,00,000", "10%"],
    ["₹10,00,001 – ₹12,00,000", "15%"],
    ["₹12,00,001 – ₹15,00,000", "20%"],
    ["Above ₹15,00,000", "30%"],
  ];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 flex flex-col gap-6">
        {run ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Provident Fund" value={money(sum(run.lines, "pf") * 2)} hint="employee + employer" />
              <StatCard label="Professional Tax" value={money(sum(run.lines, "professionalTax"))} />
              <StatCard label="TDS deposited" value={money(sum(run.lines, "incomeTax"))} />
            </div>
            <Card>
              <CardHeader title={`Statutory deductions · ${formatMonth(run.month)}`} subtitle={`Run status: ${run.status.toLowerCase()}`} />
              <Table minWidth={560}>
                <thead><tr><Th>Employee</Th><Th>PF (12%)</Th><Th>Prof. tax</Th><Th>TDS</Th><Th>Annual tax est.</Th></tr></thead>
                <tbody>
                  {run.lines.map((l) => (
                    <tr key={l.employeeId}>
                      <Td>{fullName(db.employees.find((e) => e.id === l.employeeId))}</Td>
                      <Td className="tabular-nums">{money(l.pf)}</Td>
                      <Td className="tabular-nums">{money(l.professionalTax)}</Td>
                      <Td className="tabular-nums">{money(l.incomeTax)}</Td>
                      <Td className="tabular-nums">{money(l.incomeTax * 12)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          </>
        ) : (
          <Card><EmptyState title="No payroll runs yet" description="Run payroll to see statutory deductions." /></Card>
        )}
      </div>
      <Card className="p-5 flex flex-col gap-3 h-fit">
        <h3 className="text-sm font-semibold">How tax is computed</h3>
        <p className="text-xs text-gray-500 dark:text-white/50">New-regime style slabs on annual taxable income (fixed gross × 12 − ₹75,000 standard deduction). Full rebate up to ₹7,00,000; 4% health & education cess applied.</p>
        <div className="flex flex-col divide-y divide-gray-100 dark:divide-white/5 text-sm">
          {slabs.map(([k, v]) => (
            <div key={k} className="flex justify-between py-2"><span className="text-gray-600 dark:text-white/70">{k}</span><span className="font-medium">{v}</span></div>
          ))}
        </div>
        <ul className="text-xs text-gray-500 dark:text-white/50 list-disc pl-4 flex flex-col gap-1">
          <li>PF: 12% of basic, capped at ₹15,000 basic.</li>
          <li>Professional tax: ₹200/month when gross exceeds ₹15,000.</li>
          <li>Loss of pay: (fixed gross ÷ working days) × absent days.</li>
        </ul>
      </Card>
    </div>
  );
}
