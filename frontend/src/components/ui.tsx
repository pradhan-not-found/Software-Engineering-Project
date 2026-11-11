"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { X, Star, Search, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { avatarColor, cn, colorFor, fullName, initials } from "@/lib/utils";
import type { Employee } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200",
  secondary:
    "bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 dark:bg-white/5 dark:text-white/90 dark:border-white/10 dark:hover:bg-white/10",
  ghost: "text-gray-600 hover:text-black hover:bg-black/5 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/5",
  danger: "bg-red-600 text-white hover:bg-red-700 dark:bg-red-500/90 dark:hover:bg-red-500",
  success: "bg-green-600 text-white hover:bg-green-700 dark:bg-green-500/90 dark:hover:bg-green-500",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  icon,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  icon?: React.ReactNode;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
        BUTTON_STYLES[variant],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Layout primitives                                                   */
/* ------------------------------------------------------------------ */

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none transition-colors",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-black dark:text-white">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div className="flex flex-col gap-1 min-w-0">
        <h1 className="text-2xl font-semibold text-black dark:text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 dark:text-white/50">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  hintTone = "muted",
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  hintTone?: "muted" | "good" | "warn" | "bad";
  icon?: React.ReactNode;
}) {
  const tone = {
    muted: "text-gray-400 dark:text-white/40",
    good: "text-green-600 dark:text-green-400",
    warn: "text-amber-600 dark:text-amber-400",
    bad: "text-red-600 dark:text-red-400",
  }[hintTone];
  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500 dark:text-white/60">{label}</span>
        {icon && <span className="text-gray-400 dark:text-white/40">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-3xl font-semibold text-black dark:text-white tabular-nums">{value}</span>
        {hint && <span className={cn("text-xs font-medium", tone)}>{hint}</span>}
      </div>
    </Card>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 gap-2">
      {icon && <div className="text-gray-300 dark:text-white/20 mb-2">{icon}</div>}
      <p className="text-sm font-medium text-gray-700 dark:text-white/80">{title}</p>
      {description && <p className="text-xs text-gray-500 dark:text-white/40 max-w-sm">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Badges & avatars                                                    */
/* ------------------------------------------------------------------ */

export function Badge({ color = "gray", children, className }: { color?: string; children: React.ReactNode; className?: string }) {
  const c = colorFor(color);
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap", c.soft, c.text, className)}>
      {children}
    </span>
  );
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "green", ONBOARDING: "blue", ON_LEAVE: "amber", OFFBOARDING: "orange", TERMINATED: "gray", SUSPENDED: "red",
  PENDING: "amber", APPROVED: "green", REJECTED: "red", CANCELLED: "gray", REIMBURSED: "teal",
  DRAFT: "gray", SUBMITTED: "blue", PROCESSED: "blue", PAID: "green", CLOSED: "gray",
  PRESENT: "green", REMOTE: "blue", HALF_DAY: "amber", ABSENT: "red",
  PENDING_SELF: "amber", PENDING_MANAGER: "blue", COMPLETED: "green",
  ON_TRACK: "green", AT_RISK: "amber", BEHIND: "red",
  PLANNING: "purple", ON_HOLD: "gray",
  LOW: "gray", MEDIUM: "blue", HIGH: "orange", URGENT: "red",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const text = label ?? status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  return <Badge color={STATUS_COLORS[status] ?? "gray"}>{text}</Badge>;
}

export function Avatar({ employee, size = "md", className }: { employee: Pick<Employee, "id" | "firstName" | "lastName"> | undefined | null; size?: "xs" | "sm" | "md" | "lg" | "xl"; className?: string }) {
  const sizes = { xs: "w-6 h-6 text-[10px]", sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-lg", xl: "w-20 h-20 text-2xl" };
  const c = colorFor(employee ? avatarColor(employee.id) : "gray");
  return (
    <div
      title={employee ? fullName(employee) : undefined}
      className={cn("rounded-full flex items-center justify-center font-semibold shrink-0 ring-2 ring-white dark:ring-black", c.soft, c.text, sizes[size], className)}
    >
      {initials(employee)}
    </div>
  );
}

export function AvatarStack({ employees, max = 3 }: { employees: (Employee | undefined)[]; max?: number }) {
  const list = employees.filter(Boolean) as Employee[];
  return (
    <div className="flex -space-x-2">
      {list.slice(0, max).map((e) => (
        <Avatar key={e.id} employee={e} size="xs" />
      ))}
      {list.length > max && (
        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-white/10 text-[10px] flex items-center justify-center font-semibold ring-2 ring-white dark:ring-black">
          +{list.length - max}
        </div>
      )}
    </div>
  );
}

export function ProgressBar({ value, color = "blue", className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden", className)}>
      <div className={cn("h-full rounded-full transition-all", colorFor(color).bg)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Form controls                                                       */
/* ------------------------------------------------------------------ */

const FIELD =
  "w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20 focus:border-gray-300 dark:focus:border-white/30 transition-all disabled:opacity-60";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(FIELD, className)} {...props} />;
});

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        FIELD,
        "pr-8 [color-scheme:light] dark:[color-scheme:dark] [&>option]:bg-white [&>option]:text-gray-900 dark:[&>option]:bg-[#18181b] dark:[&>option]:text-white",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(FIELD, "min-h-[80px] resize-y", className)} {...props} />;
}

export function Field({ label, children, hint, className }: { label: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-xs font-medium text-gray-600 dark:text-white/70">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-gray-400 dark:text-white/40">{hint}</span>}
    </label>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search…", className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/40" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-9" />
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-3 py-2">
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function StarRating({ value, onChange, size = 18 }: { value: number | null; onChange?: (v: number) => void; size?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onMouseEnter={() => onChange && setHover(n)}
          onClick={() => onChange?.(n)}
          className={cn("transition-transform", onChange && "hover:scale-110 cursor-pointer", !onChange && "cursor-default")}
          aria-label={`${n} star`}
        >
          <Star
            width={size}
            height={size}
            className={n <= shown ? "fill-amber-400 text-amber-400" : "text-gray-300 dark:text-white/20"}
          />
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { value: T; label: React.ReactNode }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn("inline-flex bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-1 overflow-x-auto max-w-full scrollbar-hide", className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap",
            value === t.value
              ? "bg-white dark:bg-white/10 text-black dark:text-white shadow-sm dark:shadow-none"
              : "text-gray-500 dark:text-white/60 hover:text-black dark:hover:text-white",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  const widths = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-full bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]",
          widths[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-gray-100 dark:border-white/5">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-black dark:text-white">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-black hover:bg-black/5 dark:hover:text-white dark:hover:bg-white/10" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex justify-end gap-2 flex-wrap">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  danger,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="text-sm text-gray-600 dark:text-white/70">{message}</div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Table helpers                                                       */
/* ------------------------------------------------------------------ */

export function Table({ children, minWidth = 640 }: { children: React.ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn("px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider bg-gray-50 dark:bg-white/[0.03] border-b border-gray-200 dark:border-white/10", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-4 py-3 text-sm text-gray-700 dark:text-white/80 border-b border-gray-100 dark:border-white/5", className)} {...props}>
      {children}
    </td>
  );
}

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

type Toast = { id: number; message: string; tone: "success" | "error" | "info" };
const ToastContext = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-auto">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-start gap-3 bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 shadow-xl rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-white/90 animate-[slideUp_.2s_ease-out]"
          >
            {t.tone === "success" && <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />}
            {t.tone === "error" && <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />}
            {t.tone === "info" && <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

export function Spinner({ className }: { className?: string }) {
  return <div className={cn("w-6 h-6 border-2 border-gray-300 dark:border-white/20 border-t-black dark:border-t-white rounded-full animate-spin", className)} />;
}

export function FullPageLoader() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-black">
      <Spinner />
    </div>
  );
}

export function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
        checked ? "bg-green-500" : "bg-gray-300 dark:bg-white/15",
      )}
    >
      <span className={cn("absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform", checked && "translate-x-4")} />
    </button>
  );
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label?: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none group">
      <input type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4 rounded border-gray-300 dark:border-white/20 accent-black dark:accent-white" />
      {label && <span className={cn("text-sm", checked ? "text-gray-400 dark:text-white/40 line-through" : "text-gray-700 dark:text-white/80")}>{label}</span>}
    </label>
  );
}
