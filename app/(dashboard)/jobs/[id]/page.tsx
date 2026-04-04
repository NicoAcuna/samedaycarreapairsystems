'use client'
import { useState, use } from 'react'
import { useRouter } from 'next/navigation'

// Simulación — después vendrá de Supabase según el ID
const JOBS: Record<string, {
  id: string; name: string; type: string; client: string;
  vehicle: string; plate: string; date: string; time: string;
  location: string; odometer: string; status: string; overdue: boolean;
}> = {
  '1': { id: '1', name: 'Pre-Purchase Inspection', type: 'Pre-Purchase', client: 'Jesus Nunez', vehicle: 'Toyota RAV4 2015', plate: 'ABC-123', date: '29 Mar 2026', time: '9:00 am', location: 'Waverley, NSW', odometer: '259,865 km', status: 'in_progress', overdue: false },
  '2': { id: '2', name: 'Minor Service', type: 'Service', client: 'Octa Juarez', vehicle: 'Honda CRV 2008', plate: 'BFW34T', date: '29 Mar 2026', time: '11:30 am', location: 'Bondi, NSW', odometer: '268,172 km', status: 'pending', overdue: false },
  '3': { id: '3', name: 'Diagnosis', type: 'Diagnosis', client: 'Luis Pérez', vehicle: 'Ford Ranger 2020', plate: 'QWE-789', date: '26 Mar 2026', time: '2:00 pm', location: 'Auburn, NSW', odometer: '88,450 km', status: 'pending', overdue: true },
  '4': { id: '4', name: 'Brake & Rotor Repair', type: 'Repair', client: 'Carlos Méndez', vehicle: 'Toyota Camry 2019', plate: 'XYZ-321', date: '27 Mar 2026', time: '4:00 pm', location: 'Parramatta, NSW', odometer: '74,200 km', status: 'completed', overdue: false },
}

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  'Pre-Purchase': { bg: 'bg-blue-50',   text: 'text-blue-700'   },
  'Service':      { bg: 'bg-green-50',  text: 'text-green-700'  },
  'Diagnosis':    { bg: 'bg-purple-50', text: 'text-purple-700' },
  'Repair':       { bg: 'bg-orange-50', text: 'text-orange-700' },
}

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  in_progress: { label: 'In progress', bg: 'bg-orange-50',  text: 'text-orange-700', dot: 'bg-orange-500' },
  pending:     { label: 'Pending',     bg: 'bg-neutral-100', text: 'text-neutral-500', dot: 'bg-neutral-400' },
  completed:   { label: 'Completed',  bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-500'  },
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const job = JOBS[id] || JOBS['1']
  const t = TYPE_STYLES[job.type]
  const [status, setStatus] = useState(job.status)
  const s = STATUS_STYLES[status]

  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showComplete, setShowComplete] = useState(false)

  const ctaLabel =
    status === 'completed'   ? null :
    status === 'in_progress' ? 'Continue job →' : 'Start job →'

  return (
    <div className="p-6 max-w-3xl">

      {/* Back */}
      <button onClick={() => router.back()} className="text-sm text-neutral-500 hover:text-neutral-700 mb-6 flex items-center gap-1">
        ← Back to jobs
      </button>

      {/* Header card */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between mb-4 pb-4 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${t.bg} ${t.text}`}>{job.type}</span>
              <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${s.bg} ${s.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot} inline-block`}></span>
                {s.label}
              </span>
              {job.overdue && <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-50 text-red-600">Overdue</span>}
            </div>
            <h1 className="text-lg font-semibold text-neutral-900">{job.name}</h1>
            <p className="text-sm text-neutral-500 mt-1">{job.client} · {job.vehicle} · {job.date}</p>
          </div>
          {ctaLabel && (
            <button
              onClick={() => router.push(`/jobs/${job.id}/flow`)}
              className="bg-neutral-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-neutral-700 transition-colors flex-shrink-0"
            >
              {ctaLabel}
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Client',     value: job.client   },
            { label: 'Vehicle',    value: job.vehicle  },
            { label: 'Plate',      value: job.plate    },
            { label: 'Date',       value: `${job.date} · ${job.time}` },
            { label: 'Location',   value: job.location },
            { label: 'Odometer',   value: job.odometer },
          ].map((row) => (
            <div key={row.label}>
              <div className="text-xs text-neutral-400 mb-1">{row.label}</div>
              <div className="text-sm font-medium text-neutral-900">{row.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Status banner */}
      {job.status === 'pending' && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 mb-4 text-center">
          <div className="text-sm text-neutral-500 mb-3">This job hasn't been started yet.</div>
          <button
            onClick={() => router.push(`/jobs/${job.id}/flow`)}
            className="bg-neutral-900 text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-neutral-700 transition-colors"
          >
            Start job →
          </button>
        </div>
      )}

      {job.status === 'in_progress' && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 mb-4 flex items-center justify-between">
          <div className="text-sm text-orange-700">This job is in progress. Resume where you left off.</div>
          <button
            onClick={() => setShowComplete(true)}
            className="bg-green-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-green-700 transition-colors flex-shrink-0"
          >
            Mark as completed ✓
          </button>
        </div>
      )}

      {job.status === 'completed' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-4 text-center">
          <div className="text-sm text-green-700 mb-1 font-medium">Job completed</div>
          <div className="text-xs text-green-600">Report generated and sent to client.</div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowEdit(true)}
          className="text-sm px-4 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600"
        >
          Edit details
        </button>
        <button
          onClick={() => setShowDelete(true)}
          className="text-sm px-4 py-2 border border-red-200 rounded-lg hover:bg-red-50 text-red-600"
        >
          Delete job
        </button>
      </div>

      {/* Edit modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-20">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-neutral-900">Edit job details</h2>
              <button onClick={() => setShowEdit(false)} className="text-neutral-400 hover:text-neutral-600 text-xl">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Date</label>
                <input defaultValue={job.date} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-neutral-400" />
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Time</label>
                <input defaultValue={job.time} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-neutral-400" />
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Location</label>
                <input defaultValue={job.location} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-neutral-400" />
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Odometer (km)</label>
                <input defaultValue={job.odometer} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-neutral-400" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowEdit(false)} className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600">Cancel</button>
              <button onClick={() => setShowEdit(false)} className="flex-1 py-2 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-700">Save changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Complete confirmation modal */}
      {showComplete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-20">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-lg">✓</div>
            <h2 className="text-base font-semibold text-neutral-900 mb-2">Mark as completed?</h2>
            <p className="text-sm text-neutral-500 mb-5">This will mark <strong>{job.name}</strong> as completed. You can still view and edit the job after.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowComplete(false)} className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600">Cancel</button>
              <button onClick={() => { setShowComplete(false); router.push('/jobs') }} className="flex-1 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">Yes, complete</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-20">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-lg">⚠️</div>
            <h2 className="text-base font-semibold text-neutral-900 mb-2">Delete this job?</h2>
            <p className="text-sm text-neutral-500 mb-5">This will permanently delete <strong>{job.name}</strong> for {job.client}. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600">Cancel</button>
              <button onClick={() => { setShowDelete(false); router.push('/jobs') }} className="flex-1 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600">Yes, delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
