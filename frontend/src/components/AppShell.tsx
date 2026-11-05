"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, Search, X } from "lucide-react";
import ProfileDropdown from "@/components/ProfileDropdown";
import { Avatar, FullPageLoader } from "@/components/ui";
import { useStore } from "@/lib/store";
import { cn, fullName, isAdminRole, resolveLink, timeAgo } from "@/lib/utils";

export interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}
export interface NavSection {
  title?: string;
  items: NavItem[];
}

export default function AppShell({
  variant,
  sections,
  children,
}: {
  variant: "admin" | "employee";
  sections: NavSection[];
  children: React.ReactNode;
}) {
  const { ready, user } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const allowed = !!user && (variant === "employee" || isAdminRole(user.role));

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      let deliberate = false;
      try {
        deliberate = sessionStorage.getItem("ems-logged-out") === "1";
        sessionStorage.removeItem("ems-logged-out");
      } catch {}
      router.replace(deliberate ? "/login" : `/login?next=${encodeURIComponent(pathname)}`);
    }
    else if (!allowed) router.replace("/employee");
  }, [ready, user, allowed, router, pathname]);

  useEffect(() => setMobileOpen(false), [pathname]);

  if (!ready || !user || !allowed) return <FullPageLoader />;

  const base = variant === "admin" ? "/admin" : "/employee";
  const isActive = (href: string) => (href === base ? pathname === base : pathname === href || pathname.startsWith(href + "/"));

  return (
    <div className="flex h-screen w-full bg-white dark:bg-black text-black dark:text-white font-sans overflow-hidden">
      {mobileOpen && <div className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" onClick={() => setMobileOpen(false)} />}

      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-50 w-[260px] flex-shrink-0 flex flex-col bg-gray-50 dark:bg-[#050505] border-r border-gray-200 dark:border-white/5 h-full transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-white/5 shrink-0">
          <Link href={base} className="flex items-center gap-2">
            <Image src="/logo.png" alt="Workplace" width={160} height={38} className="w-[110px] h-auto object-contain brightness-0 dark:invert dark:opacity-90" />
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                variant === "admin" ? "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400" : "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
              )}
            >
              {variant === "admin" ? "Admin" : "Team"}
            </span>
          </Link>
          <button className="md:hidden p-1 text-gray-500" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-hide py-5 px-3 flex flex-col gap-6">
          {sections.map((section, i) =>
            section.items.length === 0 ? null : (
              <div key={i} className="flex flex-col gap-1">
                {section.title && (
                  <span className="text-[11px] font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wider px-3 mb-1">{section.title}</span>
                )}
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors",
                      isActive(item.href)
                        ? "bg-black/5 dark:bg-white/10 text-black dark:text-white"
                        : "text-gray-500 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5",
                    )}
                  >
                    <span className="w-5 h-5 flex items-center justify-center opacity-80 [&>svg]:w-[18px] [&>svg]:h-[18px]">{item.icon}</span>
                    <span className="flex-1 truncate">{item.name}</span>
                    {!!item.badge && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{item.badge}</span>
                    )}
                  </Link>
                ))}
              </div>
            ),
          )}
        </nav>

        <div className="p-3 border-t border-gray-200 dark:border-white/5">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar employee={user} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{fullName(user)}</p>
              <p className="text-xs text-gray-500 dark:text-white/40 truncate">{user.designation}</p>
            </div>
          </div>
          {variant === "employee" && isAdminRole(user.role) && (
            <Link href="/admin" className="mt-1 block text-center text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5">
              Switch to Admin Console
            </Link>
          )}
          {variant === "admin" && (
            <Link href="/employee" className="mt-1 block text-center text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5">
              Switch to Employee Portal
            </Link>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full bg-white dark:bg-[#0a0a0a] min-w-0">
        <header className="h-16 flex-shrink-0 flex items-center justify-between gap-3 px-4 md:px-8 border-b border-gray-200 dark:border-white/5">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button className="md:hidden p-2 text-gray-500 dark:text-white/60 rounded-lg hover:bg-black/5 dark:hover:bg-white/5" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </button>
            <GlobalSearch variant={variant} />
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <NotificationBell base={base} />
            <ProfileDropdown />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-[1280px] mx-auto pb-12 flex flex-col gap-8">{children}</div>
        </div>
      </main>
    </div>
  );
}

function NotificationBell({ base }: { base: string }) {
  const { db, user, markRead, markAllRead } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const mine = useMemo(() => (db && user ? db.notifications.filter((n) => n.recipientId === user.id) : []), [db, user]);
  const unread = mine.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-full text-gray-500 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{unread > 9 ? "9+" : unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-[340px] max-w-[calc(100vw-2rem)] bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/5">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {mine.length === 0 && <p className="text-sm text-gray-500 dark:text-white/40 text-center py-10">You&apos;re all caught up.</p>}
            {mine.slice(0, 8).map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  markRead(n.id);
                  setOpen(false);
                  const to = user ? resolveLink(n.link, user.role) : null;
                  if (to) router.push(to);
                }}
                className={cn("w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 dark:hover:bg-white/5 border-b border-gray-50 dark:border-white/5", !n.read && "bg-blue-50/50 dark:bg-blue-500/5")}
              >
                <span className={cn("mt-1.5 w-2 h-2 rounded-full shrink-0", n.read ? "bg-transparent" : "bg-blue-500")} />
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider", n.category === "HR" ? "text-pink-500" : n.category === "WORK" ? "text-blue-500" : "text-gray-400")}>{n.category}</span>
                    <span className="text-[11px] text-gray-400 dark:text-white/40">{timeAgo(n.createdAt)}</span>
                  </span>
                  <span className="block text-sm font-medium text-black dark:text-white">{n.title}</span>
                  <span className="block text-xs text-gray-500 dark:text-white/50 line-clamp-2">{n.message}</span>
                </span>
              </button>
            ))}
          </div>
          <Link href={`${base}/notifications`} onClick={() => setOpen(false)} className="block text-center text-xs font-medium py-3 hover:bg-gray-50 dark:hover:bg-white/5">
            View all activity
          </Link>
        </div>
      )}
    </div>
  );
}

