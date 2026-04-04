'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const JOBS = [
  { id: '1', name: 'Pre-Purchase Inspection', type: 'Pre-Purchase', client: 'Jesus Nunez', vehicle: 'Toyota RAV4 2015', plate: 'ABC-123', date: '29 Mar 2026', time: '9:00 am', status: 'in_progress', overdue: false },
  { id: '2', name: 'Minor Service', type: 'Service', client: 'Octa Juarez', vehicle: 'Honda CRV 2008', plate: 'BFW34T', date: '29 Mar 2026', time: '11:30 am', status: 'pending', overdue: false },
  { id: '3', name: 'Diagnosis', type: 'Diagnosis', client: 'Luis Pérez', vehicle: 'Ford Ranger 2020', plate: 'QWE-789', date: '26 Mar 2026', time: '2:00 pm', status: 'pending', overdue: true },
  { id: '4', name: 'Brake & Rotor Repair', type: 'Repair', client: 'Carlos Méndez', vehicle: 'Toyota Camry 2019', plate: 'XYZ-321', date: '27 Mar 2026', time: '4:00 pm', status: 'completed', overdue: false },
]

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

const JOB_TYPES = ['Pre-Purchase', 'Service', 'Diagnosis', 'Repair']

export default function JobsPage() {
  const router = useRouter()
  const [typeFilter, setTypeFilter] = useState('All')
  const [showModal, setShowModal] = useState(false)

  const filtered = JOBS.filter(j => typeFilter === 'All' || j.type === typeFilter)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Jobs</h1>
          <p className="text-sm text-neutral-500 mt-1">All jobs</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-neutral-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-neutral-700 transition-colors"
        >
          + New job
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {['All', ...JOB_TYPES].map((tab) => (
          <button
            key={tab}
            onClick={() => setTypeFilter(tab)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              typeFilter === tab
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Job</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Client</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Date</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Type</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Status</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((job) => {
              const t = TYPE_STYLES[job.type]
              const s = STATUS_STYLES[job.status]
              return (
                <tr
                  key={job.id}
                  onClick={() => router.push(`/jobs/${job.id}`)}
                  className={`border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer last:border-b-0 ${job.overdue ? 'bg-red-50/30' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900">{job.name}</div>
                    <div className="text-xs text-neutral-400 mt-0.5">{job.vehicle}</div>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{job.client}</td>
                  <td className="px-4 py-3">
                    <div className="text-neutral-600">{job.date}</div>
                    <div className="text-xs text-neutral-400">{job.time}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${t.bg} ${t.text}`}>{job.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 w-fit ${s.bg} ${s.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>
                      {s.label}
                      {job.overdue && <span className="ml-1 text-red-500">· Overdue</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/jobs/${job.id}`) }}
                      className="text-xs px-3 py-1 border border-neutral-200 rounded-lg hover:bg-neutral-100 text-neutral-600"
                    >
                      {job.status === 'completed' ? 'View' : job.status === 'in_progress' ? 'Continue' : 'Start'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* New Job Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-20">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-semibold text-neutral-900">New job</h2>
              <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-neutral-600 text-xl leading-none">×</button>
            </div>
            <p className="text-sm text-neutral-500 mb-5">Select the type of work</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { type: 'Pre-Purchase', desc: 'Full vehicle inspection' },
                { type: 'Service',      desc: 'Oil change & maintenance' },
                { type: 'Diagnosis',    desc: 'Find & report the issue' },
                { type: 'Repair',       desc: 'Fix a known issue' },
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => { setShowModal(false); router.push(`/jobs/new?type=${item.type.toLowerCase().replace('-', '_')}`) }}
                  className="border border-neutral-200 rounded-xl p-4 text-left hover:border-neutral-400 hover:bg-neutral-50 transition-colors"
                >
                  <div className="text-sm font-medium text-neutral-900 mb-1">{item.type}</div>
                  <div className="text-xs text-neutral-500">{item.desc}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="w-full mt-4 py-2 text-sm text-neutral-500 border border-neutral-200 rounded-lg hover:bg-neutral-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
