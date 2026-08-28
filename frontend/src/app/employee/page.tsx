export default function EmployeeDashboardPage() {
  return (
    <div className="w-full flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-black dark:text-white tracking-tight transition-colors">Good morning, John</h1>
        <p className="text-sm text-gray-500 dark:text-white/50 transition-colors">Here is what&apos;s happening with your work today.</p>
      </div>

      {/* Top Context Widgets (HR & Work Capacity) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 flex flex-col gap-3 transition-colors shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-white/60 transition-colors">My Active Tasks</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-black dark:text-white transition-colors">4</span>
            <span className="text-xs text-red-400 font-medium">1 due today</span>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 flex flex-col gap-3 transition-colors shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-white/60 transition-colors">Leave Balance</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-black dark:text-white transition-colors">12</span>
            <span className="text-xs text-gray-400 dark:text-white/40 font-medium transition-colors">days remaining</span>
          </div>
        </div>
      </div>

      {/* Unified Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium text-black dark:text-white transition-colors">Personal Activity Feed</h2>
          </div>
          <div className="flex flex-col gap-3">
            <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 flex gap-4 items-start transition-colors">
              <div className="flex flex-col gap-1">
                <p className="text-sm text-gray-700 dark:text-white/80 transition-colors"><span className="font-semibold text-green-600 dark:text-green-400">HR</span> approved your leave request for Oct 12th.</p>
                <span className="text-xs text-gray-400 dark:text-white/40 transition-colors">2 hours ago</span>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 flex gap-4 items-start transition-colors">
              <div className="flex flex-col gap-1">
                <p className="text-sm text-gray-700 dark:text-white/80 transition-colors"><span className="font-semibold text-black dark:text-white transition-colors">Sarah Jenkins</span> assigned you to <span className="text-black dark:text-white font-medium transition-colors">Design System Audit</span>.</p>
                <span className="text-xs text-gray-400 dark:text-white/40 transition-colors">Yesterday</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
