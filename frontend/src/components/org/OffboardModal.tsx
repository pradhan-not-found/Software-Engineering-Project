"use client";

import { useState } from "react";
import { useAuthed } from "@/lib/store";
import { Button, Field, FormError, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { addDays, fullName, openTasksFor, today } from "@/lib/utils";

/** Initiate offboarding. If employeeId is given the picker is hidden. */
export default function OffboardModal({ open, onClose, employeeId }: { open: boolean; onClose: () => void; employeeId?: string }) {
  const { db, initiateOffboarding } = useAuthed();
  const toast = useToast();
  const candidates = db.employees.filter((e) => e.status === "ACTIVE" || e.status === "ON_LEAVE" || e.status === "ONBOARDING");
  const [pick, setPick] = useState(employeeId ?? "");
  const [lwd, setLwd] = useState(addDays(today(), 30));
  const [reason, setReason] = useState("Resignation");
  const [error, setError] = useState<string | null>(null);
  const target = employeeId ?? pick;
  const person = db.employees.find((e) => e.id === target);
  const open$ = person ? openTasksFor(db, person.id).length : 0;

  const submit = () => {
    if (!target) return setError("Select an employee.");
    if (!lwd) return setError("Pick a last working day.");
    if (!reason.trim()) return setError("Add a reason.");
    const res = initiateOffboarding(target, { lastWorkingDay: lwd, reason });
    if (!res.ok) return setError(res.error);
    toast(`Offboarding started for ${fullName(person)}${open$ ? ` — ${open$} open task(s) flagged for reassignment` : ""}.`);
    setError(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Initiate Offboarding"
      subtitle="Creates an exit checklist and flags the employee's open work for reassignment."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={submit}>Start offboarding</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormError message={error} />
        {!employeeId && (
          <Field label="Employee">
            <Select value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">Select employee…</option>
              {candidates.map((e) => <option key={e.id} value={e.id}>{fullName(e)} · {e.designation}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Last working day"><Input type="date" value={lwd} onChange={(e) => setLwd(e.target.value)} /></Field>
        <Field label="Reason">
          <Select value={["Resignation", "Termination", "Retirement", "Contract end"].includes(reason) ? reason : "Other"} onChange={(e) => setReason(e.target.value === "Other" ? "" : e.target.value)}>
            {["Resignation", "Termination", "Retirement", "Contract end", "Other"].map((r) => <option key={r}>{r}</option>)}
          </Select>
        </Field>
        <Field label="Notes"><Textarea value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        {person && (
          <p className="text-xs text-gray-500 dark:text-white/50">
            {fullName(person)} has <b>{open$}</b> open task(s) and <b>{person.assets.filter((a) => !a.returned).length}</b> unreturned asset(s).
          </p>
        )}
      </div>
    </Modal>
  );
}
