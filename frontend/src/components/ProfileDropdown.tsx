"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "next-themes";

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Hydration safety for theme
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        className="w-9 h-9 rounded-full bg-gradient-to-tr from-gray-500 to-gray-700 flex items-center justify-center text-sm font-semibold text-white border-2 border-black/10 dark:border-white/10 shadow-[0_0_10px_rgba(0,0,0,0.1)] dark:shadow-[0_0_10px_rgba(255,255,255,0.1)] cursor-pointer hover:border-black/30 dark:hover:border-white/30 transition-all"
        onClick={() => setIsOpen(!isOpen)}
      >
        JD
      </div>

      {isOpen && (
        <div className="absolute top-12 right-0 w-64 bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl py-2 flex flex-col z-50 text-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          
          <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
            <p className="text-black dark:text-white font-medium">John Doe</p>
            <p className="text-gray-500 dark:text-white/50 text-xs">johndoe@workplace.com</p>
          </div>
          
          <div className="flex flex-col py-2 border-b border-gray-100 dark:border-white/5">
            <Link href="/admin" className="px-4 py-2 text-gray-700 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white flex items-center justify-between">
              Dashboard (Admin)
            </Link>
            <Link href="/employee" className="px-4 py-2 text-gray-700 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white flex items-center justify-between">
              Dashboard (Employee)
            </Link>
            <Link href="#" className="px-4 py-2 text-gray-700 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white flex items-center justify-between">
              Account Settings
            </Link>
            <Link href="#" className="px-4 py-2 text-gray-700 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white flex items-center justify-between">
              Create Team
            </Link>
          </div>

          {/* Theme Selector */}
          <div className="flex flex-col py-2 border-b border-gray-100 dark:border-white/5 relative group">
            <div className="px-4 py-2 text-gray-700 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-black dark:hover:text-white flex items-center justify-between cursor-pointer">
              Theme
              <span className="text-xs text-gray-400 dark:text-white/40">{mounted ? (theme?.charAt(0).toUpperCase() + theme?.slice(1)) : "System"} &rsaquo;</span>
            </div>
            
            {/* Theme Hover Sub-menu */}
            <div className="absolute top-0 right-full mr-1 w-32 bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-lg shadow-2xl py-2 hidden group-hover:flex flex-col z-50">
              <button onClick={() => setTheme("system")} className={`px-4 py-2 text-left text-xs ${theme === 'system' ? 'text-black dark:text-white font-medium bg-gray-50 dark:bg-white/5' : 'text-gray-500 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5'}`}>System</button>
              <button onClick={() => setTheme("light")} className={`px-4 py-2 text-left text-xs ${theme === 'light' ? 'text-black dark:text-white font-medium bg-gray-50 dark:bg-white/5' : 'text-gray-500 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5'}`}>Light</button>
              <button onClick={() => setTheme("dark")} className={`px-4 py-2 text-left text-xs ${theme === 'dark' ? 'text-black dark:text-white font-medium bg-gray-50 dark:bg-white/5' : 'text-gray-500 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5'}`}>Dark</button>
            </div>
          </div>

          <div className="flex flex-col py-2 border-b border-gray-100 dark:border-white/5">
            <Link href="#" className="px-4 py-2 text-purple-600 dark:text-purple-400 font-medium hover:bg-purple-50 dark:hover:bg-purple-500/10 flex items-center justify-between">
              Upgrade to Pro
            </Link>
          </div>

          <div className="flex flex-col py-2">
            <Link href="/" className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-between">
              Log Out
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
