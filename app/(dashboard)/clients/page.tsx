export default function ClientsPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Clients</h1>
          <p className="text-sm text-neutral-500 mt-1">All clients</p>
        </div>
        <button className="bg-neutral-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-neutral-700 transition-colors">
          + New client
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Search by name, phone or email..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-neutral-400"
        />
        <span className="absolute left-3 top-2.5 text-neutral-400 text-sm">🔍</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Name</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Phone</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Email</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Vehicles</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Jobs</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Last job</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer">
              <td className="px-4 py-3 font-medium text-neutral-900">Jesus Nunez</td>
              <td className="px-4 py-3 text-neutral-500">+61 413 852 877</td>
              <td className="px-4 py-3 text-neutral-500">jesus@email.com</td>
              <td className="px-4 py-3 text-neutral-900">1</td>
              <td className="px-4 py-3 text-neutral-900">1</td>
              <td className="px-4 py-3 text-neutral-500">Today</td>
              <td className="px-4 py-3">
                <button className="text-xs px-3 py-1 border border-neutral-200 rounded-lg hover:bg-neutral-50">View</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div className="px-4 py-8 text-center text-sm text-neutral-400">
          No more clients
        </div>
      </div>
    </div>
  )
}
