export default function VehiclesPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Vehicles</h1>
          <p className="text-sm text-neutral-500 mt-1">All vehicles</p>
        </div>
        <button className="bg-neutral-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-neutral-700 transition-colors">
          + New vehicle
        </button>
      </div>
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="px-4 py-8 text-center text-sm text-neutral-400">
          No vehicles yet
        </div>
      </div>
    </div>
  )
}
