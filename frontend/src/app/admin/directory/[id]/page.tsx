"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft, CheckCircle2, FileText, Mail, MapPin, Pencil, Phone, Plus, Trash2, UserMinus, UserCheck, AlertTriangle,
} from "lucide-react";
import { useAuthed } from "@/lib/store";
import type { Asset, Employee, EmployeeDocument, EmployeeStatus, Role, SalaryStructure } from "@/lib/types";
import {
  Avatar, Badge, Button, Card, CardHeader, EmptyState, Field, FormError, Input, Modal, ProgressBar, Select, StatusBadge,
  Table, Tabs, Td, Th, useToast,
} from "@/components/ui";
import PerformanceMetrics from "@/components/PerformanceMetrics";
import OffboardModal from "@/components/org/OffboardModal";
import {
  addDays, computePayrollLine, formatDate, fullName, getDirectReports, getManagerChain, isOverdue, LEAVE_TYPES,
  leaveBalances, money, openTasksFor, ROLE_LABEL, today,
} from "@/lib/utils";

type Tab = "overview" | "job" | "documents" | "assets" | "comp" | "leave" | "work";

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { db, completeOnboarding } = useAuthed();
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [offOpen, setOffOpen] = useState(false);
  const e = db.employees.find((x) => x.id === id);

  if (!e) {
    return (
      <Card>
        <EmptyState title="Employee not found" description="This record may have been removed." action={<Button onClick={() => router.push("/admin/directory")}>Back to directory</Button>} />
      </Card>
    );
  }
  const dept = db.departments.find((d) => d.id === e.departmentId);

  return (
    <>
      <Link href="/admin/directory" className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-white/50 hover:text-black dark:hover:text-white w-fit">
        <ArrowLeft className="w-4 h-4" /> Directory
      </Link>

      <Card className="p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <Avatar employee={e} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{fullName(e)}</h1>
              <StatusBadge status={e.status} />
              {e.accountStatus === "SUSPENDED" && <StatusBadge status="SUSPENDED" label="Account suspended" />}
            </div>
            <p className="text-sm text-gray-500 dark:text-white/50 mt-0.5">
              {e.designation} · {dept?.name} · {e.code}
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm text-gray-600 dark:text-white/70">
              <a href={`mailto:${e.email}`} className="flex items-center gap-1.5 hover:underline"><Mail className="w-4 h-4" />{e.email}</a>
              {e.phone && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" />{e.phone}</span>}
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{e.location || "—"} · {e.workMode}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={<Pencil className="w-4 h-4" />} onClick={() => setEditOpen(true)}>Edit</Button>
            {e.status === "ONBOARDING" && (
              <Button
                variant="success"
                icon={<UserCheck className="w-4 h-4" />}
                onClick={() => {
                  const r = completeOnboarding(e.id);
                  r.ok ? toast(`${fullName(e)} is now active.`) : toast(r.error, "error");
                }}
              >
                Complete onboarding
              </Button>
            )}
            {(e.status === "ACTIVE" || e.status === "ON_LEAVE" || e.status === "ONBOARDING") && (
              <Button variant="danger" icon={<UserMinus className="w-4 h-4" />} onClick={() => setOffOpen(true)}>Offboard</Button>
            )}
            {e.status === "OFFBOARDING" && (
              <Button variant="secondary" onClick={() => router.push("/admin/onboarding?tab=offboarding")}>View exit checklist</Button>
            )}
          </div>
        </div>
      </Card>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "overview", label: "Overview" },
          { value: "job", label: "Job & Org" },
          { value: "documents", label: `Documents (${e.documents.length})` },
          { value: "assets", label: `Assets (${e.assets.filter((a) => !a.returned).length})` },
          { value: "comp", label: "Compensation" },
          { value: "leave", label: "Leave" },
          { value: "work", label: "Work & Performance" },
        ]}
      />

      {tab === "overview" && <Overview e={e} />}
      {tab === "job" && <JobTab e={e} onEdit={() => setEditOpen(true)} />}
      {tab === "documents" && <DocumentsTab e={e} />}
      {tab === "assets" && <AssetsTab e={e} />}
      {tab === "comp" && <CompTab e={e} />}
      {tab === "leave" && <LeaveTab e={e} />}
      {tab === "work" && <WorkTab e={e} />}

      {editOpen && <EditModal e={e} onClose={() => setEditOpen(false)} />}
      <OffboardModal open={offOpen} onClose={() => setOffOpen(false)} employeeId={e.id} />
    </>
  );
}

