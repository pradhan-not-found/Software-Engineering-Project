import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="w-full flex flex-col">
      <h1 className="text-[32px] font-semibold text-black dark:text-white tracking-tight mb-2 transition-colors">Log in</h1>
      
      <p className="text-sm text-gray-500 dark:text-white/60 mb-10 font-medium transition-colors">
        Don&apos;t have an account? <Link href="/signup" className="text-black dark:text-white font-semibold hover:underline decoration-1 underline-offset-2 transition-colors">Sign up</Link>
      </p>

      <form className="flex flex-col gap-5 w-full">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-gray-600 dark:text-white/70 transition-colors">Email</label>
          <input 
            type="email" 
            placeholder="guy@gmail.com" 
            className="w-full px-4 py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20 focus:border-gray-300 dark:focus:border-white/30 transition-all shadow-sm dark:shadow-none"
            defaultValue="guy@gmail.com"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-medium text-gray-600 dark:text-white/70 transition-colors">Password</label>
            <Link href="#" className="text-[12px] text-gray-500 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors">Forgot password?</Link>
          </div>
          <input 
            type="password" 
            placeholder="••••••••••••" 
            className="w-full px-4 py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20 focus:border-gray-300 dark:focus:border-white/30 transition-all shadow-sm dark:shadow-none"
            defaultValue="password123"
          />
        </div>

        <Link href="/dashboard" className="mt-4 w-full bg-black dark:bg-white text-white dark:text-black text-sm font-semibold px-8 py-3.5 rounded-xl hover:bg-gray-900 dark:hover:bg-gray-200 transition-colors shadow-lg dark:shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-xl dark:hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center justify-center">
          Log in
        </Link>
      </form>
    </div>
  );
}
