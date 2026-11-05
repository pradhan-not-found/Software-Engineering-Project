"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { FormError } from "@/components/ui";
import { cn } from "@/lib/utils";

const INPUT =
  "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20 focus:border-gray-300 dark:focus:border-white/30 transition-all";

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

export default function SignupPage() {
  const { signup, ready } = useStore();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", orgName: "" });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const s = strength(form.password);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.name.trim().length < 2) return setError("Enter your full name.");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError("Enter a valid email address.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    if (!form.orgName.trim()) return setError("Enter your organization name.");
    if (!agreed) return setError("Please accept the Terms of Service and Privacy Policy.");
    setBusy(true);
    setTimeout(() => {
      const res = signup(form);
      setBusy(false);
      if (!res.ok) return setError(res.error);
      router.push("/admin");
    }, 400);
  };

  return (
    <div className="w-full flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <h1 className="text-[28px] font-semibold text-black dark:text-white tracking-tight">Create Organization</h1>
        <Building2 className="w-6 h-6 text-black dark:text-white" />
      </div>
      <p className="text-sm text-gray-500 dark:text-white/60 mb-8 font-medium">
        Already have an account? <Link href="/login" className="text-black dark:text-white font-semibold hover:underline underline-offset-2">Log in</Link>
      </p>

      <form className="flex flex-col gap-5 w-full" onSubmit={submit}>
        <FormError message={error} />
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-gray-600 dark:text-white/70">Full name</label>
          <input type="text" autoComplete="name" placeholder="Jane Doe" value={form.name} onChange={set("name")} className={INPUT} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-gray-600 dark:text-white/70">Work email</label>
          <input type="email" autoComplete="email" placeholder="jane@company.com" value={form.email} onChange={set("email")} className={INPUT} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-gray-600 dark:text-white/70">Password</label>
          <input type="password" autoComplete="new-password" placeholder="At least 6 characters" value={form.password} onChange={set("password")} className={INPUT} />
          {form.password && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex gap-1 flex-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={cn("h-1 flex-1 rounded-full", i < s ? (s <= 1 ? "bg-red-500" : s <= 2 ? "bg-amber-500" : "bg-green-500") : "bg-gray-200 dark:bg-white/10")} />
                ))}
              </div>
              <span className="text-[11px] text-gray-500">{["Weak", "Weak", "Fair", "Good", "Strong"][s]}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-gray-600 dark:text-white/70">Organization name</label>
          <input type="text" placeholder="Acme Inc." value={form.orgName} onChange={set("orgName")} className={INPUT} />
        </div>
        <label className="flex items-center gap-2 mt-1 cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={() => setAgreed((a) => !a)} className="w-4 h-4 accent-black dark:accent-white" />
          <span className="text-[13px] text-gray-500 dark:text-white/60 font-medium">
            I agree to the <span className="text-black dark:text-white font-semibold">Terms of Service</span> and <span className="text-black dark:text-white font-semibold">Privacy Policy</span>.
          </span>
        </label>
        <button
          type="submit"
          disabled={busy || !ready}
          className="mt-2 w-fit bg-black dark:bg-white text-white dark:text-black text-sm font-semibold px-8 py-3 rounded-full hover:bg-gray-900 dark:hover:bg-gray-200 transition-colors shadow-lg flex items-center gap-2 disabled:opacity-60"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Create workspace
        </button>
      </form>
    </div>
  );
}
