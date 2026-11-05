"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BellOff, CheckCheck, Download, Trash2, Zap } from "lucide-react";
import { useAuthed } from "@/lib/store";
import type { NotificationCategory } from "@/lib/types";
import { cn, downloadText, fullName, isAdminRole, timeAgo, toCSV } from "@/lib/utils";
import { Avatar, Badge, Button, Card, EmptyState, PageHeader, SearchInput, Select, Table, Tabs, Td, Th } from "@/components/ui";

const CAT_COLOR: Record<NotificationCategory, string> = { HR: "pink", WORK: "blue", SYSTEM: "gray" };

export default function NotificationsCenter({ variant }: { variant: "admin" | "employee" }) {
  const { db, user, markRead, markAllRead, clearNotifications } = useAuthed();
  const router = useRouter();
  const [tab, setTab] = useState<"inbox" | "audit">("inbox");
  const [cat, setCat] = useState<"ALL" | NotificationCategory>("ALL");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [q, setQ] = useState("");
  const [entity, setEntity] = useState("");

  const mine = db.notifications
    .filter((n) => n.recipientId === user.id)
    .filter((n) => cat === "ALL" || n.category === cat)
    .filter((n) => !unreadOnly || !n.read);
  const unread = db.notifications.filter((n) => n.recipientId === user.id && !n.read).length;
  const showAudit = variant === "admin" && isAdminRole(user.role);

  const entities = Array.from(new Set(db.activity.map((a) => a.entity))).sort();
  const audit = db.activity
    .filter((a) => cat === "ALL" || a.category === cat)
    .filter((a) => !entity || a.entity === entity)
    .filter((a) => !q || a.message.toLowerCase().includes(q.toLowerCase()));

  const exportAudit = () =>
    downloadText(
      "audit-log.csv",
      toCSV([["Timestamp", "Actor", "Action", "Entity", "Category", "Message"], ...audit.map((a) => [a.at, a.actorId ? fullName(db.employees.find((e) => e.id === a.actorId)) : "System", a.action, a.entity, a.category, a.message])]),
      "text/csv",
    );

  return (
    <>
      <PageHeader
        title={showAudit ? "Activity & Alerts" : "Notifications"}
        subtitle="A single feed where HR events (leave, joiners, reviews) and work events (assignments, deadlines) show up together."
        actions={
          tab === "inbox" ? (
            <>
              <Button variant="secondary" icon={<CheckCheck className="w-4 h-4" />} disabled={!unread} onClick={markAllRead}>Mark all read</Button>
              <Button variant="ghost" icon={<Trash2 className="w-4 h-4" />} onClick={clearNotifications}>Clear</Button>
            </>
          ) : (
            <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={exportAudit}>Export CSV</Button>
          )
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {showAudit && <Tabs value={tab} onChange={setTab} tabs={[{ value: "inbox", label: `My inbox${unread ? ` (${unread})` : ""}` }, { value: "audit", label: "Organization audit log" }]} />}
          <Tabs value={cat} onChange={setCat} tabs={[{ value: "ALL", label: "All" }, { value: "HR", label: "HR" }, { value: "WORK", label: "Work" }, { value: "SYSTEM", label: "System" }]} />
        </div>
        {tab === "inbox" ? (
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-white/60">
            <input type="checkbox" checked={unreadOnly} onChange={() => setUnreadOnly((u) => !u)} className="accent-black dark:accent-white" /> Unread only
          </label>
        ) : (
          <div className="flex gap-2">
            <SearchInput value={q} onChange={setQ} placeholder="Search log…" className="sm:w-56" />
            <Select value={entity} onChange={(e) => setEntity(e.target.value)} className="w-40">
              <option value="">All entities</option>
              {entities.map((x) => <option key={x} value={x}>{x}</option>)}
            </Select>
          </div>
        )}
      </div>

      {tab === "inbox" ? (
        <Card className="divide-y divide-gray-100 dark:divide-white/5 overflow-hidden">
          {mine.length === 0 && <EmptyState icon={<BellOff className="w-10 h-10" />} title="No notifications" description="You're all caught up." />}
          {mine.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                markRead(n.id);
                if (n.link && !(variant === "employee" && n.link.startsWith("/admin"))) router.push(n.link);
              }}
              className={cn("w-full text-left flex gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.03]", !n.read && "bg-blue-50/40 dark:bg-blue-500/[0.04]")}
            >
              <span className={cn("mt-2 w-2 h-2 rounded-full shrink-0", n.read ? "bg-transparent" : "bg-blue-500")} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge color={CAT_COLOR[n.category]}>{n.category}</Badge>
                  <span className="text-sm font-medium">{n.title}</span>
                  <span className="text-xs text-gray-400 dark:text-white/40 ml-auto">{timeAgo(n.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-white/60 mt-1">{n.message}</p>
              </div>
            </button>
          ))}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table minWidth={760}>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Entity</Th>
                <Th>Details</Th>
              </tr>
            </thead>
            <tbody>
              {audit.map((a) => {
                const actor = db.employees.find((e) => e.id === a.actorId);
                return (
                  <tr key={a.id}>
                    <Td className="whitespace-nowrap text-xs text-gray-500">{timeAgo(a.at)}</Td>
                    <Td>
                      <span className="flex items-center gap-2 whitespace-nowrap">
                        {actor ? <Avatar employee={actor} size="xs" /> : <Zap className="w-4 h-4 text-amber-500" />}
                        {actor ? fullName(actor) : "System"}
                      </span>
                    </Td>
                    <Td><Badge color={a.action === "APPROVE" ? "green" : a.action === "REJECT" ? "red" : a.action === "SYSTEM" ? "amber" : "gray"}>{a.action}</Badge></Td>
                    <Td className="text-xs">{a.entity}</Td>
                    <Td>{a.message}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          {audit.length === 0 && <EmptyState title="No matching log entries" />}
        </Card>
      )}
    </>
  );
}
