import Link from "next/link";
import Image from "next/image";

export default function SignupPage() {
  return (
    <div className="w-full flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <h1 className="text-[28px] font-semibold text-black dark:text-white tracking-tight transition-colors">Create Organization</h1>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black dark:text-white transition-colors">
          <path d="M19 21V5C19 4.46957 18.7893 3.96086 18.4142 3.58579C18.0391 3.21071 17.5304 3 17 3H7C6.46957 3 5.96086 3.21071 5.58579 3.58579C5.21071 3.96086 5 4.46957 5 5V21M3 21H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 7H15M9 11H15M9 15H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      
      <p className="text-sm text-gray-500 dark:text-white/60 mb-8 font-medium transition-colors">
        Already have an account? <Link href="/login" className="text-black dark:text-white font-semibold hover:underline decoration-1 underline-offset-2 transition-colors">log in</Link>
      </p>

      <form className="flex flex-col gap-5 w-full">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-gray-600 dark:text-white/70 transition-colors">Name</label>
          <input 
            type="text" 
            placeholder="john doe" 
            className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20 focus:border-gray-300 dark:focus:border-white/30 transition-all shadow-sm dark:shadow-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-gray-600 dark:text-white/70 transition-colors">Email</label>
          <input 
            type="email" 
            placeholder="guy@gmail.com" 
            className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20 focus:border-gray-300 dark:focus:border-white/30 transition-all shadow-sm dark:shadow-none"
            defaultValue="guy@gmail.com"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-gray-600 dark:text-white/70 transition-colors">Password</label>
          <input 
            type="password" 
            placeholder="••••••••••••" 
            className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20 focus:border-gray-300 dark:focus:border-white/30 transition-all shadow-sm dark:shadow-none"
            defaultValue="password123"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-gray-600 dark:text-white/70 transition-colors">Organization Name</label>
          <input 
            type="text" 
            placeholder="acme Inc." 
            className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20 focus:border-gray-300 dark:focus:border-white/30 transition-all shadow-sm dark:shadow-none"
          />
        </div>

        <div className="flex items-center gap-2 mt-2">
          <div className="w-4 h-4 rounded border border-gray-300 dark:border-white/30 bg-transparent flex items-center justify-center cursor-pointer hover:border-gray-500 dark:hover:border-white/50 transition-colors">
            {/* Custom Checkbox */}
          </div>
          <span className="text-[13px] text-gray-500 dark:text-white/60 font-medium transition-colors">
            I agree to <Link href="#" className="text-black dark:text-white font-semibold hover:underline transition-colors">Terms of Service</Link> and <Link href="#" className="text-black dark:text-white font-semibold hover:underline transition-colors">Privacy Policy</Link>.
          </span>
        </div>

        <Link href="/dashboard" className="mt-4 w-fit bg-black dark:bg-white text-white dark:text-black text-sm font-semibold px-8 py-3 rounded-full hover:bg-gray-900 dark:hover:bg-gray-200 transition-colors shadow-lg dark:shadow-[0_0_20px_rgba(255,255,255,0.1)]">
          Create
        </Link>
      </form>
    </div>
  );
}
