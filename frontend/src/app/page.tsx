"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import ProfileDropdown from "@/components/ProfileDropdown";
import { useStore } from "@/lib/store";
import { isAdminRole } from "@/lib/utils";

export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { user, ready, logout } = useStore();
  const isLoggedIn = ready && !!user;
  const dashboardHref = user && isAdminRole(user.role) ? "/admin" : "/employee";

  return (
    <main className="relative min-h-screen w-full flex flex-col overflow-hidden font-sans selection:bg-black/20 dark:selection:bg-white/20">
      {/* Background Image & Advanced Overlays */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Image
          src="/bg.png"
          alt="Office Background"
          fill
          className="object-cover scale-105 transform-gpu"
          priority
        />
        {/* Multi-layered glass gradient overlay */}
        <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-[4px] transition-colors duration-300"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-white/95 via-white/60 to-white/95 dark:from-black/95 dark:via-black/60 dark:to-black/95 transition-colors duration-300"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,white_100%)] dark:bg-[radial-gradient(ellipse_at_center,transparent_0%,black_100%)] opacity-80 transition-colors duration-300"></div>
      </div>

      {/* Navigation Bar */}
      <div className="relative z-50 w-full px-4 md:px-6 pt-6 flex justify-center">
        <nav className="w-full max-w-[1400px] flex items-center justify-between px-2 py-4">
          <div className="flex items-center gap-12">
            {/* Logo */}
            <Link href="/" className="flex items-center relative z-50">
                <Image 
                  src="/logo.png" 
                  alt="Workplace Logo" 
                  width={130} 
                  height={30} 
                  className="w-[110px] md:w-[130px] h-auto object-contain brightness-0 dark:invert drop-shadow-[0_0_15px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all" 
                  priority
                />
              </Link>

              {/* Desktop Nav Links */}
              <div className="hidden md:flex items-center gap-8">
                <Link href="#" className="text-sm font-medium text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-all duration-300">Features</Link>
                <Link href="#" className="text-sm font-medium text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-all duration-300 flex items-center gap-1.5 group">
                  Resources
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-70 group-hover:opacity-100 transition-opacity">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
                <Link href="#" className="text-sm font-medium text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-all duration-300">Enterprise</Link>
                <Link href="#" className="text-sm font-medium text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-all duration-300">Pricing</Link>
            </div>
          </div>

          {/* Desktop Auth Actions / Logged In State */}
          <div className="hidden md:flex items-center gap-6">
            {isLoggedIn ? (
              <ProfileDropdown />
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-black/90 dark:text-white/90 hover:text-black dark:hover:text-white transition-colors duration-300">
                  Log In
                </Link>
                <Link href="/signup" className="relative group text-sm font-semibold text-white dark:text-black px-6 py-2.5 rounded-md bg-black dark:bg-white overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(0,0,0,0.1)] dark:shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-black dark:from-gray-100 dark:to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="relative z-10">Sign Up</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden relative z-50 p-2 text-white/80 hover:text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              {isMobileMenuOpen ? (
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              ) : (
                <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              )}
            </svg>
          </button>
        </nav>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="absolute top-24 left-4 right-4 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col gap-6 md:hidden shadow-2xl z-40">
            <div className="flex flex-col gap-4">
              <Link href="#" className="text-base font-medium text-white/80 hover:text-white">Features</Link>
              <Link href="#" className="text-base font-medium text-white/80 hover:text-white">Resources</Link>
              <Link href="#" className="text-base font-medium text-white/80 hover:text-white">Enterprise</Link>
              <Link href="#" className="text-base font-medium text-white/80 hover:text-white">Pricing</Link>
            </div>
            
            <div className="h-[1px] w-full bg-white/10"></div>
            
            {isLoggedIn ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-500 to-gray-700 flex items-center justify-center text-sm font-semibold text-white border border-white/10">
                    {user ? `${user.firstName[0]}${user.lastName[0]}` : ""}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white font-medium text-sm">{user ? `${user.firstName} ${user.lastName}` : ""}</span>
                    <span className="text-white/40 text-xs">{user?.email}</span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 pl-2 border-l border-white/10">
                  {user && isAdminRole(user.role) && <Link href="/admin" className="text-sm text-white/70 hover:text-white py-1">Dashboard (Admin)</Link>}
                  <Link href="/employee" className="text-sm text-white/70 hover:text-white py-1">Dashboard (Employee)</Link>
                  <Link href="/employee/profile" className="text-sm text-white/70 hover:text-white py-1">Account Settings</Link>
                  <button onClick={logout} className="text-left text-sm text-red-400 hover:text-red-300 py-1">Log Out</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Link href="/login" className="w-full text-center text-base font-medium text-white/90 border border-white/20 rounded-lg py-3 hover:bg-white/5">
                  Log In
                </Link>
                <Link href="/signup" className="w-full text-center text-base font-semibold text-black bg-white rounded-lg py-3 hover:bg-gray-100">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hero Section */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 md:px-16 w-full max-w-7xl mx-auto -mt-10">
        <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-24">
          
          {/* Left Side: Massive Workplace Logo */}
          <div className="flex-1 flex justify-center lg:justify-start w-full">
            <div className="relative inline-block w-full max-w-[300px] sm:max-w-[400px] lg:max-w-[500px]">
              <Image 
                src="/logo.png" 
                alt="Workplace Hero Logo" 
                width={500} 
                height={120} 
                className="w-full h-auto object-contain object-center lg:object-left brightness-0 dark:invert drop-shadow-[0_0_15px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] cursor-pointer transition-all" 
                priority
              />
            </div>
          </div>

          {/* Vertical Separator Line (visible on desktop between logo and text) */}
          <div className="hidden lg:block w-[1px] h-[160px] bg-gradient-to-b from-transparent via-black/10 dark:via-white/30 to-transparent transition-colors"></div>

          {/* Right Side: Hero Content & CTA */}
          <div className="flex-1 max-w-xl text-center lg:text-left flex flex-col items-center lg:items-start">
            <h2 className="text-3xl md:text-4xl lg:text-[42px] font-semibold text-black dark:text-white leading-[1.1] mb-6 tracking-tight drop-shadow-sm dark:drop-shadow-md transition-colors">
              The unified workspace for your entire company.
            </h2>
            <p className="text-lg md:text-xl text-black/60 dark:text-white/60 leading-relaxed mb-10 font-light max-w-md transition-colors">
              Powering tight, genuinely useful connections between HR and work data.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Link href={isLoggedIn ? dashboardHref : "/signup"} className="group relative w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-semibold bg-black text-white dark:bg-white dark:text-black px-8 py-4 rounded-xl hover:bg-gray-900 dark:hover:bg-gray-50 transition-all duration-300 shadow-xl dark:shadow-[0_0_20px_rgba(255,255,255,0.1)] dark:hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                {isLoggedIn ? "Go to Dashboard" : "Get Started"}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform group-hover:translate-x-1 transition-transform duration-300">
                  <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
              {!isLoggedIn && (
                <Link href="/login" className="w-full sm:w-auto flex items-center justify-center text-sm font-medium bg-black/5 dark:bg-white/5 text-black dark:text-white backdrop-blur-md border border-black/10 dark:border-white/10 px-8 py-4 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-all duration-300 hover:border-black/20 dark:hover:border-white/20">
                  Book a Demo
                </Link>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </main>
  );
}
