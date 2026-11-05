"use client";

import { useEffect, useState } from "react";
import { LogIn, LogOut, Wifi } from "lucide-react";
import { useAuthed } from "@/lib/store";
import { Button, Card, StatusBadge, useToast } from "@/components/ui";
import { formatTime, today } from "@/lib/utils";

function fmtDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** Clock in / out widget with a live elapsed timer for today's attendance. */
export default function ClockWidget() {
  const { db, user, clockIn, clockOut } = useAuthed();
  const toast = useToast();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const rec = db.attendance.find((a) => a.employeeId === user.id && a.date === today());
  const onLeave = rec?.status === "ON_LEAVE";
  const elapsed = rec?.clockIn ? (rec.clockOut ? new Date(rec.clockOut).getTime() : now) - new Date(rec.clockIn).getTime() : 0;

  const run = (fn: () => { ok: boolean; error?: string }, msg: string) => {
    const r = fn();
    if (r.ok) toast(msg);
    else toast(r.error ?? "Something went wrong", "error");
  };

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-white/60">Today&apos;s attendance</p>
          <p className="text-xs text-gray-400 dark:text-white/40 mt-0.5">Shift: {user.shift}</p>
        </div>
        {rec ? <StatusBadge status={rec.status} /> : <StatusBadge status="DRAFT" label="Not clocked in" />}
      </div>
      <div className="text-4xl font-semibold tabular-nums tracking-tight text-black dark:text-white">{fmtDuration(elapsed)}</div>
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-white/50">
        <span>In: <b className="text-gray-700 dark:text-white/80">{formatTime(rec?.clockIn)}</b></span>
        <span>Out: <b className="text-gray-700 dark:text-white/80">{formatTime(rec?.clockOut)}</b></span>
      </div>
      {onLeave ? (
        <p className="text-sm text-amber-600 dark:text-amber-400">You&apos;re on approved leave today. Enjoy your time off!</p>
      ) : !rec?.clockIn ? (
        <div className="flex gap-2 flex-wrap">
          <Button icon={<LogIn className="w-4 h-4" />} onClick={() => run(() => clockIn(false), "Clocked in — have a great day!")}>Clock in</Button>
          <Button variant="secondary" icon={<Wifi className="w-4 h-4" />} onClick={() => run(() => clockIn(true), "Clocked in remotely.")}>Clock in remote</Button>
        </div>
      ) : !rec.clockOut ? (
        <Button variant="danger" icon={<LogOut className="w-4 h-4" />} onClick={() => run(clockOut, "Clocked out. See you tomorrow!")}>Clock out</Button>
      ) : (
        <p className="text-sm text-green-600 dark:text-green-400">Day complete — {(elapsed / 3600000).toFixed(1)} hours logged.</p>
      )}
    </Card>
  );
}