function InfoGrid({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 px-5 pb-5">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs text-gray-500 dark:text-white/40">{k}</dt>
          <dd className="text-sm text-black dark:text-white mt-0.5">{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function PersonRow({ e, sub }: { e: Employee; sub?: string }) {
  return (
    <Link href={`/admin/directory/${e.id}`} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5">
      <Avatar employee={e} size="sm" />
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{fullName(e)}</p>
        <p className="text-xs text-gray-500 dark:text-white/40 truncate">{sub ?? e.designation}</p>
      </div>
    </Link>
  );
}

function Overview({ e }: { e: Employee }) {
  const { db } = useAuthed();
  const chain = getManagerChain(db.employees, e.id);
  const reports = getDirectReports(db.employees, e.id);
  const buddy = db.employees.find((x) => x.id === e.buddyId);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 flex flex-col gap-6">
        <Card>
          <CardHeader title="Personal information" />
          <InfoGrid
            items={[
              ["Full name", fullName(e)],
              ["Gender", e.gender],
              ["Date of birth", e.dob ? formatDate(e.dob) : "—"],
              ["Phone", e.phone],
              ["Address", e.address],
              ["Email", e.email],
            ]}
          />
        </Card>
        <Card>
          <CardHeader title="Emergency contact" />
          <InfoGrid
            items={[
              ["Name", e.emergencyContact.name],
              ["Relation", e.emergencyContact.relation],
              ["Phone", e.emergencyContact.phone],
            ]}
          />
        </Card>
        <Card>
          <CardHeader title="Skills & certifications" />
          <div className="px-5 pb-5 flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              {e.skills.length ? e.skills.map((s) => <Badge key={s} color="blue">{s}</Badge>) : <span className="text-sm text-gray-400">No skills recorded</span>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {e.certifications.map((c) => <Badge key={c} color="purple">{c}</Badge>)}
            </div>
          </div>
        </Card>
      </div>
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader title="Reporting chain" subtitle="Task permissions inherit from this line" />
          <div className="px-2 pb-3">
            {chain.length === 0 && <p className="px-3 pb-2 text-sm text-gray-400">Top of organization</p>}
            {chain.map((m) => <PersonRow key={m.id} e={m} />)}
          </div>
        </Card>
        <Card>
          <CardHeader title={`Direct reports (${reports.length})`} />
          <div className="px-2 pb-3">
            {reports.length === 0 && <p className="px-3 pb-2 text-sm text-gray-400">No direct reports</p>}
            {reports.map((r) => <PersonRow key={r.id} e={r} />)}
          </div>
        </Card>
        {buddy && (
          <Card>
            <CardHeader title="Onboarding buddy" />
            <div className="px-2 pb-3"><PersonRow e={buddy} /></div>
          </Card>
        )}
      </div>
    </div>
  );
}

function JobTab({ e, onEdit }: { e: Employee; onEdit: () => void }) {
  const { db } = useAuthed();
  const mgr = db.employees.find((x) => x.id === e.managerId);
  const dept = db.departments.find((d) => d.id === e.departmentId);
  return (
    <Card>
      <CardHeader title="Employment details" action={<Button size="sm" variant="secondary" onClick={onEdit}>Edit</Button>} />
      <InfoGrid
        items={[
          ["Employee code", e.code],
          ["Designation", e.designation],
          ["Department", dept?.name],
          ["Reporting manager", mgr ? fullName(mgr) : "—"],
          ["Access role", ROLE_LABEL[e.role]],
          ["Employment status", <StatusBadge key="s" status={e.status} />],
          ["Joining date", formatDate(e.joiningDate)],
          ["Work mode", e.workMode],
          ["Location", e.location],
          ["Shift", e.shift],
          ["Account", e.accountStatus],
          ["Bank account", e.bankAccount],
        ]}
      />
      {e.offboarding && (
        <div className="mx-5 mb-5 rounded-xl border border-orange-200 dark:border-orange-500/20 bg-orange-50 dark:bg-orange-500/10 p-4 text-sm">
          <p className="font-medium text-orange-700 dark:text-orange-400">Offboarding · last working day {formatDate(e.offboarding.lastWorkingDay)}</p>
          <p className="text-orange-700/80 dark:text-orange-400/80 mt-1">{e.offboarding.reason}</p>
          <p className="text-xs mt-1 text-orange-700/70 dark:text-orange-400/70">
            Checklist {e.offboarding.checklist.filter((c) => c.done).length}/{e.offboarding.checklist.length} ·
            Settlement {e.offboarding.settlementStatus === "PROCESSED" ? money(e.offboarding.settlementAmount) : "pending"}
          </p>
        </div>
      )}
    </Card>
  );
}

function EditModal({ e, onClose }: { e: Employee; onClose: () => void }) {
  const { db, updateEmployee, setRole } = useAuthed();
  const toast = useToast();
  const [f, setF] = useState({
    firstName: e.firstName, lastName: e.lastName, email: e.email, phone: e.phone, designation: e.designation,
    departmentId: e.departmentId, managerId: e.managerId ?? "", role: e.role, workMode: e.workMode, location: e.location,
    shift: e.shift, status: e.status, address: e.address,
  });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const save = () => {
    if (!f.firstName.trim() || !f.lastName.trim()) return setError("Name is required.");
    if (f.role !== e.role) {
      const r = setRole(e.id, f.role);
      if (!r.ok) return setError(r.error);
    }
    const res = updateEmployee(e.id, {
      firstName: f.firstName.trim(), lastName: f.lastName.trim(), email: f.email.trim(), phone: f.phone,
      designation: f.designation, departmentId: f.departmentId, managerId: f.managerId || null,
      workMode: f.workMode, location: f.location, shift: f.shift, status: f.status, address: f.address,
    });
    if (!res.ok) return setError(res.error);
    toast("Employee updated.");
    onClose();
  };
  return (
    <Modal open onClose={onClose} size="lg" title={`Edit ${fullName(e)}`} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Save changes</Button></>}>
      <div className="flex flex-col gap-4">
        <FormError message={error} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="First name"><Input value={f.firstName} onChange={(x) => set("firstName", x.target.value)} /></Field>
          <Field label="Last name"><Input value={f.lastName} onChange={(x) => set("lastName", x.target.value)} /></Field>
          <Field label="Email"><Input value={f.email} onChange={(x) => set("email", x.target.value)} /></Field>
          <Field label="Phone"><Input value={f.phone} onChange={(x) => set("phone", x.target.value)} /></Field>
          <Field label="Designation"><Input value={f.designation} onChange={(x) => set("designation", x.target.value)} /></Field>
          <Field label="Department">
            <Select value={f.departmentId} onChange={(x) => set("departmentId", x.target.value)}>
              {db.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Reporting manager" hint="Changing this re-inherits task permissions.">
            <Select value={f.managerId} onChange={(x) => set("managerId", x.target.value)}>
              <option value="">— None —</option>
              {db.employees.filter((m) => m.id !== e.id && m.status !== "TERMINATED").map((m) => <option key={m.id} value={m.id}>{fullName(m)}</option>)}
            </Select>
          </Field>
          <Field label="Access role">
            <Select value={f.role} onChange={(x) => set("role", x.target.value)}>
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </Select>
          </Field>
          <Field label="Work mode">
            <Select value={f.workMode} onChange={(x) => set("workMode", x.target.value)}>
              {["Onsite", "Hybrid", "Remote"].map((m) => <option key={m}>{m}</option>)}
            </Select>
          </Field>
          <Field label="Location"><Input value={f.location} onChange={(x) => set("location", x.target.value)} /></Field>
          <Field label="Shift">
            <Select value={f.shift} onChange={(x) => set("shift", x.target.value)}>
              {Array.from(new Set(["General (09:00 – 18:00)", "Early (07:00 – 16:00)", "Late (12:00 – 21:00)", "Night (21:00 – 06:00)", f.shift])).map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Employment status">
            <Select value={f.status} onChange={(x) => set("status", x.target.value as EmployeeStatus)}>
              {["ACTIVE", "ONBOARDING", "ON_LEAVE", "OFFBOARDING", "TERMINATED"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </Select>
          </Field>
          <Field label="Address" className="sm:col-span-2"><Input value={f.address} onChange={(x) => set("address", x.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  );
}

const DOC_TYPES: EmployeeDocument["type"][] = ["Offer Letter", "ID Proof", "Address Proof", "Education", "Certification", "Contract", "Other"];

function DocumentsTab({ e }: { e: Employee }) {
  const { addDocument, verifyDocument, removeDocument } = useAuthed();
  const toast = useToast();
  const [type, setType] = useState<EmployeeDocument["type"]>("ID Proof");
  return (
    <Card>
      <CardHeader
        title="Documents"
        subtitle="Collected during onboarding and throughout employment"
        action={
          <div className="flex items-center gap-2">
            <Select value={type} onChange={(x) => setType(x.target.value as EmployeeDocument["type"])} className="w-36 py-1.5 text-xs">
              {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
            </Select>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black cursor-pointer whitespace-nowrap">
              <Plus className="w-3.5 h-3.5" /> Upload
              <input
                type="file"
                className="hidden"
                onChange={(x) => {
                  const file = x.target.files?.[0];
                  if (!file) return;
                  addDocument(e.id, { name: file.name, type });
                  toast(`Uploaded ${file.name}.`);
                  x.target.value = "";
                }}
              />
            </label>
          </div>
        }
      />
      {e.documents.length === 0 ? (
        <EmptyState icon={<FileText className="w-8 h-8" />} title="No documents yet" />
      ) : (
        <Table>
          <thead><tr><Th>Document</Th><Th>Type</Th><Th>Uploaded</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr></thead>
          <tbody>
            {e.documents.map((d) => (
              <tr key={d.id}>
                <Td><span className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" />{d.name}</span></Td>
                <Td>{d.type}</Td>
                <Td>{formatDate(d.uploadedAt)}</Td>
                <Td>{d.verified ? <Badge color="green">Verified</Badge> : <Badge color="amber">Pending</Badge>}</Td>
                <Td className="text-right whitespace-nowrap">
                  <Button size="sm" variant="ghost" onClick={() => verifyDocument(e.id, d.id)}>
                    <CheckCircle2 className="w-3.5 h-3.5" />{d.verified ? "Unverify" : "Verify"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeDocument(e.id, d.id)} aria-label="Remove"><Trash2 className="w-3.5 h-3.5" /></Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

const ASSET_TYPES: Asset["type"][] = ["Laptop", "ID Card", "Access Card", "Monitor", "Phone", "Headset"];

function AssetsTab({ e }: { e: Employee }) {
  const { assignAsset, toggleAssetReturned } = useAuthed();
  const toast = useToast();
  const [type, setType] = useState<Asset["type"]>("Monitor");
  const [tag, setTag] = useState("");
  return (
    <Card>
      <CardHeader title="Allocated assets" subtitle="Tracked for onboarding allocation and offboarding return" />
      <div className="flex flex-col sm:flex-row gap-2 px-5 pb-4">
        <Select value={type} onChange={(x) => setType(x.target.value as Asset["type"])} className="sm:w-40">
          {ASSET_TYPES.map((t) => <option key={t}>{t}</option>)}
        </Select>
        <Input value={tag} onChange={(x) => setTag(x.target.value)} placeholder="Asset tag e.g. MN-3021" className="sm:w-56" />
        <Button
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            if (!tag.trim()) return toast("Enter an asset tag.", "error");
            assignAsset(e.id, type, tag.trim().toUpperCase());
            setTag("");
            toast(`${type} assigned to ${fullName(e)}.`);
          }}
        >
          Assign
        </Button>
      </div>
      {e.assets.length === 0 ? (
        <EmptyState title="No assets allocated" />
      ) : (
        <Table minWidth={520}>
          <thead><tr><Th>Asset</Th><Th>Tag</Th><Th>Assigned</Th><Th>Status</Th><Th className="text-right">Action</Th></tr></thead>
          <tbody>
            {e.assets.map((a) => (
              <tr key={a.id}>
                <Td className="font-medium">{a.type}</Td>
                <Td className="font-mono text-xs">{a.tag}</Td>
                <Td>{formatDate(a.assignedAt)}</Td>
                <Td>{a.returned ? <Badge>Returned</Badge> : <Badge color="green">In use</Badge>}</Td>
                <Td className="text-right">
                  <Button size="sm" variant="secondary" onClick={() => toggleAssetReturned(e.id, a.id)}>{a.returned ? "Re-issue" : "Mark returned"}</Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

function CompTab({ e }: { e: Employee }) {
  const { updateSalary } = useAuthed();
  const toast = useToast();
  const [s, setS] = useState<SalaryStructure>(e.salary);
  const preview = computePayrollLine({ ...e, salary: s });
  const num = (k: keyof SalaryStructure, v: string) => setS((p) => ({ ...p, [k]: Number(v) || 0 }));
  const dirty = JSON.stringify(s) !== JSON.stringify(e.salary);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader title="Salary structure" subtitle={`Effective ${formatDate(e.salary.effectiveDate)}`} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-5 pb-5">
          <Field label="Basic (monthly)"><Input type="number" value={s.basic} onChange={(x) => num("basic", x.target.value)} /></Field>
          <Field label="HRA"><Input type="number" value={s.hra} onChange={(x) => num("hra", x.target.value)} /></Field>
          <Field label="Allowances"><Input type="number" value={s.allowances} onChange={(x) => num("allowances", x.target.value)} /></Field>
          <Field label="Other deductions"><Input type="number" value={s.otherDeductions} onChange={(x) => num("otherDeductions", x.target.value)} /></Field>
          <Field label="Effective date"><Input type="date" value={s.effectiveDate} onChange={(x) => setS((p) => ({ ...p, effectiveDate: x.target.value }))} /></Field>
          <div className="flex items-end gap-2">
            <Button disabled={!dirty} onClick={() => { updateSalary(e.id, s); toast("Salary structure updated."); }}>Save</Button>
            <Button variant="ghost" disabled={!dirty} onClick={() => setS(e.salary)}>Reset</Button>
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader title="Monthly pay preview" subtitle="Computed with the current tax slabs" />
        <div className="px-5 pb-5 text-sm flex flex-col gap-1.5">
          {([
            ["Gross earnings", preview.gross],
            ["Provident fund", -preview.pf],
            ["Professional tax", -preview.professionalTax],
            ["Income tax (TDS)", -preview.incomeTax],
            ["Other deductions", -preview.otherDeductions],
          ] as [string, number][]).map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-gray-500 dark:text-white/50">{k}</span>
              <span className={v < 0 ? "text-red-600 dark:text-red-400" : ""}>{money(v)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-gray-200 dark:border-white/10 pt-2 mt-1 font-semibold text-base">
            <span>Net pay</span><span>{money(preview.net)}</span>
          </div>
          <p className="text-xs text-gray-400 dark:text-white/40 mt-2">Annual CTC ≈ {money((s.basic + s.hra + s.allowances) * 12 + preview.pf * 12)}</p>
        </div>
      </Card>
    </div>
  );
}

function LeaveTab({ e }: { e: Employee }) {
  const { db } = useAuthed();
  const balances = leaveBalances(db, e.id);
  const history = db.leaves.filter((l) => l.employeeId === e.id).sort((a, b) => b.startDate.localeCompare(a.startDate));
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {balances.map((b) => (
          <Card key={b.type} className="p-4">
            <p className="text-xs text-gray-500 dark:text-white/50">{b.label}</p>
            <p className="text-2xl font-semibold mt-1 tabular-nums">{b.available}<span className="text-sm text-gray-400 font-normal"> / {b.allocated}</span></p>
            <ProgressBar value={((b.used + b.pending) / b.allocated) * 100} color={b.color} className="mt-2" />
            <p className="text-[11px] text-gray-400 dark:text-white/40 mt-1.5">{b.used} used · {b.pending} pending</p>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader title="Leave history" />
        {history.length === 0 ? (
          <EmptyState title="No leave requests" />
        ) : (
          <Table>
            <thead><tr><Th>Type</Th><Th>Dates</Th><Th>Days</Th><Th>Reason</Th><Th>Status</Th><Th>Approver</Th></tr></thead>
            <tbody>
              {history.map((l) => (
                <tr key={l.id}>
                  <Td><Badge color={LEAVE_TYPES[l.type].color}>{LEAVE_TYPES[l.type].label}</Badge></Td>
                  <Td className="whitespace-nowrap">{formatDate(l.startDate, false)} – {formatDate(l.endDate)}</Td>
                  <Td>{l.days}</Td>
                  <Td className="max-w-[240px] truncate">{l.reason}</Td>
                  <Td><StatusBadge status={l.status} /></Td>
                  <Td>{l.approverId ? fullName(db.employees.find((x) => x.id === l.approverId)) : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

function WorkTab({ e }: { e: Employee }) {
  const { db } = useAuthed();
  const open = openTasksFor(db, e.id);
  const goals = db.goals.filter((g) => g.employeeId === e.id);
  return (
    <>
      <Card>
        <CardHeader title="Delivery metrics · last 90 days" subtitle="Pulled live from work management — used to pre-fill performance reviews" />
        <div className="px-5 pb-5"><PerformanceMetrics db={db} employeeId={e.id} start={addDays(today(), -90)} end={today()} /></div>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title={`Open tasks (${open.length})`} />
          <div className="px-5 pb-5 flex flex-col gap-2">
            {open.length === 0 && <p className="text-sm text-gray-400">No open tasks.</p>}
            {open.map((t) => {
              const board = db.boards.find((b) => b.id === t.boardId);
              return (
                <div key={t.id} className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 dark:border-white/5 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-gray-500 dark:text-white/40 truncate">
                      {board?.title} · due {formatDate(t.dueDate, false)}
                      {isOverdue(db.boards, t) && <span className="text-red-500"> · overdue</span>}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={t.priority} />
                    {t.flag !== "NORMAL" && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="w-3 h-3" />{t.flag === "DELAYED_ON_LEAVE" ? "On leave" : "Blocked"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <CardHeader title="Goals" />
          <div className="px-5 pb-5 flex flex-col gap-3">
            {goals.length === 0 && <p className="text-sm text-gray-400">No goals set.</p>}
            {goals.map((g) => (
              <div key={g.id}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{g.title}</p>
                  <StatusBadge status={g.status} />
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <ProgressBar value={g.progress} color={g.status === "BEHIND" ? "red" : g.status === "AT_RISK" ? "amber" : "green"} />
                  <span className="text-xs tabular-nums text-gray-500">{g.progress}%</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">{g.type} · {g.quarter}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
