"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, MapPin, Phone, Users } from "lucide-react";
import { useAuthed } from "@/lib/store";
import { Avatar, Badge, Card, EmptyState, PageHeader, SearchInput, Select, StatusBadge } from "@/components/ui";
import ProfileModal from "@/components/org/ProfileModal";
import { fullName } from "@/lib/utils";

export default function EmployeeDirectoryPage() {
  return (
    <Suspense fallback={null}>
      <Directory />
    </Suspense>
  );
}

function Directory() {
  const { db } = useAuthed();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [dept, setDept] = useState("all");
  const [profile, setProfile] = useState<string | null>(null);

  useEffect(() => {
    const fromUrl = params.get("q");
    if (fromUrl !== null) setQ(fromUrl);
  }, [params]);

  const people = useMemo(() => {
    const s = q.trim().toLowerCase();
    return db.employees
      .filter((e) => e.status !== "TERMINATED")
      .filter((e) => (dept === "all" || e.departmentId === dept) && (!s || `${fullName(e)} ${e.designation} ${e.email} ${e.skills.join(" ")}`.toLowerCase().includes(s)))
      .sort((a, b) => fullName(a).localeCompare(fullName(b)));
  }, [db, q, dept]);

  return (
    <>
      <PageHeader title="Company Directory" subtitle={`Find and contact anyone at ${db.org.name}.`} />
      <div className="flex flex-col sm:flex-row gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search by name, role or skill…" className="flex-1" />
        <Select value={dept} onChange={(e) => setDept(e.target.value)} className="sm:w-56">
          <option value="all">All departments</option>
          {db.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
      </div>

      {people.length === 0 ? (
        <Card><EmptyState icon={<Users className="w-10 h-10" />} title="No one found" description="Try a different name or department." /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {people.map((e) => {
            const d = db.departments.find((x) => x.id === e.departmentId);
            return (
              <Card key={e.id} className="p-5 flex flex-col gap-4">
                <button onClick={() => setProfile(e.id)} className="flex items-start gap-3 text-left">
                  <Avatar employee={e} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate hover:underline">{fullName(e)}</p>
                    <p className="text-xs text-gray-500 dark:text-white/50 truncate">{e.designation}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {d && <Badge color={d.color}>{d.name}</Badge>}
                      {e.status !== "ACTIVE" && <StatusBadge status={e.status} />}
                    </div>
                  </div>
                </button>
                <div className="flex flex-col gap-1.5 text-xs text-gray-600 dark:text-white/60 border-t border-gray-100 dark:border-white/5 pt-3">
                  <a href={`mailto:${e.email}`} className="flex items-center gap-2 hover:underline truncate"><Mail className="w-3.5 h-3.5 shrink-0" />{e.email}</a>
                  {e.phone && <span className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{e.phone}</span>}
                  <span className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{e.location || "—"} · {e.workMode}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <ProfileModal db={db} employeeId={profile} onClose={() => setProfile(null)} />
    </>
  );
}
