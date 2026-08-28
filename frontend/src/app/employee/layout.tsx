"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import ProfileDropdown from "@/components/ProfileDropdown";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = {
    self: [
      { name: "My Profile", href: "/employee/profile", icon: <><path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></> },
      { name: "My Leaves", href: "/employee/leaves", icon: <><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></> },
    ],
    work: [
      { name: "My Tasks & Kanban", href: "/employee/tasks", icon: <><path d="M9 11L12 14L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></> },
    ]
  };

  return (
    <div className="flex h-screen w-full bg-white dark:bg-black text-black dark:text-white font-sans overflow-hidden transition-colors duration-300">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-[260px] flex-shrink-0 flex flex-col bg-gray-50 dark:bg-[#050505] border-r border-gray-200 dark:border-white/5 h-full transition-all duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Sidebar Header (Logo) */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-white/5 shrink-0 transition-colors">
          <Link href="/employee" className="flex items-center gap-2">
            <Image 
              src="/logo.png" 
              alt="Workplace Logo" 
              width={160} 
              height={38} 
              className="w-[120px] h-auto object-contain brightness-0 dark:invert dark:opacity-90 transition-all" 
            />
            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 px-1.5 py-0.5 rounded transition-colors">Team</span>
          </Link>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto scrollbar-hide py-6 px-4 flex flex-col gap-8">
          <Link 
            href="/employee" 
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors ${
              pathname === '/employee' ? 'bg-black/5 dark:bg-white/10 text-black dark:text-white' : 'text-gray-500 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center opacity-70">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21 20.4142 21C20.0391 21 19.5304 21 19 21H5C4.46957 21 3.96086 21 3.58579 21C3.21071 21 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            Employee Hub
          </Link>

          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wider px-3 mb-1 transition-colors">Self Service</span>
            {navLinks.self.map((link) => (
              <Link 
                key={link.name}
                href={link.href} 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  pathname === link.href ? 'bg-black/5 dark:bg-white/10 text-black dark:text-white' : 'text-gray-500 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <div className="w-5 h-5 flex items-center justify-center opacity-70">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">{link.icon}</svg>
                </div>
                {link.name}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wider px-3 mb-1 transition-colors">My Work</span>
            {navLinks.work.map((link) => (
              <Link 
                key={link.name}
                href={link.href} 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  pathname === link.href ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="w-5 h-5 flex items-center justify-center opacity-70">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">{link.icon}</svg>
                </div>
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full bg-white dark:bg-[#0a0a0a] min-w-0 transition-colors duration-300">
        <header className="h-16 flex-shrink-0 flex items-center justify-between px-4 md:px-8 border-b border-gray-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a] transition-colors duration-300">
          <div className="flex items-center gap-4 flex-1">
            <button className="md:hidden p-2 text-gray-500 dark:text-white/60 hover:text-black dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" onClick={() => setIsMobileMenuOpen(true)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
          <div className="flex items-center gap-4 ml-4">
            <ProfileDropdown />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 md:p-8">
          <div className="max-w-[1200px] mx-auto pb-12">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
