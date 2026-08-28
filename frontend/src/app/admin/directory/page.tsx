import Image from "next/image";

export default function DirectoryPage() {
  const employees = [
    { id: 1, name: "Sarah Jenkins", role: "VP of Marketing", dept: "Marketing", status: "Active", avatar: "SJ", color: "bg-purple-500" },
    { id: 2, name: "Mike Ross", role: "DevOps Engineer", dept: "Engineering", status: "On Leave", avatar: "MR", color: "bg-orange-500" },
    { id: 3, name: "John Doe", role: "Frontend Lead", dept: "Engineering", status: "Active", avatar: "JD", color: "bg-blue-500" },
    { id: 4, name: "Alice Smith", role: "Product Designer", dept: "Design", status: "Active", avatar: "AS", color: "bg-pink-500" },
    { id: 5, name: "Robert Chen", role: "Data Scientist", dept: "Data", status: "Active", avatar: "RC", color: "bg-teal-500" },
  ];

  return (
    <div className="w-full flex flex-col gap-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-white tracking-tight">Employee Directory</h1>
          <p className="text-sm text-white/50">Manage and view all members of the organization.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search directory..." 
              className="w-full md:w-64 bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/20 transition-all"
            />
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-white/40" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <button className="bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors hidden sm:block">
            Invite Member
          </button>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="p-4 text-xs font-semibold text-white/60 uppercase tracking-wider">Employee</th>
                <th className="p-4 text-xs font-semibold text-white/60 uppercase tracking-wider">Role</th>
                <th className="p-4 text-xs font-semibold text-white/60 uppercase tracking-wider">Department</th>
                <th className="p-4 text-xs font-semibold text-white/60 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-semibold text-white/60 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${emp.color}/20 text-${emp.color.replace('bg-', '')}`}>
                        {emp.avatar}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">{emp.name}</span>
                        <span className="text-xs text-white/40">{emp.name.split(' ')[0].toLowerCase()}@workplace.com</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-white/80">{emp.role}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-white/10 text-white/80">
                      {emp.dept}
                    </span>
                  </td>
                  <td className="p-4">
                    {emp.status === "Active" ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-sm text-white/80">{emp.status}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        <span className="text-sm text-orange-400 font-medium">{emp.status}</span>
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-white/40 hover:text-white transition-colors p-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 13C12.5523 13 13 12.5523 13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 13C19.5523 13 20 12.5523 20 12C20 11.4477 19.5523 11 19 11C18.4477 11 18 11.4477 18 12C18 12.5523 18.4477 13 19 13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 13C5.55228 13 6 12.5523 6 12C6 11.4477 5.55228 11 5 11C4.44772 11 4 11.4477 4 12C4 12.5523 4.44772 13 5 13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
