export default function AdminDashboardPage() {
  return (
    <div className="w-full flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-black dark:text-white tracking-tight transition-colors">Admin Overview</h1>
        <p className="text-sm text-gray-500 dark:text-white/50 transition-colors">Organization-wide metrics and approvals.</p>
      </div>

      {/* Top Context Widgets (HR & Work Capacity) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 flex flex-col gap-3 transition-colors shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-white/60 transition-colors">Total Headcount</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-black dark:text-white transition-colors">142</span>
            <span className="text-xs text-green-400 font-medium">+12 this quarter</span>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 flex flex-col gap-3 transition-colors shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-white/60 transition-colors">Pending Leave Approvals</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-black dark:text-white transition-colors">7</span>
            <span className="text-xs text-orange-400 font-medium">Requires action</span>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 flex flex-col gap-3 transition-colors shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-white/60 transition-colors">Org Capacity</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-black dark:text-white transition-colors">92%</span>
            <span className="text-xs text-gray-400 dark:text-white/40 transition-colors">11 on leave</span>
          </div>
        </div>
      </div>

      {/* Unified Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium text-black dark:text-white transition-colors">Global Activity Feed</h2>
          </div>
          <div className="flex flex-col gap-3">
            <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 flex gap-4 items-start transition-colors">
              <div className="flex flex-col gap-1">
                <p className="text-sm text-gray-700 dark:text-white/80 transition-colors"><span className="font-semibold text-black dark:text-white transition-colors">System</span> automatically assigned Onboarding workflows for <span className="text-black dark:text-white font-medium transition-colors">3 new hires</span>.</p>
                <span className="text-xs text-gray-400 dark:text-white/40 transition-colors">1 hour ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
