"use client";

import { useState } from "react";
import { CalendarDays, KeyRound, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useAuthed } from "@/lib/store";
import type { Holiday } from "@/lib/types";
import {
  Badge, Button, Card, CardHeader, ConfirmDialog, Field, FormError, Input, Modal, PageHeader, Select, Table, Td, Th,
  useToast,
} from "@/components/ui";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/seed";
import { COLOR_CLASSES, formatDate, fullName, today } from "@/lib/utils";

export default function SettingsPage() {
  const { db, updateOrg, addHoliday, removeHoliday, resetDemo } = useAuthed();
  const toast = useToast();
  const [orgName, setOrgName] = useState(db.org.name);
  const [deptOpen, setDeptOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [hol, setHol] = useState<{ date: string; name: string; type: Holiday["type"] }>({ date: today(), name: "", type: "Company" });

  const year = new Date().getFullYear();
  const holidays = db.holidays.filter((h) => h.date.startsWith(String(year)));

  return (
    <>
      <PageHeader title="Organization Settings" subtitle="Workspace profile, departments, holiday calendar and demo controls." />

      <Card>
        <CardHeader title="Workspace" subtitle="Shown on payslips, emails and the sidebar." />
        <div className="flex flex-col sm:flex-row gap-3 px-5 pb-5 sm:items-end">
          <Field label="Organization name" className="flex-1"><Input value={orgName} onChange={(e) => setOrgName(e.target.value)} /></Field>
          <Field label="Currency" className="sm:w-32"><Input value={db.org.currency} disabled /></Field>
          <Button
            disabled={!orgName.trim() || orgName === db.org.name}
            onClick={() => { updateOrg({ name: orgName.trim() }); toast("Organization name updated."); }}
          >
            Save
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title={`Departments (${db.departments.length})`} action={<Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setDeptOpen(true)}>Add department</Button>} />
        <Table minWidth={560}>
          <thead><tr><Th>Department</Th><Th>Code</Th><Th>Head</Th><Th className="text-right">Headcount</Th></tr></thead>
          <tbody>
            {db.departments.map((d) => {
              const head = db.employees.find((e) => e.id === d.headId);
              const n = db.employees.filter((e) => e.departmentId === d.id && e.status !== "TERMINATED").length;
              return (
                <tr key={d.id}>
                  <Td><span className="flex items-center gap-2 font-medium text-black dark:text-white"><span className={`w-2.5 h-2.5 rounded-full ${COLOR_CLASSES[d.color]?.dot ?? "bg-gray-500"}`} />{d.name}</span></Td>
                  <Td><Badge color={d.color}>{d.code}</Badge></Td>
                  <Td>{head ? fullName(head) : "—"}</Td>
                  <Td className="text-right tabular-nums">{n}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title={`Holiday calendar ${year}`} subtitle="Holidays are excluded from leave day counts and payroll working days." />
        <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr_140px_auto] gap-2 px-5 pb-4">
          <Input type="date" value={hol.date} onChange={(e) => setHol({ ...hol, date: e.target.value })} />
          <Input value={hol.name} onChange={(e) => setHol({ ...hol, name: e.target.value })} placeholder="Holiday name" />
          <Select value={hol.type} onChange={(e) => setHol({ ...hol, type: e.target.value as Holiday["type"] })}>
            {["National", "Regional", "Company"].map((t) => <option key={t}>{t}</option>)}
          </Select>
          <Button
            icon={<CalendarDays className="w-4 h-4" />}
            onClick={() => {
              if (!hol.name.trim() || !hol.date) return toast("Enter a date and name.", "error");
              if (db.holidays.some((h) => h.date === hol.date)) return toast("A holiday already exists on that date.", "error");
              addHoliday(hol.date, hol.name.trim(), hol.type);
              setHol({ ...hol, name: "" });
              toast(`${hol.name} added — everyone has been notified.`);
            }}
          >
            Add
          </Button>
        </div>
        <Table minWidth={480}>
          <thead><tr><Th>Date</Th><Th>Holiday</Th><Th>Type</Th><Th className="text-right" /></tr></thead>
          <tbody>
            {holidays.map((h) => (
              <tr key={h.id} className={h.date < today() ? "opacity-50" : ""}>
                <Td className="whitespace-nowrap">{formatDate(h.date)}</Td>
                <Td className="font-medium text-black dark:text-white">{h.name}</Td>
                <Td><Badge color={h.type === "National" ? "blue" : h.type === "Regional" ? "teal" : "purple"}>{h.type}</Badge></Td>
                <Td className="text-right">
                  <Button size="sm" variant="ghost" aria-label="Remove holiday" onClick={() => { removeHoliday(h.id); toast(`${h.name} removed.`); }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <CardHeader title="Demo accounts" subtitle={`All demo users sign in with password “${DEMO_PASSWORD}”.`} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-5 pb-5">
          {DEMO_ACCOUNTS.map((a) => (
            <div key={a.email} className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-white/10 px-4 py-3">
              <KeyRound className="w-4 h-4 text-gray-400" />
              <div className="min-w-0">
                <p className="text-sm font-medium">{a.label} <span className="text-gray-400 font-normal">· {a.description}</span></p>
                <p className="text-xs font-mono text-gray-500 dark:text-white/50 truncate">{a.email}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-red-200 dark:border-red-500/20">
        <CardHeader title="Danger zone" subtitle="Data lives in this browser's localStorage until the backend is connected." />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 pb-5">
          <p className="text-sm text-gray-600 dark:text-white/60">Reset all data back to the seeded demo organization.</p>
          <Button variant="danger" icon={<RotateCcw className="w-4 h-4" />} onClick={() => setConfirmReset(true)}>Reset demo data</Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset demo data?"
        message="Every change made in this browser will be discarded."
        confirmLabel="Reset"
        danger
        onConfirm={() => { resetDemo(); setOrgName("Workplace Technologies"); toast("Demo data restored.", "info"); }}
      />
      {deptOpen && <DepartmentModal onClose={() => setDeptOpen(false)} />}
    </>
  );
}

function DepartmentModal({ onClose }: { onClose: () => void }) {
  const { db, addDepartment } = useAuthed();
  const toast = useToast();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [color, setColor] = useState("blue");
  const [headId, setHeadId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const save = () => {
    if (!name.trim() || !code.trim()) return setError("Name and code are required.");
    const r = addDepartment(name.trim(), code.trim(), color, headId || null);
    if (!r.ok) return setError(r.error);
    toast(`${name} department created.`);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="Add department" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Create</Button></>}>
      <div className="flex flex-col gap-4">
        <FormError message={error} />
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer Success" /></Field>
        <Field label="Code"><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={5} placeholder="CS" /></Field>
        <Field label="Department head">
          <Select value={headId} onChange={(e) => setHeadId(e.target.value)}>
            <option value="">— None —</option>
            {db.employees.filter((e) => e.status !== "TERMINATED").map((e) => <option key={e.id} value={e.id}>{fullName(e)}</option>)}
          </Select>
        </Field>
        <Field label="Color">
          <div className="flex flex-wrap gap-2">
            {Object.keys(COLOR_CLASSES).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full ${COLOR_CLASSES[c].dot} ${color === c ? "ring-2 ring-offset-2 ring-black dark:ring-white dark:ring-offset-black" : ""}`}
                aria-label={c}
              />
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}
