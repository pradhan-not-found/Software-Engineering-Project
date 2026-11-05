"use client";

import { Mail, MapPin, Phone } from "lucide-react";
import type { DB } from "@/lib/types";
import { Avatar, Badge, Modal, StatusBadge } from "@/components/ui";
import { formatDate, fullName, getDirectReports, getManagerChain } from "@/lib/utils";

/** Read-only public profile, used by employee-facing directory and org chart. */
export default function ProfileModal({ db, employeeId, onClose }: { db: DB; employeeId: string | null; onClose: () => void }) {
  const e = db.employees.find((x) => x.id === employeeId);
  if (!e) return null;
  const dept = db.departments.find((d) => d.id === e.departmentId);
  const chain = getManagerChain(db.employees, e.id);
  const reports = getDirectReports(db.employees, e.id);
  return (
    <Modal open onClose={onClose} title={fullName(e)} subtitle={e.designation}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <Avatar employee={e} size="xl" />
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap gap-1.5">
              {dept && <Badge color={dept.color}>{dept.name}</Badge>}
              <StatusBadge status={e.status} />
            </div>
            <span className="text-xs text-gray-500 dark:text-white/50">{e.code} · Joined {formatDate(e.joiningDate)}</span>
          </div>
        </div>
        <div className="grid gap-2 text-sm">
          <a href={`mailto:${e.email}`} className="flex items-center gap-2 text-gray-700 dark:text-white/80 hover:underline"><Mail className="w-4 h-4 text-gray-400" />{e.email}</a>
          {e.phone && <span className="flex items-center gap-2 text-gray-700 dark:text-white/80"><Phone className="w-4 h-4 text-gray-400" />{e.phone}</span>}
          <span className="flex items-center gap-2 text-gray-700 dark:text-white/80"><MapPin className="w-4 h-4 text-gray-400" />{e.location || "—"} · {e.workMode}</span>
        </div>
        {e.skills.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-white/50 mb-1.5">Skills</p>
            <div className="flex flex-wrap gap-1.5">{e.skills.map((s) => <Badge key={s}>{s}</Badge>)}</div>
          </div>
        )}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-white/50 mb-1.5">Reports to</p>
          {chain.length ? (
            <div className="flex flex-wrap items-center gap-1 text-sm">
              {chain.map((m, i) => (
                <span key={m.id} className="flex items-center gap-1">
                  {i > 0 && <span className="text-gray-300">›</span>}
                  {fullName(m)}
                </span>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">Top of organization</p>}
        </div>
        {reports.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-white/50 mb-1.5">Direct reports ({reports.length})</p>
            <div className="flex flex-wrap gap-2">
              {reports.map((r) => (
                <span key={r.id} className="flex items-center gap-1.5 text-xs bg-gray-100 dark:bg-white/5 rounded-full pl-0.5 pr-2.5 py-0.5">
                  <Avatar employee={r} size="xs" />{fullName(r)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
