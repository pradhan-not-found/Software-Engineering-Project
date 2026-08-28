"use client";
import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-black font-sans selection:bg-white/20">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        {/* Glow effects */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-500/10 rounded-full blur-[120px] opacity-50"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] opacity-80"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 text-center">
        
        {/* Logo */}
        <Link href="/" className="mb-12 opacity-80 hover:opacity-100 transition-opacity duration-300">
          <Image 
            src="/logo.png" 
            alt="Workplace Logo" 
            width={120} 
            height={28} 
            className="w-[120px] h-auto object-contain brightness-0 invert drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" 
          />
        </Link>

        {/* 404 Text */}
        <div className="relative">
          <h1 className="text-[120px] md:text-[180px] font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/10 leading-none tracking-tighter drop-shadow-2xl">
            404
          </h1>
          {/* Decorative glass overlay over the text */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent mix-blend-overlay"></div>
        </div>

        <h2 className="mt-4 text-2xl md:text-3xl font-semibold text-white tracking-tight">
          Page Not Found
        </h2>
        
        <p className="mt-4 text-base md:text-lg text-white/50 max-w-md font-light leading-relaxed">
          It looks like the page you are looking for has been moved, deleted, or never existed in the first place.
        </p>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <button 
            onClick={() => window.history.back()}
            className="w-full sm:w-auto px-6 py-3 rounded-lg text-sm font-medium text-white/80 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all backdrop-blur-sm"
          >
            Go Back
          </button>
          <Link 
            href="/"
            className="w-full sm:w-auto px-6 py-3 rounded-lg text-sm font-semibold text-black bg-white hover:bg-gray-100 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)]"
          >
            Return to Homepage
          </Link>
        </div>
        
      </div>
    </main>
  );
}
