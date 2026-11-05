"use client";

import Image from "next/image";
import { Download, Printer } from "lucide-react";
import type { DB, PayrollLine, PayrollRun } from "@/lib/types";
import { downloadText, formatDate, formatMonth, fullName, money } from "@/lib/utils";
import { Button, Modal } from "@/components/ui";

/** Printable payslip for one employee in one payroll run. */
export function PayslipView({ db, run, line }: { db: DB; run: PayrollRun; line: PayrollLine }) {
  const e = db.employees.find((x) => x.id === line.employeeId);
  const dept = db.departments.find((d) => d.id === e?.departmentId);
  const earnings: [string, number][] = [
    ["Basic Salary", line.basic],
    ["House Rent Allowance", line.hra],
    ["Special Allowances", line.allowances],
    ["Reimbursements", line.reimbursements],
  ];
  const deductions: [string, number][] = [
    ["Provident Fund (12%)", line.pf],
    ["Professional Tax", line.professionalTax],
    ["Income Tax (TDS)", line.incomeTax],
    [`Loss of Pay (${line.lopDays} day${line.lopDays === 1 ? "" : "s"})`, line.lopDeduction],
    ["Other Deductions", line.otherDeductions],
  ];
  return (
    <div id="payslip" className="bg-white text-black rounded-xl border border-gray-200 p-6 text-sm">
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <Image src="/logo.png" alt="Workplace" width={120} height={28} className="w-[110px] h-auto brightness-0" />
          <p className="text-xs text-gray-500 mt-2">{db.org.name}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Payslip</p>
          <p className="text-lg font-semibold">{formatMonth(run.month)}</p>
          <p className="text-xs text-gray-500">Status: {run.status}{run.paidAt ? ` · Paid ${formatDate(run.paidAt.slice(0, 10))}` : ""}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 py-4 border-b border-gray-200 text-xs">
        <Row k="Employee" v={fullName(e)} />
        <Row k="Employee Code" v={e?.code ?? "—"} />
        <Row k="Designation" v={e?.designation ?? "—"} />
        <Row k="Department" v={dept?.name ?? "—"} />
        <Row k="Bank Account" v={e?.bankAccount || "—"} />
        <Row k="PAN" v={e?.pan || "—"} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Earnings</p>
          {earnings.map(([k, v]) => (
            <Row key={k} k={k} v={money(v)} />
          ))}
          <div className="border-t border-gray-200 mt-2 pt-2 font-semibold">
            <Row k="Gross Earnings" v={money(line.gross)} />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Deductions</p>
          {deductions.map(([k, v]) => (
            <Row key={k} k={k} v={money(v)} />
          ))}
          <div className="border-t border-gray-200 mt-2 pt-2 font-semibold">
            <Row k="Total Deductions" v={money(line.totalDeductions)} />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
        <span className="font-semibold">Net Pay</span>
        <span className="text-xl font-bold">{money(line.net)}</span>
      </div>
      <p className="text-[10px] text-gray-400 mt-4">This is a system-generated payslip and does not require a signature.</p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 py-0.5">
      <span className="text-gray-500">{k}</span>
      <span className="font-medium text-right">{v}</span>
    </div>
  );
}

export function payslipText(db: DB, run: PayrollRun, line: PayrollLine) {
  const e = db.employees.find((x) => x.id === line.employeeId);
  return [
    `${db.org.name} — Payslip for ${formatMonth(run.month)}`,
    `Employee: ${fullName(e)} (${e?.code})`,
    `Designation: ${e?.designation}`,
    "",
    `Basic: ${line.basic}`,
    `HRA: ${line.hra}`,
    `Allowances: ${line.allowances}`,
    `Reimbursements: ${line.reimbursements}`,
    `Gross: ${line.gross}`,
    "",
    `PF: ${line.pf}`,
    `Professional Tax: ${line.professionalTax}`,
    `Income Tax: ${line.incomeTax}`,
    `Loss of Pay (${line.lopDays} days): ${line.lopDeduction}`,
    `Other Deductions: ${line.otherDeductions}`,
    `Total Deductions: ${line.totalDeductions}`,
    "",
    `NET PAY: ${line.net}`,
  ].join("\n");
}

/** Modal wrapper with print & download actions. */
export function PayslipModal({ db, run, line, onClose }: { db: DB; run: PayrollRun | null; line: PayrollLine | null; onClose: () => void }) {
  if (!run || !line) return null;
  const e = db.employees.find((x) => x.id === line.employeeId);
  const print = () => {
    const el = document.getElementById("payslip");
    if (!el) return;
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map((n) => n.outerHTML).join("");
    w.document.write(`<html><head><title>Payslip</title>${styles}</head><body style="background:white;padding:24px">${el.outerHTML}</body></html>`);
    w.document.close();
    w.onload = () => w.print();
  };
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Payslip · ${fullName(e)}`}
      subtitle={formatMonth(run.month)}
      footer={
        <>
          <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={() => downloadText(`payslip-${e?.code}-${run.month}.txt`, payslipText(db, run, line))}>
            Download
          </Button>
          <Button icon={<Printer className="w-4 h-4" />} onClick={print}>
            Print / Save PDF
          </Button>
        </>
      }
    >
      <PayslipView db={db} run={run} line={line} />
    </Modal>
  );
}
