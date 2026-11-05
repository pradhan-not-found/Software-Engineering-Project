"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { useAuthed } from "@/lib/store";
import type { PayrollLine, PayrollRun } from "@/lib/types";
import { Button, Card, CardHeader, EmptyState, PageHeader, StatCard, StatusBadge, Table, Td, Th } from "@/components/ui";
import { PayslipModal } from "@/components/Payslip";
import { computePayrollLine, formatDate, formatMonth, money } from "@/lib/utils";

export default function PayslipsPage() {
  const { db, user } = useAuthed();
  const [selected, setSelected] = useState<{ run: PayrollRun; line: PayrollLine } | null>(null);

  const slips = db.payrollRuns
    .filter((r) => r.status !== "DRAFT")
    .map((run) => ({ run, line: run.lines.find((l) => l.employeeId === user.id) }))
    .filter((x): x is { run: PayrollRun; line: PayrollLine } => !!x.line)
    .sort((a, b) => b.run.month.localeCompare(a.run.month));

  const year = String(new Date().getFullYear());
  const ytd = slips.filter((s) => s.run.month.startsWith(year));
  const sum = (k: keyof PayrollLine) => ytd.reduce((s, x) => s + (x.line[k] as number), 0);

  const projection = computePayrollLine(user);
  const s = user.salary;
  const ctc = (s.basic + s.hra + s.allowances) * 12;

  return (
    <>
      <PageHeader title="Payslips" subtitle="Your monthly payslips, tax deductions and salary structure." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={`YTD gross (${year})`} value={money(sum("gross"))} hint={`${ytd.length} payslip(s)`} />
        <StatCard label="YTD net pay" value={money(sum("net"))} hintTone="good" />
        <StatCard label="YTD income tax" value={money(sum("incomeTax"))} />
        <StatCard label="YTD provident fund" value={money(sum("pf"))} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader title="Payslip history" />
          {slips.length === 0 ? (
            <EmptyState icon={<FileText className="w-10 h-10" />} title="No payslips yet" description="Payslips appear here once payroll is processed." />
          ) : (
            <Table minWidth={560}>
              <thead>
                <tr><Th>Month</Th><Th>Gross</Th><Th>Deductions</Th><Th>Net pay</Th><Th>Status</Th><Th> </Th></tr>
              </thead>
              <tbody>
                {slips.map(({ run, line }) => (
                  <tr key={run.id}>
                    <Td className="font-medium text-black dark:text-white">
                      {formatMonth(run.month)}
                      {run.paidAt && <p className="text-xs text-gray-500 dark:text-white/40 font-normal">Paid {formatDate(run.paidAt.slice(0, 10))}</p>}
                    </Td>
                    <Td className="tabular-nums">{money(line.gross)}</Td>
                    <Td className="tabular-nums text-red-600 dark:text-red-400">−{money(line.totalDeductions)}</Td>
                    <Td className="tabular-nums font-semibold">{money(line.net)}</Td>
                    <Td><StatusBadge status={run.status} /></Td>
                    <Td className="text-right"><Button size="sm" variant="secondary" onClick={() => setSelected({ run, line })}>View</Button></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader title="Salary structure" subtitle={`Effective ${formatDate(s.effectiveDate)} · CTC ${money(ctc)}/yr`} />
          <div className="px-5 pb-5 text-sm flex flex-col gap-1.5">
            {[
              ["Basic", s.basic],
              ["HRA", s.hra],
              ["Allowances", s.allowances],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between"><span className="text-gray-500 dark:text-white/50">{k}</span><span className="tabular-nums">{money(v as number)}</span></div>
            ))}
            <div className="flex justify-between font-semibold border-t border-gray-100 dark:border-white/10 pt-2 mt-1"><span>Monthly gross</span><span className="tabular-nums">{money(s.basic + s.hra + s.allowances)}</span></div>
            <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-white/40 font-semibold mt-4 mb-1">Projected deductions</p>
            {[
              ["Provident Fund", projection.pf],
              ["Professional Tax", projection.professionalTax],
              ["Income Tax (TDS)", projection.incomeTax],
              ["Other", projection.otherDeductions],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between"><span className="text-gray-500 dark:text-white/50">{k}</span><span className="tabular-nums text-red-600 dark:text-red-400">−{money(v as number)}</span></div>
            ))}
            <div className="flex justify-between items-center bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2 mt-3">
              <span className="font-semibold">Est. take-home</span>
              <span className="text-lg font-bold tabular-nums">{money(projection.net)}</span>
            </div>
          </div>
        </Card>
      </div>

      <PayslipModal db={db} run={selected?.run ?? null} line={selected?.line ?? null} onClose={() => setSelected(null)} />
    </>
  );
}
