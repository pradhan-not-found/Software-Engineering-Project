"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/seed";
import { isAdminRole } from "@/lib/utils";

const INPUT =
  "w-full px-4 py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20 focus:border-gray-300 dark:focus:border-white/30 transition-all shadow-sm dark:shadow-none";

function LoginForm() {
  const { login, ready } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const [demo, setDemo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickDemo = (value: string) => {
    setDemo(value);
    setError(null);
    setEmail(value);
    setPassword(value ? DEMO_PASSWORD : "");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) return setError("Please enter your email and password.");
    setLoading(true);
    try {
      const res = await login(email, password);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const next = params.get("next");
      const admin = isAdminRole(res.data!.role);
      if (next && next.startsWith("/") && (!next.startsWith("/admin") || admin)) router.push(next);
      else router.push(admin ? "/admin" : "/employee");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col">
      <h1 className="text-[32px] font-semibold text-black dark:text-white tracking-tight mb-2 transition-colors">Log in</h1>

      <p className="text-sm text-gray-500 dark:text-white/60 mb-10 font-medium transition-colors">
        Don&apos;t have an account? <Link href="/signup" className="text-black dark:text-white font-semibold hover:underline decoration-1 underline-offset-2 transition-colors">Sign up</Link>
      </p>

      <form className="flex flex-col gap-5 w-full" onSubmit={submit}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="demo" className="text-[13px] font-medium text-gray-600 dark:text-white/70 transition-colors">Demo account</label>
          <select id="demo" value={demo} onChange={(e) => pickDemo(e.target.value)} className={`${INPUT} dark:[color-scheme:dark]`}>
            <option value="">Select a role to try…</option>
            {DEMO_ACCOUNTS.map((a) => (
              <option key={a.email} value={a.email}>
                {a.label} — {a.description}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-[13px] font-medium text-gray-600 dark:text-white/70 transition-colors">Email</label>
          <input id="email" type="email" autoComplete="email" placeholder="guy@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-[13px] font-medium text-gray-600 dark:text-white/70 transition-colors">Password</label>
            <span className="text-[12px] text-gray-500 dark:text-white/50">Forgot password? Ask your HR admin.</span>
          </div>
          <input id="password" type="password" autoComplete="current-password" placeholder="••••••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT} />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={!ready || loading}
          className="mt-4 w-full bg-black dark:bg-white text-white dark:text-black text-sm font-semibold px-8 py-3.5 rounded-xl hover:bg-gray-900 dark:hover:bg-gray-200 transition-colors shadow-lg dark:shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-xl dark:hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center justify-center disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Log in"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