function GlobalSearch({ variant }: { variant: "admin" | "employee" }) {
  const { db } = useStore();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const results = useMemo(() => {
    if (!db || q.trim().length < 2) return [];
    const s = q.toLowerCase();
    const people = db.employees
      .filter((e) => `${fullName(e)} ${e.email} ${e.designation} ${e.code}`.toLowerCase().includes(s))
      .slice(0, 5)
      .map((e) => ({
        key: e.id,
        label: fullName(e),
        sub: `${e.designation} · ${e.code}`,
        href: variant === "admin" ? `/admin/directory/${e.id}` : `/employee/directory?q=${encodeURIComponent(fullName(e))}`,
        type: "Person",
      }));
    const projects = db.projects
      .filter((p) => p.name.toLowerCase().includes(s))
      .slice(0, 3)
      .map((p) => ({ key: p.id, label: p.name, sub: p.status, href: variant === "admin" ? `/admin/projects?p=${p.id}` : "/employee/tasks", type: "Project" }));
    const tasks = db.tasks
      .filter((t) => t.title.toLowerCase().includes(s))
      .slice(0, 4)
      .map((t) => ({ key: t.id, label: t.title, sub: db.boards.find((b) => b.id === t.boardId)?.title ?? "", href: variant === "admin" ? `/admin/projects?task=${t.id}` : `/employee/tasks?task=${t.id}`, type: "Task" }));
    return [...people, ...projects, ...tasks];
  }, [db, q, variant]);

  return (
    <div ref={ref} className="relative w-full max-w-md hidden sm:block">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/40" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search people, projects, tasks…"
        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full py-1.5 pl-10 pr-4 text-sm placeholder:text-gray-400 dark:placeholder:text-white/40 focus:outline-none focus:border-gray-400 dark:focus:border-white/20"
      />
      {open && q.trim().length >= 2 && (
        <div className="absolute top-11 left-0 right-0 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          {results.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-white/40 px-4 py-6 text-center">No results for “{q}”</p>
          ) : (
            results.map((r) => (
              <button
                key={r.type + r.key}
                onClick={() => {
                  setOpen(false);
                  setQ("");
                  router.push(r.href);
                }}
                className="w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-white/5"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium truncate">{r.label}</span>
                  <span className="block text-xs text-gray-500 dark:text-white/40 truncate">{r.sub}</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">{r.type}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
