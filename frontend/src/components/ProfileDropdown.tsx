"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { LayoutDashboard, LogOut, Monitor, Moon, RotateCcw, Settings, Sun, User, Shield } from "lucide-react";
import { useStore } from "@/lib/store";
import { Avatar, ConfirmDialog, useToast } from "@/components/ui";
import { cn, fullName, isAdminRole, ROLE_LABEL } from "@/lib/utils";

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const { user, logout, resetDemo } = useStore();
  const router = useRouter();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) {
    return (
      <Link href="/login" className="text-sm font-medium px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black">
        Log in
      </Link>
    );
  }

  const admin = isAdminRole(user.role);
  const item = "px-4 py-2 text-gray-700 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white flex items-center gap-2.5";

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setIsOpen(!isOpen)} className="rounded-full focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20" aria-label="Account menu">
        <Avatar employee={user} size="sm" />
      </button>

      {isOpen && (
        <div className="absolute top-12 right-0 w-64 bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl py-2 flex flex-col z-50 text-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
            <p className="text-black dark:text-white font-medium">{fullName(user)}</p>
            <p className="text-gray-500 dark:text-white/50 text-xs">{user.email}</p>
            <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/60">
              {ROLE_LABEL[user.role]}
            </span>
          </div>

          <div className="flex flex-col py-2 border-b border-gray-100 dark:border-white/5" onClick={() => setIsOpen(false)}>
            {admin && (
              <Link href="/admin" className={item}>
                <Shield className="w-4 h-4" /> Admin Console
              </Link>
            )}
            <Link href="/employee" className={item}>
              <LayoutDashboard className="w-4 h-4" /> Employee Portal
            </Link>
            <Link href="/employee/profile" className={item}>
              <User className="w-4 h-4" /> My Profile
            </Link>
            {admin && (
              <Link href="/admin/settings" className={item}>
                <Settings className="w-4 h-4" /> Organization Settings
              </Link>
            )}
          </div>

          <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
            <p className="text-xs text-gray-400 dark:text-white/40 mb-2">Theme</p>
            <div className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-white/5 rounded-lg p-1">
              {[
                { v: "light", icon: <Sun className="w-3.5 h-3.5" /> },
                { v: "dark", icon: <Moon className="w-3.5 h-3.5" /> },
                { v: "system", icon: <Monitor className="w-3.5 h-3.5" /> },
              ].map((t) => (
                <button
                  key={t.v}
                  onClick={() => setTheme(t.v)}
                  className={cn(
                    "flex items-center justify-center gap-1 py-1.5 rounded-md text-xs capitalize",
                    mounted && theme === t.v ? "bg-white dark:bg-white/15 text-black dark:text-white shadow-sm" : "text-gray-500 dark:text-white/50",
                  )}
                >
                  {t.icon}
                  {t.v}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col py-2">
            <button className={item} onClick={() => { setIsOpen(false); setConfirmReset(true); }}>
              <RotateCcw className="w-4 h-4" /> Reset demo data
            </button>
            <button
              className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2.5"
              onClick={() => {
                // Tell the route guard this was a deliberate logout (no ?next= redirect back).
                try { sessionStorage.setItem("ems-logged-out", "1"); } catch {}
                logout();
                router.push("/login");
              }}
            >
              <LogOut className="w-4 h-4" /> Log out
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetDemo();
          toast("Demo data restored to its original state.", "info");
        }}
        title="Reset demo data?"
        message="All changes you made in this browser (new hires, approvals, tasks, payroll runs…) will be discarded and the seeded demo organization restored."
        confirmLabel="Reset"
        danger
      />
    </div>
  );
}
