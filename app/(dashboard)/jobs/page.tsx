'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase/client'

type Job = {
  id: string
  type: string
  status: string
  scheduled_at: string | null
  odometer_km: number | null
  created_at: string
  clients?: { first_name: string; last_name: string } | null
  vehicles?: { make: string; model: string; year: string; plate: string } | null
}

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pre_purchase: { bg: 'bg-blue-50',   text: 'text-blue-700',   label: 'Pre-Purchase' },
  service:      { bg: 'bg-green-50',  text: 'text-green-700',  label: 'Service'      },
  diagnosis:    { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Diagnosis'    },
  repair:       { bg: 'bg-orange-50', text: 'text-orange-700', label: 'Repair'       },
}

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  in_progress: { label: 'In progress', bg: 'bg-orange-50',   text: 'text-orange-700', dot: 'bg-orange-500'  },
  pending:     { label: 'Pending',     bg: 'bg-neutral-100', text: 'text-neutral-500', dot: 'bg-neutral-400' },
  completed:   { label: 'Completed',  bg: 'bg-green-50',    text: 'text-green-700',  dot: 'bg-green-500'   },
}

const TYPE_FILTERS = ['All', 'pre_purchase', 'service', 'diagnosis', 'repair']
const TYPE_FILTER_LABELS: Record<string, string> = {
  All: 'All',
  pre_purchase: 'Pre-Purchase',
  service: 'Service',
  diagnosis: 'Diagnosis',
  repair: 'Repair',
}

export default function JobsPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('All')
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('jobs')
      .select('*, clients(first_name, last_name), vehicles(make, model, year, plate)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setJobs((data as Job[]) || [])
        setLoading(false)
      })
  }, [])

  const filtered = jobs.filter(j => typeFilter === 'All' || j.type === typeFilter)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Jobs</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {loading ? '…' : `${jobs.length} job${jobs.length !== 1 ? 's' : ''}`}
          </p>
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
        {TYPE_FILTERS.map((tab) => (
          <button
            key={tab}
            onClick={() => setTypeFilter(tab)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              typeFilter === tab
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50'
            }`}
          >
            {TYPE_FILTER_LABELS[tab]}
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
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-neutral-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-neutral-400">
                {typeFilter !== 'All' ? 'No jobs match this filter' : 'No jobs yet — create your first one'}
              </td></tr>
            ) : filtered.map((job) => {
              const t = TYPE_STYLES[job.type] || { bg: 'bg-neutral-100', text: 'text-neutral-600', label: job.type }
              const s = STATUS_STYLES[job.status] || { label: job.status, bg: 'bg-neutral-100', text: 'text-neutral-500', dot: 'bg-neutral-400' }
              const vehicleLabel = job.vehicles
                ? `${job.vehicles.make} ${job.vehicles.model} ${job.vehicles.year}`
                : '—'
              const clientLabel = job.clients
                ? `${job.clients.first_name} ${job.clients.last_name}`
                : '—'
              const dateLabel = job.scheduled_at
                ? new Date(job.scheduled_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
                : new Date(job.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })

              return (
                <tr
                  key={job.id}
                  onClick={() => router.push(`/jobs/${job.id}`)}
                  className="border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer last:border-b-0"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900">{t.label}</div>
                    <div className="text-xs text-neutral-400 mt-0.5">{vehicleLabel}</div>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{clientLabel}</td>
                  <td className="px-4 py-3 text-neutral-600">{dateLabel}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${t.bg} ${t.text}`}>{t.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 w-fit ${s.bg} ${s.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>
                      {s.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/jobs/${job.id}`) }}
                      className="text-xs px-3 py-1 border border-neutral-200 rounded-lg hover:bg-neutral-100 text-neutral-600"
                    >
                      {job.status === 'completed' ? 'View' : 'Continue'}
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
                { type: 'pre_purchase', label: 'Pre-Purchase', desc: 'Full vehicle inspection' },
                { type: 'service',      label: 'Service',      desc: 'Oil change & maintenance' },
                { type: 'diagnosis',    label: 'Diagnosis',    desc: 'Find & report the issue' },
                { type: 'repair',       label: 'Repair',       desc: 'Fix a known issue' },
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => { setShowModal(false); router.push(`/jobs/new?type=${item.type}`) }}
                  className="border border-neutral-200 rounded-xl p-4 text-left hover:border-neutral-400 hover:bg-neutral-50 transition-colors"
                >
                  <div className="text-sm font-medium text-neutral-900 mb-1">{item.label}</div>
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
