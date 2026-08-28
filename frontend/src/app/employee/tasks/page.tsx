"use client";
import { useState } from "react";

export default function EmployeeTasksPage() {
  const [viewMode, setViewMode] = useState<"list" | "board">("list");

  return (
    <div className="w-full flex flex-col gap-8">
      {/* Header with View Toggle */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-black dark:text-white tracking-tight transition-colors">My Tasks</h1>
          <p className="text-sm text-gray-500 dark:text-white/50 transition-colors">Your personal prioritized task list.</p>
        </div>
        
        {/* Toggle Switch */}
        <div className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-1 flex items-center transition-colors">
          <button 
            onClick={() => setViewMode("list")}
            className={`px-4 py-1.5 text-xs font-medium rounded shadow transition-all ${viewMode === "list" ? "bg-white dark:bg-white/10 text-black dark:text-white shadow-sm dark:shadow-none" : "text-gray-500 dark:text-white/60 hover:text-black dark:hover:text-white"}`}
          >
            List View
          </button>
          <button 
            onClick={() => setViewMode("board")}
            className={`px-4 py-1.5 text-xs font-medium rounded transition-all ${viewMode === "board" ? "bg-white dark:bg-white/10 text-black dark:text-white shadow-sm dark:shadow-none" : "text-gray-500 dark:text-white/60 hover:text-black dark:hover:text-white"}`}
          >
            Kanban Board
          </button>
        </div>
      </div>

      {/* Conditional Rendering of Views */}
      {viewMode === "list" ? (
        <div className="flex flex-col gap-3">
          {/* List View Items */}
          <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 group cursor-pointer hover:border-gray-300 dark:hover:border-white/20 transition-all shadow-sm dark:shadow-none">
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-white/30 shrink-0 mt-0.5 group-hover:border-gray-400 dark:group-hover:border-white/60 transition-colors"></div>
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-base text-black dark:text-white font-medium transition-colors">Review Q3 Payroll Reports</span>
                <span className="text-xs text-red-600 dark:text-red-400 font-bold uppercase tracking-wider transition-colors">High</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-white/50 transition-colors">Ensure all reimbursements are processed before end of quarter.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 group cursor-pointer hover:border-gray-300 dark:hover:border-white/20 transition-all shadow-sm dark:shadow-none">
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-white/30 shrink-0 mt-0.5 group-hover:border-gray-400 dark:group-hover:border-white/60 transition-colors"></div>
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-base text-black dark:text-white font-medium transition-colors">Design System Audit</span>
                <span className="text-xs text-gray-400 dark:text-white/40 font-bold uppercase tracking-wider transition-colors">Low</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-white/50 transition-colors">Check for inconsistencies in the component library across the new dashboard.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
          {/* Kanban Board View Items */}
          <div className="flex flex-col gap-4 min-w-[300px] w-[300px]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <h3 className="text-sm font-medium text-black dark:text-white transition-colors">To Do</h3>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 flex flex-col gap-3 transition-colors shadow-sm dark:shadow-none">
                <span className="text-sm font-medium text-black dark:text-white/90 transition-colors">Review Q3 Payroll Reports</span>
                <span className="text-[10px] uppercase font-bold text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-400/10 px-2 py-1 rounded w-fit transition-colors">High</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 min-w-[300px] w-[300px]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <h3 className="text-sm font-medium text-black dark:text-white transition-colors">In Progress</h3>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 flex flex-col gap-3 transition-colors shadow-sm dark:shadow-none">
                <span className="text-sm font-medium text-black dark:text-white/90 transition-colors">Design System Audit</span>
                <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-white/40 bg-gray-200 dark:bg-white/5 px-2 py-1 rounded w-fit transition-colors">Low</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
