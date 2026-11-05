"use client";

import Link from "next/link";
import { useState } from "react";
import { Award, Briefcase, CheckCircle2, FileText, KeyRound, Laptop, Mail, MapPin, Pencil, Phone, Upload } from "lucide-react";
import { useAuthed } from "@/lib/store";
import type { Employee, EmployeeDocument } from "@/lib/types";
import {
  Avatar, Badge, Button, Card, CardHeader, Checkbox, EmptyState, Field, FormError, Input, Modal, PageHeader, Select,
  StatusBadge, Textarea, useToast,
} from "@/components/ui";
import { formatDate, fullName, getDirectReports, getManagerChain, ROLE_LABEL } from "@/lib/utils";

const DOC_TYPES: EmployeeDocument["type"][] = ["ID Proof", "Address Proof", "Education", "Certification", "Contract", "Other"];

export default function ProfilePage() {
  const { db, user, updateEmployee, addDocument, changePassword, toggleOnboardingDoc } = useAuthed();
  const toast = useToast();
  const dept = db.departments.find((d) => d.id === user.departmentId);
  const manager = db.employees.find((e) => e.id === user.managerId);
  const buddy = db.employees.find((e) => e.id === user.buddyId);
  const chain = getManagerChain(db.employees, user.id);
  const reports = getDirectReports(db.employees, user.id);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Pick<Employee, "phone" | "address" | "dob" | "gender" | "emergencyContact" | "bankAccount"> & { skills: string }>({
    phone: "", address: "", dob: "", gender: "Other", emergencyContact: { name: "", relation: "", phone: "" }, bankAccount: "", skills: "",
  });
  const [docType, setDocType] = useState<EmployeeDocument["type"]>("ID Proof");
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState<string | null>(null);

  const openEdit = () => {
    setForm({
      phone: user.phone, address: user.address, dob: user.dob, gender: user.gender,
      emergencyContact: { ...user.emergencyContact }, bankAccount: user.bankAccount, skills: user.skills.join(", "),
    });
    setEditing(true);
  };

  const saveProfile = () => {
    const res = updateEmployee(user.id, {
      ...form,
      skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
    });
    if (res.ok) { toast("Profile updated."); setEditing(false); } else toast(res.error, "error");
  };

  const submitPw = () => {
    if (pw.next !== pw.confirm) return setPwError("New passwords don't match.");
    const res = changePassword(pw.current, pw.next);
    if (res.ok) { toast("Password changed."); setPw({ current: "", next: "", confirm: "" }); setPwError(null); } else setPwError(res.error);
  };

  const info = (label: string, value: React.ReactNode) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 dark:text-white/40">{label}</span>
      <span className="text-sm text-gray-800 dark:text-white/90">{value || "—"}</span>
    </div>
  );

  return (
    <>
      <PageHeader title="My Profile" subtitle="Your personal and professional information." actions={<Button variant="secondary" icon={<Pencil className="w-4 h-4" />} onClick={openEdit}>Edit personal info</Button>} />

      <Card className="p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
        <Avatar employee={user} size="xl" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-semibold">{fullName(user)}</h2>
            <StatusBadge status={user.status} />
            <Badge color="indigo">{ROLE_LABEL[user.role]}</Badge>
          </div>
          <p className="text-sm text-gray-500 dark:text-white/50 mt-1">{user.designation} · {dept?.name} · {user.code}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm text-gray-600 dark:text-white/70">
            <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" />{user.email}</span>
            {user.phone && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" />{user.phone}</span>}
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{user.location || "—"} · {user.workMode}</span>
            <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4" />Joined {formatDate(user.joiningDate)}</span>
          </div>
        </div>
      </Card>

      {user.status === "ONBOARDING" && user.onboarding && (
        <Card>
          <CardHeader title="Onboarding documents" subtitle="Tick off documents as you submit them to HR." action={<Link href="/employee/tasks" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Onboarding board →</Link>} />
          <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {user.onboarding.documentsRequired.map((d) => (
              <Checkbox key={d.id} checked={d.done} onChange={() => toggleOnboardingDoc(user.id, d.id)} label={d.label} />
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <CardHeader title="Personal information" />
            <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {info("Date of birth", user.dob ? formatDate(user.dob) : "")}
              {info("Gender", user.gender)}
              {info("Address", user.address)}
              {info("Bank account", user.bankAccount)}
              {info("Emergency contact", user.emergencyContact.name ? `${user.emergencyContact.name} (${user.emergencyContact.relation})` : "")}
              {info("Emergency phone", user.emergencyContact.phone)}
            </div>
          </Card>

          <Card>
            <CardHeader title="Job information" subtitle="Managed by HR" />
            <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {info("Employee code", user.code)}
              {info("Department", dept?.name)}
              {info("Designation", user.designation)}
              {info("Shift", user.shift)}
              {info("Reporting manager", manager ? fullName(manager) : "None (top of org)")}
              {info("Onboarding buddy", buddy ? fullName(buddy) : "")}
              {info("PAN", user.pan)}
              {info("Account role", ROLE_LABEL[user.role])}
            </div>
            <div className="px-5 pb-5">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 dark:text-white/40 mb-2">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {user.skills.length ? user.skills.map((s) => <Badge key={s} color="blue">{s}</Badge>) : <span className="text-sm text-gray-400">—</span>}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Documents"
              action={
                <div className="flex items-center gap-2">
                  <Select value={docType} onChange={(e) => setDocType(e.target.value as EmployeeDocument["type"])} className="w-36 py-1.5 text-xs">
                    {DOC_TYPES.map((d) => <option key={d}>{d}</option>)}
                  </Select>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black cursor-pointer">
                    <Upload className="w-3.5 h-3.5" /> Upload
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) { addDocument(user.id, { name: f.name, type: docType }); toast(`Uploaded ${f.name} — pending HR verification.`); }
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              }
            />
            <div className="px-5 pb-5 flex flex-col divide-y divide-gray-100 dark:divide-white/5">
              {user.documents.length === 0 && <EmptyState title="No documents uploaded" />}
              {user.documents.map((d) => (
                <div key={d.id} className="py-2.5 flex items-center gap-3">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.name}</p>
                    <p className="text-xs text-gray-500 dark:text-white/40">{d.type} · {formatDate(d.uploadedAt)}</p>
                  </div>
                  {d.verified ? <Badge color="green"><CheckCircle2 className="w-3 h-3" />Verified</Badge> : <Badge color="amber">Pending</Badge>}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Reporting line" subtitle="Inherited for task permissions" />
            <div className="px-5 pb-5 flex flex-col gap-2">
              {[...chain].reverse().map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <Avatar employee={m} size="sm" />
                  <div className="min-w-0"><p className="text-sm font-medium truncate">{fullName(m)}</p><p className="text-xs text-gray-500 dark:text-white/40 truncate">{m.designation}</p></div>
                </div>
              ))}
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-white/5 p-1.5 -mx-1.5">
                <Avatar employee={user} size="sm" />
                <div className="min-w-0"><p className="text-sm font-semibold truncate">{fullName(user)} (you)</p><p className="text-xs text-gray-500 dark:text-white/40 truncate">{user.designation}</p></div>
              </div>
              {reports.length > 0 && (
                <>
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 dark:text-white/40 mt-2">Direct reports ({reports.length})</p>
                  {reports.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 pl-4">
                      <Avatar employee={r} size="xs" />
                      <span className="text-sm truncate">{fullName(r)}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Assigned assets" />
            <div className="px-5 pb-5 flex flex-col gap-2">
              {user.assets.length === 0 && <p className="text-sm text-gray-500">No assets assigned.</p>}
              {user.assets.map((a) => (
                <div key={a.id} className="flex items-center gap-3">
                  <Laptop className="w-4 h-4 text-gray-400" />
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium">{a.type}</p><p className="text-xs text-gray-500 dark:text-white/40">{a.tag} · since {formatDate(a.assignedAt)}</p></div>
                  {a.returned && <Badge>Returned</Badge>}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Certifications" />
            <div className="px-5 pb-5 flex flex-col gap-2">
              {user.certifications.length === 0 && <p className="text-sm text-gray-500">None listed.</p>}
              {user.certifications.map((c) => (
                <div key={c} className="flex items-center gap-2 text-sm"><Award className="w-4 h-4 text-amber-500" />{c}</div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Change password" />
            <div className="px-5 pb-5 flex flex-col gap-3">
              <FormError message={pwError} />
              <Input type="password" placeholder="Current password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
              <Input type="password" placeholder="New password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
              <Input type="password" placeholder="Confirm new password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
              <Button icon={<KeyRound className="w-4 h-4" />} onClick={submitPw} disabled={!pw.current || !pw.next}>Update password</Button>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit personal information"
        size="lg"
        footer={<><Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button><Button onClick={saveProfile}>Save changes</Button></>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Date of birth"><Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></Field>
          <Field label="Gender">
            <Select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as Employee["gender"] })}><option>Male</option><option>Female</option><option>Other</option></Select>
          </Field>
          <Field label="Bank account"><Input value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} /></Field>
          <Field label="Address" className="sm:col-span-2"><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="Emergency contact name"><Input value={form.emergencyContact.name} onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, name: e.target.value } })} /></Field>
          <Field label="Relation"><Input value={form.emergencyContact.relation} onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, relation: e.target.value } })} /></Field>
          <Field label="Emergency phone"><Input value={form.emergencyContact.phone} onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, phone: e.target.value } })} /></Field>
          <Field label="Skills" hint="Comma-separated"><Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} /></Field>
        </div>
      </Modal>
    </>
  );
}
