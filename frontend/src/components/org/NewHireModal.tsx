"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Asset, Employee, Role } from "@/lib/types";
import { useAuthed, type NewHireInput } from "@/lib/store";
import { Button, Field, FormError, Input, Modal, Select, useToast } from "@/components/ui";
import { fullName, today, ROLE_LABEL } from "@/lib/utils";

const ASSET_TYPES: Asset["type"][] = ["Laptop", "ID Card", "Access Card", "Monitor", "Phone", "Headset"];

export default function NewHireModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { db, addEmployee } = useAuthed();
  const toast = useToast();
  const router = useRouter();
  const blank: NewHireInput = {
    firstName: "", lastName: "", email: "", phone: "", designation: "",
    departmentId: db.departments[0]?.id ?? "", managerId: null, buddyId: null, role: "EMPLOYEE",
    joiningDate: today(), workMode: "Onsite", location: "", gender: "Female", basicSalary: 60000,
    assets: ["Laptop", "ID Card"],
  };
  const [f, setF] = useState<NewHireInput>(blank);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const set = <K extends keyof NewHireInput>(k: K, v: NewHireInput[K]) => setF((p) => ({ ...p, [k]: v }));
  const active = db.employees.filter((e) => e.status !== "TERMINATED");

  const submit = async () => {
    if (!f.firstName.trim() || !f.lastName.trim()) return setError("First and last name are required.");
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setError("Enter a valid email address.");
    if (!f.designation.trim()) return setError("Designation is required.");
    if (!(f.basicSalary > 0)) return setError("Enter a valid basic salary.");
    setLoading(true);
    try {
      const res = await addEmployee(f);
      if (!res.ok) return setError(res.error);
      toast(`${fullName(res.data)} added — onboarding board with 9 tasks auto-generated.`);
      setF(blank);
      setError(null);
      onClose();
      if (res.data) router.push(`/admin/directory/${res.data.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Add New Hire"
      subtitle="Creates the employee record, allocates assets and auto-generates an onboarding Kanban board."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={submit} disabled={loading}>{loading ? "Adding & creating onboarding board…" : "Add & start onboarding"}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormError message={error} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="First name"><Input value={f.firstName} onChange={(e) => set("firstName", e.target.value)} /></Field>
          <Field label="Last name"><Input value={f.lastName} onChange={(e) => set("lastName", e.target.value)} /></Field>
          <Field label="Work email"><Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="name@workplace.com" /></Field>
          <Field label="Phone"><Input value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 …" /></Field>
          <Field label="Designation"><Input value={f.designation} onChange={(e) => set("designation", e.target.value)} /></Field>
          <Field label="Department">
            <Select value={f.departmentId} onChange={(e) => set("departmentId", e.target.value)}>
              {db.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Reporting manager">
            <Select value={f.managerId ?? ""} onChange={(e) => set("managerId", e.target.value || null)}>
              <option value="">— None —</option>
              {active.map((e) => <option key={e.id} value={e.id}>{fullName(e)} · {e.designation}</option>)}
            </Select>
          </Field>
          <Field label="Onboarding buddy">
            <Select value={f.buddyId ?? ""} onChange={(e) => set("buddyId", e.target.value || null)}>
              <option value="">— None —</option>
              {active.map((e) => <option key={e.id} value={e.id}>{fullName(e)}</option>)}
            </Select>
          </Field>
          <Field label="Access role">
            <Select value={f.role} onChange={(e) => set("role", e.target.value as Role)}>
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </Select>
          </Field>
          <Field label="Joining date"><Input type="date" value={f.joiningDate} onChange={(e) => set("joiningDate", e.target.value)} /></Field>
          <Field label="Work mode">
            <Select value={f.workMode} onChange={(e) => set("workMode", e.target.value as Employee["workMode"])}>
              {["Onsite", "Hybrid", "Remote"].map((m) => <option key={m}>{m}</option>)}
            </Select>
          </Field>
          <Field label="Location"><Input value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="Kolkata" /></Field>
          <Field label="Gender">
            <Select value={f.gender} onChange={(e) => set("gender", e.target.value as Employee["gender"])}>
              {["Female", "Male", "Other"].map((m) => <option key={m}>{m}</option>)}
            </Select>
          </Field>
          <Field label="Monthly basic salary (₹)" hint="HRA (40%) and allowances (20%) are derived automatically.">
            <Input type="number" min={0} value={f.basicSalary} onChange={(e) => set("basicSalary", Number(e.target.value))} />
          </Field>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600 dark:text-white/70 mb-2">Assets to allocate</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ASSET_TYPES.map((a) => (
              <label key={a} className="flex items-center gap-2 text-sm text-gray-700 dark:text-white/80 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-black dark:accent-white"
                  checked={f.assets.includes(a)}
                  onChange={() => set("assets", f.assets.includes(a) ? f.assets.filter((x) => x !== a) : [...f.assets, a])}
                />
                {a}
              </label>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
